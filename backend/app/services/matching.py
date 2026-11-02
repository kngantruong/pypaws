"""Business scoring rules for LOST/FOUND matching."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MatchingWeights:
    """Only the three approved matching signals are used in the final score."""

    image: float = 0.60
    location: float = 0.25
    time: float = 0.15

    def __post_init__(self) -> None:
        total = self.image + self.location + self.time
        if abs(total - 1.0) > 1e-9:
            raise ValueError("matching weights must sum to 1.0")


def normalize_image_score(cosine_similarity: float) -> float:
    """Use normalized DINOv2 cosine similarity directly as a 0..1 score."""
    return max(0.0, min(1.0, float(cosine_similarity)))


def passes_image_threshold(cosine_similarity: float, minimum: float = 0.252) -> bool:
    """Apply the verification-set operating threshold to cosine similarity."""
    return float(cosine_similarity) >= minimum


def image_priority(
    cosine_similarity: float,
    minimum: float = 0.252,
    review: float = 0.70,
    high: float = 0.80,
) -> str:
    score = float(cosine_similarity)
    if score < minimum:
        return "exclude"
    if score < review:
        return "low"
    if score < high:
        return "review"
    return "high"


def weighted_score(
    image_score: float,
    location_score_value: float | None,
    time_score: float | None,
    weights: MatchingWeights = MatchingWeights(),
) -> float:
    """Compute the weighted score, renormalizing only when a signal is missing."""
    values = {
        "image": image_score,
        "location": location_score_value,
        "time": time_score,
    }
    weight_map = {
        "image": weights.image,
        "location": weights.location,
        "time": weights.time,
    }
    usable = {key: value for key, value in values.items() if value is not None}
    if not usable:
        return 0.0
    total_weight = sum(weight_map[key] for key in usable)
    return sum(float(usable[key]) * weight_map[key] for key in usable) / total_weight


def radius_sequence(default_km: float = 5.0) -> tuple[float, ...]:
    if default_km not in (5.0, 10.0, 20.0):
        raise ValueError("MVP radius must be 5, 10 or 20 km")
    return tuple(radius for radius in (5.0, 10.0, 20.0) if radius >= default_km)
