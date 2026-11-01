"""PyPaws FastAPI application entry point."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.posts import router as posts_router
from app.api.auth import router as auth_router
from app.api.candidates import router as candidates_router, post_candidates_router
from app.api.notifications import router as notifications_router
from app.core.config import get_settings
from app.routers import health

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="PyPaws backend: lost/found pet reporting and AI matching.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(posts_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(candidates_router, prefix="/api")
app.include_router(post_candidates_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")


@app.get("/", tags=["Health"])
def root() -> dict[str, str]:
    return {"service": settings.app_name, "docs": "/docs", "health": "/api/health"}
