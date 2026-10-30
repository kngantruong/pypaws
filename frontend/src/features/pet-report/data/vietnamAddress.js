import provincesData from './provinces.json';
import wardsData from './wards.json';

// Dữ liệu được đóng gói cùng ứng dụng: không phụ thuộc API hoặc kết nối mạng.
export async function getProvinces() {
  return provincesData.map((province) => ({
    code: String(province.code),
    name: province.nameWithType || province.name,
  }));
}

export async function getWards(provinceCode) {
  if (!provinceCode) return [];

  return wardsData
    .filter((ward) => String(ward.provinceCode) === String(provinceCode))
    .map((ward) => ({
      code: String(ward.code),
      name: ward.nameWithType || ward.name,
    }));
}
