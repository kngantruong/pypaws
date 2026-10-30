const API_BASE_URL = 'https://production.cas.so/address-kit';
const EFFECTIVE_DATE = '2025-07-01';

// Lấy danh sách 34 tỉnh/thành phố
export async function getProvinces() {
  const response = await fetch(
    `${API_BASE_URL}/${EFFECTIVE_DATE}/provinces`
  );

  if (!response.ok) {
    throw new Error('Không thể tải danh sách tỉnh/thành phố.');
  }

  const data = await response.json();

  return data.provinces || [];
}

// Lấy danh sách phường/xã theo tỉnh/thành phố
export async function getWards(provinceCode) {
  if (!provinceCode) return [];

  const response = await fetch(
    `${API_BASE_URL}/${EFFECTIVE_DATE}/provinces/${provinceCode}/communes`
  );

  if (!response.ok) {
    throw new Error('Không thể tải danh sách phường/xã.');
  }

  const data = await response.json();

  return data.communes || [];
}