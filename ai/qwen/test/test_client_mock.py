"""Kiểm thử luồng gọi API bằng client giả, không tốn quota."""
from io import BytesIO
from types import SimpleNamespace

import httpx
import openai
import pytest
from PIL import Image

import pypaws_qwen.client as client_mod
from pypaws_qwen import (ImageRejectedError, NO_PET, QwenConfigError, QwenRateLimitError,
                         QwenTimeoutError, QwenUnavailableError, QwenUpstreamError,
                         describe_pet_image)

GOOD = """Màu lông, hoa văn: Vàng nâu
Độ dài lông: Ngắn
Đặc điểm tai, mắt, mõm, đuôi:
- Tai: Cụp
- Mắt: Nâu
- Mõm: Thon
- Đuôi: Cong
Dấu hiệu nhận dạng đặc biệt: Đeo vòng cổ đỏ"""


def img_bytes():
    buf = BytesIO(); Image.new("RGB", (300, 200), (120, 90, 40)).save(buf, "JPEG"); return buf.getvalue()


def fake_client(content=None, exc=None):
    def create(**kwargs):
        if exc:
            raise exc
        msg = SimpleNamespace(content=content)
        return SimpleNamespace(choices=[SimpleNamespace(message=msg)],
                               usage=SimpleNamespace(prompt_tokens=700, completion_tokens=120))
    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))


@pytest.fixture(autouse=True)
def key(monkeypatch):
    monkeypatch.setenv("DASHSCOPE_API_KEY", "sk-test")


def patch(monkeypatch, **kw):
    fc = fake_client(**kw)
    monkeypatch.setattr(client_mod, "_get_client", lambda *a, **k: fc)


def http_exc(cls, status, body=None):
    req = httpx.Request("POST", "https://x/y")
    return cls("loi", response=httpx.Response(status, request=req), body=body)


def test_thanh_cong(monkeypatch):
    patch(monkeypatch, content=GOOD)
    r = describe_pet_image(img_bytes())
    assert r.is_pet and r.message is None
    assert r.description.startswith("Màu lông, hoa văn: Vàng nâu")
    assert r.usage == {"prompt_tokens": 700, "completion_tokens": 120}


def test_khong_co_thu_cung(monkeypatch):
    patch(monkeypatch, content=NO_PET)
    r = describe_pet_image(img_bytes())
    assert not r.is_pet and r.description == "" and r.message == NO_PET


def test_phan_hoi_rong_khong_bi_hieu_nham_la_khong_co_thu_cung(monkeypatch):
    patch(monkeypatch, content="   ")
    with pytest.raises(QwenUpstreamError):
        describe_pet_image(img_bytes())


def test_thieu_khoa_api(monkeypatch):
    monkeypatch.delenv("DASHSCOPE_API_KEY")
    monkeypatch.setattr(client_mod, "load_settings", client_mod.load_settings)
    with pytest.raises(QwenConfigError):
        describe_pet_image(img_bytes())


@pytest.mark.parametrize("exc,expected", [
    (openai.APITimeoutError(request=httpx.Request("POST", "https://x")), QwenTimeoutError),
    (openai.APIConnectionError(request=httpx.Request("POST", "https://x")), QwenUpstreamError),
    (http_exc(openai.RateLimitError, 429), QwenRateLimitError),
    (http_exc(openai.AuthenticationError, 401), QwenUnavailableError),
    (http_exc(openai.PermissionDeniedError, 403), QwenUnavailableError),
    (http_exc(openai.InternalServerError, 500), QwenUpstreamError),
    (http_exc(openai.BadRequestError, 400, {"error": {"code": "data_inspection_failed"}}), ImageRejectedError),
])
def test_anh_xa_loi_api(monkeypatch, exc, expected):
    patch(monkeypatch, exc=exc)
    with pytest.raises(expected):
        describe_pet_image(img_bytes())


def test_khoa_api_khong_lo_trong_repr(monkeypatch):
    assert "sk-test" not in repr(client_mod.load_settings())
