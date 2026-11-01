"""Runtime configuration for the PyPaws FastAPI backend."""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    supabase_key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()

    if not supabase_url:
        raise RuntimeError(
            "SUPABASE_URL is not configured. Copy backend/.env.example to .env "
            "and set the Supabase project URL."
        )
    if not supabase_key:
        raise RuntimeError(
            "SUPABASE_PUBLISHABLE_KEY is not configured. Use the Supabase "
            "publishable key; never use a service_role/secret key."
        )
    if not supabase_url.startswith(("https://", "http://")):
        raise RuntimeError("SUPABASE_URL must be a valid HTTP(S) URL")

    origins = _csv(os.getenv("CORS_ORIGINS", "http://localhost:5173"))
    if not origins:
        raise RuntimeError("CORS_ORIGINS must contain at least one origin")

    return Settings(
        app_name=os.getenv("APP_NAME", "PyPaws Backend").strip() or "PyPaws Backend",
        app_env=os.getenv("APP_ENV", "development").strip() or "development",
        supabase_url=supabase_url,
        supabase_publishable_key=supabase_key,
        cors_origins=origins,
        upload_dir=os.getenv("UPLOAD_DIR", "backend/uploads").strip() or "backend/uploads",
    )
