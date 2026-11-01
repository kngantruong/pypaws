"""Server-side LOST/FOUND candidate generation using DINOv2 + location/time/appearance."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import numpy as np

from app.core.config import get_settings
from app.services.location import haversine_km, location_score
from app.services.matching import image_priority, passes_image_threshold, weighted_score
from app.services.pet_embedding import get_embedder


MODEL_NAME = "dinov2_petface"
MODEL_VERSION = "v1"


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
    norm = np.linalg.norm(vector)
    if norm == 0:
        raise ValueError("Embedding vector has zero norm")
    return (vector / norm).astype(np.float32)


def _appearance_score(query: dict[str, Any], candidate: dict[str, Any]) -> float | None:
    fields = ("gender", "breed", "coat_color")
    compared = []
    for field in fields:
        left, right = query.get(field), candidate.get(field)
        if left is None or right is None or not str(left).strip() or not str(right).strip():
            continue
        compared.append(1.0 if str(left).strip().casefold() == str(right).strip().casefold() else 0.0)
    q_notes, c_notes = query.get("appearance_notes"), candidate.get("appearance_notes")
    if q_notes and c_notes:
        q_tokens = {x.strip().casefold() for x in str(q_notes).replace(",", " ").split() if x.strip()}
        c_tokens = {x.strip().casefold() for x in str(c_notes).replace(",", " ").split() if x.strip()}
        if q_tokens and c_tokens:
            compared.append(len(q_tokens & c_tokens) / len(q_tokens | c_tokens))
    return sum(compared) / len(compared) if compared else None


def _time_score(query_time: datetime | None, candidate_time: datetime | None) -> float | None:
    if query_time is None or candidate_time is None:
        return None
    q = query_time if query_time.tzinfo else query_time.replace(tzinfo=timezone.utc)
    c = candidate_time if candidate_time.tzinfo else candidate_time.replace(tzinfo=timezone.utc)
    hours = abs((q - c).total_seconds()) / 3600.0
    if hours <= 24:
        return 1.0
    if hours <= 72:
        return 0.8
    if hours <= 168:
        return 0.6
    if hours <= 720:
        return 0.35
    return 0.1


def _candidate_is_in_radius(distance_km: float | None, radius_km: float, image_similarity: float) -> bool:
    if distance_km is None:
        return True
    # High image similarity is never hard-excluded solely because of distance.
    return distance_km <= radius_km or image_similarity >= 0.80


def match_post(supabase, post_id: int, radius_km: float | None = None) -> list[dict[str, Any]]:
    settings = get_settings()
    radius = radius_km or settings.match_default_radius_km
    if radius not in (5.0, 10.0, 20.0):
        raise ValueError("radius_km must be 5, 10 or 20")

    context_rows = supabase.rpc("get_post_match_context", {"p_post_id": post_id}).execute().data or []
    if not context_rows:
        raise LookupError("No primary embedding found for this post")
    query = context_rows[0]
    query_vector = _decode_embedding(query["embedding"], query.get("dim"))

    pool = supabase.rpc("get_match_pool", {
        "p_query_post_id": post_id,
        "p_model_name": MODEL_NAME,
        "p_model_version": MODEL_VERSION,
    }).execute().data or []

    embedder = get_embedder(settings.dinov2_checkpoint)
    results: list[dict[str, Any]] = []
    for candidate in pool:
        candidate_vector = _decode_embedding(candidate["embedding"], candidate.get("dim"))
        image_similarity = embedder.similarity(query_vector, candidate_vector)
        if not passes_image_threshold(image_similarity, settings.match_image_min_similarity):
            continue

        distance_km = None
        if query.get("latitude") is not None and query.get("longitude") is not None \
                and candidate.get("latitude") is not None and candidate.get("longitude") is not None:
            distance_km = haversine_km(float(query["latitude"]), float(query["longitude"]),
                                       float(candidate["latitude"]), float(candidate["longitude"]))
        if not _candidate_is_in_radius(distance_km, radius, image_similarity):
            continue

        appearance = _appearance_score(query, candidate)
        time_fit = _time_score(query.get("event_time"), candidate.get("event_time"))
        loc_score = location_score(distance_km)
        image_score = max(0.0, min(1.0, (image_similarity + 1.0) / 2.0))
        final_score = weighted_score(image_score, appearance, loc_score, time_fit)
        candidate_id = supabase.rpc("save_candidate", {
            "p_lost_post_id": post_id if query["post_type"] == "LOST" else candidate["post_id"],
            "p_found_post_id": candidate["post_id"] if query["post_type"] == "LOST" else post_id,
            "p_final_score": round(final_score * 100, 4),
            "p_passed_threshold": True,
            "p_image_score": round(image_similarity, 6),
            "p_distance_km": None if distance_km is None else round(distance_km, 3),
            "p_time_gap_hours": None if time_fit is None else round(abs((query["event_time"] - candidate["event_time"]).total_seconds()) / 3600, 3),
            "p_reason": image_priority(image_similarity, settings.match_image_review_similarity, settings.match_image_high_similarity),
        }).execute().data
        results.append({
            "candidate_id": candidate_id,
            "post_id": candidate["post_id"],
            "distance_km": None if distance_km is None else round(distance_km, 3),
            "image_similarity": round(image_similarity, 4),
            "final_score": round(final_score * 100, 2),
            "location_label": "unknown" if distance_km is None else _location_label(distance_km),
            "image_priority": image_priority(image_similarity, settings.match_image_review_similarity, settings.match_image_high_similarity),
        })

    results.sort(key=lambda x: x["final_score"], reverse=True)
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
