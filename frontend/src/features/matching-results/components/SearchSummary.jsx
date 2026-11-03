import { resolveImageUrl } from '../../../services/api'

function SearchSummary({ report, currentUser }) {
  if (!report) return null

  const speciesLabel = {
    DOG: 'Chó',
    CAT: 'Mèo',
  }
  const genderLabel = {
    MALE: 'Đực',
    FEMALE: 'Cái',
    UNKNOWN: 'Chưa xác định',
  }
  const rawImages = report.images || report.image_urls || report.photos || []
  const images = [resolveImageUrl(report.image_url || report.cover_image_url || report.primary_image), ...rawImages.map((image) => resolveImageUrl(typeof image === 'string' ? image : image?.url || image?.image_url))].filter((image, index, all) => image && all.indexOf(image) === index)
  const eventDate = report.event_time ? new Date(report.event_time) : null
  const formattedEventTime =
    eventDate && !Number.isNaN(eventDate.getTime())
      ? eventDate.toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : 'Chưa cập nhật'
  const provinceName = report.province || report.location_text || 'Chưa cập nhật tỉnh/thành'
  const isOwnReport = currentUser?.id != null && report?.owner_id != null && String(currentUser.id) === String(report.owner_id)
  const contactName = report.contact_name || (isOwnReport ? currentUser?.full_name : null) || report.owner_name
  const contactPhone = report.contact_phone || (isOwnReport ? currentUser?.phone : null)
  const contactEmail = report.contact_email || (isOwnReport ? currentUser?.email : null)
  const descriptionParts = String(report.description || '')
    .split(/(?=(?:Màu lông, hoa văn|Độ dài lông|Đặc điểm tai, mắt, mõm, đuôi|Dấu hiệu nhận dạng đặc biệt):)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const pieces = part.split(/\s+-\s+/).map((piece) => piece.trim()).filter(Boolean)
      if (pieces.length <= 1) return pieces
      return [pieces[0], ...pieces.slice(1).map((piece) => '- ' + piece)]
    })

  return (
    <section className="matching-summary">
      <p className="matching-summary-code">
        Mã báo cáo: <strong>{report.report_code || `${report.post_type || 'LOST'}${report.post_id}`}</strong>
      </p>

      <div className="matching-summary-layout">
        <div className="matching-summary-details">
          <section className="matching-summary-panel">
            <h3>Thông tin thú cưng</h3>
            <dl>
              <div><dt>Tên thú cưng:</dt><dd>{report.pet_name || 'Chưa cập nhật'}</dd></div>
              <div><dt>Loài:</dt><dd>{speciesLabel[report.species] || report.species || 'Chưa xác định'}</dd></div>
              <div><dt>Giới tính:</dt><dd>{genderLabel[report.gender] || 'Chưa xác định'}</dd></div>
              <div><dt>Thời gian:</dt><dd>{formattedEventTime}</dd></div>
              <div><dt>Ngày đăng:</dt><dd>{report.created_at ? new Date(report.created_at).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</dd></div>
              <div><dt>Trạng thái:</dt><dd>{{ ACTIVE: 'Đang hiển thị', RESOLVED: 'Đã tìm thấy chủ', CLOSED: 'Đã đóng' }[report.status] || report.status || 'Chưa cập nhật'}</dd></div>
              <div><dt>Địa chỉ:</dt><dd>{provinceName}</dd></div>
              <div><dt>Đặc điểm:</dt><dd className="matching-summary-description">{descriptionParts.length ? descriptionParts.map((part, index) => <span key={`${part}-${index}`}>{part}</span>) : 'Chưa cung cấp'}</dd></div>
              {report.notes && <div><dt>Ghi chú:</dt><dd>{report.notes}</dd></div>}
              <div className="matching-summary-contact-heading"><dt>Thông tin liên hệ</dt><dd></dd></div>
              <div><dt>Người liên hệ:</dt><dd>{contactName || 'Chưa cập nhật'}</dd></div>
              <div><dt>Số điện thoại:</dt><dd>{contactPhone || 'Chưa cập nhật'}</dd></div>
              <div><dt>Email:</dt><dd>{contactEmail || 'Chưa cập nhật'}</dd></div>
            </dl>
          </section>

        </div>

        <div className="matching-summary-photo">
          <span className={`matching-summary-type ${String(report.post_type || 'LOST').toLowerCase()}`}>{report.post_type || 'LOST'}</span>
          {images.length > 0 ? (
            <>
              <img
                className="matching-summary-main-image"
                src={images[0]}
                alt="Ảnh thú cưng trong bài đăng"
              />
              {images.length > 1 && (
                <div className="matching-summary-thumbnails">
                  {images.slice(1).map((image, index) => (
                    <img key={image || index} src={image} alt={`Ảnh thú cưng ${index + 2}`} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="matching-summary-no-image">Chưa có hình ảnh</div>
          )}
        </div>
      </div>
    </section>
  )
}

export default SearchSummary
