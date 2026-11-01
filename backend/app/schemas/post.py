from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PostCreate(BaseModel):
    user_id: int = Field(gt=0)
    post_type: str = Field(pattern="^(LOST|FOUND)$")
    species: str = Field(pattern="^(DOG|CAT)$")
    description: str = Field(min_length=1)
    event_time: datetime
    location_text: str = Field(min_length=1)
    image_paths: list[str] = Field(min_length=1, max_length=6)
    cover_index: int = Field(default=0, ge=0, le=5)
    gender: str | None = None
    breed: str | None = None
    coat_color: str | None = None
    appearance_notes: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    data_source: str = "USER"


class PostSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    post_id: int
    report_code: str
    post_type: str
    species: str
    gender: str | None = None
    breed: str | None = None
    coat_color: str | None = None
    appearance_notes: str | None = None
    description: str
    event_time: datetime
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    location_text: str | None = None
    status: str
    created_at: datetime
    owner_id: int
    owner_name: str
    primary_image: str | None = None
    total_count: int


class PostDetail(BaseModel):
    post_id: int
    report_code: str
    post_type: str
    species: str
    gender: str | None = None
    breed: str | None = None
    coat_color: str | None = None
    appearance_notes: str | None = None
    description: str
    event_time: datetime
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    location_text: str | None = None
    status: str
    resolved_at: datetime | None = None
    data_source: str
    created_at: datetime
    owner_id: int
    owner_name: str


class PostImage(BaseModel):
    image_id: int
    post_id: int
    image_path: str
    is_primary: bool
    sort_order: int
    created_at: datetime


class PostListResponse(BaseModel):
    items: list[PostSummary]
    page: int
    page_size: int
    total_count: int
