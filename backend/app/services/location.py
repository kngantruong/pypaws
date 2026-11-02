"""Geocoding, coordinate validation, distance and location scoring helpers."""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

import httpx


EARTH_RADIUS_KM = 6371.0088
GEO_MAX_DISTANCE_KM = 20.0


class LocationError(Exception):
    """Base error for location services."""


class GeocodingError(LocationError):
    """Raised when the geocoder cannot complete a request."""


@dataclass(frozen=True)
class GeocodedLocation:
    latitude: float
    longitude: float
    display_name: str
    precision: str = "address"


def validate_coordinates(latitude: float | None, longitude: float | None) -> None:
    if latitude is None and longitude is None:
        return
    if latitude is None or longitude is None:
        raise ValueError("latitude and longitude must be provided together")
    if not -90.0 <= float(latitude) <= 90.0:
        raise ValueError("latitude must be between -90 and 90")
    if not -180.0 <= float(longitude) <= 180.0:
        raise ValueError("longitude must be between -180 and 180")


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    validate_coordinates(lat1, lon1)
    validate_coordinates(lat2, lon2)
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def distance_label(distance_km: float | None) -> str:
    if distance_km is None:
        return "unknown"
    if distance_km <= 1:
        return "very_near"
    if distance_km <= 3:
        return "near"
    if distance_km <= 5:
        return "suitable"
    if distance_km <= 10:
        return "expanded"
    return "far"


def location_score(distance_km: float | None) -> float | None:
    """Linear proximity score: max(0, 1 - distance_km / 20 km)."""
    if distance_km is None:
        return None
    return max(0.0, 1.0 - float(distance_km) / GEO_MAX_DISTANCE_KM)


class NominatimGeocoder:
    """Small configurable Nominatim client for MVP geocoding.

    Nominatim's public service is rate-limited and intended for light use.
    The URL and User-Agent are configurable so production can switch provider
    without changing the API contract. No API key is embedded in code.
    """

    def __init__(self, base_url: str, user_agent: str, timeout_seconds: float = 8.0):
        self.base_url = base_url.rstrip("/")
        self.user_agent = user_agent
        self.timeout = httpx.Timeout(timeout_seconds)

    def geocode(self, address: str) -> GeocodedLocation | None:
        if not address.strip():
            return None
        try:
            response = httpx.get(
                f"{self.base_url}/search",
                params={"q": address.strip(), "format": "jsonv2", "limit": 1, "addressdetails": 1},
                headers={"User-Agent": self.user_agent},
                timeout=self.timeout,
            )
        except httpx.HTTPError as exc:
            raise GeocodingError("Geocoding service is unavailable") from exc
        if response.status_code == 429:
            raise GeocodingError("Geocoding rate limit exceeded")
        if response.status_code >= 500:
            raise GeocodingError("Geocoding service is unavailable")
        if response.status_code != 200:
            raise GeocodingError(f"Geocoding request failed with status {response.status_code}")
        try:
            rows: list[dict[str, Any]] = response.json()
        except ValueError as exc:
            raise GeocodingError("Geocoding service returned invalid data") from exc
        if not rows:
            return None
        try:
            lat = float(rows[0]["lat"])
            lon = float(rows[0]["lon"])
        except (KeyError, TypeError, ValueError) as exc:
            raise GeocodingError("Geocoding service returned invalid coordinates") from exc
        validate_coordinates(lat, lon)
        address_data = rows[0].get("address") or {}
        precision = "address"
        if not address_data.get("house_number"):
            precision = "area"
        return GeocodedLocation(lat, lon, str(rows[0].get("display_name") or address), precision)
