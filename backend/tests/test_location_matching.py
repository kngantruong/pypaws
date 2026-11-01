import math

import pytest

from app.services.location import distance_label, haversine_km, location_score, validate_coordinates
from app.services.matching import image_priority, passes_image_threshold, weighted_score


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


def test_business_image_thresholds():
    assert not passes_image_threshold(0.599)
    assert passes_image_threshold(0.60)
    assert image_priority(0.65) == "low"
    assert image_priority(0.75) == "review"
    assert image_priority(0.85) == "high"


def test_missing_location_is_renormalized_not_zero():
    score = weighted_score(0.8, 0.8, None, 0.8)
    assert score == pytest.approx(0.8)


def test_missing_optional_signals_do_not_destroy_image_score():
    assert weighted_score(0.9, None, None, None) == pytest.approx(0.9)
