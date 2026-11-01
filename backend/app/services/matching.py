"""Business scoring rules for LOST/FOUND matching."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MatchingWeights:
    image: float = 0.65
    appearance: float = 0.15
    location: float = 0.10
    time: float = 0.10

    def __post_init__(self) -> None:
        total = self.image + self.appearance + self.location + self.time
        if abs(total - 1.0) > 1e-9:
            raise ValueError("matching weights must sum to 1.0")


def normalize_image_score(cosine_similarity: float) -> float:
    """Map cosine similarity [-1,1] to a bounded business score [0,1]."""
    return max(0.0, min(1.0, (float(cosine_similarity) + 1.0) / 2.0))


def passes_image_threshold(cosine_similarity: float, minimum: float = 0.60) -> bool:
    return float(cosine_similarity) >= minimum


def image_priority(cosine_similarity: float, review: float = 0.70, high: float = 0.80) -> str:
    score = float(cosine_similarity)
    if score < 0.60:
        return "exclude"
    if score < review:
        return "low"
    if score < high:
        return "review"
    return "high"


def weighted_score(
    image_score: float,
    appearance_score: float | None,
    location_score_value: float | None,
    time_score: float | None,
    weights: MatchingWeights = MatchingWeights(),
) -> float:
    """Compute 0..1 score and renormalize weights when optional signals are missing."""
    values = {
        "image": image_score,
        "appearance": appearance_score,
        "location": location_score_value,
        "time": time_score,
    }
    weight_map = {
        "image": weights.image,
        "appearance": weights.appearance,
        "location": weights.location,
        "time": weights.time,
    }
    usable = {k: v for k, v in values.items() if v is not None}
    if not usable:
        return 0.0
    total_weight = sum(weight_map[k] for k in usable)
    return sum(float(usable[k]) * weight_map[k] for k in usable) / total_weight


def radius_sequence(default_km: float = 5.0) -> tuple[float, ...]:
    if default_km not in (5.0, 10.0, 20.0):
        raise ValueError("MVP radius must be 5, 10 or 20 km")
    return tuple(radius for radius in (5.0, 10.0, 20.0) if radius >= default_km)
