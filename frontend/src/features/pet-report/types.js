// Shared constants for the PYPAWS pet report feature.
// Plain JavaScript only — the JSDoc comments help editors show hints without TypeScript.

/** Machine values for the report type. Must match the backend exactly. */
export const POST_TYPES = Object.freeze({
  LOST: 'LOST',
  FOUND: 'FOUND',
});

/** Machine values for the species. Must match the backend exactly. */
export const SPECIES = Object.freeze({
  DOG: 'DOG',
  CAT: 'CAT',
});

export const POST_TYPE_OPTIONS = [
  {
    value: POST_TYPES.LOST,
    label: 'Tôi bị lạc mất thú cưng',
    hint: 'Thú cưng của bạn đã đi lạc và bạn đang tìm bé.',
  },
  {
    value: POST_TYPES.FOUND,
    label: 'Tôi tìm thấy thú cưng',
    hint: 'Bạn đã gặp một bé đi lạc và muốn tìm chủ cho bé.',
  },
];

export const SPECIES_OPTIONS = [
  { value: SPECIES.DOG, label: 'Chó' },
  { value: SPECIES.CAT, label: 'Mèo' },
];

/**
 * @typedef {Object} PetReportFormData
 * @property {'LOST' | 'FOUND'} post_type
 * @property {'DOG' | 'CAT'} species
 * @property {string} description
 * @property {string} event_time   Value from <input type="datetime-local">, e.g. "2026-10-24T08:30"
 * @property {string} location_text
 * @property {string | null} latitude   Kept as text while typing, converted to a number on submit
 * @property {string | null} longitude  Kept as text while typing, converted to a number on submit
 */

/** @type {Readonly<PetReportFormData>} */

export const INITIAL_FORM_DATA = Object.freeze({
  post_type: POST_TYPES.LOST,
  species: SPECIES.DOG,
  breed: '',
  coat_color: '',
  appearance_notes: '',
  description: '',
  event_time: '',
  location_text: '',
  latitude: null,
  longitude: null,
});


/** Returns a fresh, editable copy of the initial form data. */
export function createInitialFormData() {
  return { ...INITIAL_FORM_DATA };
}


export const IMAGE_RULES = Object.freeze({
  ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ACCEPTED_LABEL: 'JPG, PNG, WEBP hoặc GIF',
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  MAX_FILES: 6,
});

export const DESCRIPTION_MIN_LENGTH = 10;
export const DESCRIPTION_MAX_LENGTH = 1000;
