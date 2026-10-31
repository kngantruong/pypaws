function SearchSummary({ report }) {
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
  const images = report.images?.length
    ? report.images
    : report.image_url
      ? [report.image_url]
      : []
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

  return (
    <section className="matching-summary">
      <div className="matching-summary-heading">
        <div>
          <p className="matching-summary-eyebrow">THÔNG TIN TÌM KIẾM</p>
          <h2>Tiêu chí tìm kiếm của bạn</h2>
          <p className="matching-summary-code">
            Mã báo cáo: <strong>{report.report_code || 'Đang chờ mã báo cáo từ hệ thống'}</strong>
          </p>
        </div>
      </div>

      {images.length > 0 && (
        <div className="matching-summary-images" aria-label="Ảnh trong bài LOST">
          {images.map((image, index) => (
            <img
              key={image || index}
              src={image}
              alt={`Ảnh ${index + 1} trong báo cáo LOST`}
            />
          ))}
        </div>
      )}

      <div className="matching-summary-content">
        <div className="matching-summary-item">
          <span>Loài thú cưng</span>
          <strong>{speciesLabel[report.species] || report.species || 'Chưa xác định'}</strong>
        </div>
        <div className="matching-summary-item">
          <span>Loại tin đăng</span>
          <strong>Thú cưng thất lạc</strong>
        </div>
        <div className="matching-summary-item">
          <span>Giới tính</span>
          <strong>{genderLabel[report.gender] || 'Chưa xác định'}</strong>
        </div>
        <div className="matching-summary-item">
          <span>Mô tả</span>
          <strong className="matching-summary-preserve">{report.description ?? 'Chưa cung cấp'}</strong>
        </div>
        <div className="matching-summary-item">
          <span>Thời gian</span>
          <strong>{formattedEventTime}</strong>
        </div>
        <div className="matching-summary-item">
          <span>Địa chỉ cụ thể</span>
          <strong className="matching-summary-preserve">{report.address_detail || 'Chưa cung cấp'}</strong>
        </div>
        <div className="matching-summary-item">
          <span>Khu vực</span>
          <strong className="matching-summary-preserve">
            {[report.ward, report.province].filter(Boolean).join(', ') || report.location_text || 'Chưa cung cấp'}
          </strong>
        </div>
      </div>
    </section>
  )
}

export default SearchSummary
