from io import BytesIO

import pytest
from PIL import Image

from pypaws_qwen import (ImageTooLargeError, InvalidImageError, UnsupportedImageFormatError,
                         load_settings)
from pypaws_qwen.images import prepare_image


@pytest.fixture
def settings(monkeypatch):
    monkeypatch.setenv("QWEN_API_KEY", "sk-test"); monkeypatch.setenv("QWEN_MODEL", "mo-hinh-thu")
    return load_settings()


def make(fmt="JPEG", size=(300, 200), mode="RGB", **kw):
    buf = BytesIO()
    Image.new(mode, size, (200, 120, 60) if mode == "RGB" else (200, 120, 60, 128)).save(buf, fmt, **kw)
    return buf.getvalue()


def test_anh_hop_le_tra_ve_jpeg(settings):
    out = prepare_image(make("PNG", mode="RGBA"), settings)
    assert Image.open(BytesIO(out)).format == "JPEG"


def test_thu_nho_canh_dai(settings):
    out = prepare_image(make("JPEG", size=(3000, 1500)), settings)
    assert max(Image.open(BytesIO(out)).size) <= settings.image_max_side


def test_xoa_exif_gps(settings):
    img = Image.new("RGB", (300, 200), (10, 20, 30))
    exif = Image.Exif(); exif[0x010F] = "TestMaker"
    buf = BytesIO(); img.save(buf, "JPEG", exif=exif)
    assert Image.open(BytesIO(buf.getvalue())).getexif().get(0x010F) == "TestMaker"
    out = prepare_image(buf.getvalue(), settings)
    assert not Image.open(BytesIO(out)).getexif()


def test_tep_rong_hoac_khong_phai_anh(settings):
    with pytest.raises(InvalidImageError):
        prepare_image(b"", settings)
    with pytest.raises(InvalidImageError):
        prepare_image(b"day khong phai anh", settings)


def test_dinh_dang_khong_ho_tro(settings):
    with pytest.raises(UnsupportedImageFormatError):
        prepare_image(make("GIF"), settings)
    with pytest.raises(UnsupportedImageFormatError):
        prepare_image(make("BMP"), settings)


def test_anh_qua_nang_hoac_qua_nhieu_diem_anh(settings, monkeypatch):
    monkeypatch.setenv("QWEN_MAX_IMAGE_MB", "1")
    s = load_settings()
    with pytest.raises(ImageTooLargeError):
        prepare_image(b"0" * (2 * 1024 * 1024), s)
    monkeypatch.setenv("QWEN_MAX_IMAGE_PIXELS", "10000")
    with pytest.raises(ImageTooLargeError):
        prepare_image(make("JPEG", size=(300, 200)), load_settings())


def test_anh_qua_nho(settings):
    with pytest.raises(InvalidImageError):
        prepare_image(make("JPEG", size=(20, 20)), settings)


def test_anh_bi_cat_cut(settings):
    data = make("PNG", size=(400, 400))
    with pytest.raises(InvalidImageError):
        prepare_image(data[: len(data) // 2], settings)
