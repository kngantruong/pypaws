from pypaws_qwen import NO_PET, NOT_FOUND, normalize_output

GOOD = """Màu lông, hoa văn: Nâu đỏ đồng màu, ngực và bốn chân trắng
Độ dài lông: Lông ngắn, ôm sát cơ thể

Đặc điểm tai, mắt, mõm, đuôi:
- Tai: Dựng, hình tam giác
- Mắt: Hạnh nhân, màu nâu
- Mõm: Thon dài, mũi đen
- Đuôi: Chưa xác định
Dấu hiệu nhận dạng đặc biệt: Mảng lông trắng hình tam giác giữa trán"""


def test_dung_dinh_dang():
    out = normalize_output(GOOD).splitlines()
    assert out[0] == "Màu lông, hoa văn: Nâu đỏ đồng màu, ngực và bốn chân trắng"
    assert out[1] == "Độ dài lông: Lông ngắn, ôm sát cơ thể"
    assert out[2] == "Đặc điểm tai, mắt, mõm, đuôi:"
    assert out[3:7] == ["- Tai: Dựng, hình tam giác", "- Mắt: Hạnh nhân, màu nâu",
                        "- Mõm: Thon dài, mũi đen", "- Đuôi: Chưa xác định"]
    assert out[7] == "Dấu hiệu nhận dạng đặc biệt: Mảng lông trắng hình tam giác giữa trán"


def test_khong_co_thu_cung():
    assert normalize_output(NO_PET) == NO_PET
    assert normalize_output("") == NO_PET
    assert normalize_output(None) == NO_PET


def test_thieu_truong_thanh_chua_xac_dinh():
    out = normalize_output("Màu lông, hoa văn: Đen toàn thân")
    assert "Độ dài lông: " + NOT_FOUND in out
    assert "- Tai: " + NOT_FOUND in out
    assert out.endswith("Dấu hiệu nhận dạng đặc biệt: " + NOT_FOUND)


def test_viet_tren_mot_dong_va_markdown():
    raw = ("Màu lông, hoa văn: Vàng\nĐộ dài lông: Ngắn\n"
           "Đặc điểm tai, mắt, mõm, đuôi: Tai: cụp; Mắt: đen; Mõm: ngắn; Đuôi: cong\n"
           "Dấu hiệu nhận dạng đặc biệt: Đeo vòng cổ đỏ")
    out = normalize_output(raw)
    assert "- Tai: cụp" in out and "- Đuôi: cong" in out
