from __future__ import annotations

import pytest

from app.core.config import get_settings


def _set_required_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")


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
    _set_required_env(monkeypatch)
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co/")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173, http://127.0.0.1:5173")
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.supabase_url == "https://example.supabase.co"
    assert settings.supabase_publishable_key == "sb_publishable_test"
    assert settings.cors_origins == ("http://localhost:5173", "http://127.0.0.1:5173")
    assert settings.match_model_name == "dinov2_finetuned"


def test_settings_default_top_k_is_five(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required_env(monkeypatch)
    monkeypatch.delenv("MATCH_TOP_K", raising=False)
    get_settings.cache_clear()

    assert get_settings().match_top_k == 5


def test_settings_reject_non_positive_top_k(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required_env(monkeypatch)
    monkeypatch.setenv("MATCH_TOP_K", "0")
    get_settings.cache_clear()

    with pytest.raises(RuntimeError, match="MATCH_TOP_K must be at least 1"):
        get_settings()


@pytest.mark.parametrize("model_name", ["dinov2_pretrained", "dinov2_finetuned"])
def test_settings_accept_database_model_names(monkeypatch: pytest.MonkeyPatch, model_name: str) -> None:
    _set_required_env(monkeypatch)
    monkeypatch.setenv("MATCH_MODEL_NAME", model_name)
    get_settings.cache_clear()

    assert get_settings().match_model_name == model_name


def test_settings_reject_model_name_not_allowed_by_database(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required_env(monkeypatch)
    monkeypatch.setenv("MATCH_MODEL_NAME", "dinov3")
    get_settings.cache_clear()

    with pytest.raises(RuntimeError, match="MATCH_MODEL_NAME must be one of"):
        get_settings()
