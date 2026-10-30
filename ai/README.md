# AI 1: Mô tả ngoại hình chó/mèo bằng Qwen-VL (Alibaba Cloud Model Studio)

Người dùng tải ảnh thú cưng lên, hệ thống gọi **Qwen-VL qua API** và trả về một đoạn văn bản tiếng Việt mô tả ngoại hình.
Người dùng đọc, **chỉnh sửa hoặc bổ sung**, rồi mới lưu vào database khi đăng tin.

```
Người dùng chọn ảnh
        │
        ▼
Frontend ──POST /api/ai/describe-pet (multipart, trường "image")──▶ FastAPI (backend)
                                                                        │ kiểm tra ảnh, bỏ EXIF, thu nhỏ
                                                                        ▼
                                                              Qwen-VL (Alibaba Cloud Model Studio)
        ◀── JSON { is_pet, description, ... } ───────────────────────────┘
        │
        ▼
Ô văn bản cho người dùng sửa  ──(đăng tin)──▶ API đăng tin hiện có ──▶ SQL Server (NVARCHAR(MAX))
```

Endpoint **chỉ phân tích, không lưu ảnh, không ghi database**. Việc lưu do API đăng tin hiện có đảm nhiệm.

## 1. Cấu trúc thư mục

```
ai/qwen/                          # copy vào repo, cạnh ai/dinov2_petface
├── README.md                     # tài liệu này
├── pyproject.toml                # để cài như một gói Python: pip install -e ai/qwen
├── requirements.txt
├── .env.example                  # mẫu biến môi trường (KHÔNG commit file .env)
├── .gitignore
├── pypaws_qwen/
│   ├── prompt.py                 # PROMPT tiếng Việt (giữ nguyên từ notebook Colab)
│   ├── normalize.py              # normalize_output() (giữ nguyên từ notebook Colab)
│   ├── constants.py              # FIELDS, BODY_PARTS, NOT_FOUND, NO_PET
│   ├── images.py                 # kiểm tra định dạng, bỏ EXIF, thu nhỏ ảnh
│   ├── client.py                 # gọi Qwen API, ánh xạ lỗi
│   ├── config.py                 # đọc biến môi trường
│   └── errors.py                 # các lỗi nghiệp vụ + mã HTTP + câu thông báo an toàn
├── scripts/test_describe.py      # thử nhanh từ dòng lệnh, không cần chạy backend
└── tests/                        # 24 test, không tốn quota (dùng API giả)

backend/                          # CHỈ THÊM 2 file, không sửa file cũ ngoài 2 dòng trong main.py
├── app/routers/ai_pet_description.py    # endpoint /api/ai/describe-pet và /api/ai/health
└── tests/test_ai_pet_description.py     # 8 test cho endpoint
```

> Giả định backend có cấu trúc `backend/app/routers/`. Nếu khác, đặt `ai_pet_description.py` vào thư mục router tương ứng và
> sửa dòng import trong `main.py`; file này chỉ phụ thuộc gói `pypaws_qwen`, không phụ thuộc code khác của backend.

## 2. Cấu hình API Qwen (làm một lần)

1. Tạo tài khoản **Alibaba Cloud** (bản International) và kích hoạt **Model Studio**, chọn vùng **Singapore**.
2. Vào trang quản lý khóa API của Model Studio, tạo **API key**.
3. Đặt khóa vào biến môi trường `DASHSCOPE_API_KEY` (xem mục 3). **Không** dán khóa vào code, notebook hay tin nhắn nhóm.
4. Tài khoản mới thường có hạn mức dùng thử miễn phí cho từng mô hình (hiện áp dụng ở vùng Singapore, có thời hạn).
   Hết hạn mức thì mặc định chuyển sang tính tiền, nên **vào trang của mô hình và bật chế độ chỉ dùng hạn mức miễn phí**
   nếu muốn tránh phát sinh phí. Chính sách và bảng giá có thể thay đổi, hãy xem lại trong console trước khi triển khai.

