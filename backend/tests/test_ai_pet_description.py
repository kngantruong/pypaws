"""Kiểm thử endpoint bằng Qwen giả. Chạy từ thư mục backend: pytest tests/"""
import os
import sys
from io import BytesIO
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pypaws_qwen.client as client_mod                      # noqa: E402
from app.routers import ai_pet_description                   # noqa: E402

GOOD = ("Màu lông, hoa văn: Vàng nâu\nĐộ dài lông: Ngắn\nĐặc điểm tai, mắt, mõm, đuôi:\n- Tai: Cụp\n"
        "- Mắt: Nâu\n- Mõm: Thon\n- Đuôi: Cong\nDấu hiệu nhận dạng đặc biệt: Đeo vòng cổ đỏ")


def jpeg():
    buf = BytesIO(); Image.new("RGB", (300, 200), (120, 90, 40)).save(buf, "JPEG"); return buf.getvalue()


@pytest.fixture
def api(monkeypatch):
    monkeypatch.setenv("QWEN_API_KEY", "sk-test")
    monkeypatch.setenv("QWEN_MODEL", "mo-hinh-thu")
    app = FastAPI(); app.include_router(ai_pet_description.router)
    return TestClient(app)


def use_qwen(monkeypatch, content):
    msg = SimpleNamespace(content=content)
    resp = SimpleNamespace(choices=[SimpleNamespace(message=msg)],
                           usage=SimpleNamespace(prompt_tokens=1, completion_tokens=1))
    fc = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=lambda **k: resp)))
    monkeypatch.setattr(client_mod, "_get_client", lambda *a, **k: fc)


def post(api, data, name="cho.jpg", ctype="image/jpeg"):
    return api.post("/api/ai/describe-pet", files={"image": (name, data, ctype)})


def test_thanh_cong(api, monkeypatch):
    use_qwen(monkeypatch, GOOD)
    r = post(api, jpeg())
    assert r.status_code == 200
    j = r.json()
    assert j["success"] is True and j["is_pet"] is True
    assert j["description"].startswith("Màu lông, hoa văn: Vàng nâu") and "\n" in j["description"]


def test_khong_co_thu_cung(api, monkeypatch):
    use_qwen(monkeypatch, "Không nhận diện được chó/mèo trong ảnh.")
    j = post(api, jpeg()).json()
    assert j["is_pet"] is False and j["description"] == "" and j["message"]


def test_file_khong_phai_anh(api):
    r = post(api, b"day la file text", "a.jpg", "image/jpeg")   # khai gian Content-Type vẫn bị chặn
    assert r.status_code == 400 and r.json()["detail"]["code"] == "invalid_image"


def test_dinh_dang_gif(api):
    buf = BytesIO(); Image.new("RGB", (300, 200)).save(buf, "GIF")
    r = post(api, buf.getvalue(), "a.gif", "image/gif")
    assert r.status_code == 415


def test_anh_qua_nang(api, monkeypatch):
    monkeypatch.setenv("QWEN_MAX_IMAGE_MB", "1")
    r = post(api, b"0" * (2 * 1024 * 1024))
    assert r.status_code == 413


def test_thieu_khoa_api(api, monkeypatch):
    monkeypatch.delenv("QWEN_API_KEY")
    r = post(api, jpeg())
    assert r.status_code == 503 and r.json()["detail"]["code"] == "ai_not_configured"
    assert "QWEN_API_KEY" not in r.text                      # không lộ tên biến cấu hình ra ngoài


def test_thieu_truong_image(api):
    assert api.post("/api/ai/describe-pet").status_code == 422


def test_health(api, monkeypatch):
    assert api.get("/api/ai/health").json()["configured"] is True
    monkeypatch.delenv("QWEN_API_KEY")
    assert api.get("/api/ai/health").json() == {"configured": False, "model": None}
