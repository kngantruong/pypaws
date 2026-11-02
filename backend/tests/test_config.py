from __future__ import annotations

import pytest

from app.core.config import get_settings


def test_settings_require_supabase_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_PUBLISHABLE_KEY", raising=False)
    get_settings.cache_clear()

    with pytest.raises(RuntimeError, match="SUPABASE_URL"):
        get_settings()


def test_settings_require_publishable_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.delenv("SUPABASE_PUBLISHABLE_KEY", raising=False)
    get_settings.cache_clear()

    with pytest.raises(RuntimeError, match="SUPABASE_PUBLISHABLE_KEY"):
        get_settings()


def test_settings_read_supabase_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co/")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173, http://127.0.0.1:5173")
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.supabase_url == "https://example.supabase.co"
    assert settings.supabase_publishable_key == "sb_publishable_test"
    assert settings.cors_origins == ("http://localhost:5173", "http://127.0.0.1:5173")



def test_settings_default_top_k_is_ten(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    monkeypatch.delenv("MATCH_TOP_K", raising=False)
    get_settings.cache_clear()

    assert get_settings().match_top_k == 10


def test_settings_reject_non_positive_top_k(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    monkeypatch.setenv("MATCH_TOP_K", "0")
    get_settings.cache_clear()

    with pytest.raises(RuntimeError, match="MATCH_TOP_K must be at least 1"):
        get_settings()
