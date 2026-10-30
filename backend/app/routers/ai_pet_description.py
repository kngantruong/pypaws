"""
Endpoint AI 1: Nhận ảnh chó/mèo, gọi Gemini 2.5 Flash qua OpenRouter
và trả về mô tả ngoại hình để người dùng chỉnh sửa.

Endpoint không lưu ảnh và không ghi dữ liệu vào database.
Việc lưu mô tả vào SQL Server do API đăng tin hiện có đảm nhiệm
sau khi người dùng xem và chỉnh sửa nội dung.

Tích hợp vào ứng dụng FastAPI hiện tại (app/main.py):

    from app.routers import ai_pet_description
    app.include_router(ai_pet_description.router)

Nếu backend đã có xác thực, có thể thêm dependency xác thực
để hạn chế việc sử dụng API và tránh phát sinh chi phí ngoài ý muốn.
"""
import logging
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from pypaws_qwen import PyPawsQwenError, describe_pet_image, is_configured, load_settings

logger = logging.getLogger("pypaws.ai")

router = APIRouter(prefix="/api/ai", tags=["AI - Mô tả ngoại hình thú cưng"])


class DescribePetResponse(BaseModel):
    success: bool = True
    is_pet: bool  # False: ảnh không có chó/mèo
    description: str  # văn bản nhiều dòng, đưa vào ô chỉnh sửa; rỗng khi is_pet = False
    message: Optional[str] = None  # thông báo hiển thị cho người dùng khi is_pet = False
    model: str
    elapsed_ms: int


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    detail: ErrorDetail


class HealthResponse(BaseModel):
    configured: bool
    model: Optional[str] = None


@router.get("/health", response_model=HealthResponse, summary="Kiểm tra đã cấu hình khóa API chưa (không gọi Qwen)")
async def ai_health():
    if not is_configured():
        return HealthResponse(configured=False)
    return HealthResponse(configured=True, model=load_settings().model)


@router.post(
    "/describe-pet",
    response_model=DescribePetResponse,
    summary="Mô tả ngoại hình chó/mèo từ ảnh",
    responses={
        400: {"model": ErrorResponse, "description": "Ảnh rỗng hoặc hỏng"},
        413: {"model": ErrorResponse, "description": "Ảnh quá nặng hoặc quá nhiều điểm ảnh"},
        415: {"model": ErrorResponse, "description": "Không phải JPEG/PNG/WEBP"},
        422: {"model": ErrorResponse, "description": "Ảnh bị hệ thống AI từ chối"},
        429: {"model": ErrorResponse, "description": "AI quá tải hoặc vượt giới hạn tốc độ"},
        502: {"model": ErrorResponse, "description": "Lỗi từ phía dịch vụ AI"},
        503: {"model": ErrorResponse, "description": "Chưa cấu hình khóa API hoặc hết hạn mức"},
        504: {"model": ErrorResponse, "description": "Dịch vụ AI quá thời gian chờ"},
    },
)
async def describe_pet(
        image: UploadFile = File(..., description="Ảnh chó/mèo (JPEG, PNG hoặc WEBP), tối đa 10 MB"),
):
    try:
        limit = load_settings().max_image_bytes
        data = await image.read(limit + 1)  # đọc dư 1 byte để biết ảnh có vượt giới hạn không
        # describe_pet_image là hàm chặn (gọi mạng), chạy trong threadpool để không treo event loop
        result = await run_in_threadpool(describe_pet_image, data)
    except PyPawsQwenError as e:
        logger.warning("describe-pet thất bại: code=%s detail=%s", e.code, e.detail)
        raise HTTPException(status_code=e.status_code,
                            detail={"code": e.code, "message": e.public_message})
    finally:
        await image.close()

    return DescribePetResponse(
        is_pet=result.is_pet, description=result.description, message=result.message,
        model=result.model, elapsed_ms=result.elapsed_ms,
    )

