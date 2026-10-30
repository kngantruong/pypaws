"""Các lỗi nghiệp vụ. Mỗi lỗi có mã máy đọc được (code), mã HTTP gợi ý và câu thông báo an toàn để trả cho người dùng.

Chi tiết kỹ thuật (nếu có) chỉ ghi vào log, không trả ra ngoài.
"""


class PyPawsQwenError(Exception):
    code = "qwen_error"
    status_code = 500
    public_message = "Có lỗi xảy ra khi phân tích ảnh."

    def __init__(self, detail: str = ""):
        super().__init__(detail or self.public_message)
        self.detail = detail


class InvalidImageError(PyPawsQwenError):
    code = "invalid_image"
    status_code = 400
    public_message = "Ảnh không hợp lệ hoặc bị lỗi. Vui lòng chọn ảnh khác."


class UnsupportedImageFormatError(InvalidImageError):
    code = "unsupported_image_format"
    status_code = 415
    public_message = "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WEBP."


class ImageTooLargeError(InvalidImageError):
    code = "image_too_large"
    status_code = 413
    public_message = "Ảnh quá lớn. Vui lòng chọn ảnh nhẹ hơn."


class ImageRejectedError(PyPawsQwenError):
    code = "image_rejected"
    status_code = 422
    public_message = "Ảnh không được hệ thống AI chấp nhận. Vui lòng chọn ảnh khác."


class QwenConfigError(PyPawsQwenError):
    code = "ai_not_configured"
    status_code = 503
    public_message = "Dịch vụ phân tích ảnh chưa sẵn sàng. Vui lòng thử lại sau."


class QwenUnavailableError(PyPawsQwenError):
    """Sai khóa API, hết hạn mức, bị từ chối quyền. Người dùng không tự xử lý được."""
    code = "ai_unavailable"
    status_code = 503
    public_message = "Dịch vụ phân tích ảnh tạm thời không khả dụng. Vui lòng thử lại sau."


class QwenRateLimitError(PyPawsQwenError):
    code = "ai_rate_limited"
    status_code = 429
    public_message = "Hệ thống AI đang quá tải. Vui lòng thử lại sau ít phút."


class QwenTimeoutError(PyPawsQwenError):
    code = "ai_timeout"
    status_code = 504
    public_message = "Phân tích ảnh quá thời gian chờ. Vui lòng thử lại."


class QwenUpstreamError(PyPawsQwenError):
    code = "ai_upstream_error"
    status_code = 502
    public_message = "Hệ thống AI gặp sự cố. Vui lòng thử lại sau."