| Biến môi trường | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `DASHSCOPE_API_KEY` | **Có** | | Khóa API |
| `QWEN_MODEL` | Không | `qwen3-vl-plus` | Tên mô hình Qwen-VL (đổi sang `qwen-vl-max`... nếu cần) |
| `QWEN_BASE_URL` | Không | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | Đổi nếu dùng vùng khác (khóa API gắn với từng vùng) |
| `QWEN_TIMEOUT_SECONDS` | Không | `60` | Thời gian chờ tối đa mỗi lần gọi |
| `QWEN_MAX_RETRIES` | Không | `2` | Số lần tự thử lại khi lỗi mạng hoặc lỗi 5xx |
| `QWEN_MAX_TOKENS` | Không | `450` | Độ dài tối đa của mô tả |
| `QWEN_MAX_IMAGE_MB` | Không | `10` | Giới hạn dung lượng ảnh tải lên |
| `QWEN_MAX_IMAGE_PIXELS` | Không | `40000000` | Giới hạn tổng điểm ảnh (chống ảnh bom giải nén) |
| `QWEN_IMAGE_MAX_SIDE` | Không | `1024` | Cạnh dài tối đa sau khi thu nhỏ (giảm token và chi phí) |
| `QWEN_DISABLE_THINKING` | Không | `false` | Đặt `true` nếu mô hình chạy chế độ "thinking" làm chậm hoặc cắt cụt kết quả |

## 3. Cài đặt

Chạy từ thư mục gốc của repo:

```bash
pip install -e ai/qwen                  # cài gói pypaws_qwen và openai, pillow, python-dotenv
pip install python-multipart            # FastAPI cần để nhận file tải lên (bỏ qua nếu backend đã có)
cp ai/qwen/.env.example .env            # hoặc gộp các biến vào .env của backend, rồi điền DASHSCOPE_API_KEY
```

Triển khai bằng Docker: copy thư mục `ai/qwen` vào image và chạy `pip install ./ai/qwen`; truyền `DASHSCOPE_API_KEY` bằng
biến môi trường hoặc secret của máy chủ, không đóng gói vào image.

## 4. Thử nhanh trước khi tích hợp

**Dòng lệnh** (cần khóa API, tốn một ít hạn mức):

```bash
python ai/qwen/scripts/test_describe.py anh1.jpg anh2.png --csv ketqua_qwen.csv
```

**Google Colab** (lưu khóa ở mục Secrets, biểu tượng chìa khóa bên trái, đặt tên `DASHSCOPE_API_KEY`):

```python
!pip install -q openai pillow python-dotenv
import sys, os
sys.path.insert(0, "/content/<ten-repo>/ai/qwen")                      # đường dẫn tới thư mục ai/qwen
from google.colab import userdata, files
os.environ["DASHSCOPE_API_KEY"] = userdata.get("DASHSCOPE_API_KEY")   # không dán khóa trực tiếp vào cell
from pypaws_qwen import describe_pet_image

for name, data in files.upload().items():
    r = describe_pet_image(data)
    print("=" * 60, "\n", name, "\n", r.description or r.message, "\n", r.usage)
```

**Kiểm thử tự động** (không gọi API thật):

```bash
pip install pytest httpx fastapi python-multipart
cd ai/qwen && python -m pytest tests -q        # 24 test
cd backend && python -m pytest tests -q        # 8 test
```

## 5. Tích hợp vào FastAPI hiện tại

Thêm đúng **hai dòng** vào `app/main.py`:

```python
from app.routers import ai_pet_description
app.include_router(ai_pet_description.router)
```

Nên bảo vệ endpoint bằng xác thực sẵn có của backend, vì mỗi lần gọi tốn hạn mức hoặc tiền:

```python
app.include_router(ai_pet_description.router, dependencies=[Depends(get_current_user)])   # tên hàm tuỳ backend
```

Kiểm tra đã cấu hình xong chưa (không tốn hạn mức): `GET /api/ai/health` trả `{"configured": true, "model": "qwen3-vl-plus"}`.
Nếu frontend và backend khác origin, dùng cấu hình CORS sẵn có của backend.

## 6. Đặc tả endpoint

### `POST /api/ai/describe-pet`

