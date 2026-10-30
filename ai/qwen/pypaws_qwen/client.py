"""Gọi mô hình đọc ảnh qua API tương thích OpenAI để mô tả ngoại hình thú cưng.
 
Mặc định dùng OpenRouter (https://openrouter.ai/api/v1). Đổi nhà cung cấp chỉ cần đổi QWEN_BASE_URL, QWEN_API_KEY, QWEN_MODEL,
ví dụ Alibaba Model Studio. Tên gói "pypaws_qwen" là tên lịch sử của dự án, không ràng buộc mô hình hay nhà cung cấp.
"""
from __future__ import annotations
 
import base64
import logging
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional
 
import openai
from openai import OpenAI
 
from .config import Settings, load_settings
from .constants import NO_PET
from .errors import (
    ImageRejectedError, QwenRateLimitError, QwenTimeoutError,
    QwenUnavailableError, QwenUpstreamError,
)
from .images import prepare_image
from .normalize import normalize_output
from .prompt import PROMPT
 
logger = logging.getLogger("pypaws_qwen")
 
 
@dataclass
class DescribeResult:
    description: str          # văn bản đã chuẩn hóa, đưa thẳng vào ô chỉnh sửa / cột NVARCHAR(MAX)
    is_pet: bool              # False khi ảnh không có chó/mèo (khi đó description rỗng)
    message: Optional[str]    # thông báo cho người dùng khi is_pet = False
    model: str
    elapsed_ms: int
    usage: Optional[dict]     # số token đã dùng (để theo dõi chi phí)
 
 
@lru_cache(maxsize=4)
def _get_client(api_key: str, base_url: str, timeout: float, max_retries: int) -> OpenAI:
    return OpenAI(api_key=api_key, base_url=base_url, timeout=timeout, max_retries=max_retries)
 
 
def _call_api(jpeg_bytes: bytes, s: Settings):
    client = _get_client(s.api_key, s.base_url, s.timeout, s.max_retries)
    b64 = base64.b64encode(jpeg_bytes).decode("ascii")
    extra_body = {}
    if s.disable_thinking:
        extra_body["enable_thinking"] = False           # riêng Alibaba DashScope
    if s.fallback_models:
        extra_body["models"] = list(s.fallback_models)  # riêng OpenRouter: thử lần lượt khi mô hình chính lỗi/bị giới hạn
    kwargs = {"extra_body": extra_body} if extra_body else {}
    try:
        return client.chat.completions.create(
            model=s.model,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                    {"type": "text", "text": PROMPT},
                ],
            }],
            max_tokens=s.max_tokens,
            temperature=0,          # giống do_sample=False trên Colab: cùng ảnh cho kết quả ổn định
            **kwargs,
        )
    except openai.APITimeoutError as e:                    # phải đặt trước APIConnectionError (lớp cha)
        raise QwenTimeoutError(str(e)) from e
    except openai.APIConnectionError as e:
        raise QwenUpstreamError(f"Không kết nối được API: {e}") from e
    except openai.RateLimitError as e:
        raise QwenRateLimitError(str(e)) from e
    except (openai.AuthenticationError, openai.PermissionDeniedError, openai.NotFoundError) as e:
        # 401 sai khóa | 403 khóa bị đặt hạn mức ("Key limit exceeded") hoặc bị từ chối | 404 mô hình bị gỡ/không khớp chính sách dữ liệu
        raise QwenUnavailableError(f"Khóa API sai, hết hạn mức, bị từ chối hoặc không tìm thấy mô hình: {e}") from e
    except openai.APIStatusError as e:
        text = f"{e} {getattr(e, 'body', '')}"
        if e.status_code == 402:                          # OpenRouter: hết credit
            raise QwenUnavailableError(f"Hết credit: {text}") from e
        if e.status_code == 408:
            raise QwenTimeoutError(text) from e
        if e.status_code == 400 and ("data_inspection_failed" in text or "inappropriate" in text.lower()):
            raise ImageRejectedError(text) from e
        raise QwenUpstreamError(f"HTTP {e.status_code}: {text}") from e
 
 
def describe_pet_image(image_bytes: bytes, settings: Optional[Settings] = None) -> DescribeResult:
    """Nhận bytes của ảnh gốc, trả về mô tả đã chuẩn hóa.
 
    Có thể ném: InvalidImageError (và lớp con), QwenConfigError, QwenRateLimitError, QwenTimeoutError,
    QwenUnavailableError, QwenUpstreamError, ImageRejectedError. Tất cả đều kế thừa PyPawsQwenError.
    """
    s = settings or load_settings()
    jpeg = prepare_image(image_bytes, s)
 
    started = time.perf_counter()
    try:
        resp = _call_api(jpeg, s)
    except Exception as e:
        logger.warning("API mô hình lỗi: %s: %s", type(e).__name__, getattr(e, "detail", e))
        raise
    elapsed_ms = int((time.perf_counter() - started) * 1000)

    if not resp.choices:
        raise QwenUpstreamError("API không trả về choices")

    choice = resp.choices[0]
    message = choice.message

    raw = message.content or ""

    if isinstance(raw, list):
        raw = "\n".join(
            item.text for item in raw
            if getattr(item, "text", None)
        )

    if not str(raw).strip():
        finish_reason = getattr(choice, "finish_reason", None)

        message_info = (
            message.model_dump(exclude_none=True)
            if hasattr(message, "model_dump")
            else repr(message)
        )

        logger.warning(
            "Empty response: model=%s, finish_reason=%s, message=%s, usage=%s",
            getattr(resp, "model", None),
            finish_reason,
            message_info,
            getattr(resp, "usage", None),
        )

        raise QwenUpstreamError(
            f"Model trả nội dung rỗng (finish_reason={finish_reason})"
        )
    if not raw.strip():
        # normalize_output coi chuỗi rỗng là "không có thú cưng", nên phải chặn trước để không báo sai
        logger.warning("API trả về nội dung rỗng (model=%s)", s.model)
        raise QwenUpstreamError("Phản hồi rỗng từ API")
 
    text = normalize_output(raw)
    is_pet = text != NO_PET
    usage = None
    if getattr(resp, "usage", None):
        usage = {"prompt_tokens": resp.usage.prompt_tokens, "completion_tokens": resp.usage.completion_tokens}
    logger.info("describe OK model=%s is_pet=%s elapsed_ms=%s usage=%s", s.model, is_pet, elapsed_ms, usage)
 
    return DescribeResult(
        description=text if is_pet else "",
        is_pet=is_pet,
        message=None if is_pet else NO_PET,
        model=getattr(resp, "model", None) or s.model,   # mô hình thực sự đã trả lời (có thể là mô hình dự phòng)
        elapsed_ms=elapsed_ms,
        usage=usage,
    )
