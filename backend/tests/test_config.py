from __future__ import annotations
import pytest
from app.core.config import get_settings

def test_settings_requires_database_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    get_settings.cache_clear()
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        get_settings()

def test_settings_reads_database_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://postgres:secret@localhost:5432/pypaws")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173, http://127.0.0.1:5173")
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.database_url.startswith("postgresql://")
    assert settings.cors_origins == ("http://localhost:5173", "http://127.0.0.1:5173")
