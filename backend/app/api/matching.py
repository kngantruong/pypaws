import logging
from io import BytesIO

import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image

from app.core.auth import get_current_user_id
from app.core.config import get_settings
from app.core.database import get_supabase, get_supabase_admin
from app.services.matcher import match_post
from app.services.pet_embedding import get_embedder

router = APIRouter(prefix="/matching", tags=["AI Matching"])


@router.post("/posts/{post_id}")
def run_matching(
    post_id: int,
    radius_km: float = Query(default=None, description="MVP radius: 5, 10 or 20 km"),
    user_id: int = Depends(get_current_user_id),
):
    if radius_km is not None and radius_km not in (5.0, 10.0, 20.0):
        raise HTTPException(422, "radius_km must be 5, 10 or 20")

    try:
        owner_rows = get_supabase().rpc("get_post_detail", {"p_post_id": post_id}).execute().data or []
        if not owner_rows:
            raise HTTPException(404, "Post not found.")
        owner = owner_rows[0]
        if int(owner["owner_id"]) != user_id:
            raise HTTPException(403, "Only the post owner can start matching.")
        if owner["post_type"] != "LOST":
            raise HTTPException(422, "AI matching must be started from a LOST post.")

        effective_radius = radius_km or get_settings().match_default_radius_km
        matching_db = get_supabase_admin()
        results = match_post(matching_db, post_id, effective_radius)

        if radius_km is None and effective_radius == 5.0 and not results:
            results = match_post(matching_db, post_id, 10.0)
            effective_radius = 10.0
        if radius_km is None and effective_radius == 10.0 and not results:
            results = match_post(matching_db, post_id, 20.0)
            effective_radius = 20.0

    except HTTPException:
        raise
    except LookupError as exc:
        raise HTTPException(409, str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(503, "DINOv2 checkpoint is not configured on the backend.") from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except Exception as exc:
        logging.exception("AI matching failed for post_id=%s", post_id)
        raise HTTPException(500, "Matching operation failed.") from exc

    return {
        "post_id": post_id,
        "radius_km": effective_radius,
        "items": results,
        "message": "No candidate passed the current confidence threshold." if not results else None,
    }


@router.post("/posts/{post_id}/images/{image_id}/embedding")
async def create_image_embedding(
    post_id: int,
    image_id: int,
    image: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
):
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(415, "Only JPEG, PNG and WEBP images are supported.")

    data = await image.read(10 * 1024 * 1024 + 1)
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(413, "Image exceeds the 10 MB limit.")

    try:
        detail_rows = get_supabase().rpc("get_post_detail", {"p_post_id": post_id}).execute().data or []
        if not detail_rows:
            raise HTTPException(404, "Post not found.")
        owner = detail_rows[0]
        if int(owner["owner_id"]) != user_id:
            raise HTTPException(403, "Only the post owner can create an embedding.")

        image_rows = get_supabase().rpc("get_post_images", {"p_post_id": post_id}).execute().data or []
        selected = next((row for row in image_rows if int(row["image_id"]) == image_id), None)
        if selected is None:
            raise HTTPException(404, "Image does not belong to this post.")

        pil_image = Image.open(BytesIO(data)).convert("RGB")
        embedder = get_embedder(get_settings().dinov2_checkpoint)
        vector = await run_in_threadpool(embedder.embed, pil_image)

        if vector.shape != (512,):
            raise HTTPException(500, "DINOv2 embedding must have shape (512,).")
        if not np.isfinite(vector).all():
            raise HTTPException(500, "DINOv2 embedding contains invalid values.")

        vector = vector.astype("float32", copy=False)
        norm = float(np.linalg.norm(vector))
        if not (0.999 <= norm <= 1.001):
            raise HTTPException(500, "DINOv2 embedding is not L2-normalized.")

        settings = get_settings()
        hex_embedding = "\\x" + vector.tobytes().hex()
        get_supabase().rpc(
            "save_image_embedding",
            {
                "p_image_id": image_id,
                "p_model_name": settings.match_model_name,
                "p_model_version": settings.match_model_version,
                "p_embedding": hex_embedding,
                "p_dim": 512,
                "p_dtype": "float32",
            },
        ).execute()

    except HTTPException:
        raise
    except FileNotFoundError as exc:
        raise HTTPException(503, "DINOv2 checkpoint is not configured on the backend.") from exc
    except (OSError, ValueError) as exc:
        raise HTTPException(400, "Invalid image or embedding input.") from exc
    except Exception as exc:
        logging.exception("DINOv2 embedding generation failed")
        raise HTTPException(500, "Embedding generation failed.") from exc
    finally:
        await image.close()

    return {
        "image_id": image_id,
        "model_name": settings.match_model_name,
        "model_version": settings.match_model_version,
        "dim": 512,
        "dtype": "float32",
        "normalized": True,
    }
