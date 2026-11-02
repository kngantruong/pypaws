"""Integration tests for the local DINOv2 PetFace embedder."""
from pathlib import Path
import sys

import numpy as np
import pytest
from PIL import Image

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = BACKEND_DIR.parent
AI_DIR = REPO_DIR / "ai" / "dinov2_petface"
MODEL_PATH = AI_DIR / "dinov2_petface_ft.pt"

TEST_IMAGE_CANDIDATES = (
    BACKEND_DIR / "test_images" / "cat_same_1.jpg",
    REPO_DIR / "test_images" / "cat_same_1.jpg",
)

sys.path.insert(0, str(AI_DIR))
from embedder import PetFaceEmbedder  # noqa: E402


def _get_test_image_path() -> Path:
    for path in TEST_IMAGE_CANDIDATES:
        if path.exists():
            return path
    return TEST_IMAGE_CANDIDATES[0]


@pytest.fixture(scope="module")
def embedder():
    if not MODEL_PATH.exists():
        pytest.skip("DINOv2 checkpoint is not present in this checkout.")
    return PetFaceEmbedder(ckpt_path=str(MODEL_PATH), device="cpu")


def test_petface_embedder_returns_normalized_512d_vector(embedder):
    image_path = _get_test_image_path()
    if not image_path.exists():
        pytest.skip(f"Test image is not present: {image_path}")

    with Image.open(image_path) as image:
        vector = embedder.embed(image.convert("RGB"))

    assert vector.shape == (512,)
    assert vector.dtype == np.float32
    assert np.isfinite(vector).all()
    assert np.isclose(np.linalg.norm(vector), 1.0, atol=1e-4)


def test_petface_embedder_is_deterministic_for_same_image(embedder):
    image_path = _get_test_image_path()
    if not image_path.exists():
        pytest.skip(f"Test image is not present: {image_path}")

    with Image.open(image_path) as image:
        image = image.convert("RGB")
        first = embedder.embed(image)
        second = embedder.embed(image)

    assert np.allclose(first, second, atol=1e-5)
    assert np.isclose(float(np.dot(first, second)), 1.0, atol=1e-4)
