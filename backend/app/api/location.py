from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.schemas.location import DistanceRequest, DistanceResponse, GeocodeRequest, GeocodeResponse
from app.services.location import GeocodingError, NominatimGeocoder, distance_label, haversine_km, location_score, validate_coordinates

router = APIRouter(prefix="/location", tags=["Location"])


def _geocoder() -> NominatimGeocoder:
    settings = get_settings()
    return NominatimGeocoder(settings.geocoder_base_url, settings.geocoder_user_agent, settings.geocoder_timeout_seconds)


@router.post("/geocode", response_model=GeocodeResponse)
def geocode(payload: GeocodeRequest):
    try:
        result = _geocoder().geocode(payload.address)
    except GeocodingError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if result is None:
        return GeocodeResponse(found=False)
    return GeocodeResponse(found=True, latitude=result.latitude, longitude=result.longitude,
                            display_name=result.display_name, precision=result.precision)


@router.post("/distance", response_model=DistanceResponse)
def distance(payload: DistanceRequest):
    try:
        validate_coordinates(payload.origin_latitude, payload.origin_longitude)
        validate_coordinates(payload.target_latitude, payload.target_longitude)
        km = haversine_km(payload.origin_latitude, payload.origin_longitude,
                          payload.target_latitude, payload.target_longitude)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return DistanceResponse(distance_km=round(km, 3), location_label=distance_label(km),
                            location_score=location_score(km) or 0.0)
