"""Kiểm tra và chuẩn bị ảnh trước khi gửi lên API.

- Xác thực định dạng bằng cách THỰC SỰ giải mã ảnh (không tin đuôi file hay Content-Type do client gửi).
- Chặn ảnh quá nặng, quá nhiều điểm ảnh (chống ảnh bom giải nén).
- Xoay đúng chiều theo EXIF rồi XÓA toàn bộ EXIF (kể cả vị trí GPS) bằng cách lưu lại thành JPEG mới.
- Thu nhỏ cạnh dài về tối đa `image_max_side` để giảm token và chi phí.
"""
from __future__ import annotations

from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

from .config import Settings
from .errors import ImageTooLargeError, InvalidImageError, UnsupportedImageFormatError

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MIN_SIDE = 64   # ảnh nhỏ hơn mức này không đủ chi tiết để mô tả


def prepare_image(data: bytes, settings: Settings) -> bytes:
    """Trả về bytes JPEG đã chuẩn hóa, hoặc ném InvalidImageError và các lớp con của nó."""
    if not data:
        raise InvalidImageError("Tệp ảnh rỗng")
    if len(data) > settings.max_image_bytes:
        raise ImageTooLargeError(f"{len(data)} bytes > {settings.max_image_bytes}")

    try:
        img = Image.open(BytesIO(data))
        fmt = img.format
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError) as e:
        raise InvalidImageError(f"Không đọc được ảnh: {e}")

    if fmt not in ALLOWED_FORMATS:
        raise UnsupportedImageFormatError(f"Định dạng {fmt!r}")

    width, height = img.size
    if width * height > settings.max_image_pixels:
        raise ImageTooLargeError(f"{width}x{height} vượt giới hạn điểm ảnh")
    if min(width, height) < MIN_SIDE:
        raise InvalidImageError(f"Ảnh quá nhỏ: {width}x{height}")

    try:
        img = ImageOps.exif_transpose(img)           # sửa ảnh chụp điện thoại bị xoay
        if img.mode != "RGB":                        # PNG/WEBP trong suốt -> nền trắng
            rgba = img.convert("RGBA")
            background = Image.new("RGB", rgba.size, (255, 255, 255))
            background.paste(rgba, mask=rgba.split()[3])
            img = background
        img.thumbnail((settings.image_max_side, settings.image_max_side))
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=90)     # ảnh mới không mang theo EXIF
    except (OSError, ValueError, SyntaxError, Image.DecompressionBombError) as e:
        raise InvalidImageError(f"Ảnh bị lỗi hoặc cắt dở: {e}")
    return buf.getvalue()
