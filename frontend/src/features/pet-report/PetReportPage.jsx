import { useEffect, useRef, useState } from 'react';
import ImageUploader, { FilePreviewImage } from './components/ImageUploader.jsx';
import {
  DESCRIPTION_MAX_LENGTH,
  POST_TYPE_OPTIONS,
  SPECIES_OPTIONS,
  createInitialFormData,
} from './types.js';
import { hasErrors, validatePetReport } from './validation.js';
import './PetReportPage.css';

// Order used to find the first invalid field, and the element to focus for each field.
const FIELD_FOCUS_IDS = {
  post_type: 'pet-report-post_type-LOST',
  species: 'pet-report-species-DOG',
  description: 'pet-report-description',
  event_time: 'pet-report-event_time',
  location_text: 'pet-report-location_text',
  latitude: 'pet-report-latitude',
  longitude: 'pet-report-longitude',
  images: 'pet-report-images',
  breed: 'pet-report-breed',
  coat_color: 'pet-report-coat_color',
  appearance_notes: 'pet-report-appearance_notes',
};

const FIELD_LABELS = {
  post_type: 'Loại tin',
  species: 'Loài',
  description: 'Mô tả',
  event_time: 'Thời gian',
  location_text: 'Địa điểm',
  latitude: 'Vĩ độ',
  longitude: 'Kinh độ',
  images: 'Ảnh thú cưng',
  breed: 'Giống',
  coat_color: 'Màu lông',
  appearance_notes: 'Đặc điểm ngoại hình',
};

// Formats a Date as "YYYY-MM-DDTHH:mm" in local time, the format datetime-local expects.
function toDateTimeLocalValue(date) {
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatEventTime(value) {
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' });
}

function getOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Chuẩn hóa dữ liệu form trước khi chuyển cho backend. */
function buildPetReportPayload(formData) {
  const hasCoordinates =
    formData.latitude !== null &&
    formData.latitude !== '' &&
    formData.longitude !== null &&
    formData.longitude !== '';

  return {
    post_type: formData.post_type,
    species: formData.species,
    breed: formData.breed.trim() || null,
    coat_color: formData.coat_color.trim() || null,
    appearance_notes: formData.appearance_notes.trim() || null,
    description: formData.description.trim(),
    event_time: new Date(formData.event_time).toISOString(),
    location_text: formData.location_text.trim(),
    latitude: hasCoordinates ? Number(formData.latitude) : null,
    longitude: hasCoordinates ? Number(formData.longitude) : null,
  };
}

/**
 * Placeholder for the real API call.
 *
 * TODO(backend): connect this to the team's API. The backend team decides the endpoint
 * and how images are uploaded. One possible approach is a single multipart request:
 *
 *   const body = new FormData();
 *   Object.entries(payload).forEach(([key, value]) => {
 *     if (value !== null) body.append(key, String(value));
 *   });
 *   images.forEach((file) => body.append('images', file));
 *   body.append('cover_index', String(coverIndex));
 *   const response = await fetch(API_URL, { method: 'POST', body });
 *   if (!response.ok) throw new Error('Request failed');
 *   return response.json();
 *
 * Until then, this function intentionally does NOT pretend the report was saved.
 */
async function submitPetReport(payload, images, coverIndex) {
  console.info('[PYPAWS] Report ready for the API (not sent):', { payload, images, coverIndex });
  throw new Error('NOT_CONNECTED');
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="pet-report-field__error">
      {message}
    </p>
  );
}

function PawIcon() {
  return (
    <span className="pet-report-paw" aria-hidden="true">
      <span className="pet-report-paw__toe" />
      <span className="pet-report-paw__toe" />
      <span className="pet-report-paw__toe" />
      <span className="pet-report-paw__toe" />
      <span className="pet-report-paw__pad" />
    </span>
  );
}

