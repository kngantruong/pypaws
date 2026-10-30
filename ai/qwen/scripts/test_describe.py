"""Thử mô tả ảnh bằng Qwen API từ dòng lệnh hoặc Colab, KHÔNG cần chạy backend.

Cách dùng:
    export DASHSCOPE_API_KEY=sk-...        # hoặc đặt trong file .env
    python scripts/test_describe.py anh1.jpg anh2.png
    python scripts/test_describe.py test_images/*.jpg --csv ketqua_qwen.csv
"""
import argparse
import csv
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))   # chạy được cả khi chưa pip install -e

from pypaws_qwen import PyPawsQwenError, describe_pet_image   # noqa: E402


def main():
    p = argparse.ArgumentParser()
    p.add_argument("images", nargs="+", help="Đường dẫn ảnh (jpg, png, webp)")
    p.add_argument("--csv", help="Lưu kết quả ra CSV (cột ten_anh, mo_ta) để nạp thử vào SQL Server")
    args = p.parse_args()

    rows = []
    for path in args.images:
        print("=" * 70, f"\n📷 {os.path.basename(path)}")
        try:
            with open(path, "rb") as f:
                r = describe_pet_image(f.read())
        except PyPawsQwenError as e:
            print(f"❌ [{e.code}] {e.public_message}  (chi tiết: {e.detail})")
            continue
        except OSError as e:
            print(f"❌ Không đọc được tệp: {e}")
            continue
        print(r.description if r.is_pet else f"⚠️ {r.message}")
        print(f"\n(model={r.model} | {r.elapsed_ms} ms | token={r.usage})")
        rows.append({"ten_anh": os.path.basename(path), "mo_ta": r.description})

    if args.csv and rows:
        with open(args.csv, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=["ten_anh", "mo_ta"])
            w.writeheader(); w.writerows(rows)
        print(f"\nĐã lưu {len(rows)} kết quả: {args.csv}")


if __name__ == "__main__":
    main()
