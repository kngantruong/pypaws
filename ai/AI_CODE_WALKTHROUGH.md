# PyPaws – AI Code Walkthrough (Ngân)

Tài liệu này đánh dấu các vị trí quan trọng để đọc và thuyết trình phần AI. GitHub không hỗ trợ tô đậm riêng từng dòng trong giao diện source code, vì vậy tài liệu dùng **tên hàm/đoạn lệnh in đậm**, giải thích ngắn và liên kết thẳng đến file gốc. Không thay đổi logic chạy của chương trình.

## 1. AI2 – DINOv2 trích xuất đặc trưng ảnh

File chính: [`ai/dinov2_petface/embedder.py`](dinov2_petface/embedder.py)

| Đoạn code cần chú ý | Ý nghĩa |
|---|---|
| **`torch.hub.load(..., 'dinov2_vits14', pretrained=False)`** | Nạp kiến trúc DINOv2 ViT-S/14. `pretrained=False` vì trọng số đã được nạp từ checkpoint fine-tune của dự án ở bước `load_state_dict`. |
| **`nn.Linear(384, 512)`** | Backbone ViT-S/14 tạo vector đặc trưng 384 chiều; lớp Linear chiếu vector đó sang không gian embedding 512 chiều để phù hợp mô hình đã huấn luyện. |
| **`nn.BatchNorm1d(512)`** | Chuẩn hóa 512 đặc trưng trong head embedding, giúp ổn định phân phối đầu ra. |
| **`F.normalize(..., dim=1)`** | Chuẩn hóa L2 từng vector để độ dài vector bằng 1. |
| **`self.model.load_state_dict(...)`** | Nạp trọng số đã huấn luyện từ checkpoint; **`self.model.eval()`** chuyển mô hình sang chế độ suy luận. |
| **`T.Resize((224, 224))` + `T.Normalize(...)`** | Đưa ảnh về kích thước 224 × 224 và chuẩn hóa theo mean/std ImageNet trước khi đưa vào backbone. |
| **`embed_batch()`** | Chuyển ảnh thành tensor, chạy mô hình trên batch ảnh và trả về mảng NumPy float32 có dạng (N, 512). |
| **`torch.flip(x, dims=[3])`** | Horizontal Flip TTA: chạy thêm ảnh lật ngang, cộng embedding ảnh gốc và ảnh lật để giảm phụ thuộc hướng chụp. Sau đó chuẩn hóa L2 lại. |
| **`embed()`** | Hàm tiện ích cho một ảnh; gọi `embed_batch([image])` rồi lấy vector đầu tiên. |
| **`similarity()` / `np.dot(a, b)`** | Tính cosine similarity. Vì hai vector đã L2-normalize nên tích vô hướng bằng cosine similarity. |

### Vì sao 384 chiều thành 512 chiều?

DINOv2 ViT-S/14 là backbone trích xuất đặc trưng và đầu ra của backbone có 384 chiều. Dự án thêm projection head gồm **Linear(384, 512)** và **BatchNorm1d(512)** để chuyển đặc trưng sang không gian embedding 512 chiều đã dùng trong quá trình fine-tune. 512 là kích thước embedding của mô hình PyPaws, không phải kích thước gốc của backbone.

### ArcFace nằm ở đâu?

ArcFace là margin-based classification head được dùng trong **giai đoạn huấn luyện** để buộc embedding của cùng cá thể gần nhau và embedding của cá thể khác nhau cách xa hơn. File suy luận `embedder.py` chỉ dựng backbone + projection + BatchNorm để trích xuất embedding; không cần ArcFace classifier head khi so sánh hai ảnh mới. Khi inference, hệ thống dùng embedding và cosine similarity.

**Lưu ý khi trình bày:** cosine similarity là điểm tương đồng, không phải xác suất hai ảnh chắc chắn cùng một cá thể. Ngưỡng 0.252 trong file là ngưỡng cấu hình/đánh giá trên tập verification của dự án; dữ liệu thực tế có thể cần hiệu chỉnh.

## 2. AI2 – So khớp ảnh trong Backend

File: [`backend/app/services/matcher.py`](../backend/app/services/matcher.py)

| Đoạn code cần chú ý | Ý nghĩa |
|---|---|
| **`_get_query_context()`** | Lấy thông tin bài LOST và embedding ảnh chính; ưu tiên lấy embedding đã lưu trong database, sau đó kiểm tra RAM, cuối cùng mới tính embedding từ ảnh trên ổ đĩa. |
| **`get_embedder(...)` + `embedder.embed(pil_img)`** | Backend lấy đối tượng DINOv2 embedder và tạo vector 512 chiều nếu chưa có vector dùng được. Đây là lời gọi hàm Python nội bộ, không phải HTTP API gọi sang một máy chủ DINOv2 riêng. |
| **`_build_search_pool()`** | Lấy danh sách bài đăng đối ứng qua RPC `get_search_pool`; nếu không có dữ liệu thì fallback sang bài đăng ACTIVE cùng loài và lấy/tạo embedding. |
| **`_decode_embedding()`** | Chuyển embedding từ các dạng dữ liệu database/RAM về NumPy float32, kiểm tra số chiều và chuẩn hóa L2. |
| **`np.dot(query_vector, candidate_vector)`** | Tính cosine similarity giữa ảnh truy vấn và ảnh ứng viên. |
| **`passes_image_threshold(...)`** | Loại ứng viên có điểm ảnh thấp hơn ngưỡng tối thiểu cấu hình. |
| **`haversine_km(...)` + `_time_score(...)`** | Tính khoảng cách địa lý và mức độ phù hợp thời gian giữa hai bài đăng. |
| **`weighted_score(...)`** | Kết hợp điểm ảnh, vị trí và thời gian thành điểm xếp hạng cuối. |
| **`save_candidate` / `notify_candidate`** | Lưu ứng viên và tạo thông báo sau khi ứng viên được ghi nhận. |

