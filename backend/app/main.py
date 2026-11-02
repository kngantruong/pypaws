"""PyPaws FastAPI application entry point."""
from __future__ import annotations

import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure repository root and AI packages are in sys.path
_repo_root = Path(__file__).resolve().parents[2]
_backend_dir = _repo_root / "backend"
_ai_qwen_dir = _repo_root / "ai" / "qwen"

for _p in [str(_repo_root), str(_backend_dir), str(_ai_qwen_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.candidates import post_candidates_router, router as candidates_router
from app.api.location import router as location_router
from app.api.matching import router as matching_router
from app.api.notifications import router as notifications_router
from app.api.posts import router as posts_router
from app.core.config import get_settings
from app.routers import health
from app.routers.ai_pet_description import router as ai_pet_description_router

logger = logging.getLogger(__name__)
settings = get_settings()

# Ensure uploads directory exists
os.makedirs(settings.upload_dir, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize heavyweight AI exactly once when a checkpoint is available."""
    try:
        from app.services.pet_embedding import get_embedder
        get_embedder(settings.dinov2_checkpoint)
        logger.info("DINOv2 embedder successfully initialized at startup.")
    except FileNotFoundError:
        logger.warning("DINOv2 checkpoint is not present; image matching remains unavailable until configured.")
    except Exception:
        logger.exception("DINOv2 initialization failed; backend starts without the embedder.")
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description="PyPaws backend: lost/found pet reporting, location services and AI matching.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development & local testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(health.router)
app.include_router(posts_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(candidates_router, prefix="/api")
app.include_router(post_candidates_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(location_router, prefix="/api")
app.include_router(matching_router, prefix="/api")
app.include_router(ai_pet_description_router)


@app.get("/", tags=["Health"])
def root() -> dict[str, str]:
    return {
        "service": settings.app_name,
        "docs": "/docs",
        "health": "/api/health",
    }
