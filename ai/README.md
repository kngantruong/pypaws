# AI 1 – Mô tả ngoại hình chó/mèo

Sử dụng **Gemini 2.5 Flash qua OpenRouter API** để phân tích ảnh chó/mèo và tạo mô tả ngoại hình bằng tiếng Việt.

Người dùng có thể chỉnh sửa mô tả trước khi đăng tin. AI không tự lưu ảnh hoặc ghi dữ liệu vào database.

## 1. Luồng hoạt động

```text
Người dùng tải ảnh
       |
       v
Frontend
       |
       | POST /api/ai/describe-pet
       v
FastAPI Backend
       |
       v
Gemini 2.5 Flash (OpenRouter)
       |
       v
Trả về mô tả tiếng Việt
       |
       v
Người dùng chỉnh sửa
       |
       v
API đăng tin hiện có -> SQL Server
```

## 2. Cấu hình API

Tạo tài khoản tại https://openrouter.ai/, tạo API key và cấu hình trong file `.env`:

```env
QWEN_API_KEY=YOUR_OPENROUTER_API_KEY
QWEN_MODEL=google/gemini-2.5-flash
QWEN_BASE_URL=https://openrouter.ai/api/v1
QWEN_TIMEOUT_SECONDS=90
QWEN_MAX_RETRIES=2
QWEN_MAX_TOKENS=1000
QWEN_MAX_IMAGE_MB=10
QWEN_IMAGE_MAX_SIDE=1024
QWEN_DISABLE_THINKING=false
QWEN_FALLBACK_MODELS=
```

Lưu ý:
- `QWEN_API_KEY` là OpenRouter API key.
- Không đưa API key lên GitHub hoặc frontend.
- File `.env` phải nằm trong `.gitignore`.

## 3. Cài đặt

Chạy từ thư mục gốc repository:

```bash
pip install -e ai/qwen
pip install python-multipart
```

Nếu backend đã cài các thư viện tương ứng thì không cần cài lại.

## 4. Tích hợp FastAPI

Trong `backend/app/main.py`, thêm:

```python
from app.routers import ai_pet_description

app.include_router(ai_pet_description.router)
```

Router sử dụng package `pypaws_qwen` trong `AI/qwen`.

Kiểm tra cấu hình:

```http
GET /api/ai/health
```

Kết quả:

```json
{
  "configured": true,
  "model": "google/gemini-2.5-flash"
}
```

## 5. Đặc tả API

### POST `/api/ai/describe-pet`

**Input:**
- Content-Type: `multipart/form-data`
- Field: `image`
- Định dạng: JPEG, PNG, WEBP.
- Dung lượng tối đa: 10 MB.

**Kết quả thành công:**

```json
{
  "success": true,
  "is_pet": true,
  "description": "Màu lông, hoa văn: Lông trắng xen kẽ nâu vàng.\nĐộ dài lông: Lông ngắn.\nĐặc điểm tai, mắt, mõm, đuôi:\n- Tai: Dựng đứng.\n- Mắt: Màu nâu sẫm.\n- Mõm: Mũi đen.\n- Đuôi: Chưa xác định.\nDấu hiệu nhận dạng đặc biệt: Có đốm lông nâu ở chân trước.",
  "message": null,
  "model": "google/gemini-2.5-flash",
  "elapsed_ms": 5489
}
```

**Nếu ảnh không có chó/mèo:**

```json
{
  "success": true,
  "is_pet": false,
  "description": "",
  "message": "Không nhận diện được chó/mèo trong ảnh.",
  "model": "google/gemini-2.5-flash",
  "elapsed_ms": 2890
}
```

**Frontend xử lý:**
- Nếu `is_pet = true`: hiển thị `description` trong ô văn bản để người dùng chỉnh sửa.
- Nếu `is_pet = false`: hiển thị `message`.
- Nếu API lỗi: thông báo lỗi và vẫn cho phép người dùng tự nhập mô tả.

### Các mã lỗi chính

| HTTP | Ý nghĩa |
|---|---|
| 400 | Ảnh rỗng hoặc không hợp lệ |
| 413 | Ảnh quá dung lượng |
| 415 | Định dạng ảnh không hỗ trợ |
| 422 | AI từ chối ảnh hoặc thiếu trường ảnh |
| 429 | Vượt giới hạn gọi API |
| 502 | Lỗi dịch vụ AI |
| 503 | Chưa cấu hình API key hoặc hết hạn mức |
| 504 | Quá thời gian chờ |

## 6. Lưu ý tích hợp

- AI 1 chỉ trả về mô tả, không lưu database.
- Frontend cho phép người dùng chỉnh sửa nội dung.
- API đăng tin hiện có chịu trách nhiệm lưu mô tả vào SQL Server.
- Không để API key xuất hiện ở frontend hoặc GitHub.
- Model đang sử dụng và đã kiểm thử thành công: `google/gemini-2.5-flash` qua OpenRouter.
