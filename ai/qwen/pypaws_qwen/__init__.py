"""PyPaws AI 1: mô tả ngoại hình chó/mèo từ ảnh bằng mô hình thị giác qua API tương thích OpenAI (mặc định OpenRouter)."""
from .client import DescribeResult, describe_pet_image
from .config import Settings, is_configured, load_settings
from .constants import NO_PET, NOT_FOUND
from .errors import (
    ImageRejectedError, ImageTooLargeError, InvalidImageError, PyPawsQwenError,
    QwenConfigError, QwenRateLimitError, QwenTimeoutError, QwenUnavailableError,
    QwenUpstreamError, UnsupportedImageFormatError,
)
from .normalize import normalize_output
from .prompt import PROMPT
 
__all__ = [
    "describe_pet_image", "DescribeResult", "Settings", "load_settings", "is_configured",
    "normalize_output", "PROMPT", "NO_PET", "NOT_FOUND", "PyPawsQwenError", "InvalidImageError",
    "UnsupportedImageFormatError", "ImageTooLargeError", "ImageRejectedError", "QwenConfigError",
    "QwenUnavailableError", "QwenRateLimitError", "QwenTimeoutError", "QwenUpstreamError",
]
 
