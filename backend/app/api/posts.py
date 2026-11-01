from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, model_validator

from app.core.database import get_supabase
from app.core.config import get_settings
from app.core.auth import get_current_user_id
from app.schemas.post import PostCreate, PostDetail, PostListResponse
from app.services.location import GeocodingError, NominatimGeocoder

router = APIRouter(prefix="/posts", tags=["Posts"])


class LocationUpdate(BaseModel):
    location_text: str = Field(min_length=1, max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @model_validator(mode="after")
    def validate_pair(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be provided together")
        return self


def _raise_rpc_error(exc: Exception) -> None:
    message = str(exc)
    if "check_violation" in message:
        raise HTTPException(status_code=400, detail=message)
    if "insufficient_privilege" in message:
        raise HTTPException(status_code=403, detail=message)
    if "no_data_found" in message:
        raise HTTPException(status_code=404, detail=message)
    raise HTTPException(status_code=500, detail="Database operation failed.")


@router.post("", status_code=201)
def create_post(payload: PostCreate, user_id: int = Depends(get_current_user_id)):
    supabase = get_supabase()
    latitude, longitude = payload.latitude, payload.longitude
    if latitude is None and longitude is None:
        settings = get_settings()
        try:
            geocoded = NominatimGeocoder(
                settings.geocoder_base_url, settings.geocoder_user_agent, settings.geocoder_timeout_seconds
            ).geocode(payload.location_text)
            if geocoded is not None:
                latitude, longitude = geocoded.latitude, geocoded.longitude
        except GeocodingError:
            pass

    try:
        result = supabase.rpc("create_post", {
            "p_user_id": user_id,
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
        }).execute()
    except Exception as exc:
        _raise_rpc_error(exc)

    if not result.data:
        raise HTTPException(500, "create_post returned no data.")
    row = result.data[0]
    return {"post_id": row["new_post_id"], "report_code": row["new_report_code"]}


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
        result = get_supabase().rpc("get_posts", {
            "p_post_type": post_type, "p_species": species, "p_status": status,
            "p_page": page, "p_page_size": page_size, "p_after_post_id": after_post_id,
        }).execute()
    except Exception as exc:
        _raise_rpc_error(exc)

    rows = result.data or []
    total_count = int(rows[0]["total_count"]) if rows else 0
    return {"items": rows, "page": page, "page_size": page_size, "total_count": total_count}


@router.get("/{post_id}", response_model=PostDetail)
def get_post(post_id: int):
    try:
        result = get_supabase().rpc("get_post_detail", {"p_post_id": post_id}).execute()
    except Exception as exc:
        _raise_rpc_error(exc)
    rows = result.data or []
    if not rows:
        raise HTTPException(404, "Post not found.")
    return rows[0]


@router.post("/{post_id}/cancel")
def cancel_post(post_id: int, user_id: int = Depends(get_current_user_id)):
    try:
        get_supabase().rpc("cancel_post", {"p_requester_id": user_id, "p_post_id": post_id}).execute()
    except Exception as exc:
        _raise_rpc_error(exc)
    return {"status": "CANCELLED", "post_id": post_id}


@router.post("/{post_id}/resolve")
def resolve_post(post_id: int, candidate_id: int | None = None, source: str | None = None,
                 user_id: int = Depends(get_current_user_id)):
    try:
        get_supabase().rpc("resolve_lost_post", {
            "p_requester_id": user_id, "p_lost_post_id": post_id,
            "p_source": source, "p_candidate_id": candidate_id,
        }).execute()
    except Exception as exc:
        _raise_rpc_error(exc)
    return {"status": "RESOLVED", "post_id": post_id}


@router.get("/{post_id}/images")
def get_post_images(post_id: int):
    try:
        result = get_supabase().rpc("get_post_images", {"p_post_id": post_id}).execute()
    except Exception as exc:
        _raise_rpc_error(exc)
    return {"items": result.data or []}


@router.patch("/{post_id}/location")
def update_location(post_id: int, payload: LocationUpdate, user_id: int = Depends(get_current_user_id)):
    """Update location through the existing posts table; no new SQL function is required."""
    latitude, longitude = payload.latitude, payload.longitude
    if latitude is None and longitude is None:
        settings = get_settings()
        try:
            geocoded = NominatimGeocoder(
                settings.geocoder_base_url, settings.geocoder_user_agent, settings.geocoder_timeout_seconds
            ).geocode(payload.location_text)
            if geocoded is not None:
                latitude, longitude = geocoded.latitude, geocoded.longitude
        except GeocodingError:
            pass

    try:
        detail = get_supabase().rpc("get_post_detail", {"p_post_id": post_id}).execute().data or []
        if not detail:
            raise HTTPException(404, "Post not found.")
        if int(detail[0]["owner_id"]) != user_id:
            raise HTTPException(403, "Only the post owner can update location.")

        result = get_supabase().table("posts").update({
            "location_text": payload.location_text,
            "latitude": latitude,
            "longitude": longitude,
        }).eq("post_id", post_id).execute()
        if not result.data:
            raise HTTPException(500, "Location update was not accepted by the database.")
    except HTTPException:
        raise
    except Exception as exc:
        _raise_rpc_error(exc)

    return {"post_id": post_id, "location_text": payload.location_text,
            "latitude": latitude, "longitude": longitude}
