"""Runtime configuration for the PyPaws FastAPI backend."""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

ALLOWED_MATCH_MODEL_NAMES = {"dinov2_pretrained", "dinov2_finetuned"}


def _csv(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_env: str
    supabase_url: str
    supabase_publishable_key: str
    cors_origins: tuple[str, ...]
    upload_dir: str
    geocoder_base_url: str
    geocoder_user_agent: str
    geocoder_timeout_seconds: float
    dinov2_checkpoint: str
    match_model_name: str
    match_model_version: str
    match_image_min_similarity: float
    match_image_review_similarity: float
    match_image_high_similarity: float
    match_default_radius_km: float
    match_top_k: int
    supabase_service_role_key: str | None = None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    supabase_key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip() or None
    if not supabase_url:
        raise RuntimeError("SUPABASE_URL is not configured.")
    if not supabase_key:
        raise RuntimeError("SUPABASE_PUBLISHABLE_KEY is not configured. Use the publishable key only.")
    if not supabase_url.startswith(("https://", "http://")):
        raise RuntimeError("SUPABASE_URL must be a valid HTTP(S) URL")

    origins = _csv(os.getenv("CORS_ORIGINS", "http://localhost:5173"))
    if not origins:
        raise RuntimeError("CORS_ORIGINS must contain at least one origin")

    default_radius = float(os.getenv("MATCH_DEFAULT_RADIUS_KM", "5"))
    if default_radius not in (5.0, 10.0, 20.0):
        raise RuntimeError("MATCH_DEFAULT_RADIUS_KM must be 5, 10 or 20")
    min_similarity = float(os.getenv("MATCH_IMAGE_MIN_SIMILARITY", "0.252"))
    review_similarity = float(os.getenv("MATCH_IMAGE_REVIEW_SIMILARITY", "0.70"))
    high_similarity = float(os.getenv("MATCH_IMAGE_HIGH_SIMILARITY", "0.80"))
    match_top_k = int(os.getenv("MATCH_TOP_K", "5"))
    match_model_name = os.getenv("MATCH_MODEL_NAME", "dinov2_finetuned").strip()
    match_model_version = os.getenv("MATCH_MODEL_VERSION", "v1").strip()
    if match_model_name not in ALLOWED_MATCH_MODEL_NAMES:
        allowed = ", ".join(sorted(ALLOWED_MATCH_MODEL_NAMES))
        raise RuntimeError(f"MATCH_MODEL_NAME must be one of: {allowed}")
    if not match_model_version:
        raise RuntimeError("MATCH_MODEL_VERSION must not be empty")
    if match_top_k < 1:
        raise RuntimeError("MATCH_TOP_K must be at least 1")
    if not (0.0 <= min_similarity < review_similarity < high_similarity <= 1.0):
        raise RuntimeError("Image similarity thresholds must satisfy 0 <= min < review < high <= 1")

    return Settings(
        app_name=os.getenv("APP_NAME", "PyPaws Backend").strip() or "PyPaws Backend",
        app_env=os.getenv("APP_ENV", "development").strip() or "development",
        supabase_url=supabase_url,
        supabase_publishable_key=supabase_key,
        cors_origins=origins,
        upload_dir=os.getenv("UPLOAD_DIR", "backend/uploads").strip() or "backend/uploads",
        geocoder_base_url=os.getenv("GEOCODER_BASE_URL", "https://nominatim.openstreetmap.org").strip().rstrip("/"),
        geocoder_user_agent=os.getenv("GEOCODER_USER_AGENT", "PyPaws/0.1 (pet-matching-project)").strip(),
        geocoder_timeout_seconds=float(os.getenv("GEOCODER_TIMEOUT_SECONDS", "8")),
        dinov2_checkpoint=os.getenv("DINOV2_CHECKPOINT", "ai/dinov2_petface/dinov2_petface_ft.pt").strip(),
        match_model_name=match_model_name,
        match_model_version=match_model_version,
        match_image_min_similarity=min_similarity,
        match_image_review_similarity=review_similarity,
        match_image_high_similarity=high_similarity,
        match_default_radius_km=default_radius,
        match_top_k=match_top_k,
        supabase_service_role_key=supabase_service_role_key,
    )
