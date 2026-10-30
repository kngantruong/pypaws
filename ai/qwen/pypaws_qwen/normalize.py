"""Chuẩn hóa kết quả mô hình về định dạng cố định. GIỮ NGUYÊN hàm từ notebook Colab (test_qwen_2_5.py)."""
import re

from .constants import BODY_PARTS, FIELDS, NO_PET, NOT_FOUND


def normalize_output(raw):
    if not raw:
        return NO_PET

    raw = raw.strip().replace("\r\n", "\n").replace("\r", "\n")

    if NO_PET.lower() in raw.lower():
        return NO_PET

    patterns = {
        "Màu lông, hoa văn": r"Màu lông\s*,?\s*hoa văn\s*:",
        "Độ dài lông": r"Độ dài lông\s*:",
        "Đặc điểm tai, mắt, mõm, đuôi":
            r"Đặc điểm tai\s*,?\s*mắt\s*,?\s*mõm\s*,?\s*đuôi\s*:",
        "Dấu hiệu nhận dạng đặc biệt":
            r"Dấu hiệu nhận dạng đặc biệt\s*:"
    }

    result = {field: "" for field in FIELDS}

    combined_pattern = "|".join(
        f"(?P<F{i}>{pattern})"
        for i, pattern in enumerate(patterns.values())
    )

    matches = list(re.finditer(combined_pattern, raw, re.IGNORECASE))
    field_names = list(patterns.keys())

    for i, match in enumerate(matches):
        field = field_names[int(match.lastgroup[1:])]
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw)
        result[field] = raw[start:end].strip()

    output = []

    # Màu lông và độ dài lông
    for field in FIELDS[:2]:
        value = re.sub(r"\s+", " ", result[field]).strip(" -*•")
        output.append(f"{field}: {value or NOT_FOUND}")

    # Tai, mắt, mõm, đuôi
    body_text = result["Đặc điểm tai, mắt, mõm, đuôi"]
    body_values = {part: NOT_FOUND for part in BODY_PARTS}

    body_pattern = re.compile(
        r"(?:^|[-*•\n;]\s*)(Tai|Mắt|Mõm|Đuôi)\s*:\s*",
        re.IGNORECASE
    )

    body_matches = list(body_pattern.finditer(body_text))

    for i, match in enumerate(body_matches):
        part = match.group(1).capitalize()
        start = match.end()
        end = body_matches[i + 1].start() if i + 1 < len(body_matches) else len(body_text)

        value = body_text[start:end]
        value = re.sub(r"^[\-*•\s]+", "", value)
        value = re.sub(r"[\n]+", " ", value).strip(" -;")

        if value:
            body_values[part] = value

    output.append("Đặc điểm tai, mắt, mõm, đuôi:")
    for part in BODY_PARTS:
        output.append(f"- {part}: {body_values[part]}")

    # Dấu hiệu nhận dạng
    value = re.sub(
        r"\s+", " ", result["Dấu hiệu nhận dạng đặc biệt"]
    ).strip(" -*•")

    output.append(
        f"Dấu hiệu nhận dạng đặc biệt: {value or NOT_FOUND}"
    )

    return "\n".join(output)
