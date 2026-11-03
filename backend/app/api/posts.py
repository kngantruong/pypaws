import io
import logging
import os
from pathlib import Path
from uuid import uuid4

import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from PIL import Image
from pydantic import BaseModel, Field

from app.core.auth import get_current_user_id
from app.core.config import get_settings
from app.core.database import get_supabase, get_supabase_admin
from app.schemas.post import PostCreate, PostDetail, PostListResponse
from app.services.matcher import match_post
from app.services.pet_embedding import get_embedder
from app.services.storage import load_image_bytes, upload_pet_image

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/posts", tags=["Posts"])


class LocationUpdate(BaseModel):
    location_text: str = Field(min_length=1, max_length=500)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


def _raise_rpc_error(exc: Exception) -> None:
    logger.exception("Supabase RPC/database operation failed")
    message = str(exc)
    if "check_violation" in message:
        raise HTTPException(status_code=400, detail=message)
    if "insufficient_privilege" in message:
        raise HTTPException(status_code=403, detail=message)
    if "no_data_found" in message:
        raise HTTPException(status_code=404, detail=message)
    raise HTTPException(status_code=500, detail="Database operation failed.")


@router.post("/upload-image")
async def upload_image(image: UploadFile = File(...), user_id: int = Depends(get_current_user_id)):
    """Upload pet photo to Supabase Storage with local cache fallback."""
    if not (image.content_type and image.content_type.startswith("image/")):
        raise HTTPException(415, "Only image files (JPEG, PNG, WEBP) are allowed.")

    content = await image.read()
    res = upload_pet_image(
        file_bytes=content,
        original_filename=image.filename or "pet.jpg",
        content_type=image.content_type,
    )
    return res


