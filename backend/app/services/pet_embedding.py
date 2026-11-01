"""Process-wide DINOv2 PetFace embedder lifecycle."""
from __future__ import annotations

import logging
import sys
from pathlib import Path
from threading import Lock

logger = logging.getLogger(__name__)

_embedder = None
_lock = Lock()


def get_embedder(checkpoint_path: str | None = None):
    global _embedder
    if _embedder is not None:
        return _embedder
    with _lock:
        if _embedder is not None:
            return _embedder
        repo_root = Path(__file__).resolve().parents[3]
        if str(repo_root) not in sys.path:
            sys.path.insert(0, str(repo_root))
        from ai.dinov2_petface.embedder import PetFaceEmbedder
        path = Path(checkpoint_path or "ai/dinov2_petface/dinov2_petface_ft.pt")
        if not path.exists():
            raise FileNotFoundError(f"DINOv2 checkpoint not found: {path}")
        _embedder = PetFaceEmbedder(str(path))
        logger.info("DINOv2 PetFace embedder initialized once from %s", path)
        return _embedder


def is_loaded() -> bool:
    return _embedder is not None
