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
  const fullAddress = [
    report.address_detail,
    report.ward,
    report.province,
  ].filter(Boolean).join(', ') || report.location_text || 'Chưa cập nhật'

  return (
    <section className="matching-summary">
      <p className="matching-summary-code">
        Mã báo cáo: <strong>{report.report_code || 'Đang chờ mã báo cáo từ hệ thống'}</strong>
      </p>

      <div className="matching-summary-layout">
        <div className="matching-summary-details">
          <section className="matching-summary-panel">
            <h3>Thông tin thú cưng</h3>
            <dl>
              <div><dt>Loài:</dt><dd>{speciesLabel[report.species] || report.species || 'Chưa xác định'}</dd></div>
              <div><dt>Giới tính:</dt><dd>{genderLabel[report.gender] || 'Chưa xác định'}</dd></div>
              <div><dt>Thời gian:</dt><dd>{formattedEventTime}</dd></div>
              <div><dt>Địa chỉ:</dt><dd>{fullAddress}</dd></div>
              <div><dt>Đặc điểm:</dt><dd>{report.description || 'Chưa cung cấp'}</dd></div>
              {report.notes && <div><dt>Ghi chú:</dt><dd>{report.notes}</dd></div>}
            </dl>
          </section>

          <section className="matching-summary-panel">
            <h3>Thông tin liên hệ</h3>
            <dl>
              <div><dt>Họ tên:</dt><dd>{report.contact_name || 'Chưa cung cấp'}</dd></div>
              <div><dt>Số điện thoại:</dt><dd>{report.contact_phone || 'Chưa cung cấp'}</dd></div>
              <div><dt>Email:</dt><dd>{report.contact_email || 'Chưa cung cấp'}</dd></div>
            </dl>
          </section>
        </div>

        <div className="matching-summary-photo">
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
