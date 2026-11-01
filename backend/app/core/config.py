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
    database_url: str
    db_connect_timeout: int
    cors_origins: tuple[str, ...]
    upload_dir: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is not configured. Copy backend/.env.example to .env "
            "and set the PostgreSQL connection string."
        )

    timeout_raw = os.getenv("DB_CONNECT_TIMEOUT", "5").strip()
    try:
        timeout = int(timeout_raw)
    except ValueError as exc:
        raise RuntimeError("DB_CONNECT_TIMEOUT must be an integer") from exc
    if timeout <= 0:
        raise RuntimeError("DB_CONNECT_TIMEOUT must be greater than 0")

    origins = _csv(os.getenv("CORS_ORIGINS", "http://localhost:5173"))
    if not origins:
        raise RuntimeError("CORS_ORIGINS must contain at least one origin")

    return Settings(
        app_name=os.getenv("APP_NAME", "PyPaws Backend").strip() or "PyPaws Backend",
        app_env=os.getenv("APP_ENV", "development").strip() or "development",
        database_url=database_url,
        db_connect_timeout=timeout,
        cors_origins=origins,
        upload_dir=os.getenv("UPLOAD_DIR", "backend/uploads").strip() or "backend/uploads",
    )
