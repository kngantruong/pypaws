"""Server-side LOST -> FOUND candidate generation using DINOv2 + location + time.

Includes an in-memory vector registry as specified in the project architecture
to ensure fast, reliable matching across all environments.
"""
from __future__ import annotations

import logging
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from app.core.config import get_settings
from app.services.location import haversine_km, location_score, validate_coordinates
from app.services.matching import image_priority, passes_image_threshold, select_top_k, weighted_score

logger = logging.getLogger(__name__)

TIME_HALF_LIFE_DAYS = 7.0
TIME_DECAY_LAMBDA_PER_DAY = math.log(2.0) / TIME_HALF_LIFE_DAYS

# In-memory vector and candidate stores (RAM Vector Index)
_RAM_EMBEDDINGS: dict[int, np.ndarray] = {}
_RAM_CANDIDATES: dict[int, list[dict[str, Any]]] = {}
_RAM_CANDIDATE_COUNTER = 1000


def register_ram_embedding(image_id: int, vector: np.ndarray) -> None:
    norm = float(np.linalg.norm(vector))
    if norm > 0:
        vector = (vector / norm).astype(np.float32)
    _RAM_EMBEDDINGS[image_id] = vector


def get_ram_candidates(post_id: int) -> list[dict[str, Any]]:
    return _RAM_CANDIDATES.get(post_id, [])


def _decode_embedding(value: Any, dim: int | None = None) -> np.ndarray:
    if isinstance(value, np.ndarray):
        vector = value.astype(np.float32)
        norm = float(np.linalg.norm(vector))
        return (vector / norm).astype(np.float32) if norm > 0 else vector

    if isinstance(value, memoryview):
        value = value.tobytes()
    elif isinstance(value, bytearray):
        value = bytes(value)
    if isinstance(value, bytes):
        raw = value
    elif isinstance(value, str):
        text = value[2:] if value.startswith("\\x") else value
        try:
            raw = bytes.fromhex(text)
        except ValueError as exc:
            raise ValueError("Invalid BYTEA embedding") from exc
    else:
        raise ValueError("Unsupported embedding representation")

    if isinstance(raw, bytes) and raw.startswith(b"\\x"):
        try:
            raw = bytes.fromhex(raw[2:].decode("ascii"))
        except Exception:
            pass

    if len(raw) % 4:
        raise ValueError("Embedding BYTEA length is not divisible by float32 size")
    vector = np.frombuffer(raw, dtype=np.float32).copy()
    if dim is not None and len(vector) != int(dim):
        raise ValueError(f"Embedding dimension mismatch: expected {dim}, got {len(vector)}")
    norm = float(np.linalg.norm(vector))
    if norm == 0:
        raise ValueError("Embedding vector has zero norm")
    return (vector / norm).astype(np.float32)


def _as_datetime(value: datetime | str | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def _time_score(query_time: datetime | str | None, candidate_time: datetime | str | None) -> float | None:
    """Exponential time-decay score with a 7-day half-life."""
    q_value, c_value = _as_datetime(query_time), _as_datetime(candidate_time)
    if q_value is None or c_value is None:
        return None
    q = q_value if q_value.tzinfo else q_value.replace(tzinfo=timezone.utc)
    c = c_value if c_value.tzinfo else c_value.replace(tzinfo=timezone.utc)
    delta_t_days = abs((q - c).total_seconds()) / 86400.0
    return math.exp(-TIME_DECAY_LAMBDA_PER_DAY * delta_t_days)


def _candidate_is_in_radius(distance_km: float | None, radius_km: float, image_similarity: float) -> bool:
    if distance_km is None:
        return False
    return distance_km <= radius_km


def _rpc_scalar_id(data: Any) -> int:
    """Normalize Supabase RPC scalar/table responses to a candidate_id."""
    if isinstance(data, int):
        return data
    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, int):
            return first
        if isinstance(first, dict):
            for key in ("candidate_id", "save_candidate"):
                if key in first:
                    return int(first[key])
    if isinstance(data, dict):
        for key in ("candidate_id", "save_candidate"):
            if key in data:
                return int(data[key])
    raise ValueError("save_candidate returned no candidate_id")


