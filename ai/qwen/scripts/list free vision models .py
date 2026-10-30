"""Liệt kê các mô hình MIỄN PHÍ có đọc được ảnh trên OpenRouter, để chọn QWEN_MODEL và QWEN_FALLBACK_MODELS.
 
Danh sách mô hình free thay đổi liên tục (bị gỡ, đổi tên), nên chạy script này ngay trước khi chọn, không chép danh sách cũ.
Không cần khóa API (danh mục mô hình là công khai).
 
    python scripts/list_free_vision_models.py
"""
import json
import urllib.request
 
MODELS_URL = "https://openrouter.ai/api/v1/models"
 
 
def filter_free_vision(payload: dict) -> list:
    """Giữ mô hình có đầu vào là ảnh và giá đầu vào, đầu ra đều bằng 0."""
    out = []
    for m in payload.get("data", []):
        arch = m.get("architecture") or {}
        inputs = arch.get("input_modalities") or []
        takes_image = "image" in inputs or "image" in str(arch.get("modality", "")).split("->")[0]
        pricing = m.get("pricing") or {}
        try:
            is_free = float(pricing.get("prompt", "1")) == 0 and float(pricing.get("completion", "1")) == 0
        except (TypeError, ValueError):
            is_free = False
        if takes_image and is_free:
            out.append({"id": m.get("id"), "name": m.get("name"), "context": m.get("context_length")})
    return sorted(out, key=lambda x: str(x["id"]))
 
 
def main():
    with urllib.request.urlopen(MODELS_URL, timeout=30) as r:
        payload = json.load(r)
    models = filter_free_vision(payload)
    print(f"{len(models)} mô hình miễn phí có đọc ảnh (theo danh mục hiện tại):\n")
    for m in models:
        print(f"  {m['id']:<60} context={m['context']}  | {m['name']}")
    print("\nGợi ý: chọn 1 mô hình làm QWEN_MODEL, 1 đến 2 mô hình khác làm QWEN_FALLBACK_MODELS (cách nhau bằng dấu phẩy).")
    print("Mô hình 'openrouter/free' tự chọn ngẫu nhiên một mô hình free có hỗ trợ ảnh, dùng làm dự phòng cuối.")
 
 
if __name__ == "__main__":
