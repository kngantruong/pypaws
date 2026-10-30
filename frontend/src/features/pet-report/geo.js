const EARTH_RADIUS_KM = 6371;

/**
 * Tính khoảng cách giữa hai tọa độ bằng công thức Haversine.
 * @param {number} latitude1 Vĩ độ điểm thứ nhất
 * @param {number} longitude1 Kinh độ điểm thứ nhất
 * @param {number} latitude2 Vĩ độ điểm thứ hai
 * @param {number} longitude2 Kinh độ điểm thứ hai
 * @returns {number} Khoảng cách tính bằng kilomet
 */
export function calculateDistanceKm(latitude1, longitude1, latitude2, longitude2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const lat1 = toRadians(Number(latitude1));
  const lat2 = toRadians(Number(latitude2));
  const deltaLat = toRadians(Number(latitude2) - Number(latitude1));
  const deltaLon = toRadians(Number(longitude2) - Number(longitude1));

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return EARTH_RADIUS_KM * centralAngle;
}
