"""Server-side LOST -> FOUND candidate generation using DINOv2 + location + time.

The database contract is the existing `get_search_pool` / `save_candidate`
functions. No new SQL functions are required by the backend.
"""
from __future__ import annotations

from datetime import datetime, timezone
import math
from typing import Any

import numpy as np

from app.core.config import get_settings
from app.services.location import haversine_km, location_score, validate_coordinates
from app.services.matching import image_priority, passes_image_threshold, select_top_k, weighted_score


TIME_HALF_LIFE_DAYS = 7.0
TIME_DECAY_LAMBDA_PER_DAY = math.log(2.0) / TIME_HALF_LIFE_DAYS


def _decode_embedding(value: Any, dim: int | None = None) -> np.ndarray:
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


def _candidate_is_in_radius(
    distance_km: float | None, radius_km: float, image_similarity: float
) -> bool:
    if distance_km is None:
        return False
    # Geographic radius is a hard filter; image similarity cannot bypass it.
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
    if not embedding_rows:
        raise LookupError("No primary embedding found for this post.")

    embedding = embedding_rows[0]
    query["embedding"] = embedding["embedding"]
    query["dim"] = embedding.get("dim")
    query["image_id"] = image_id
    return query


def match_post(supabase, post_id: int, radius_km: float | None = None) -> list[dict[str, Any]]:
    settings = get_settings()
    model_name = settings.match_model_name
    model_version = settings.match_model_version
    radius = settings.match_default_radius_km if radius_km is None else radius_km
    if radius not in (5.0, 10.0, 20.0):
        raise ValueError("radius_km must be 5, 10 or 20")

    query = _get_query_context(supabase, post_id, model_name, model_version)
    validate_coordinates(query.get("latitude"), query.get("longitude"))
    query_vector = _decode_embedding(query["embedding"], query.get("dim"))

    # Keep candidate IDs stable across reruns. This preserves notification
    # references and lets us distinguish genuinely new LOST-FOUND pairs.
    existing_rows = (
        supabase.table("candidates")
        .select("candidate_id,candidate_post_id,status")
        .eq("query_post_id", post_id)
        .execute()
        .data
        or []
    )
    existing_pairs = {int(row["candidate_post_id"]) for row in existing_rows}
    # Hide old pending suggestions before re-enabling the current top-k below.
    # save_candidate sets passed_threshold=True for each newly ranked result.
    (
        supabase.table("candidates")
        .update({"passed_threshold": False})
        .eq("query_post_id", post_id)
        .eq("status", "PENDING")
        .execute()
    )

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

    if not pool:
        return []

    ranked_candidates: list[dict[str, Any]] = []

    for candidate in pool:
        candidate_vector = _decode_embedding(candidate["embedding"], candidate.get("dim"))
        # Embeddings are L2-normalized, so cosine similarity is a dot product.
        image_similarity = float(np.dot(query_vector, candidate_vector))
        if not passes_image_threshold(image_similarity, settings.match_image_min_similarity):
            continue

        # Coordinates are mandatory for both sides; missing candidate location
        # must never be treated as an unrestricted geographic match.
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

        ranked_candidates.append(
            {
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
            }
        )

    # Persist and notify only the configured number of highest-ranked eligible candidates.
    top_candidates = select_top_k(ranked_candidates, settings.match_top_k)
    results: list[dict[str, Any]] = []
    for ranked in top_candidates:
        image_similarity = ranked["_image_similarity"]
        distance_km = ranked["_distance_km"]
        time_gap_hours = ranked["_time_gap_hours"]
        final_score = ranked["final_score"]
        candidate = ranked["_candidate"]

        is_new_pair = int(candidate["post_id"]) not in existing_pairs
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

        if is_new_pair and (final_score / 100 >= 0.80 or image_similarity >= settings.match_image_high_similarity):
            try:
                supabase.rpc("notify_candidate", {"p_candidate_id": candidate_id}).execute()
            except Exception:
                # Notification failure must not discard an otherwise valid match.
                pass

        results.append(
            {
                "candidate_id": candidate_id,
                "post_id": ranked["post_id"],
                "distance_km": ranked["distance_km"],
                "image_similarity": ranked["image_similarity"],
                "final_score": final_score,
                "location_label": ranked["location_label"],
                "image_priority": ranked["image_priority"],
            }
        )

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