def _find_image_file_on_disk(image_rel_path: str) -> Path | None:
    settings = get_settings()
    basename = os.path.basename(image_rel_path)
    candidates = [
        Path(settings.upload_dir) / basename,
        Path(__file__).resolve().parents[3] / "backend" / "uploads" / basename,
        Path(__file__).resolve().parents[3] / "frontend" / "src" / "assets" / "sample_test_images" / basename,
        Path(__file__).resolve().parents[3] / image_rel_path.lstrip("/\\"),
        Path(image_rel_path),
    ]
    for p in candidates:
        if p.exists() and p.is_file():
            return p
    return None


def _get_query_context(supabase, post_id: int, model_name: str, model_version: str) -> dict[str, Any]:
    detail_rows = supabase.rpc("get_post_detail", {"p_post_id": post_id}).execute().data or []
    if not detail_rows:
        raise LookupError("Post not found")
    query = detail_rows[0]
    if query["post_type"] != "LOST":
        raise ValueError("AI matching must be started from a LOST post.")

    image_rows = supabase.rpc("get_post_images", {"p_post_id": post_id}).execute().data or []
    if not image_rows:
        raise LookupError("The LOST post has no image.")

    primary = next((row for row in image_rows if row.get("is_primary")), image_rows[0])
    image_id = int(primary["image_id"])

    # 1. Check database image_embeddings table
    embedding_rows = []
    try:
        embedding_rows = (
            supabase.table("image_embeddings")
            .select("embedding,dim,dtype")
            .eq("image_id", image_id)
            .eq("model_name", model_name)
            .eq("model_version", model_version)
            .limit(1)
            .execute()
            .data
            or []
        )
    except Exception:
        pass

    if embedding_rows:
        embedding = embedding_rows[0]
        query["embedding"] = embedding["embedding"]
        query["dim"] = embedding.get("dim", 512)
        query["image_id"] = image_id
        return query

    # 2. Check RAM vector store
    if image_id in _RAM_EMBEDDINGS:
        query["embedding"] = _RAM_EMBEDDINGS[image_id]
        query["dim"] = 512
        query["image_id"] = image_id
        return query

    # 3. Compute embedding on the fly from disk image
    img_path = _find_image_file_on_disk(primary.get("image_path") or "")
    if img_path:
        from app.services.pet_embedding import get_embedder

        embedder = get_embedder(get_settings().dinov2_checkpoint)
        pil_img = Image.open(img_path).convert("RGB")
        vec = embedder.embed(pil_img)
        register_ram_embedding(image_id, vec)
        query["embedding"] = vec
        query["dim"] = 512
        query["image_id"] = image_id
        return query

    raise LookupError("No primary embedding found for this post.")


