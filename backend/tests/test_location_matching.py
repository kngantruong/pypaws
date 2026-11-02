import math

import httpx
import pytest

from app.schemas.post import PostCreate
from app.services.location import GeocodingError, NominatimGeocoder

from app.services.location import distance_label, haversine_km, location_score, validate_coordinates
from app.services.matching import image_priority, passes_image_threshold, select_top_k, weighted_score


def test_haversine_zero_distance():
    assert haversine_km(10.0, 106.0, 10.0, 106.0) == pytest.approx(0.0)


def test_haversine_known_delta():
    assert haversine_km(0.0, 0.0, 0.0, 1.0) == pytest.approx(111.195, rel=1e-4)


@pytest.mark.parametrize("lat,lon", [(91, 0), (-91, 0), (0, 181), (0, -181)])
def test_invalid_coordinates(lat, lon):
    with pytest.raises(ValueError):
        validate_coordinates(lat, lon)


def test_partial_coordinates_rejected():
    with pytest.raises(ValueError):
        validate_coordinates(10, None)


def test_distance_labels_and_scores():
    assert distance_label(0.5) == "very_near"
    assert distance_label(2) == "near"
    assert distance_label(4) == "suitable"
    assert distance_label(8) == "expanded"
    assert distance_label(15) == "far"
    assert location_score(None) is None


def test_finetuned_image_thresholds():
    assert not passes_image_threshold(0.2519)
    assert passes_image_threshold(0.252)
    assert image_priority(0.65) == "low"
    assert image_priority(0.75) == "review"
    assert image_priority(0.85) == "high"


def test_missing_location_is_renormalized_not_zero():
    score = weighted_score(0.8, 0.8, None)
    assert score == pytest.approx(0.8)


def test_missing_optional_signals_do_not_destroy_image_score():
    assert weighted_score(0.9, None, None) == pytest.approx(0.9)


def test_post_create_rejects_partial_coordinates():
    with pytest.raises(ValueError):
        PostCreate(
            post_type="LOST", species="DOG", description="x",
            event_time="2026-11-01T10:00:00Z", location_text="District 1",
            image_paths=["x.jpg"], latitude=10.0,
        )


def test_geocoder_returns_none_when_address_not_found(monkeypatch):
    class Response:
        status_code = 200
        def json(self):
            return []

    monkeypatch.setattr(httpx, "get", lambda *args, **kwargs: Response())
    result = NominatimGeocoder("https://example.test", "PyPaws/test").geocode("unknown address")
    assert result is None


def test_geocoder_raises_on_rate_limit(monkeypatch):
    class Response:
        status_code = 429
        def json(self):
            return []

    monkeypatch.setattr(httpx, "get", lambda *args, **kwargs: Response())
    with pytest.raises(GeocodingError):
        NominatimGeocoder("https://example.test", "PyPaws/test").geocode("rate limited")



def test_select_top_k_returns_highest_scores_in_descending_order():
    candidates = [
        {"post_id": 1, "final_score": 42.0},
        {"post_id": 2, "final_score": 91.0},
        {"post_id": 3, "final_score": 67.0},
        {"post_id": 4, "final_score": 83.0},
        {"post_id": 5, "final_score": 55.0},
        {"post_id": 6, "final_score": 78.0},
    ]
    selected = select_top_k(candidates, 5)
    assert [item["post_id"] for item in selected] == [2, 4, 6, 3, 5]


def test_select_top_k_returns_available_candidates_when_fewer_than_k():
    candidates = [{"post_id": 1, "final_score": 42.0}, {"post_id": 2, "final_score": 91.0}]
    assert [item["post_id"] for item in select_top_k(candidates, 5)] == [2, 1]


def test_select_top_k_rejects_non_positive_k():
    with pytest.raises(ValueError, match="k must be at least 1"):
        select_top_k([], 0)
