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
SAMPLE_DIR = REPO_DIR / "frontend" / "src" / "assets" / "sample_test_images"

TEST_IMAGES = {
    "cat_same_1": SAMPLE_DIR / "cat_same_1.jpg",
    "cat_same_2": SAMPLE_DIR / "cat_same_2.jpg",
    "cat_diff": SAMPLE_DIR / "cat_diff.jpg",
    "dog_same_1": SAMPLE_DIR / "dog_same_1.jpg",
    "dog_same_2": SAMPLE_DIR / "dog_same_2.jpg",
    "dog_diff": SAMPLE_DIR / "dog_diff.jpg",
}

sys.path.insert(0, str(AI_DIR))
from embedder import PetFaceEmbedder  # noqa: E402


@pytest.fixture(scope="module")
def embedder():
    if not MODEL_PATH.exists():
        pytest.skip("DINOv2 checkpoint is not present in this checkout.")
    return PetFaceEmbedder(ckpt_path=str(MODEL_PATH), device="cpu")


@pytest.fixture(scope="module")
def embeddings(embedder):
    result = {}
    missing = []

    for name, path in TEST_IMAGES.items():
        if not path.exists():
            missing.append(str(path))
            continue

        with Image.open(path) as image:
            result[name] = embedder.embed(image.convert("RGB"))

    if missing:
        pytest.fail("Missing DINOv2 sample images:\n" + "\n".join(missing))

    return result


def _assert_valid_embedding(vector):
    assert vector.shape == (512,)
    assert vector.dtype == np.float32
    assert np.isfinite(vector).all()
    assert np.isclose(np.linalg.norm(vector), 1.0, atol=1e-4)


def _cosine(first, second):
    return float(np.dot(first, second))


def test_petface_embedder_returns_valid_512d_vectors(embeddings):
    for name, vector in embeddings.items():
        _assert_valid_embedding(vector), name


def test_petface_embedder_is_deterministic_for_same_image(embedder):
    image_path = TEST_IMAGES["cat_same_1"]

    with Image.open(image_path) as image:
        image = image.convert("RGB")
        first = embedder.embed(image)
        second = embedder.embed(image)

    assert np.allclose(first, second, atol=1e-5)
    assert np.isclose(_cosine(first, second), 1.0, atol=1e-4)


def test_petface_sample_similarity_pairs(embeddings):
    scores = {
        "cat_same": _cosine(embeddings["cat_same_1"], embeddings["cat_same_2"]),
        "cat_diff": _cosine(embeddings["cat_same_1"], embeddings["cat_diff"]),
        "dog_same": _cosine(embeddings["dog_same_1"], embeddings["dog_same_2"]),
        "dog_diff": _cosine(embeddings["dog_same_1"], embeddings["dog_diff"]),
    }

    print("\nDINOv2 PetFace cosine similarity:")
    for label, score in scores.items():
        print(f"  {label:>9}: {score:.6f}")

    assert all(-1.0 <= score <= 1.0 for score in scores.values())
    assert scores["cat_same"] > scores["cat_diff"]
    assert scores["dog_same"] > scores["dog_diff"]