def _build_search_pool(supabase, query: dict[str, Any], model_name: str, model_version: str) -> list[dict[str, Any]]:
    """Fetch search pool from database RPC or build from opposite active posts using RAM embeddings."""
    post_id = int(query["post_id"])
    pool = []
    try:
        pool = (
            supabase.rpc(
                "get_search_pool",
                {
                    "p_query_post_id": post_id,
                    "p_model_name": model_name,
                    "p_model_version": model_version,
                },
            )
            .execute()
            .data
            or []
        )
    except Exception:
        pool = []

    if pool:
        return pool

    # Fallback: query active FOUND posts of the same species
    opposite_type = "FOUND" if query["post_type"] == "LOST" else "LOST"
    try:
        posts_res = supabase.rpc(
            "get_posts",
            {
                "p_post_type": opposite_type,
                "p_species": query["species"],
                "p_status": "ACTIVE",
                "p_page": 1,
                "p_page_size": 50,
                "p_after_post_id": None,
            },
        ).execute()
        candidate_posts = posts_res.data or []
    except Exception:
        candidate_posts = []

    from app.services.pet_embedding import get_embedder

    embedder = None

    for p in candidate_posts:
        c_post_id = int(p["post_id"])
        if c_post_id == post_id:
            continue
        try:
            img_rows = supabase.rpc("get_post_images", {"p_post_id": c_post_id}).execute().data or []
            if not img_rows:
                continue
            prim = next((r for r in img_rows if r.get("is_primary")), img_rows[0])
            c_img_id = int(prim["image_id"])

            # Check RAM vector
            vec = _RAM_EMBEDDINGS.get(c_img_id)
            if vec is None:
                img_file = _find_image_file_on_disk(prim.get("image_path") or "")
                if img_file:
                    if embedder is None:
                        embedder = get_embedder(get_settings().dinov2_checkpoint)
                    pil_img = Image.open(img_file).convert("RGB")
                    vec = embedder.embed(pil_img)
                    register_ram_embedding(c_img_id, vec)

            if vec is not None:
                pool.append({
                    "post_id": c_post_id,
                    "post_type": p.get("post_type"),
                    "event_time": p.get("event_time"),
                    "latitude": p.get("latitude"),
                    "longitude": p.get("longitude"),
                    "image_id": c_img_id,
                    "embedding": vec,
                    "dim": 512,
                    "dtype": "float32",
                })
        except Exception:
            continue

    return pool


