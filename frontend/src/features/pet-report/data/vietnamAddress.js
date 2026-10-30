const API_BASE_URL = 'https://production.cas.so/address-kit';
const LATEST_DATE = 'latest';
const STABLE_DATE = '2025-07-01';

// Dữ liệu dự phòng để form vẫn hiển thị tỉnh/thành nếu API tạm thời không truy cập được.
const FALLBACK_PROVINCES = [
  { code: '01', name: 'Thành phố Hà Nội' },
  { code: '04', name: 'Tỉnh Cao Bằng' },
  { code: '08', name: 'Tỉnh Tuyên Quang' },
  { code: '11', name: 'Tỉnh Điện Biên' },
  { code: '12', name: 'Tỉnh Lai Châu' },
  { code: '14', name: 'Tỉnh Sơn La' },
  { code: '15', name: 'Tỉnh Lào Cai' },
  { code: '19', name: 'Tỉnh Thái Nguyên' },
  { code: '20', name: 'Tỉnh Lạng Sơn' },
  { code: '22', name: 'Tỉnh Quảng Ninh' },
  { code: '24', name: 'Tỉnh Bắc Ninh' },
  { code: '25', name: 'Tỉnh Phú Thọ' },
  { code: '31', name: 'Thành phố Hải Phòng' },
  { code: '33', name: 'Tỉnh Hưng Yên' },
  { code: '37', name: 'Tỉnh Ninh Bình' },
  { code: '38', name: 'Tỉnh Thanh Hóa' },
  { code: '40', name: 'Tỉnh Nghệ An' },
  { code: '42', name: 'Tỉnh Hà Tĩnh' },
  { code: '44', name: 'Tỉnh Quảng Trị' },
  { code: '46', name: 'Thành phố Huế' },
  { code: '48', name: 'Thành phố Đà Nẵng' },
  { code: '51', name: 'Tỉnh Quảng Ngãi' },
  { code: '52', name: 'Tỉnh Gia Lai' },
  { code: '56', name: 'Tỉnh Khánh Hòa' },
  { code: '66', name: 'Tỉnh Đắk Lắk' },
  { code: '68', name: 'Tỉnh Lâm Đồng' },
  { code: '75', name: 'Tỉnh Đồng Nai' },
  { code: '79', name: 'Thành phố Hồ Chí Minh' },
  { code: '80', name: 'Tỉnh Tây Ninh' },
  { code: '82', name: 'Tỉnh Đồng Tháp' },
  { code: '86', name: 'Tỉnh Vĩnh Long' },
  { code: '91', name: 'Tỉnh An Giang' },
  { code: '92', name: 'Thành phố Cần Thơ' },
  { code: '96', name: 'Tỉnh Cà Mau' },
];

async function requestAddressData(path) {
  const response = await fetch(`${API_BASE_URL}/${path}`);

  if (!response.ok) {
    throw new Error(`Address API trả về lỗi HTTP ${response.status}`);
  }

  return response.json();
}

// Lấy danh sách tỉnh/thành: ưu tiên dữ liệu mới nhất, sau đó dùng bản ổn định.
export async function getProvinces() {
  for (const effectiveDate of [LATEST_DATE, STABLE_DATE]) {
    try {
      const data = await requestAddressData(`${effectiveDate}/provinces`);

      if (Array.isArray(data.provinces) && data.provinces.length > 0) {
        return data.provinces;
      }
    } catch (error) {
      console.warn(`Không tải được danh sách tỉnh với mốc ${effectiveDate}:`, error);
    }
  }

  console.warn('Đang sử dụng danh sách tỉnh/thành dự phòng tích hợp trong ứng dụng.');
  return FALLBACK_PROVINCES;
}

// Lấy danh sách xã/phường theo mã tỉnh; thử latest trước rồi đến bản ổn định.
export async function getWards(provinceCode) {
  if (!provinceCode) return [];

  for (const effectiveDate of [LATEST_DATE, STABLE_DATE]) {
    try {
      const data = await requestAddressData(
        `${effectiveDate}/provinces/${encodeURIComponent(provinceCode)}/communes`
      );

      if (Array.isArray(data.communes)) {
        return data.communes;
      }
    } catch (error) {
      console.warn(`Không tải được danh sách xã/phường với mốc ${effectiveDate}:`, error);
    }
  }

  throw new Error('Không thể tải danh sách phường/xã. Vui lòng thử lại sau.');
}
