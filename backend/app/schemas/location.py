from pydantic import BaseModel, Field


class GeocodeRequest(BaseModel):
    address: str = Field(min_length=2, max_length=500)


class GeocodeResponse(BaseModel):
    found: bool
    latitude: float | None = None
    longitude: float | None = None
    display_name: str | None = None
    precision: str | None = None


class DistanceRequest(BaseModel):
    origin_latitude: float
    origin_longitude: float
    target_latitude: float
    target_longitude: float


class DistanceResponse(BaseModel):
    distance_km: float
    location_label: str
    location_score: float
