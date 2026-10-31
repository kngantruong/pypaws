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
  const rawImages = report.images || report.image_urls || report.photos || []
  const images = [report.image_url || report.cover_image_url, ...rawImages.map((image) => typeof image === 'string' ? image : image?.url || image?.image_url)].filter((image, index, all) => image && all.indexOf(image) === index)
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
              <div><dt>Địa chỉ:</dt><dd>{fullAddress}</dd></div>
              <div><dt>Đặc điểm:</dt><dd>{report.description || 'Chưa cung cấp'}</dd></div>
              {report.notes && <div><dt>Ghi chú:</dt><dd>{report.notes}</dd></div>}
              <div className="matching-summary-contact-heading"><dt>Thông tin liên hệ</dt><dd></dd></div>
              <div><dt>Người liên hệ:</dt><dd>{report.contact_name || 'Chưa cập nhật'}</dd></div>
              <div><dt>Số điện thoại:</dt><dd>{report.contact_phone || 'Chưa cập nhật'}</dd></div>
              <div><dt>Email:</dt><dd>{report.contact_email || 'Chưa cập nhật'}</dd></div>
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
