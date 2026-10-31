import { useEffect, useRef, useState } from 'react';
import { IMAGE_RULES } from '../types.js';
import { formatFileSize, validateImageFile } from '../validation.js';
import './ImageUploader.css';

// A stable key for a File, used for React keys and to skip duplicates.
function getFileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * Shows a preview of a local File.
 * The object URL is created when the component mounts and released (revoked)
 * when it unmounts or the file changes, so the browser does not leak memory.
 */
export function FilePreviewImage({ file, alt, className }) {
  const imageRef = useRef(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    imageRef.current.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return <img ref={imageRef} alt={alt} className={className} />;
}

/**
 * Reusable multi-image picker with previews and cover selection.
 *
 * Props:
 * - id: id of the hidden file input (lets a parent focus it)
 * - files: File[] currently selected
 * - coverIndex: index of the cover image inside `files`
 * - onChange(nextFiles, nextCoverIndex): called whenever the selection changes
 * - error: optional error message from the parent form
 */
export default function ImageUploader({ id = 'pet-image-input', files, coverIndex, onChange, error }) {
  const inputRef = useRef(null);
  const [selectionErrors, setSelectionErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const selectionErrorsId = `${id}-selection-errors`;
  const isFull = files.length >= IMAGE_RULES.MAX_FILES;

  const describedBy = [hintId, error ? errorId : null, selectionErrors.length ? selectionErrorsId : null]
    .filter(Boolean)
    .join(' ');

  function addFiles(fileList) {
    const knownKeys = new Set(files.map(getFileKey));
    const accepted = [];
    const messages = [];

    for (const file of Array.from(fileList)) {
      const fileError = validateImageFile(file);
      if (fileError) {
        messages.push(fileError);
        continue;
      }
      if (knownKeys.has(getFileKey(file))) {
        messages.push(`"${file.name}" đã được chọn trước đó.`);
        continue;
      }
      if (files.length + accepted.length >= IMAGE_RULES.MAX_FILES) {
        messages.push(`Chỉ được chọn tối đa ${IMAGE_RULES.MAX_FILES} ảnh. "${file.name}" chưa được thêm.`);
        continue;
      }
      knownKeys.add(getFileKey(file));
      accepted.push(file);
    }

    setSelectionErrors(messages);
    if (accepted.length > 0) {
      // The first image ever added becomes the cover automatically.
      onChange([...files, ...accepted], files.length === 0 ? 0 : coverIndex);
    }
  }

  function handleInputChange(event) {
    addFiles(event.target.files);
    // Reset so the same file can be chosen again after being removed.
    event.target.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    if (!isFull) addFiles(event.dataTransfer.files);
  }

  function handleDragOver(event) {
    event.preventDefault();
    if (!isFull) setIsDragging(true);
  }

  function removeFile(indexToRemove) {
    const nextFiles = files.filter((_, index) => index !== indexToRemove);

    // Keep the cover pointing at the same image when possible.
    let nextCoverIndex = coverIndex;
    if (indexToRemove === coverIndex) nextCoverIndex = 0;
    else if (indexToRemove < coverIndex) nextCoverIndex = coverIndex - 1;

    setSelectionErrors([]);
    onChange(nextFiles, nextFiles.length === 0 ? 0 : nextCoverIndex);
    // The removed button disappears, so move keyboard focus somewhere sensible.
    inputRef.current?.focus();
  }

  return (
    <div className={`pet-image-uploader${error ? ' pet-image-uploader--invalid' : ''}`}>
      <div
        className={`pet-image-uploader__drop-area${isDragging ? ' pet-image-uploader__drop-area--dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={id}
          className="pet-image-uploader__input"
          type="file"
          accept={IMAGE_RULES.ACCEPTED_TYPES.join(',')}
          multiple
          disabled={isFull}
          onChange={handleInputChange}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
        />
        <label htmlFor={id} className="pet-image-uploader__dropzone">
          <span className="pet-image-uploader__icon" aria-hidden="true" />
          <span className="pet-image-uploader__title">
            {isFull ? 'Đã đạt số ảnh tối đa' : 'Chọn ảnh thú cưng'}
          </span>
          <span className="pet-image-uploader__subtitle">
            {isFull ? 'Xóa bớt ảnh nếu bạn muốn thêm ảnh khác.' : 'Nhấn để chọn hoặc kéo thả ảnh vào đây'}
          </span>
        </label>
      </div>


      <div className="pet-report-image-description">
        <strong>Ảnh rõ nét giúp cộng đồng nhận diện bé nhanh hơn:</strong>
        <ul>
          <li>Chụp rõ mặt và đôi mắt của bé.</li>
          <li>Chụp toàn thân, thấy rõ màu lông và đặc điểm nhận dạng.</li>
          <li>Ưu tiên ảnh đủ sáng, không bị mờ hoặc che khuất.</li>
        </ul>
      </div>

      <div className="pet-image-uploader__info-row">
        <p id={hintId} className="pet-image-uploader__hint">
          {IMAGE_RULES.ACCEPTED_LABEL}, tối đa {formatFileSize(IMAGE_RULES.MAX_FILE_SIZE_BYTES)} mỗi ảnh, tối đa {IMAGE_RULES.MAX_FILES} ảnh.
          {' '}
          <span aria-live="polite">Đã chọn {files.length}/{IMAGE_RULES.MAX_FILES} ảnh.</span>
        </p>
        <p className="pet-image-uploader__cover-hint">Chọn ảnh rõ nhất làm ảnh bìa.</p>
      </div>

      {error && (
        <p id={errorId} className="pet-image-uploader__error">
          {error}
        </p>
      )}

      {selectionErrors.length > 0 && (
        <ul id={selectionErrorsId} className="pet-image-uploader__selection-errors" role="alert">
          {selectionErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="pet-image-uploader__grid" aria-label="Ảnh đã chọn">
          {files.map((file, index) => {
            const isCover = index === coverIndex;
            return (
              <li
                key={getFileKey(file)}
                className={`pet-image-uploader__item${isCover ? ' pet-image-uploader__item--cover' : ''}`}
              >
                <div className="pet-image-uploader__preview">
                  <FilePreviewImage
                    file={file}
                    alt={`Ảnh xem trước ${index + 1}: ${file.name}`}
                    className="pet-image-uploader__image"
                  />
                  {isCover && <span className="pet-image-uploader__badge">Ảnh bìa</span>}
                </div>

                <div className="pet-image-uploader__meta">
                  <span className="pet-image-uploader__name" title={file.name}>
                    {file.name}
                  </span>
                  <span className="pet-image-uploader__size">{formatFileSize(file.size)}</span>
                </div>

                <div className="pet-image-uploader__actions">
                  <button
                    type="button"
                    className="pet-image-uploader__button"
                    onClick={() => onChange(files, index)}
                    aria-pressed={isCover}
                    disabled={isCover}
                  >
                    {isCover ? 'Đang là ảnh bìa' : 'Đặt làm ảnh bìa'}
                  </button>
                  <button
                    type="button"
                    className="pet-image-uploader__button pet-image-uploader__button--danger"
                    onClick={() => removeFile(index)}
                    aria-label={`Xóa ảnh ${file.name}`}
                  >
                    Xóa
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
