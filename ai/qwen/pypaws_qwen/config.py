"""Đọc cấu hình từ biến môi trường."""
from __future__ import annotations
 
import os
from dataclasses import dataclass, field
 
from .errors import QwenConfigError
 
try:
    from dotenv import load_dotenv
    from pathlib import Path

    ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=ENV_PATH)
except ImportError:
    pass
 
DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"

def _int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        raise QwenConfigError(f"Biến môi trường {name} phải là số nguyên, hiện là {raw!r}")
 
 
def _float(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        raise QwenConfigError(f"Biến môi trường {name} phải là số, hiện là {raw!r}")
 
 
def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")
 

KEY_ENV_NAMES = ("QWEN_API_KEY", "OPENROUTER_API_KEY", "DASHSCOPE_API_KEY")
 
 
def _api_key() -> str:
    for name in KEY_ENV_NAMES:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""
 
 
@dataclass(frozen=True)
class Settings:
    api_key: str = field(repr=False)          # repr=False: không lộ khóa khi in log
    base_url: str
    model: str
    timeout: float
    max_retries: int
    max_tokens: int
    max_image_bytes: int
    max_image_pixels: int
    image_max_side: int
    disable_thinking: bool
    fallback_models: tuple = ()      # OpenRouter: mô hình dự phòng khi mô hình chính lỗi hoặc bị giới hạn
 
 
def is_configured() -> bool:
    """Đủ cấu hình tối thiểu (có khóa và có tên mô hình) để gọi API."""
    return bool(_api_key()) and bool(os.getenv("QWEN_MODEL", "").strip())
 
 
def load_settings() -> Settings:
    api_key = _api_key()
    if not api_key:
        raise QwenConfigError("Thiếu khóa API: đặt một trong các biến " + ", ".join(KEY_ENV_NAMES))
    model = os.getenv("QWEN_MODEL", "").strip()
    if not model:
        raise QwenConfigError("Thiếu biến môi trường QWEN_MODEL (chạy scripts/list_free_vision_models.py để chọn mô hình)")
    return Settings(
        api_key=api_key,
        base_url=os.getenv("QWEN_BASE_URL", "").strip() or DEFAULT_BASE_URL,
        model=model,
        timeout=_float("QWEN_TIMEOUT_SECONDS", 60.0),
        max_retries=_int("QWEN_MAX_RETRIES", 2),
        max_tokens=_int("QWEN_MAX_TOKENS", 450),
        max_image_bytes=_int("QWEN_MAX_IMAGE_MB", 10) * 1024 * 1024,
        max_image_pixels=_int("QWEN_MAX_IMAGE_PIXELS", 40_000_000),
        image_max_side=_int("QWEN_IMAGE_MAX_SIDE", 1024),
        disable_thinking=_bool("QWEN_DISABLE_THINKING", False),
        fallback_models=tuple(m.strip() for m in os.getenv("QWEN_FALLBACK_MODELS", "").split(",") if m.strip()),
    )
