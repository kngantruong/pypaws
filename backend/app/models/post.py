from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass
class Post:
    post_id: int
    report_code: str
    post_type: str
    species: str
    gender: str | None
    breed: str | None
    coat_color: str | None
    appearance_notes: str | None
    description: str
    event_time: datetime
    latitude: Decimal | None
    longitude: Decimal | None
    location_text: str | None
    status: str
    created_at: datetime
    owner_id: int
    owner_name: str
    primary_image: str | None = None
    total_count: int = 0