def _auto_embed_and_match(post_id: int, post_type: str, image_paths: list[str]) -> None:
    """Best-effort background embedding generation and matching for newly created posts."""
    try:
        supabase = get_supabase_admin()
        settings = get_settings()

        # 1. Fetch created post images to get primary image_id
        img_res = supabase.rpc("get_post_images", {"p_post_id": post_id}).execute()
        rows = img_res.data or []
        if not rows:
            return

        primary = next((r for r in rows if r.get("is_primary")), rows[0])
        image_id = int(primary["image_id"])
        image_rel_path = primary.get("image_path") or ""

        # 2. Resolve image bytes (local cache or Supabase Storage URL)
        try:
            img_bytes = load_image_bytes(image_rel_path)
            pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        except Exception as exc:
            logger.warning("Auto-embed: could not load image for post %s (%s): %s", post_id, image_rel_path, exc)
            return

        # 3. Generate 512D DINOv2 embedding
        embedder = get_embedder(settings.dinov2_checkpoint)
        vector = embedder.embed(pil_img)

        if vector.shape != (512,):
            logger.error("Auto-embed: unexpected vector shape %s", vector.shape)
            return

        vector = vector.astype("float32", copy=False)
        norm = float(np.linalg.norm(vector))
        if norm > 0:
            vector = vector / norm
        hex_embedding = "\\x" + vector.tobytes().hex()

        # 4. Save embedding to database
        supabase.rpc(
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
        logger.info("Auto-embed: generated and saved DINOv2 512D embedding for post %s, image %s", post_id, image_id)

        # 5. Run matching after either direction is posted.
        # LOST -> match against existing FOUND posts.
        # Keep automatic matching consistent with the manual web flow:
        # try the default radius first, then expand only when no candidate passes.
        radii = (5.0, 10.0, 20.0)
        if post_type == "LOST":
            total_results = []
            for radius_km in radii:
                total_results = match_post(supabase, post_id, radius_km)
                if total_results:
                    break
            logger.info(
                "Auto-embed: matching LOST post %s returned %d candidates at radius %.1f km",
                post_id,
                len(total_results),
                radius_km,
            )
        else:
            # FOUND -> refresh matching for existing active LOST posts of the same species.
            lost_rows = (
                supabase.rpc(
                    "get_posts",
                    {
                        "p_post_type": "LOST",
                        "p_species": None,
                        "p_status": "ACTIVE",
                        "p_page": 1,
                        "p_page_size": 100,
                        "p_after_post_id": None,
                    },
                ).execute().data
                or []
            )
            matched_count = 0
            # Fetch the new FOUND post's species once and only refresh same-species LOST posts.
            found_detail = supabase.rpc("get_post_detail", {"p_post_id": post_id}).execute().data or []
            found_species = found_detail[0].get("species") if found_detail else None
            for lost_post in lost_rows:
                if found_species and lost_post.get("species") != found_species:
                    continue
                try:
                    lost_id = int(lost_post["post_id"])
                    match_results = []
                    for radius_km in radii:
                        match_results = match_post(supabase, lost_id, radius_km)
                        if match_results:
                            break
                    matched_count += len(match_results)
                except Exception:
                    logger.exception(
                        "Auto-embed: matching LOST post %s against FOUND %s failed",
                        lost_post.get("post_id"),
                        post_id,
                    )
            logger.info("Auto-embed: refreshed %d candidate(s) for FOUND post %s", matched_count, post_id)

    except Exception:
        logger.exception("Auto-embed and match encountered an error for post %s (non-fatal)", post_id)


@router.post("", status_code=201)
def create_post(payload: PostCreate, user_id: int = Depends(get_current_user_id)):
    supabase = get_supabase()
    effective_user_id = user_id

    latitude = float(payload.latitude)
    longitude = float(payload.longitude)

    try:
        result = supabase.rpc(
            "create_post",
            {
                "p_user_id": effective_user_id,
                "p_post_type": payload.post_type,
                "p_species": payload.species,
                "p_description": payload.description,
                "p_event_time": payload.event_time.isoformat(),
                "p_location_text": payload.location_text,
                "p_image_paths": payload.image_paths,
                "p_gender": payload.gender,
                "p_breed": payload.breed,
                "p_coat_color": payload.coat_color,
                "p_appearance_notes": payload.appearance_notes,
                "p_latitude": latitude,
                "p_longitude": longitude,
                "p_cover_index": payload.cover_index,
                "p_data_source": payload.data_source,
            },
        ).execute()
    except Exception as exc:
        _raise_rpc_error(exc)

    if not result.data:
        raise HTTPException(status_code=500, detail="create_post returned no data.")

    row = result.data[0]
    new_post_id = int(row["new_post_id"])
    report_code = str(row["new_report_code"])

    # Auto-generate DINOv2 embedding and run matching
    _auto_embed_and_match(new_post_id, payload.post_type, payload.image_paths)

    return {
        "post_id": new_post_id,
        "report_code": report_code,
    }


@router.get("", response_model=PostListResponse)
def list_posts(
    post_type: str | None = Query(default=None, pattern="^(LOST|FOUND)$"),
    species: str | None = Query(default=None, pattern="^(DOG|CAT)$"),
    status: str | None = Query(default="ACTIVE", pattern="^(ACTIVE|RESOLVED|CANCELLED)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    after_post_id: int | None = Query(default=None, ge=1),
):
    try:
        result = get_supabase().rpc(
            "get_posts",
            {
                "p_post_type": post_type,
                "p_species": species,
                "p_status": status,
                "p_page": page,
                "p_page_size": page_size,
                "p_after_post_id": after_post_id,
            },
        ).execute()
    except Exception as exc:
        _raise_rpc_error(exc)

    rows = result.data or []
    total_count = int(rows[0]["total_count"]) if rows else 0

    return {
        "items": rows,
        "page": page,
        "page_size": page_size,
        "total_count": total_count,
    }


@router.get("/{post_id}", response_model=PostDetail)
def get_post(post_id: int):
    try:
        result = get_supabase().rpc("get_post_detail", {"p_post_id": post_id}).execute()
    except Exception as exc:
        _raise_rpc_error(exc)

    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Post not found.")
    return rows[0]


@router.get("/{post_id}/images")
def get_post_images(post_id: int):
    try:
        result = get_supabase().rpc("get_post_images", {"p_post_id": post_id}).execute()
    except Exception as exc:
        _raise_rpc_error(exc)
    return {"items": result.data or []}


@router.post("/{post_id}/cancel")
def cancel_post(post_id: int, user_id: int = Depends(get_current_user_id)):
    effective_user_id = user_id
    try:
        get_supabase().rpc("cancel_post", {"p_requester_id": effective_user_id, "p_post_id": post_id}).execute()
    except Exception as exc:
        _raise_rpc_error(exc)
    return {"status": "CANCELLED", "post_id": post_id}


@router.post("/{post_id}/resolve")
def resolve_post(
    post_id: int,
    candidate_id: int | None = None,
    source: str | None = None,
    user_id: int = Depends(get_current_user_id),
):
    effective_user_id = user_id
    try:
        get_supabase().rpc(
            "resolve_lost_post",
            {
                "p_requester_id": effective_user_id,
                "p_lost_post_id": post_id,
                "p_source": source,
                "p_candidate_id": candidate_id,
            },
        ).execute()
    except Exception as exc:
        _raise_rpc_error(exc)
    return {"status": "RESOLVED", "post_id": post_id}


@router.patch("/{post_id}/location")
def update_location(post_id: int, payload: LocationUpdate, user_id: int = Depends(get_current_user_id)):
    effective_user_id = user_id
    try:
        detail = get_supabase().rpc("get_post_detail", {"p_post_id": post_id}).execute().data or []
        if not detail:
            raise HTTPException(404, "Post not found.")
        if int(detail[0]["owner_id"]) != effective_user_id:
            raise HTTPException(403, "Only the post owner can update location.")

        result = (
            get_supabase()
            .table("posts")
            .update({
                "location_text": payload.location_text,
                "latitude": payload.latitude,
                "longitude": payload.longitude,
            })
            .eq("post_id", post_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(500, "Location update was not accepted by the database.")
    except HTTPException:
        raise
    except Exception as exc:
        _raise_rpc_error(exc)
    return {"status": "UPDATED", "post_id": post_id}