**Phân biệt quan trọng:** Backend không gửi ảnh qua một HTTP endpoint DINOv2 trong luồng này. Backend gọi trực tiếp lớp Python embedder đã tích hợp trong dự án; database được gọi qua Supabase client/RPC.

## 3. AI1 – Gemini mô tả ngoại hình thú cưng

Endpoint: [`backend/app/routers/ai_pet_description.py`](../backend/app/routers/ai_pet_description.py)  
Client gọi mô hình: [`ai/qwen/pypaws_qwen/client.py`](qwen/pypaws_qwen/client.py)

| Đoạn code cần chú ý | Ý nghĩa |
|---|---|
| **`APIRouter(prefix="/api/ai")`** | Nhóm endpoint AI dưới tiền tố `/api/ai`. |
| **`@router.post("/describe-pet")`** | Endpoint nhận ảnh để mô tả thú cưng: `POST /api/ai/describe-pet`. |
| **`image: UploadFile = File(...)`** | Nhận ảnh upload từ Frontend dưới dạng multipart/form-data. |
| **`run_in_threadpool(describe_pet_image, data)`** | Gọi hàm xử lý ảnh trong threadpool để thao tác gọi API mạng không chặn event loop của FastAPI. |
| **`_get_client(...)`** | Tạo OpenAI-compatible client với API key, base URL, timeout và số lần retry lấy từ cấu hình. |
| **`_call_api()`** | Mã hóa ảnh JPEG thành Base64 rồi gửi ảnh và prompt đến endpoint chat completions của nhà cung cấp cấu hình. |
| **`client.chat.completions.create(...)`** | Lệnh thực sự gửi request đến mô hình đa phương thức. Tên model, base URL và API key lấy từ Settings. |
| **`prepare_image()`** | Chuẩn bị ảnh trước khi gửi đến mô hình. |
| **`normalize_output(raw)`** | Chuẩn hóa nội dung văn bản AI trả về theo định dạng mô tả mà PyPaws mong muốn. |
| **`DescribePetResponse`** | Định nghĩa dữ liệu Backend trả về cho Frontend: `is_pet`, `description`, `message`, `model`, `elapsed_ms`. |

Trong router hiện tại, phần mô tả ghi rõ dự án dùng **Gemini 2.5 Flash qua OpenRouter**. Tuy nhiên, client được viết theo chuẩn OpenAI-compatible và model/base URL được đọc từ cấu hình; vì vậy khi kiểm tra môi trường chạy, cần đối chiếu giá trị cấu hình thực tế để xác nhận model đang được chọn.

## 4. Phân biệt AI1 và AI2

| Thành phần | AI1 – Gemini 2.5 Flash | AI2 – DINOv2 |
|---|---|---|
| Đầu vào | Ảnh thú cưng | Ảnh thú cưng |
| Cách gọi | Backend gửi request qua OpenAI-compatible API (OpenRouter theo cấu hình dự án) | Backend gọi trực tiếp Python embedder nội bộ |
| Đầu ra | Văn bản mô tả ngoại hình + trạng thái có/không nhận diện thú cưng | Vector đặc trưng 512 chiều |
| Mục đích | Hỗ trợ người dùng điền mô tả bài đăng | So sánh ảnh và xếp hạng bài đăng có khả năng cùng cá thể |
| Có phải xác suất? | Văn bản sinh bởi mô hình, có thể cần người dùng chỉnh sửa | Cosine similarity là điểm tương đồng, không phải xác suất |

## 5. Luồng tổng quát để thuyết trình

```text
AI1 – Mô tả ảnh
Frontend
  -> POST /api/ai/describe-pet
  -> FastAPI router
  -> describe_pet_image()
  -> OpenRouter / Gemini theo cấu hình
  -> Chuẩn hóa văn bản
  -> Trả description về Frontend để người dùng xem và chỉnh sửa

AI2 – So khớp ảnh
Frontend đăng bài
  -> Backend lưu bài đăng
  -> Backend gọi luồng tạo embedding
  -> DINOv2 embedder (Python nội bộ)
  -> Embedding 512 chiều
  -> Lưu/đọc embedding
  -> matcher.py tính cosine + vị trí + thời gian
  -> Lưu candidates và trả kết quả cho Frontend
```

**Khi bảo vệ:** nhấn mạnh AI1 tạo mô tả bằng ngôn ngữ tự nhiên; AI2 biến ảnh thành vector để tìm ảnh tương đồng. Hai mô hình giải quyết hai bài toán khác nhau và bổ trợ cho nhau.