export default function PetReportPage({ onBack }) {
  const [formData, setFormData] = useState(createInitialFormData);
  const [images, setImages] = useState([]); // File[] kept separate from formData
  const [coverIndex, setCoverIndex] = useState(0);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState('edit'); // 'edit' | 'review'
  const [submitStatus, setSubmitStatus] = useState('idle'); // 'idle' | 'submitting' | 'not-connected'
  const [geoStatus, setGeoStatus] = useState({ state: 'idle', message: '' });

  const formHeadingRef = useRef(null);
  const reviewHeadingRef = useRef(null);
  const isFirstRender = useRef(true);

  // Move keyboard/screen reader focus to the new section when switching steps.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const heading = step === 'review' ? reviewHeadingRef.current : formHeadingRef.current;
    heading?.focus();
  }, [step]);

  function clearErrors(fieldNames) {
    setErrors((previous) => {
      if (!fieldNames.some((name) => previous[name])) return previous;
      const next = { ...previous };
      fieldNames.forEach((name) => delete next[name]);
      return next;
    });
  }

  function updateField(name, value) {
    setFormData((previous) => ({ ...previous, [name]: value }));
    // Latitude and longitude are validated together, so clear both.
    clearErrors(name === 'latitude' || name === 'longitude' ? ['latitude', 'longitude'] : [name]);
  }

  function handleInputChange(event) {
    updateField(event.target.name, event.target.value);
  }

  function handleCoordinateChange(event) {
    const { name, value } = event.target;
    updateField(name, value === '' ? null : value);
  }

  function handleImagesChange(nextFiles, nextCoverIndex) {
    setImages(nextFiles);
    setCoverIndex(nextCoverIndex);
    clearErrors(['images']);
  }

  function handleUseCurrentLocation() {
    if (!('geolocation' in navigator)) {
      setGeoStatus({ state: 'error', message: 'Trình duyệt của bạn không hỗ trợ lấy vị trí.' });
      return;
    }
    setGeoStatus({ state: 'loading', message: 'Đang lấy vị trí hiện tại...' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((previous) => ({
          ...previous,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        clearErrors(['latitude', 'longitude']);
        setGeoStatus({ state: 'success', message: 'Đã điền vị trí hiện tại của bạn.' });
      },
      () => {
        setGeoStatus({
          state: 'error',
          message: 'Không lấy được vị trí. Bạn có thể nhập tọa độ thủ công hoặc để trống.',
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validatePetReport(formData, images);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      // Focus the first invalid field so keyboard users land right on the problem.
      const firstInvalidField = Object.keys(FIELD_FOCUS_IDS).find((name) => nextErrors[name]);
      document.getElementById(FIELD_FOCUS_IDS[firstInvalidField])?.focus();
      return;
    }

    setSubmitStatus('idle');
    setStep('review');
  }

  async function handleConfirmSubmit() {
    setSubmitStatus('submitting');
    try {
      await submitPetReport(buildPetReportPayload(formData), images, coverIndex);
      // When the real API is connected, handle success here (e.g. show the published post).
      setSubmitStatus('idle');
    } catch {
      setSubmitStatus('not-connected');
    }
  }

  const errorEntries = Object.entries(errors);
  const descriptionLength = formData.description.length;
  const maxEventTime = toDateTimeLocalValue(new Date());

  // Helper to build aria props for a field with an optional error and hint.
  function describedBy(name, hintId) {
    return [hintId, errors[name] ? `pet-report-${name}-error` : null].filter(Boolean).join(' ') || undefined;
  }

  if (step === 'review') {
    const payload = buildPetReportPayload(formData);
    // Show the cover image first in the preview.
    const orderedImages = images
      .map((file, index) => ({ file, index }))
      .sort((a, b) => (a.index === coverIndex ? -1 : b.index === coverIndex ? 1 : a.index - b.index));

    return (
      <main className="pet-report-page">
        <section className="pet-report-card" aria-labelledby="pet-report-review-title">
          <header className="pet-report-header">
            <PawIcon />
            <div>
              <h1 id="pet-report-review-title" ref={reviewHeadingRef} tabIndex={-1} className="pet-report-title">
                Xem lại tin đăng
              </h1>
              <p className="pet-report-intro">Kiểm tra lại thông tin trước khi gửi.</p>
            </div>
          </header>

          <div className="pet-report-notice" role="note">
            <strong>Lưu ý:</strong> Tin của bạn <strong>chưa được lưu hoặc đăng</strong>. Đây chỉ là bản xem trước
            trên máy của bạn.
          </div>

          <div className="pet-report-review">
            <div className="pet-report-review__tags">
              <span className={`pet-report-tag pet-report-tag--${payload.post_type.toLowerCase()}`}>
                {getOptionLabel(POST_TYPE_OPTIONS, payload.post_type)}
              </span>
              <span className="pet-report-tag">{getOptionLabel(SPECIES_OPTIONS, payload.species)}</span>
            </div>


<dl className="pet-report-review__list">
  <div className="pet-report-review__row">
    <dt>Giống</dt>
    <dd>{payload.breed || 'Chưa xác định'}</dd>
  </div>

  <div className="pet-report-review__row">
    <dt>Màu lông</dt>
    <dd>{payload.coat_color || 'Chưa xác định'}</dd>
  </div>

  <div className="pet-report-review__row">
    <dt>Đặc điểm ngoại hình</dt>
    <dd>{payload.appearance_notes || 'Chưa cung cấp'}</dd>
  </div>

  <div className="pet-report-review__row">
    <dt>Mô tả</dt>
    <dd className="pet-report-review__description">
      {payload.description}
    </dd>
  </div>

  <div className="pet-report-review__row">
    <dt>Thời gian</dt>
    <dd>{formatEventTime(formData.event_time)}</dd>
  </div>

  <div className="pet-report-review__row">
    <dt>Địa điểm</dt>
    <dd>{payload.location_text}</dd>
  </div>

  <div className="pet-report-review__row">
    <dt>Tọa độ</dt>
    <dd>
      {payload.latitude !== null
        ? `${payload.latitude}, ${payload.longitude}`
        : 'Không cung cấp'}
    </dd>
  </div>
</dl>


            <div>
              <h2 className="pet-report-section-title">Ảnh ({images.length})</h2>
              <ul className="pet-report-review__images">
                {orderedImages.map(({ file, index }) => (
                  <li
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className={`pet-report-review__image${index === coverIndex ? ' pet-report-review__image--cover' : ''}`}
                  >
                    <FilePreviewImage file={file} alt={`Ảnh thú cưng: ${file.name}`} />
                    {index === coverIndex && <span className="pet-report-review__badge">Ảnh bìa</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div aria-live="polite">
            {submitStatus === 'not-connected' && (
              <div className="pet-report-notice pet-report-notice--warning">
                Chức năng gửi tin chưa được kết nối với máy chủ, nên tin <strong>chưa được gửi</strong>. Dữ liệu của
                bạn vẫn được giữ nguyên trên trang này.
              </div>
            )}
          </div>

          <div className="pet-report-actions">
            <button type="button" className="pet-report-button pet-report-button--secondary" onClick={() => setStep('edit')}>
              Quay lại chỉnh sửa
            </button>
            <button
              type="button"
              className="pet-report-button pet-report-button--primary"
              onClick={handleConfirmSubmit}
              disabled={submitStatus === 'submitting'}
            >
              {submitStatus === 'submitting' ? 'Đang gửi...' : 'Gửi tin đăng'}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="pet-report-page">
      <section className="pet-report-card" aria-labelledby="pet-report-title">
        {onBack && (
          <button
            type="button"
            className="pet-report-button pet-report-button--secondary"
            onClick={onBack}
          >
            ← Quay về trang chủ
          </button>
        )}

        <header className="pet-report-header">
          <PawIcon />
          <div>
            <h1 id="pet-report-title" ref={formHeadingRef} tabIndex={-1} className="pet-report-title">
              Đăng tin tìm thú cưng
            </h1>
            <p className="pet-report-intro">
              Hãy cung cấp thông tin và hình ảnh của thú cưng. Càng chi tiết, cộng đồng PYPAWS càng dễ nhận ra bé và
              giúp bé sớm về nhà.
            </p>
          </div>
        </header>

        {errorEntries.length > 0 && (
          <div className="pet-report-error-summary" role="alert">
            <h2 className="pet-report-error-summary__title">Vui lòng kiểm tra lại {errorEntries.length} mục:</h2>
            <ul>
              {errorEntries.map(([name, message]) => (
                <li key={name}>
                  <a
                    href={`#${FIELD_FOCUS_IDS[name]}`}
                    onClick={(event) => {
                      event.preventDefault();
                      document.getElementById(FIELD_FOCUS_IDS[name])?.focus();
                    }}
                  >
                    {FIELD_LABELS[name]}: {message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form className="pet-report-form" onSubmit={handleSubmit} noValidate>
          {/* Report type */}
          <fieldset className="pet-report-field">
            <legend className="pet-report-label">
              Loại tin <span className="pet-report-required">(bắt buộc)</span>
            </legend>
            <div className="pet-report-choice-grid">
              {POST_TYPE_OPTIONS.map((option) => (
                <div key={option.value} className="pet-report-choice">
                  <input
                    type="radio"
                    id={`pet-report-post_type-${option.value}`}
                    name="post_type"
                    value={option.value}
                    checked={formData.post_type === option.value}
                    onChange={handleInputChange}
                    aria-describedby={describedBy('post_type')}
                    aria-invalid={errors.post_type ? 'true' : undefined}
                  />
                  <label htmlFor={`pet-report-post_type-${option.value}`} className="pet-report-choice__label">
                    <span className="pet-report-choice__title">{option.label}</span>
                    <span className="pet-report-choice__hint">{option.hint}</span>
                  </label>
                </div>
              ))}
            </div>
            <FieldError id="pet-report-post_type-error" message={errors.post_type} />
          </fieldset>

          {/* Species */}
          <fieldset className="pet-report-field">
            <legend className="pet-report-label">
              Loài <span className="pet-report-required">(bắt buộc)</span>
            </legend>
            <div className="pet-report-choice-grid pet-report-choice-grid--compact">
              {SPECIES_OPTIONS.map((option) => (
                <div key={option.value} className="pet-report-choice">
                  <input
                    type="radio"
                    id={`pet-report-species-${option.value}`}
                    name="species"
                    value={option.value}
                    checked={formData.species === option.value}
                    onChange={handleInputChange}
                    aria-describedby={describedBy('species')}
                    aria-invalid={errors.species ? 'true' : undefined}
                  />
                  <label htmlFor={`pet-report-species-${option.value}`} className="pet-report-choice__label">
                    <span className="pet-report-choice__title">{option.label}</span>
                  </label>
                </div>
              ))}
            </div>
            <FieldError id="pet-report-species-error" message={errors.species} />
          </fieldset>

           {/* Breed */}
            <div className="pet-report-field">
                <label htmlFor="pet-report-breed" className="pet-report-label">
                    Giống <span className="pet-report-optional">(không bắt buộc)</span>
                </label>

                <input
                    id="pet-report-breed"
                    name="breed"
                    type="text"
                    className="pet-report-input"
                    maxLength={100}
                    placeholder="Ví dụ: Poodle, Corgi..."
                    value={formData.breed}
                    onChange={handleInputChange}
                    aria-describedby={describedBy('breed')}
                    aria-invalid={errors.breed ? 'true' : undefined}
                />

                <FieldError id="pet-report-breed-error" message={errors.breed} />
            </div>

            {/* Coat color */}
            <div className="pet-report-field">
                <label htmlFor="pet-report-coat_color" className="pet-report-label">
                    Màu lông <span className="pet-report-optional">(không bắt buộc)</span>
                </label>

                <input
                    id="pet-report-coat_color"
                    name="coat_color"
                    type="text"
                    className="pet-report-input"
                    maxLength={50}
                    placeholder="Ví dụ: Trắng, vàng nâu, đen trắng..."
                    value={formData.coat_color}
                    onChange={handleInputChange}
                    aria-describedby={describedBy('coat_color')}
                    aria-invalid={errors.coat_color ? 'true' : undefined}
                />

                <FieldError
                    id="pet-report-coat_color-error"
                    message={errors.coat_color}
                />
            </div>

            {/* Appearance notes */}
            <div className="pet-report-field">
                <label
                    htmlFor="pet-report-appearance_notes"
                    className="pet-report-label"
                >
                    Đặc điểm ngoại hình
                    <span className="pet-report-optional"> (không bắt buộc)</span>
                </label>

                <textarea
                    id="pet-report-appearance_notes"
                    name="appearance_notes"
                    className="pet-report-input pet-report-textarea"
                    rows={3}
                    maxLength={300}
                    placeholder="Ví dụ: tai cụp, đuôi ngắn, có đốm nâu ở chân..."
                    value={formData.appearance_notes}
                    onChange={handleInputChange}
                    aria-describedby={describedBy('appearance_notes')}
                    aria-invalid={errors.appearance_notes ? 'true' : undefined}
                />

                <FieldError
                    id="pet-report-appearance_notes-error"
                    message={errors.appearance_notes}
                />
            </div>

          {/* Description */}
          <div className="pet-report-field">
            <label htmlFor="pet-report-description" className="pet-report-label">
              Mô tả <span className="pet-report-required">(bắt buộc)</span>
            </label>
            <p id="pet-report-description-hint" className="pet-report-hint">
              Ví dụ: màu lông, giống, kích thước, vòng cổ, đặc điểm nhận dạng, tính cách...
            </p>
            <textarea
              id="pet-report-description"
              name="description"
              className="pet-report-input pet-report-textarea"
              rows={5}
              maxLength={DESCRIPTION_MAX_LENGTH}
              value={formData.description}
              onChange={handleInputChange}
              aria-describedby={describedBy('description', 'pet-report-description-hint pet-report-description-count')}
              aria-invalid={errors.description ? 'true' : undefined}
            />
            <p id="pet-report-description-count" className="pet-report-counter">
              {descriptionLength}/{DESCRIPTION_MAX_LENGTH} ký tự
            </p>
            <FieldError id="pet-report-description-error" message={errors.description} />
          </div>

          {/* Event time */}
          <div className="pet-report-field">
            <label htmlFor="pet-report-event_time" className="pet-report-label">
              {formData.post_type === 'FOUND' ? 'Thời gian tìm thấy' : 'Thời gian bị lạc'}{' '}
              <span className="pet-report-required">(bắt buộc)</span>
            </label>
            <input
              id="pet-report-event_time"
              name="event_time"
              type="datetime-local"
              className="pet-report-input"
              max={maxEventTime}
              value={formData.event_time}
              onChange={handleInputChange}
              aria-describedby={describedBy('event_time')}
              aria-invalid={errors.event_time ? 'true' : undefined}
            />
            <FieldError id="pet-report-event_time-error" message={errors.event_time} />
          </div>

          {/* Location */}
          <div className="pet-report-field">
            <label htmlFor="pet-report-location_text" className="pet-report-label">
              {formData.post_type === 'FOUND' ? 'Địa điểm tìm thấy' : 'Địa điểm bị lạc'}{' '}
              <span className="pet-report-required">(bắt buộc)</span>
            </label>
            <p id="pet-report-location_text-hint" className="pet-report-hint">
              Ví dụ: Công viên Tao Đàn, gần cổng đường Trương Định, Quận 1, TP.HCM
            </p>
            <input
              id="pet-report-location_text"
              name="location_text"
              type="text"
              className="pet-report-input"
              autoComplete="street-address"
              value={formData.location_text}
              onChange={handleInputChange}
              aria-describedby={describedBy('location_text', 'pet-report-location_text-hint')}
              aria-invalid={errors.location_text ? 'true' : undefined}
            />
            <FieldError id="pet-report-location_text-error" message={errors.location_text} />
          </div>

          {/* Optional coordinates */}
          <fieldset className="pet-report-field pet-report-coordinates">
            <legend className="pet-report-label">
              Tọa độ <span className="pet-report-optional">(không bắt buộc)</span>
            </legend>
            <p id="pet-report-coordinates-hint" className="pet-report-hint">
              Giúp hệ thống tìm các tin gần nhau chính xác hơn.
            </p>
            <div className="pet-report-coordinates__grid">
              <div className="pet-report-coordinates__item">
                <label htmlFor="pet-report-latitude" className="pet-report-sublabel">
                  Vĩ độ
                </label>
                <input
                  id="pet-report-latitude"
                  name="latitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={-90}
                  max={90}
                  placeholder="10.776889"
                  className="pet-report-input"
                  value={formData.latitude ?? ''}
                  onChange={handleCoordinateChange}
                  aria-describedby={describedBy('latitude', 'pet-report-coordinates-hint')}
                  aria-invalid={errors.latitude ? 'true' : undefined}
                />
                <FieldError id="pet-report-latitude-error" message={errors.latitude} />
              </div>
              <div className="pet-report-coordinates__item">
                <label htmlFor="pet-report-longitude" className="pet-report-sublabel">
                  Kinh độ
                </label>
                <input
                  id="pet-report-longitude"
                  name="longitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={-180}
                  max={180}
                  placeholder="106.700806"
                  className="pet-report-input"
                  value={formData.longitude ?? ''}
                  onChange={handleCoordinateChange}
                  aria-describedby={describedBy('longitude', 'pet-report-coordinates-hint')}
                  aria-invalid={errors.longitude ? 'true' : undefined}
                />
                <FieldError id="pet-report-longitude-error" message={errors.longitude} />
              </div>
            </div>
            <div className="pet-report-geo">
              <button
                type="button"
                className="pet-report-button pet-report-button--secondary pet-report-button--small"
                onClick={handleUseCurrentLocation}
                disabled={geoStatus.state === 'loading'}
              >
                Dùng vị trí hiện tại
              </button>
              <p
                className={`pet-report-geo__message${geoStatus.state === 'error' ? ' pet-report-geo__message--error' : ''}`}
                aria-live="polite"
              >
                {geoStatus.message}
              </p>
            </div>
          </fieldset>

          {/* Images */}
          <fieldset className="pet-report-field">
            <legend className="pet-report-label">
              Ảnh thú cưng <span className="pet-report-required">(bắt buộc)</span>
            </legend>
            <ImageUploader
              id="pet-report-images"
              files={images}
              coverIndex={coverIndex}
              onChange={handleImagesChange}
              error={errors.images}
            />
          </fieldset>

          <div className="pet-report-actions">
            <button type="submit" className="pet-report-button pet-report-button--primary">
              Xem lại tin đăng
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
