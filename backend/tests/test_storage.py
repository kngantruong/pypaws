from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.services.storage import load_image_bytes, upload_pet_image


def test_upload_pet_image_local_fallback(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))
    from app.core.config import get_settings
    get_settings.cache_clear()

    dummy_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF"
    res = upload_pet_image(
        file_bytes=dummy_bytes,
        original_filename="my_cat.jpg",
        content_type="image/jpeg",
    )

    assert res["filename"].endswith(".jpg")
    assert res["url"] is not None
    # Check that file was saved to upload_dir
    saved = tmp_path / res["filename"]
    assert saved.exists()
    assert saved.read_bytes() == dummy_bytes


def test_upload_pet_image_with_supabase_success(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))
    from app.core.config import get_settings
    get_settings.cache_clear()

    mock_sb = MagicMock()
    mock_from = MagicMock()
    mock_sb.storage.from_.return_value = mock_from
    mock_from.upload.return_value = {"Key": "pet-images/test.jpg"}
    mock_from.get_public_url.return_value = "https://example.supabase.co/storage/v1/object/public/pet-images/test.jpg"

    with patch("app.services.storage.get_supabase_admin", return_value=mock_sb):
        res = upload_pet_image(
            file_bytes=b"fake-image-bytes",
            original_filename="test.png",
            content_type="image/png",
        )

    assert res["storage"] == "supabase"
    assert "https://example.supabase.co" in res["url"]
    assert res["bucket"] == "pet-images"


def test_load_image_bytes_local(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))
    test_file = tmp_path / "sample.jpg"
    test_file.write_bytes(b"sample-data")

    data = load_image_bytes(str(test_file))
    assert data == b"sample-data"
