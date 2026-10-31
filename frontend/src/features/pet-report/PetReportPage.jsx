import { useEffect, useRef, useState } from 'react';

import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import { getProvinces, getWards } from './data/vietnamAddress.js';

import ImageUploader, {
  FilePreviewImage,
} from './components/ImageUploader.jsx';

import {
  DESCRIPTION_MAX_LENGTH,
  POST_TYPE_OPTIONS,
  SPECIES_OPTIONS,
  createInitialFormData,
} from './types.js';

import {
  hasErrors,
  validatePetReport,
} from './validation.js';

import './PetReportPage.css';


// ======================================================
// 1. CONSTANTS
// ======================================================

const FIELD_FOCUS_IDS = {
  post_type: 'pet-report-post_type',
  species: 'pet-report-species',
  description: 'pet-report-description',
  event_time: 'pet-report-event_time',
  location_text: 'pet-report-address_detail',
  province: 'pet-report-province',
  ward: 'pet-report-ward',
  latitude: 'pet-report-map-search',
  longitude: 'pet-report-map-search',
  images: 'pet-report-images',
  address_detail: 'pet-report-address_detail',
};

const FIELD_LABELS = {
  post_type: 'Loại tin',
  species: 'Loài',
  description: 'Mô tả',
  event_time: 'Thời gian',
  location_text: 'Địa điểm',
  province: 'Tỉnh/thành phố',
  ward: 'Phường/xã',
  latitude: 'Vĩ độ',
  longitude: 'Kinh độ',
  images: 'Ảnh thú cưng',
  address_detail: 'Địa chỉ cụ thể',
};

