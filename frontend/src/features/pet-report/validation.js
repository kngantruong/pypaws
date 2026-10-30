import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  IMAGE_RULES,
  POST_TYPES,
  SPECIES,
} from './types.js';

/** Turns a byte count into a short readable text, e.g. "2.4 MB". */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Checks a single image file.
 * @param {File} file
 * @returns {string | null} A Vietnamese error message, or null if the file is valid.
 */
export function validateImageFile(file) {
  if (!IMAGE_RULES.ACCEPTED_TYPES.includes(file.type)) {
    return `"${file.name}" không phải định dạng ảnh được hỗ trợ (${IMAGE_RULES.ACCEPTED_LABEL}).`;
  }
  if (file.size > IMAGE_RULES.MAX_FILE_SIZE_BYTES) {
    const maxSize = formatFileSize(IMAGE_RULES.MAX_FILE_SIZE_BYTES);
    return `"${file.name}" có dung lượng ${formatFileSize(file.size)}, vượt quá giới hạn ${maxSize}.`;
  }
  return null;
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function validateCoordinate(value, min, max, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) return `${label} phải là một số.`;
  if (number < min || number > max) return `${label} phải nằm trong khoảng ${min} đến ${max}.`;
  return null;
}

/**
 * Validates the whole report.
 * @param {import('./types.js').PetReportFormData} formData
 * @param {File[]} images
 * @returns {Record<string, string>} Field name -> error message. Empty object means valid.
 */
export function validatePetReport(formData, images) {
  const errors = {};

  if (!Object.values(POST_TYPES).includes(formData.post_type)) {
    errors.post_type = 'Vui lòng chọn loại tin đăng.';
  }

  if (!Object.values(SPECIES).includes(formData.species)) {
    errors.species = 'Vui lòng chọn loài thú cưng.';
  }

  const description = formData.description.trim();
  if (description === '') {
    errors.description = 'Vui lòng nhập mô tả về thú cưng.';
  } else if (description.length < DESCRIPTION_MIN_LENGTH) {
    errors.description = `Mô tả cần ít nhất ${DESCRIPTION_MIN_LENGTH} ký tự để mọi người dễ nhận ra bé.`;
  } else if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Mô tả không được vượt quá ${DESCRIPTION_MAX_LENGTH} ký tự.`;
  }

  if (isBlank(formData.event_time)) {
    errors.event_time = 'Vui lòng chọn ngày và giờ.';
  } else {
    const eventDate = new Date(formData.event_time);
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
    if (Number.isNaN(eventDate.getTime())) {
      errors.event_time = 'Ngày giờ không hợp lệ.';
    } else if (eventDate.getTime() > fiveMinutesFromNow) {
      errors.event_time = 'Ngày giờ không thể ở tương lai.';
    }
  }

  if (isBlank(formData.address_detail)) {
    errors.address_detail = 'Vui lòng nhập địa chỉ cụ thể hoặc mốc dễ nhận biết.';
  }

  // Coordinates are optional, but if the user fills one in, both must be valid.
  const hasLatitude = !isBlank(formData.latitude);
  const hasLongitude = !isBlank(formData.longitude);
  if (hasLatitude || hasLongitude) {
    if (!hasLatitude) {
      errors.latitude = 'Vui lòng nhập vĩ độ (hoặc để trống cả hai ô).';
    } else {
      const latitudeError = validateCoordinate(formData.latitude, -90, 90, 'Vĩ độ');
      if (latitudeError) errors.latitude = latitudeError;
    }
    if (!hasLongitude) {
      errors.longitude = 'Vui lòng nhập kinh độ (hoặc để trống cả hai ô).';
    } else {
      const longitudeError = validateCoordinate(formData.longitude, -180, 180, 'Kinh độ');
      if (longitudeError) errors.longitude = longitudeError;
    }
  }

  if (images.length === 0) {
    errors.images = 'Vui lòng chọn ít nhất một ảnh của thú cưng.';
  } else if (images.some((file) => validateImageFile(file) !== null)) {
    errors.images = 'Có ảnh không hợp lệ. Vui lòng xóa ảnh đó và chọn lại.';
  }

  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