- Content-Type: `multipart/form-data`
- Trường **`image`**: tệp ảnh JPEG, PNG hoặc WEBP, tối đa 10 MB. Định dạng được kiểm tra bằng cách giải mã ảnh thật,
  không tin đuôi tệp hay `Content-Type` do client gửi.

```bash
curl -X POST http://localhost:8000/api/ai/describe-pet -F "image=@cho.jpg"
```

```javascript
const form = new FormData();
form.append("image", file);                                   // file lấy từ <input type="file">
const res = await fetch("/api/ai/describe-pet", { method: "POST", body: form });
const data = await res.json();
if (!res.ok) showError(data.detail.message);                  // lỗi: hiển thị câu thông báo có sẵn
else if (!data.is_pet) showWarning(data.message);             // ảnh không có chó/mèo
else textarea.value = data.description;                       // đưa vào ô cho người dùng chỉnh sửa
```

**200 OK, có thú cưng**

```json
{
  "success": true,
  "is_pet": true,
  "description": "Màu lông, hoa văn: Vàng nâu, ngực và bốn chân trắng\nĐộ dài lông: Lông ngắn, ôm sát cơ thể\nĐặc điểm tai, mắt, mõm, đuôi:\n- Tai: Dựng, hình tam giác\n- Mắt: Hạnh nhân, màu nâu\n- Mõm: Thon dài, mũi đen\n- Đuôi: Chưa xác định\nDấu hiệu nhận dạng đặc biệt: Mảng lông trắng hình tam giác giữa trán",
  "message": null,
  "model": "qwen3-vl-plus",
  "elapsed_ms": 4210
}
```

**200 OK, ảnh không có chó/mèo** (`description` rỗng, đừng lưu thông báo này vào database)

```json
{
  "success": true,
  "is_pet": false,
  "description": "",
  "message": "Không nhận diện được chó/mèo trong ảnh.",
  "model": "qwen3-vl-plus",
  "elapsed_ms": 2890
}
```

**Lỗi**: mã HTTP khác 200, thân có dạng:

```json
{ "detail": { "code": "unsupported_image_format", "message": "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WEBP." } }
```

`message` là câu tiếng Việt an toàn để hiển thị thẳng cho người dùng. Chi tiết kỹ thuật chỉ nằm trong log của backend.

| HTTP | `code` | Nguyên nhân | Frontend nên |
|---|---|---|---|
| 400 | `invalid_image` | Ảnh rỗng, hỏng, bị cắt dở, quá nhỏ (dưới 64 px) | Báo chọn ảnh khác |
| 413 | `image_too_large` | Quá 10 MB hoặc quá nhiều điểm ảnh | Báo chọn ảnh nhẹ hơn |
| 415 | `unsupported_image_format` | Không phải JPEG, PNG, WEBP | Báo đổi định dạng |
| 422 | `image_rejected` | Dịch vụ AI từ chối ảnh | Báo chọn ảnh khác |
| 422 | (FastAPI) | Thiếu trường `image`; thân lỗi dạng `detail: [...]` khác các dòng trên | Lỗi lập trình, kiểm tra lại form |
| 429 | `ai_rate_limited` | AI quá tải hoặc vượt giới hạn tốc độ | Cho thử lại sau ít phút |
| 502 | `ai_upstream_error` | Dịch vụ AI lỗi hoặc trả về rỗng | Cho thử lại, cho phép tự nhập tay |
| 503 | `ai_not_configured`, `ai_unavailable` | Chưa có khóa API, khóa sai, hết hạn mức | Cho phép tự nhập tay, báo quản trị viên |
| 504 | `ai_timeout` | Quá thời gian chờ | Cho thử lại |

Khi AI lỗi, website vẫn nên cho người dùng **tự nhập mô tả**, để tính năng này không chặn việc đăng tin.

## 7. Luồng lưu database (gợi ý)

- Đoạn mô tả là văn bản nhiều dòng, các dòng ngăn cách bằng ký tự xuống dòng `\n`. Lưu thẳng vào cột `NVARCHAR(MAX)`,
  khi hiển thị trên web dùng CSS `white-space: pre-wrap` để giữ xuống dòng.
- Nên lưu **hai cột**: bản AI sinh ra và bản người dùng đã chỉnh sửa. Về sau so sánh hai cột sẽ biết AI hay sai ở đâu.