function normalizeAddressSearch(value = '') {
  return value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

const DEFAULT_MAP_POSITION = [10.7769, 106.7009];


// ======================================================
// 2. HELPER FUNCTIONS
// ======================================================

// Chuyển Date sang định dạng datetime-local.
function toDateTimeLocalValue(date) {
  const pad = (number) => String(number).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}T${pad(date.getHours())}:` +
    `${pad(date.getMinutes())}`
  );
}


// Hiển thị thời gian theo định dạng Việt Nam.
function formatEventTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Không xác định';
  }

  return date.toLocaleString('vi-VN', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
}


// Lấy label từ danh sách options.
function getOptionLabel(options, value) {
  return (
    options.find((option) => option.value === value)?.label ?? value
  );
}


// Chuẩn hóa dữ liệu trước khi gửi backend.
function buildPetReportPayload(formData) {
  const hasCoordinates =
    formData.latitude !== null &&
    formData.latitude !== '' &&
    formData.longitude !== null &&
    formData.longitude !== '';

  const eventDate = new Date(formData.event_time);

  if (Number.isNaN(eventDate.getTime())) {
    throw new Error('INVALID_EVENT_TIME');
  }

  return {
    post_type: formData.post_type,
    species: formData.species,
    gender: formData.gender || null,

    address_detail: formData.address_detail.trim(),
    province: formData.province || null,
    ward: formData.ward || null,

    description: formData.description.trim(),

    event_time: eventDate.toISOString(),

    location_text: [formData.address_detail, formData.ward, formData.province].filter(Boolean).join(', '),

    latitude: hasCoordinates
      ? Number(formData.latitude)
      : null,

    longitude: hasCoordinates
      ? Number(formData.longitude)
      : null,
  };
}


// ======================================================
// 3. API PLACEHOLDER
// ======================================================

// TODO: Kết nối API backend khi nhóm hoàn thành endpoint.
//
// Hiện tại hàm này chỉ thông báo chưa kết nối API,
// không giả lập việc đăng tin thành công.

async function submitPetReport(payload, images, coverIndex) {
  console.info('[PYPAWS] Report ready for API:', {
    payload,
    images,
    coverIndex,
  });

  throw new Error('NOT_CONNECTED');
}


// ======================================================
// 4. REUSABLE COMPONENTS
// ======================================================

function FieldError({ id, message }) {
  if (!message) return null;

  return (
    <p
      id={id}
      className="pet-report-field__error"
    >
      {message}
    </p>
  );
}


function PawIcon() {
  return (
    <span
      className="pet-report-paw"
      aria-hidden="true"
    >
      <span className="pet-report-paw__toe" />
      <span className="pet-report-paw__toe" />
      <span className="pet-report-paw__toe" />
      <span className="pet-report-paw__toe" />
      <span className="pet-report-paw__pad" />
    </span>
  );
}


// Điều chỉnh kích thước bản đồ khi giao diện thay đổi.
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
}


// Cập nhật vị trí trung tâm bản đồ khi tọa độ thay đổi.
function MapViewUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, map.getZoom(), {
      animate: true,
    });
  }, [map, position]);

  return null;
}


// Ghim bản đồ có thể kéo thả và chọn bằng cách click.
function MapMarker({ position, onPositionChange }) {
  const markerRef = useRef(null);

  useMapEvents({
    click(event) {
      onPositionChange(event.latlng);
    },
  });

  return (
    <Marker
      position={position}
      draggable={true}
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const marker = markerRef.current;

          if (marker) {
            onPositionChange(marker.getLatLng());
          }
        },
      }}
    />
  );
}


// ======================================================
// 5. MAIN COMPONENT
// ======================================================

export default function PetReportPage({
  onBack,
  initialPostType = 'LOST',
}) {

  // --------------------------------------------------
  // 5.1. STATE
  // --------------------------------------------------

  const [formData, setFormData] = useState(() => ({
    ...createInitialFormData(),
    post_type: initialPostType,
  }));

  const [images, setImages] = useState([]);
  const [coverIndex, setCoverIndex] = useState(0);

  const [errors, setErrors] = useState({});

  const [step, setStep] = useState('edit');

  const [submitStatus, setSubmitStatus] = useState('idle');

  const [mapPosition, setMapPosition] = useState(DEFAULT_MAP_POSITION);
  const [mapLocationConfirmed, setMapLocationConfirmed] = useState(false);

  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [provinceInput, setProvinceInput] = useState('');
  const [wardInput, setWardInput] = useState('');
  const [isProvinceListOpen, setIsProvinceListOpen] = useState(false);
  const [isWardListOpen, setIsWardListOpen] = useState(false);

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);

  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState('');

  // --------------------------------------------------
  // 5.2. REFS
  // --------------------------------------------------

  const formHeadingRef = useRef(null);
  const reviewHeadingRef = useRef(null);

  const isFirstRender = useRef(true);

  const provinceRequestRef = useRef(0);
  const wardRequestRef = useRef(0);
  const locationRequestRef = useRef(0);

  // --------------------------------------------------
  // 5.3. SYNC POST TYPE
  // --------------------------------------------------

  useEffect(() => {
    setFormData((previous) => ({
      ...previous,
      post_type: initialPostType,
    }));
  }, [initialPostType]);


  // --------------------------------------------------
  // 5.4. LOAD PROVINCES
  // --------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    async function loadProvinces() {
      try {
        setIsLoadingProvinces(true);

        const data = await getProvinces();

        if (isMounted) {
          setProvinces(data);
        }
      } catch (error) {
        console.error('Lỗi tải tỉnh/thành phố:', error);

        if (isMounted) {
          setLocationSearchError(
            'Không thể tải danh sách tỉnh/thành phố. Bạn hãy thử tải lại trang.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingProvinces(false);
        }
      }
    }

    loadProvinces();

    return () => {
      isMounted = false;
    };
  }, []);


  // --------------------------------------------------
  // 5.5. FOCUS WHEN SWITCHING STEPS
  // --------------------------------------------------

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const heading =
      step === 'review'
        ? reviewHeadingRef.current
        : formHeadingRef.current;

    heading?.focus();
  }, [step]);


  // --------------------------------------------------
  // 5.6. FORM UTILITIES
  // --------------------------------------------------

  function clearErrors(fieldNames) {
    setErrors((previous) => {
      if (!fieldNames.some((name) => previous[name])) {
        return previous;
      }

      const next = { ...previous };

      fieldNames.forEach((name) => {
        delete next[name];
      });

      return next;
    });
  }


  function updateField(name, value) {
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (name === 'latitude' || name === 'longitude') {
      clearErrors(['latitude', 'longitude']);
    } else {
      clearErrors([name]);
    }
  }


  function handleInputChange(event) {
    const { name, value } = event.target;

    updateField(name, value);
  }


  // Cho phép tìm nhanh tỉnh/thành bằng cách gõ tên hoặc chọn từ gợi ý.
  function handleProvinceTextChange(event) {
    setProvinceInput(event.target.value);
    setIsProvinceListOpen(true);
  }

  function handleWardTextChange(event) {
    setWardInput(event.target.value);
    setIsWardListOpen(true);
  }

  function chooseProvince(province) {
    setProvinceInput(province.name);
    setIsProvinceListOpen(false);
    handleProvinceChange({ target: { value: String(province.code) } });
  }

  function chooseWard(ward) {
    setWardInput(ward.name);
    setIsWardListOpen(false);
    handleWardChange({ target: { value: String(ward.code) } });
  }

  // --------------------------------------------------
  // 5.7. PROVINCE CHANGE
  // --------------------------------------------------

  async function handleProvinceChange(event) {
    const provinceCode = event.target.value;
    const requestId = ++provinceRequestRef.current;

    // Hủy hiệu lực các request phường/xã trước đó.
    wardRequestRef.current += 1;

    const selectedProvince = provinces.find(
      (province) => String(province.code) === provinceCode
    );

    setFormData((previous) => ({
      ...previous,
      province: selectedProvince?.name || '',
      ward: '',
      location_text: previous.address_detail || '',
      latitude: null,
      longitude: null,
    }));

    setProvinceInput(selectedProvince?.name || '');
    setWardInput('');
    setIsWardListOpen(false);
    setWards([]);
    setLocationSearchError('');
    setMapLocationConfirmed(false);

    clearErrors([
      'province',
      'ward',
      'location_text',
      'latitude',
      'longitude',
    ]);

    if (!provinceCode || !selectedProvince) {
      setFormData((previous) => ({
        ...previous,
        location_text: '',
      }));
      setMapPosition(DEFAULT_MAP_POSITION);
      setIsSearchingLocation(false);
      setIsLoadingWards(false);
      locationRequestRef.current += 1;
      return;
    }

    // Tải xã/phường ngay từ dữ liệu cục bộ; không chờ dịch vụ bản đồ.
    setIsLoadingWards(true);
    try {
      const data = await getWards(provinceCode);

      if (requestId === provinceRequestRef.current) {
        setWards(data);
      }
    } catch (error) {
      console.error('Lỗi tải phường/xã:', error);

      if (requestId === provinceRequestRef.current) {
        setLocationSearchError(
          'Không thể tải danh sách phường/xã. Bạn hãy thử chọn lại tỉnh/thành phố.'
        );
      }
    } finally {
      if (requestId === provinceRequestRef.current) {
        setIsLoadingWards(false);
      }
    }

  }

  // --------------------------------------------------
  // 5.8. SEARCH COORDINATES
  // --------------------------------------------------

  async function searchCoordinates(address) {
    const params = new URLSearchParams({
      q: address,
      limit: '5',
      lang: 'en',
    });

    const response = await fetch(
      `https://photon.komoot.io/api/?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error('Không thể kết nối dịch vụ tìm kiếm địa chỉ.');
    }

    const data = await response.json();

    const results = (data.features || []).filter(
      (item) =>
        item.properties?.countrycode?.toUpperCase() === 'VN' &&
        Array.isArray(item.geometry?.coordinates) &&
        item.geometry.coordinates.length >= 2
    );

    if (!results.length) {
      return null;
    }

    const [longitude, latitude] = results[0].geometry.coordinates;

    return {
      latitude,
      longitude,
    };
  }


  // --------------------------------------------------
  // 5.9. WARD CHANGE
  // --------------------------------------------------

  async function handleWardChange(event) {
    const wardCode = event.target.value;
    const selectedWard = wards.find((ward) => String(ward.code) === wardCode);
    const wardName = selectedWard?.name || '';
    const provinceName = formData.province;

    setFormData((previous) => ({
      ...previous,
      ward: wardName,
      latitude: null,
      longitude: null,
    }));
    setWardInput(wardName);
    setMapLocationConfirmed(false);
    setLocationSearchError('');
    clearErrors(['ward', 'latitude', 'longitude']);

    // Chỉ dùng phường/xã + tỉnh/thành phố để định vị khu vực.
    // Không dùng địa chỉ cụ thể vì đây chỉ là ghi chú văn bản.
    if (!wardName || !provinceName) return;

    const requestId = ++locationRequestRef.current;
    setIsSearchingLocation(true);
    try {
      const coordinates = await searchCoordinates(`${wardName}, ${provinceName}, Việt Nam`);
      if (requestId !== locationRequestRef.current || !coordinates) return;
      setMapPosition([coordinates.latitude, coordinates.longitude]);
      setLocationSearchError('Bản đồ đang hiển thị khu vực phường/xã đã chọn. Hãy chạm vào vị trí chính xác hoặc kéo ghim để xác nhận.');
    } catch (error) {
      if (requestId === locationRequestRef.current) {
        setLocationSearchError('Chưa định vị được khu vực này. Bạn có thể tự di chuyển bản đồ đến đúng nơi.');
      }
    } finally {
      if (requestId === locationRequestRef.current) setIsSearchingLocation(false);
    }
  }

  // --------------------------------------------------
  // 5.10. MAP POSITION CHANGE
  // --------------------------------------------------

  function handleMapPositionChange(position) {
    const latitude = position.lat.toFixed(6);
    const longitude = position.lng.toFixed(6);

    // Hủy hiệu lực kết quả tìm kiếm địa chỉ đang chờ.
    locationRequestRef.current += 1;

    setIsSearchingLocation(false);

    setMapPosition([position.lat, position.lng]);
    setMapLocationConfirmed(true);

    setFormData((previous) => ({
      ...previous,

      latitude,
      longitude,
    }));

    clearErrors(['latitude', 'longitude']);

    setLocationSearchError('');
  }


  // --------------------------------------------------
  // 5.11. MANUAL LOCATION SEARCH
  // --------------------------------------------------

  async function handleSearchLocation() {
    if (!formData.province || !formData.ward) {
      setLocationSearchError('Vui lòng chọn Tỉnh/Thành phố và Phường/Xã trước.');
      return;
    }
    const address = [formData.ward, formData.province, 'Việt Nam'].join(', ');
    const requestId = ++locationRequestRef.current;
    setIsSearchingLocation(true);
    setLocationSearchError('');
    setMapLocationConfirmed(false);
    setFormData((previous) => ({ ...previous, latitude: null, longitude: null }));
    try {
      const coordinates = await searchCoordinates(address);
      if (requestId !== locationRequestRef.current) return;
      if (!coordinates) {
        setLocationSearchError('Không tìm thấy khu vực đã chọn. Bạn có thể tự di chuyển bản đồ đến đúng nơi.');
        return;
      }
      setMapPosition([coordinates.latitude, coordinates.longitude]);
      setLocationSearchError('Bản đồ hiển thị khu vực phường/xã đã chọn. Hãy chạm vào vị trí chính xác hoặc kéo ghim để xác nhận.');
    } catch (error) {
      if (requestId === locationRequestRef.current) setLocationSearchError(error.message || 'Không thể định vị khu vực lúc này.');
    } finally {
      if (requestId === locationRequestRef.current) setIsSearchingLocation(false);
    }
  }

  // --------------------------------------------------
  // 5.12. IMAGE HANDLING
  // --------------------------------------------------

  function handleImagesChange(nextFiles, nextCoverIndex) {
    setImages(nextFiles);

    setCoverIndex(
      nextFiles.length > 0 ? nextCoverIndex : 0
    );

    clearErrors(['images']);
  }


  // --------------------------------------------------
  // 5.13. FORM SUBMISSION
  // --------------------------------------------------

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validatePetReport(
      formData,
      images
    );

    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      const firstInvalidField = Object.keys(FIELD_FOCUS_IDS)
        .find((name) => nextErrors[name]);

      if (firstInvalidField) {
        document
          .getElementById(FIELD_FOCUS_IDS[firstInvalidField])
          ?.focus();
      }

      return;
    }

    setSubmitStatus('idle');

    setStep('review');
  }


  // --------------------------------------------------
  // 5.14. CONFIRM SUBMISSION
  // --------------------------------------------------

  async function handleConfirmSubmit() {
    setSubmitStatus('submitting');

    try {
      await submitPetReport(
        buildPetReportPayload(formData),
        images,
        coverIndex
      );

      // TODO: Xử lý khi backend trả về thành công.
      setSubmitStatus('idle');

    } catch (error) {
      console.error('Lỗi gửi tin:', error);

      setSubmitStatus('not-connected');
    }
  }


  // --------------------------------------------------
  // 5.15. DERIVED VALUES
  // --------------------------------------------------

  const errorEntries = Object.entries(errors);

  const descriptionLength = formData.description.length;

  const maxEventTime = toDateTimeLocalValue(new Date());

  function describedBy(name, hintId) {
    return [
      hintId,
      errors[name] ? `pet-report-${name}-error` : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;
  }


  // ======================================================
  // 6. REVIEW SCREEN
  // ======================================================

  if (step === 'review') {
    const payload = buildPetReportPayload(formData);

    const orderedImages = images
      .map((file, index) => ({
        file,
        index,
      }))
      .sort((a, b) => {
        if (a.index === coverIndex) return -1;
        if (b.index === coverIndex) return 1;

        return a.index - b.index;
      });

    return (
      <main className="pet-report-page">

        <section
          className="pet-report-card"
          aria-labelledby="pet-report-review-title"
        >

          {/* Header */}

          <header className="pet-report-header">
            <PawIcon />

            <div>
              <h1
                id="pet-report-review-title"
                ref={reviewHeadingRef}
                tabIndex={-1}
                className="pet-report-title"
              >
                Xem lại tin đăng
              </h1>

              <p className="pet-report-intro">
                Kiểm tra lại thông tin trước khi gửi.
              </p>
            </div>
          </header>


          {/* Notice */}

          <div
            className="pet-report-notice"
            role="note"
          >
            <strong>Lưu ý:</strong> Tin của bạn{' '}
            <strong>chưa được lưu hoặc đăng</strong>.
            Đây chỉ là bản xem trước trên máy của bạn.
          </div>


          {/* Review content */}

          <div className="pet-report-review">

            <div className="pet-report-review__tags">

              <span
                className={`pet-report-tag pet-report-tag--${payload.post_type.toLowerCase()}`}
              >
                {getOptionLabel(
                  POST_TYPE_OPTIONS,
                  payload.post_type
                )}
              </span>

              <span className="pet-report-tag">
                {getOptionLabel(
                  SPECIES_OPTIONS,
                  payload.species
                )}
              </span>

            </div>


            {/* Information */}

            <dl className="pet-report-review__list">

              <div className="pet-report-review__row">
                <dt>Giới tính</dt>
                <dd>
                  {payload.gender === 'MALE'
                    ? 'Đực'
                    : payload.gender === 'FEMALE'
                      ? 'Cái'
                      : 'Chưa xác định'}
                </dd>
              </div>

              <div className="pet-report-review__row">
                <dt>Mô tả</dt>
                <dd className="pet-report-review__description">
                  {payload.description}
                </dd>
              </div>

              <div className="pet-report-review__row">
                <dt>Thời gian</dt>
                <dd>
                  {formatEventTime(formData.event_time)}
                </dd>
              </div>

              <div className="pet-report-review__row">
                <dt>Địa chỉ cụ thể</dt>
                <dd>{payload.location_text}</dd>
              </div>

              <div className="pet-report-review__row">
                <dt>Vị trí bản đồ</dt>
                <dd>{payload.latitude !== null ? `${payload.latitude}, ${payload.longitude}` : 'Chưa xác nhận ghim'}</dd>
              </div>

            </dl>


            {/* Images */}

            <div>
              <h2 className="pet-report-section-title">
                Ảnh ({images.length})
              </h2>

              <ul className="pet-report-review__images">

                {orderedImages.map(({ file, index }) => (
                  <li
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className={
                      `pet-report-review__image${
                        index === coverIndex
                          ? ' pet-report-review__image--cover'
                          : ''
                      }`
                    }
                  >

                    <FilePreviewImage
                      file={file}
                      alt={`Ảnh thú cưng: ${file.name}`}
                    />

                    {index === coverIndex && (
                      <span className="pet-report-review__badge">
                        Ảnh bìa
                      </span>
                    )}

                  </li>
                ))}

              </ul>
            </div>

          </div>


          {/* Submit status */}

          <div aria-live="polite">

            {submitStatus === 'not-connected' && (
              <div className="pet-report-notice pet-report-notice--warning">
                Chức năng gửi tin chưa được kết nối với máy chủ,
                nên tin <strong>chưa được gửi</strong>.
                Dữ liệu của bạn vẫn được giữ nguyên trên trang này.
              </div>
            )}

          </div>


          {/* Actions */}

          <div className="pet-report-actions">

            <button
              type="button"
              className="pet-report-button pet-report-button--secondary"
              onClick={() => setStep('edit')}
            >
              Quay lại chỉnh sửa
            </button>

            <button
              type="button"
              className="pet-report-button pet-report-button--primary"
              onClick={handleConfirmSubmit}
              disabled={submitStatus === 'submitting'}
            >
              {submitStatus === 'submitting'
                ? 'Đang gửi...'
                : 'Gửi tin đăng'}
            </button>

          </div>

        </section>

      </main>
    );
  }


  // ======================================================
  // 7. EDIT SCREEN
  // ======================================================

  return (
    <main className="pet-report-page">

      <section
        className="pet-report-card"
        aria-labelledby="pet-report-title"
      >

        {/* Back button */}

        {onBack && (
          <button
            type="button"
            className="pet-report-button pet-report-button--secondary"
            onClick={onBack}
          >
            ← Quay về trang chủ
          </button>
        )}


        {/* Header */}

        <header className="pet-report-header">

          <PawIcon />

          <div>
            <h1
              id="pet-report-title"
              ref={formHeadingRef}
              tabIndex={-1}
              className="pet-report-title"
            >
              Đăng tin tìm thú cưng
            </h1>

            <p className="pet-report-intro">
              Hãy cung cấp thông tin và hình ảnh của thú cưng.
              Càng chi tiết, cộng đồng PYPAWS càng dễ nhận ra bé
              và giúp bé sớm về nhà.
            </p>
          </div>

        </header>


        {/* Error summary */}

        {errorEntries.length > 0 && (
          <div
            className="pet-report-error-summary"
            role="alert"
          >

            <h2 className="pet-report-error-summary__title">
              Vui lòng kiểm tra lại {errorEntries.length} mục:
            </h2>

            <ul>

              {errorEntries.map(([name, message]) => (
                <li key={name}>

                  <a
                    href={`#${FIELD_FOCUS_IDS[name] || 'pet-report-title'}`}
                    onClick={(event) => {
                      event.preventDefault();

                      document
                        .getElementById(FIELD_FOCUS_IDS[name])
                        ?.focus();
                    }}
                  >
                    {FIELD_LABELS[name] || name}: {message}
                  </a>

                </li>
              ))}

            </ul>

          </div>
        )}


        {/* =================================================
            FORM
        ================================================= */}

        <form
          className="pet-report-form"
          onSubmit={handleSubmit}
          noValidate
        >

          {/* BASIC INFORMATION */}

          <div className="pet-report-grid pet-report-basic-grid">

            {/* Post type */}

            <div className="pet-report-field">

              <label
                htmlFor="pet-report-post_type"
                className="pet-report-label"
              >
                Loại báo cáo{' '}
                <span className="pet-report-required">*</span>
              </label>

              <select
                id="pet-report-post_type"
                name="post_type"
                className="pet-report-input"
                value={formData.post_type}
                onChange={handleInputChange}
                aria-describedby={describedBy('post_type')}
                aria-invalid={errors.post_type ? 'true' : undefined}
              >

                <option value="">
                  Chọn loại báo cáo
                </option>

                {POST_TYPE_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}

              </select>

              <FieldError
                id="pet-report-post_type-error"
                message={errors.post_type}
              />

            </div>


            {/* Species */}

            <div className="pet-report-field">

              <label
                htmlFor="pet-report-species"
                className="pet-report-label"
              >
                Chó/Mèo{' '}
                <span className="pet-report-required">*</span>
              </label>

              <select
                id="pet-report-species"
                name="species"
                className="pet-report-input"
                value={formData.species}
                onChange={handleInputChange}
                aria-describedby={describedBy('species')}
                aria-invalid={errors.species ? 'true' : undefined}
              >

                <option value="">
                  Chọn loại thú cưng
                </option>

                {SPECIES_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}

              </select>

              <FieldError
                id="pet-report-species-error"
                message={errors.species}
              />

            </div>


            {/* Gender */}

            <div className="pet-report-field">

              <label
                htmlFor="pet-report-gender"
                className="pet-report-label"
              >
                Giới tính
              </label>

              <select
                id="pet-report-gender"
                name="gender"
                className="pet-report-input"
                value={formData.gender ?? ''}
                onChange={handleInputChange}
              >

                <option value="">
                  Chọn giới tính
                </option>

                <option value="MALE">
                  Đực
                </option>

                <option value="FEMALE">
                  Cái
                </option>

                <option value="UNKNOWN">
                  Chưa xác định
                </option>

              </select>

            </div>

          </div>


          {/* IMAGES */}

          <fieldset className="pet-report-field">

            <legend className="pet-report-label">
              Ảnh thú cưng
            </legend>

            <ImageUploader
              id="pet-report-images"
              files={images}
              coverIndex={coverIndex}
              onChange={handleImagesChange}
              error={errors.images}
            />

          </fieldset>


          {/* DESCRIPTION: photos come first so the AI suggestion can be edited here. */}
          <div className="pet-report-field pet-report-field--horizontal pet-report-description-field">
            <label htmlFor="pet-report-description" className="pet-report-label">
              Mô tả <span className="pet-report-required">*</span>
            </label>
            <div className="pet-report-description-editor">
              <p id="pet-report-description-hint" className="pet-report-hint">
                Nội dung AI đề xuất nhận diện ảnh được tích hợp sẽ hiển thị tại đây. Bạn có thể tự nhập và chỉnh sửa mô tả.
              </p>
              <textarea
                id="pet-report-description"
                name="description"
                className="pet-report-input pet-report-textarea"
                rows={5}
                maxLength={DESCRIPTION_MAX_LENGTH}
                placeholder="Mô tả giống, màu lông, kích thước, vòng cổ và đặc điểm nhận dạng của bé..."
                value={formData.description}
                onChange={handleInputChange}
                aria-describedby={describedBy('description', 'pet-report-description-hint pet-report-description-count')}
                aria-invalid={errors.description ? 'true' : undefined}
              />
              <p id="pet-report-description-count" className="pet-report-counter">{descriptionLength}/{DESCRIPTION_MAX_LENGTH} ký tự</p>
              <FieldError id="pet-report-description-error" message={errors.description} />
            </div>
          </div>

          {/* EVENT TIME */}

          <div className="pet-report-grid pet-report-location-grid">

            <div className="pet-report-field">

              <label
                htmlFor="pet-report-event_time"
                className="pet-report-label"
              >
                {formData.post_type === 'FOUND'
                  ? 'Thời gian tìm thấy'
                  : 'Thời gian bị lạc'}

                {' '}
                <span className="pet-report-required">*</span>
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

              <FieldError
                id="pet-report-event_time-error"
                message={errors.event_time}
              />

            </div>


            {/* PROVINCE: searchable dropdown showing all 34 current provinces */}
            <div className="pet-report-field pet-report-combobox">
              <label htmlFor="pet-report-province" className="pet-report-label">
                {formData.post_type === 'FOUND' ? 'Tỉnh/thành phố tìm thấy' : 'Tỉnh/thành phố bị lạc'}
                {' '}<span className="pet-report-required">*</span>
              </label>

              <input
                id="pet-report-province"
                name="province"
                type="text"
                className="pet-report-input"
                placeholder={isLoadingProvinces ? 'Đang tải danh sách...' : 'Bấm để xem hoặc gõ tên tỉnh/thành phố'}
                value={provinceInput}
                autoComplete="off"
                onFocus={() => { setProvinceInput(''); setIsProvinceListOpen(true); }}
                onChange={handleProvinceTextChange}
                onBlur={() => setTimeout(() => { setIsProvinceListOpen(false); setProvinceInput(formData.province); }, 140)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    const match = provinces.find((item) =>
                      normalizeAddressSearch(item.name).includes(normalizeAddressSearch(provinceInput))
                    );
                    if (match) chooseProvince(match);
                  }
                  if (event.key === 'Escape') setIsProvinceListOpen(false);
                }}
                aria-expanded={isProvinceListOpen}
                aria-controls="pet-report-province-options"
                role="combobox"
                aria-autocomplete="list"
                aria-invalid={errors.province ? 'true' : undefined}
                disabled={isLoadingProvinces}
              />
              {isProvinceListOpen && !isLoadingProvinces && (
                <div id="pet-report-province-options" className="pet-report-combobox__options" role="listbox">
                  {provinces
                    .filter((item) => normalizeAddressSearch(item.name).includes(normalizeAddressSearch(provinceInput)))
                    .map((province) => (
                      <button
                        type="button"
                        key={province.code}
                        className="pet-report-combobox__option"
                        role="option"
                        aria-selected={formData.province === province.name}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => chooseProvince(province)}
                      >
                        {province.name}
                      </button>
                    ))}
                  {provinces.length === 0 && (
                    <p className="pet-report-combobox__empty">Chưa tải được danh sách tỉnh/thành phố.</p>
                  )}
                </div>
              )}
              <FieldError id="pet-report-province-error" message={errors.province} />
            </div>

            {/* WARD: filtered list for the selected province */}
            <div className="pet-report-field pet-report-combobox">
              <label htmlFor="pet-report-ward" className="pet-report-label">
                Phường / Xã <span className="pet-report-required">*</span>
              </label>

              <input
                id="pet-report-ward"
                name="ward"
                type="text"
                className="pet-report-input"
                placeholder={
                  !formData.province
                    ? 'Chọn tỉnh/thành phố trước'
                    : isLoadingWards
                      ? 'Đang tải danh sách phường/xã...'
                      : 'Bấm để xem hoặc gõ tên phường/xã'
                }
                value={wardInput}
                autoComplete="off"
                onFocus={() => { setWardInput(''); setIsWardListOpen(true); }}
                onChange={handleWardTextChange}
                onBlur={() => setTimeout(() => { setIsWardListOpen(false); setWardInput(formData.ward); }, 140)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    const match = wards.find((item) =>
                      normalizeAddressSearch(item.name).includes(normalizeAddressSearch(wardInput))
                    );
                    if (match) chooseWard(match);
                  }
                  if (event.key === 'Escape') setIsWardListOpen(false);
                }}
                aria-expanded={isWardListOpen}
                aria-controls="pet-report-ward-options"
                role="combobox"
                aria-autocomplete="list"
                aria-invalid={errors.ward ? 'true' : undefined}
                disabled={!formData.province || isLoadingWards}
              />
              {isWardListOpen && formData.province && !isLoadingWards && (
                <div id="pet-report-ward-options" className="pet-report-combobox__options" role="listbox">
                  {wards
                    .filter((item) => normalizeAddressSearch(item.name).includes(normalizeAddressSearch(wardInput)))
                    .map((ward) => (
                      <button
                        type="button"
                        key={ward.code}
                        className="pet-report-combobox__option"
                        role="option"
                        aria-selected={formData.ward === ward.name}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => chooseWard(ward)}
                      >
                        {ward.name}
                      </button>
                    ))}
                  {wards.length === 0 && (
                    <p className="pet-report-combobox__empty">Không có dữ liệu phường/xã cho tỉnh này.</p>
                  )}
                </div>
              )}
              <FieldError id="pet-report-ward-error" message={errors.ward} />
            </div>


            <div className="pet-report-field pet-report-address-detail">
              <label htmlFor="pet-report-address_detail" className="pet-report-label">
                Địa chỉ cụ thể / mốc dễ nhận biết <span className="pet-report-required">*</span>
              </label>
              <input
                id="pet-report-address_detail"
                name="address_detail"
                type="text"
                className="pet-report-input"
                maxLength={300}
                placeholder="Ví dụ: Trường ĐH Kinh tế - Luật, cổng chính, đường Võ Văn Ngân..."
                value={formData.address_detail}
                onChange={handleInputChange}
                aria-describedby={describedBy('address_detail')}
                aria-invalid={errors.address_detail ? 'true' : undefined}
              />
              <FieldError id="pet-report-address_detail-error" message={errors.address_detail} />
            </div>

            {/* MAP */}

            <div className="pet-report-field pet-report-map-field">

              <div className="pet-report-map-heading">

                <span className="pet-report-label">
                  Chọn vị trí trên bản đồ
                </span>

                <p className="pet-report-hint">
                  Bản đồ định vị theo Tỉnh/Thành phố và Phường/Xã. Địa chỉ cụ thể chỉ dùng để mô tả nơi xảy ra sự việc; hãy chạm hoặc kéo ghim để xác nhận tọa độ chính xác.
                </p>

              </div>


              {/* Search location button */}

              <button
                id="pet-report-map-search"
                type="button"
                className="pet-report-map-search"
                onClick={handleSearchLocation}
                disabled={isSearchingLocation || !formData.province || !formData.ward}
              >
                {isSearchingLocation
                  ? 'Đang định vị khu vực...'
                  : 'Định vị theo phường/xã'}
              </button>


              {/* Location error */}

              {locationSearchError && (
                <p
                  className="pet-report-map-error"
                  role="alert"
                >
                  {locationSearchError}
                </p>
              )}


              {/* Leaflet map */}

              <MapContainer
                center={mapPosition}
                zoom={13}
                className="pet-report-map"
                scrollWheelZoom={true}
                style={{
                  height: '360px',
                  width: '100%',
                }}
              >

                <MapResizeHandler />

                <MapViewUpdater
                  position={mapPosition}
                />

                <TileLayer
                  attribution="Tiles &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                />

                <MapMarker
                  position={mapPosition}
                  onPositionChange={handleMapPositionChange}
                />

              </MapContainer>


              {/* Coordinates */}

              <p className="pet-report-hint">
                {mapLocationConfirmed && formData.latitude && formData.longitude
                  ? `Đã xác nhận: ${formData.latitude}, ${formData.longitude}`
                  : 'Chưa xác nhận vị trí. Hãy chạm vào bản đồ hoặc kéo ghim để lưu tọa độ.'}
              </p>

            </div>

          </div>


          {/* FORM ACTION */}

          <div className="pet-report-actions">

            <button
              type="submit"
              className="pet-report-button pet-report-button--primary"
            >
              Xem lại tin đăng
            </button>

          </div>

        </form>

      </section>

    </main>
  );
}