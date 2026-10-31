
import { useState } from 'react'

function MyReports({ reports = [], onOpenLostMatching }) {
  const myReports = reports
  const [selectedReport, setSelectedReport] = useState(null)
  const imagesOf = (report) => {
    const list = report.images || report.image_urls || report.photos || []
    return [report.image_url || report.cover_image_url, ...list.map((image) => typeof image === 'string' ? image : image?.url || image?.image_url)].filter((src, index, all) => src && all.indexOf(src) === index)
  }
  const displayDate = (value) => {
    if (!value) return 'Chưa cập nhật'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? 'Chưa cập nhật' : date.toLocaleString('vi-VN')
  }
  const displayAddress = (report) => [report.address_detail, report.ward, report.province].filter(Boolean).join(', ') || report.location_text || 'Chưa cập nhật'

  const getPostTypeLabel = (type) => {
    return type === 'LOST' ? 'LOST' : 'FOUND'
  }

  const getStatusLabel = (status) => {
    const statuses = {
      ACTIVE: 'Đang hiển thị',
      RESOLVED: 'Đã tìm thấy chủ',
      CLOSED: 'Đã đóng',
    }

    return statuses[status] || 'Chưa xác định'
  }

  return (
    <div className="my-reports">
      <div className="profile-section-heading">
        <h2>Tin đăng của tôi</h2>
        <p>Quản lý các tin tìm kiếm và tìm thấy thú cưng của bạn.</p>
      </div>

      {myReports.length === 0 ? (
        <div className="profile-empty-state">
          <h3>Bạn chưa có tin đăng nào</h3>
          <p>Các tin LOST/FOUND bạn đăng sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="my-reports-list">
          {myReports.map((report) => (
            <article className="my-report-card" key={report.post_id}>
              <div className="my-report-image">
                <span className={`my-report-type ${report.post_type?.toLowerCase()}`}>{getPostTypeLabel(report.post_type)}</span>
                <img
                  src={report.image_url || '/placeholder-pet.png'}
                  alt="Thú cưng"
                />
              </div>

              <div className="my-report-info">
                <h3>{`Mã báo cáo: ${report.report_code || report.post_id}`}</h3>

                <p className="my-report-card-description">{report.description || 'Chưa có mô tả.'}</p>

                <span className="my-report-location">
                  {report.location_text || 'Chưa cập nhật địa điểm'}
                </span>

                <span className="my-report-status">{getStatusLabel(report.status)}</span>
                <button type="button" className="my-report-detail-button" onClick={() => report.post_type === 'LOST' ? onOpenLostMatching?.(report) : setSelectedReport(report)}>Xem chi tiết</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {selectedReport && (
        <div className="my-report-modal-backdrop" role="presentation" onClick={() => setSelectedReport(null)}>
          <section className="my-report-modal" role="dialog" aria-modal="true" aria-label="Chi tiết tin đăng" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="my-report-modal-close" onClick={() => setSelectedReport(null)} aria-label="Đóng">×</button>
            <h2>{`Mã báo cáo: ${selectedReport.report_code || selectedReport.post_id}`}</h2>
            <div className="my-report-modal-gallery">
              {imagesOf(selectedReport).length ? imagesOf(selectedReport).map((src, index) => <img key={src} src={src} alt={`Ảnh thú cưng ${index + 1}`} />) : <p>Chưa có hình ảnh.</p>}
            </div>
            <h3>Thông tin thú cưng</h3>
            <dl>
              <div><dt>Tên thú cưng</dt><dd>{selectedReport.pet_name || 'Chưa cập nhật'}</dd></div>
              <div><dt>Loài</dt><dd>{selectedReport.species === 'DOG' ? 'Chó' : selectedReport.species === 'CAT' ? 'Mèo' : 'Chưa cập nhật'}</dd></div>
              <div><dt>Giới tính</dt><dd>{selectedReport.gender === 'MALE' ? 'Đực' : selectedReport.gender === 'FEMALE' ? 'Cái' : 'Chưa cập nhật'}</dd></div>
              <div><dt>Thời gian xảy ra</dt><dd>{displayDate(selectedReport.event_time || selectedReport.lost_time || selectedReport.found_time)}</dd></div>
              <div><dt>Địa điểm</dt><dd>{displayAddress(selectedReport)}</dd></div>
              <div><dt>Ngày đăng</dt><dd>{displayDate(selectedReport.created_at)}</dd></div>
              <div><dt>Trạng thái</dt><dd>{getStatusLabel(selectedReport.status)}</dd></div>
            </dl>
            <h3>Mô tả chi tiết</h3>
            <p className="my-report-modal-description">{selectedReport.description || 'Chưa có mô tả.'}</p>
            {selectedReport.notes && <><h3>Ghi chú</h3><p className="my-report-modal-description">{selectedReport.notes}</p></>}
          </section>
        </div>
      )}
    </div>
  )
}

export default MyReports
