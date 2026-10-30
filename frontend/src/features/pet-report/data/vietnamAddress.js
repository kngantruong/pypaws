import {
  getProvinces as getBundledProvinces,
  getWardsByProvince,
} from 'vietnam-address-kit';

// Dữ liệu được đóng gói cùng ứng dụng: không phụ thuộc API hoặc kết nối mạng.
export async function getProvinces() {
  return getBundledProvinces().map((province) => ({
    code: String(province.code),
    name: province.nameWithType || province.name,
  }));
}

export async function getWards(provinceCode) {
  if (!provinceCode) return [];

  return getWardsByProvince(String(provinceCode)).map((ward) => ({
    code: String(ward.code),
    name: ward.nameWithType || ward.name,
  }));
}
