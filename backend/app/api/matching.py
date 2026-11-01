from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import get_current_user_id
from app.core.config import get_settings
from app.core.database import get_supabase
from app.services.matcher import match_post

router = APIRouter(prefix="/matching", tags=["AI Matching"])


@router.post("/posts/{post_id}")
def run_matching(
    post_id: int,
    radius_km: float = Query(default=None, description="MVP radius: 5, 10 or 20 km"),
    user_id: int = Depends(get_current_user_id),
):
    # Ownership is checked before any candidate search or embedding work.
    if radius_km is not None and radius_km not in (5.0, 10.0, 20.0):
        raise HTTPException(422, "radius_km must be 5, 10 or 20")
    try:
        owner_rows = get_supabase().rpc("get_post_detail", {"p_post_id": post_id}).execute().data or []
        if not owner_rows:
            raise HTTPException(404, "Post not found.")
        if int(owner_rows[0]["owner_id"]) != user_id:
            raise HTTPException(403, "Only the post owner can start matching.")
        effective_radius = radius_km or get_settings().match_default_radius_km
        results = match_post(get_supabase(), post_id, effective_radius)
        if radius_km is None and effective_radius == 5.0 and not results:
            results = match_post(get_supabase(), post_id, 10.0)
            effective_radius = 10.0
        if radius_km is None and effective_radius == 10.0 and not results:
            results = match_post(get_supabase(), post_id, 20.0)
            effective_radius = 20.0
    except LookupError as exc:
        raise HTTPException(409, str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(503, "DINOv2 checkpoint is not configured on the backend.") from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(500, "Matching operation failed.") from exc
    return {
        "post_id": post_id,
        "radius_km": effective_radius,
        "items": results,
    }
