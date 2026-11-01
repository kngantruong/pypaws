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
    # The database function is responsible for verifying post ownership.
    # user_id is intentionally required at the API boundary even though the
    # matching RPC itself only receives the post id.
    if radius_km is not None and radius_km not in (5.0, 10.0, 20.0):
        raise HTTPException(422, "radius_km must be 5, 10 or 20")
    try:
        results = match_post(get_supabase(), post_id, radius_km)
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
        "radius_km": radius_km or get_settings().match_default_radius_km,
        "items": results,
    }
