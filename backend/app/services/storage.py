"""Supabase Storage service for PyPaws pet photos.

Provides upload, public URL generation, and fallback caching for pet images.
"""
from __future__ import annotations

import logging
import os
import urllib.request
from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings
from app.core.database import get_supabase_admin

logger = logging.getLogger(__name__)


def upload_pet_image(
    file_bytes: bytes,
    original_filename: str = "",
    content_type: str = "image/jpeg",
) -> dict[str, str | None]:
    """Upload pet image to Supabase Storage with local cache fallback.

    Args:
        file_bytes: Raw binary content of the image.
        original_filename: Original client filename to preserve extension.
        content_type: MIME type of the image.

    Returns:
        dict with keys:
          - file_path: URL or path to be stored in the database (post_images.image_path)
          - url: Public accessible URL
          - filename: Unique generated filename
          - storage: 'supabase' or 'local'
          - bucket: Supabase bucket name if uploaded to Supabase, else None
    """
    settings = get_settings()

    # 1. Determine safe extension and unique filename
    ext = os.path.splitext(original_filename or "")[1].lower()
    if not ext or ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        ext = ".jpg"

    filename = f"{uuid4().hex}{ext}"

    # 2. Always persist a local copy in upload_dir as cache and fallback
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    local_target = upload_dir / filename
    try:
        with open(local_target, "wb") as f:
            f.write(file_bytes)
    except Exception as exc:
        logger.warning("Failed to write local image cache: %s", exc)

    # 3. Attempt upload to Supabase Storage
    bucket = settings.supabase_storage_bucket or "pet-images"
    supabase_client = get_supabase_admin()

    storage_type = "local"
    public_url = f"/uploads/{filename}"
    uploaded_bucket: str | None = None

    try:
        # Supabase Python storage upload expects (path, file_bytes, file_options)
        supabase_client.storage.from_(bucket).upload(
            path=filename,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        sb_url = supabase_client.storage.from_(bucket).get_public_url(filename)
        if sb_url:
            public_url = sb_url
            storage_type = "supabase"
            uploaded_bucket = bucket
            logger.info("Uploaded pet image to Supabase Storage bucket '%s': %s", bucket, public_url)
    except Exception as exc:
        logger.warning(
            "Could not upload image '%s' to Supabase Storage bucket '%s' (%s). "
            "Using local storage fallback. "
            "To enable direct Supabase Storage uploads, ensure SUPABASE_SERVICE_ROLE_KEY is set in .env "
            "or run the storage RLS migration in Supabase SQL editor.",
            filename,
            bucket,
            exc,
        )

    return {
        "file_path": public_url,
        "url": public_url,
        "filename": filename,
        "storage": storage_type,
        "bucket": uploaded_bucket,
    }


def load_image_bytes(image_path_or_url: str) -> bytes:
    """Retrieve image bytes whether stored on Supabase Storage URL or locally on disk."""
    settings = get_settings()

    # If it's a URL (e.g. Supabase Storage public URL or external CDN)
    if image_path_or_url.startswith(("http://", "https://")):
        # First check if local cache has the basename
        basename = os.path.basename(image_path_or_url.split("?")[0])
        local_cached = Path(settings.upload_dir) / basename
        if local_cached.exists() and local_cached.is_file():
            return local_cached.read_bytes()

        # Download from remote URL
        req = urllib.request.Request(
            image_path_or_url,
            headers={"User-Agent": "PyPaws/0.1 (pet-image-loader)"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read()

    # Otherwise look on local disk
    candidates = [
        Path(settings.upload_dir) / os.path.basename(image_path_or_url),
        Path(__file__).resolve().parents[3] / image_path_or_url.lstrip("/\\"),
        Path(image_path_or_url),
    ]
    for p in candidates:
        if p.exists() and p.is_file():
            return p.read_bytes()

    raise FileNotFoundError(f"Cannot resolve image content for: {image_path_or_url}")