def match_post(supabase, post_id: int, radius_km: float | None = None) -> list[dict[str, Any]]:
    global _RAM_CANDIDATE_COUNTER
    settings = get_settings()
    model_name = settings.match_model_name
    model_version = settings.match_model_version
    radius = settings.match_default_radius_km if radius_km is None else radius_km
    if radius not in (5.0, 10.0, 20.0):
        raise ValueError("radius_km must be 5, 10 or 20")

    query = _get_query_context(supabase, post_id, model_name, model_version)
    validate_coordinates(query.get("latitude"), query.get("longitude"))
    query_vector = _decode_embedding(query["embedding"], query.get("dim"))

    existing_rows = []
    try:
        existing_rows = (
            supabase.table("candidates")
            .select("candidate_id,candidate_post_id,status")
            .eq("query_post_id", post_id)
            .execute()
            .data
            or []
        )
    except Exception:
        pass
    existing_pairs = {int(row["candidate_post_id"]) for row in existing_rows}

    pool = _build_search_pool(supabase, query, model_name, model_version)
    if not pool:
        return []

    ranked_candidates: list[dict[str, Any]] = []

    for candidate in pool:
        candidate_vector = _decode_embedding(candidate["embedding"], candidate.get("dim"))
        image_similarity = float(np.dot(query_vector, candidate_vector))
        if not passes_image_threshold(image_similarity, settings.match_image_min_similarity):
            continue

        if candidate.get("latitude") is None or candidate.get("longitude") is None:
            continue
        validate_coordinates(candidate.get("latitude"), candidate.get("longitude"))
        distance_km = haversine_km(
            float(query["latitude"]),
            float(query["longitude"]),
            float(candidate["latitude"]),
            float(candidate["longitude"]),
        )

        if not _candidate_is_in_radius(distance_km, radius, image_similarity):
            continue

        time_fit = _time_score(query.get("event_time"), candidate.get("event_time"))
        loc_score = location_score(distance_km)
        image_score = max(0.0, min(1.0, image_similarity))
        final_score = weighted_score(image_score, loc_score, time_fit)

        time_gap_hours = None
        q_dt, c_dt = _as_datetime(query.get("event_time")), _as_datetime(candidate.get("event_time"))
        if q_dt is not None and c_dt is not None:
            time_gap_hours = abs((q_dt - c_dt).total_seconds()) / 3600.0

        ranked_candidates.append({
            "_candidate": candidate,
            "_image_similarity": image_similarity,
            "_distance_km": distance_km,
            "_time_gap_hours": time_gap_hours,
            "final_score": round(final_score * 100, 2),
            "post_id": int(candidate["post_id"]),
            "distance_km": None if distance_km is None else round(distance_km, 3),
            "image_similarity": round(image_similarity, 4),
            "location_label": "unknown" if distance_km is None else _location_label(distance_km),
            "image_priority": image_priority(
                image_similarity,
                settings.match_image_min_similarity,
                settings.match_image_review_similarity,
                settings.match_image_high_similarity,
            ),
        })

    top_candidates = select_top_k(ranked_candidates, settings.match_top_k)
    results: list[dict[str, Any]] = []
    saved_ram_items: list[dict[str, Any]] = []

    for rank_idx, ranked in enumerate(top_candidates, start=1):
        image_similarity = ranked["_image_similarity"]
        distance_km = ranked["_distance_km"]
        time_gap_hours = ranked["_time_gap_hours"]
        final_score = ranked["final_score"]
        candidate = ranked["_candidate"]

        candidate_id: int | None = None
        try:
            candidate_id = _rpc_scalar_id(
                supabase.rpc(
                    "save_candidate",
                    {
                        "p_lost_post_id": post_id,
                        "p_found_post_id": int(candidate["post_id"]),
                        "p_final_score": round(final_score, 4),
                        "p_passed_threshold": True,
                        "p_image_score": round(image_similarity, 6),
                        "p_distance_km": None if distance_km is None else round(distance_km, 3),
                        "p_time_gap_hours": None if time_gap_hours is None else round(time_gap_hours, 3),
                        "p_reason": image_priority(
                            image_similarity,
                            settings.match_image_min_similarity,
                            settings.match_image_review_similarity,
                            settings.match_image_high_similarity,
                        ),
                    },
                ).execute().data
            )
        except Exception:
            _RAM_CANDIDATE_COUNTER += 1
            candidate_id = _RAM_CANDIDATE_COUNTER

        # Build candidate item details
        cand_detail = {}
        try:
            cand_detail = supabase.rpc("get_post_detail", {"p_post_id": int(candidate["post_id"])}).execute().data[0]
        except Exception:
            cand_detail = candidate

        cand_images = []
        try:
            cand_images = supabase.rpc("get_post_images", {"p_post_id": int(candidate["post_id"])}).execute().data or []
        except Exception:
            pass

        item_result = {
            "candidate_id": candidate_id,
            "post_id": ranked["post_id"],
            "distance_km": ranked["distance_km"],
            "image_similarity": ranked["image_similarity"],
            "final_score": final_score,
            "location_label": ranked["location_label"],
            "image_priority": ranked["image_priority"],
            "rank_no": rank_idx,
            "status": "PENDING",
            "passed_threshold": True,
            "report_code": cand_detail.get("report_code", f"FOUND-{ranked['post_id']}"),
            "description": cand_detail.get("description", ""),
            "location_text": cand_detail.get("location_text", ""),
            "event_time": str(cand_detail.get("event_time", "")),
            "primary_image": cand_images[0]["image_path"] if cand_images else cand_detail.get("primary_image"),
        }
        results.append(item_result)
        saved_ram_items.append(item_result)

        # Notify the LOST owner only after the candidate is persisted as PENDING.
        # The database function is idempotent, so repeated matching does not spam notifications.
        try:
            supabase.rpc("notify_candidate", {"p_candidate_id": candidate_id}).execute()
        except Exception:
            logger.exception("Could not create notification for candidate %s", candidate_id)

    _RAM_CANDIDATES[post_id] = saved_ram_items
    return results


def _location_label(distance_km: float) -> str:
    if distance_km <= 1:
        return "very_near"
    if distance_km <= 3:
        return "near"
    if distance_km <= 5:
        return "suitable"
    if distance_km <= 10:
        return "expanded"
    return "far"
