"""Đọc cấu hình từ biến môi trường. Khóa API KHÔNG bao giờ được ghi trong code hoặc commit lên git."""
from __future__ import annotations

import os
from dataclasses import dataclass, field

from .errors import QwenConfigError

try:  # python-dotenv là tuỳ chọn: có thì tự đọc file .env (chỉ dùng khi chạy local)
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:  # pragma: no cover
    pass

DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"   # vùng Singapore
DEFAULT_MODEL = "qwen3-vl-plus"


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


def is_configured() -> bool:
    return bool(os.getenv("DASHSCOPE_API_KEY", "").strip())


def load_settings() -> Settings:
    api_key = os.getenv("DASHSCOPE_API_KEY", "").strip()
    if not api_key:
        raise QwenConfigError("Thiếu biến môi trường DASHSCOPE_API_KEY")
    return Settings(
        api_key=api_key,
        base_url=os.getenv("QWEN_BASE_URL", "").strip() or DEFAULT_BASE_URL,
        model=os.getenv("QWEN_MODEL", "").strip() or DEFAULT_MODEL,
        timeout=_float("QWEN_TIMEOUT_SECONDS", 60.0),
        max_retries=_int("QWEN_MAX_RETRIES", 2),
        max_tokens=_int("QWEN_MAX_TOKENS", 450),
        max_image_bytes=_int("QWEN_MAX_IMAGE_MB", 10) * 1024 * 1024,
        max_image_pixels=_int("QWEN_MAX_IMAGE_PIXELS", 40_000_000),
        image_max_side=_int("QWEN_IMAGE_MAX_SIDE", 1024),
        disable_thinking=_bool("QWEN_DISABLE_THINKING", False),
    )