```sql
ALTER TABLE TinThuCung ADD
    MoTaAI        NVARCHAR(MAX) NULL,   -- nguyên văn từ AI, không cho sửa
    MoTaNgoaiHinh NVARCHAR(MAX) NULL;   -- bản người dùng chỉnh sửa, hiển thị trên website
```

(Tên bảng và cột chỉ là ví dụ, sửa theo schema của nhóm.)

## 8. Bảo mật và chi phí

| Vấn đề | Cách xử lý trong code |
|---|---|
| Khóa API | Chỉ đọc từ biến môi trường; `Settings` ẩn khóa khỏi `repr`; không ghi vào log; `.env` nằm trong `.gitignore` |
| Ảnh giả mạo | Giải mã ảnh thật để xác định định dạng; chặn ảnh quá nặng và quá nhiều điểm ảnh |
| Quyền riêng tư | Ảnh được lưu lại thành JPEG mới nên **mất toàn bộ EXIF, kể cả vị trí GPS**; endpoint không lưu ảnh |
| Lỗi nội bộ | Người dùng chỉ thấy câu thông báo chung; chi tiết nằm trong log |
| Chi phí | Ảnh thu nhỏ về tối đa 1024 px; `temperature=0`; kết quả trả về có `usage` (số token) để theo dõi |

Cần backend bổ sung (chưa có trong code này): **xác thực người dùng** trên endpoint và **giới hạn số lần gọi theo người dùng hoặc IP**,
nếu không ai cũng có thể gọi và làm cạn hạn mức. Cần ghi rõ trong điều khoản của website rằng ảnh được gửi tới dịch vụ AI của bên thứ ba.

## 9. Ghi chú về prompt và định dạng đầu ra

- Prompt và `normalize_output()` **giữ nguyên** từ notebook Colab `test_qwen_2_5.py`. Hàm này ép kết quả về đúng khuôn: 4 mục,
  riêng mục tai, mắt, mõm, đuôi tách thành 4 dòng con; thiếu thông tin thì ghi `Chưa xác định`.
- Prompt hiện **không có dòng "Giống"** và câu "đúng 5 dòng" trong phần định dạng không khớp với khuôn thực tế (4 mục, 7 dòng).
  `normalize_output()` đã chuẩn hóa nên không ảnh hưởng kết quả; khi sửa prompt lần sau nên sửa lại câu này cho khớp.
- Mô hình trên API (`qwen3-vl-plus`) **khác** bản Qwen2.5-VL-7B đã thử trên Colab. Cần thử lại với khoảng 10 ảnh đa dạng
  (chó, mèo, ảnh mờ, nhiều con, không có thú cưng) và đối chiếu mô tả với ảnh gốc trước khi dùng thật.

## 10. Xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `503 ai_not_configured` | Backend không thấy `DASHSCOPE_API_KEY` | Kiểm tra `GET /api/ai/health`; khởi động lại backend sau khi đặt biến |
| `503 ai_unavailable` | Khóa sai, khóa của vùng khác, hết hạn mức | Xem log; kiểm tra khóa và `QWEN_BASE_URL` có cùng vùng, kiểm tra hạn mức trong console |
| `502 ai_upstream_error` kèm "Phản hồi rỗng" | Mô hình ở chế độ thinking dùng hết token | Đặt `QWEN_DISABLE_THINKING=true` hoặc tăng `QWEN_MAX_TOKENS` |
| `504 ai_timeout` | Mạng chậm hoặc ảnh lớn | Tăng `QWEN_TIMEOUT_SECONDS`, giảm `QWEN_IMAGE_MAX_SIDE` |
| `ModuleNotFoundError: pypaws_qwen` | Chưa cài gói | `pip install -e ai/qwen` trong đúng môi trường ảo của backend |
| `Form data requires "python-multipart"` | Thiếu thư viện nhận file | `pip install python-multipart` |
| Mô tả sai hoặc bịa chi tiết | Giới hạn của mô hình | So với ảnh gốc, cho người dùng chỉnh sửa; ghi nhận ca sai để chỉnh prompt |
