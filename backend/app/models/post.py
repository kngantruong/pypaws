from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass
class Post:
    post_id: int
    report_code: str
    post_type: str
    species: str
    description: str
    event_time: datetime
    location_text: str
    status: str
    created_at: datetime
    owner_id: int
    owner_name: str

    gender: str | None = None
    breed: str | None = None
    coat_color: str | None = None
    appearance_notes: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    primary_image: str | None = None