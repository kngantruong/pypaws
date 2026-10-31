import { useMemo, useState } from 'react'
import mascot from '../../assets/logo/pypaws_mascot.png'
import './all-reports.css'

function AllReportsPage({ reports = [], onBackHome }) {
  const [reportType, setReportType] = useState('ALL')
  const [species, setSpecies] = useState('ALL')
  const [city, setCity] = useState('')
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)

  const filteredReports = useMemo(() => {
    let result = [...reports]
    if (reportType !== 'ALL') result = result.filter((report) => report.post_type === reportType)
    if (species !== 'ALL') result = result.filter((report) => report.species === species)

    if (city.trim()) {
      result = result.filter((report) => {
        const location = [report.address_detail, report.ward, report.province, report.location_text].filter(Boolean).join(' ')
        return location.toLowerCase().includes(city.trim().toLowerCase())
      })
    }

    if (keyword.trim()) {
      result = result.filter((report) => {
        const content = [report.pet_name, report.description, report.notes, report.location_text].filter(Boolean).join(' ')
        return content.toLowerCase().includes(keyword.trim().toLowerCase())
      })
    }

    if (fromDate) result = result.filter((report) => report.created_at && new Date(report.created_at) >= new Date(`${fromDate}T00:00:00`))
    if (toDate) result = result.filter((report) => report.created_at && new Date(report.created_at) <= new Date(`${toDate}T23:59:59`))

    result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB
    })
    return result
  }, [reports, reportType, species, city, keyword, fromDate, toDate, sortBy])

  const resetFilters = () => {
    setReportType('ALL')
    setSpecies('ALL')
    setCity('')
    setKeyword('')
    setFromDate('')
    setToDate('')
    setSortBy('newest')
  }

  const formatDate = (value) => {
    if (!value) return 'Chưa cập nhật'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? 'Chưa cập nhật' : date.toLocaleDateString('vi-VN')
  }

  const formatDateTime = (value) => {
    if (!value) return 'Chưa cập nhật'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? 'Chưa cập nhật' : date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const speciesLabel = (value) => value === 'DOG' ? 'Chó' : value === 'CAT' ? 'Mèo' : 'Chưa xác định'
  const genderLabel = (value) => ({ MALE: 'Đực', FEMALE: 'Cái', UNKNOWN: 'Chưa xác định' }[value] || value || 'Chưa cập nhật')
  const statusLabel = (value) => value === 'LOST' ? 'Thất lạc' : 'Đã tìm thấy'
  const addressOf = (report) => [report.address_detail, report.ward, report.province].filter(Boolean).join(', ') || report.location_text || 'Chưa cập nhật'

  const imagesOf = (report) => {
    const images = report.images || report.image_urls || report.photos || []
    return [
      report.image_url || report.cover_image_url,
      ...images.map((image) => typeof image === 'string' ? image : image?.url || image?.image_url),
    ].filter((src, index, all) => src && all.indexOf(src) === index)
  }

  return (
    <main className="all-reports-page">
      <section className="all-reports-heading">
        <div className="all-reports-heading-inner">
          <p className="all-reports-eyebrow">CÙNG CỘNG ĐỒNG PYPAWS</p>
          <h1>Tất cả báo cáo</h1>
          <p>Tìm kiếm các bé thú cưng đang thất lạc hoặc đã được tìm thấy.</p>
        </div>
      </section>

      <section className="all-reports-content">
        <div className="all-reports-filter-panel">
          <div className="all-reports-filter-heading">
            <div>
              <h2>Tìm kiếm báo cáo</h2>
              <p>Lọc theo loại báo cáo, thú cưng, địa điểm hoặc thời gian đăng.</p>
            </div>
            <button type="button" className="filter-reset" onClick={resetFilters} aria-label="Đặt lại bộ lọc" title="Đặt lại bộ lọc">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4.9 9a7.5 7.5 0 0 1 12.7-2L20 12M4 17v-5h5m10.1 3a7.5 7.5 0 0 1-12.7 2L4 12" /></svg>
            </button>
          </div>

          <div className="report-filters">
            <label className="report-filter-field">
              <span>Loại báo cáo</span>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="ALL">Tất cả báo cáo</option>
                <option value="LOST">Thú cưng thất lạc</option>
                <option value="FOUND">Thú cưng được tìm thấy</option>
              </select>
            </label>

            <label className="report-filter-field">
              <span>Loài thú cưng</span>
              <select value={species} onChange={(e) => setSpecies(e.target.value)}>
                <option value="ALL">Tất cả</option>
                <option value="DOG">Chó</option>
                <option value="CAT">Mèo</option>
              </select>
            </label>

            <label className="report-filter-field">
              <span>Khu vực</span>
              <input type="text" placeholder="Nhập tỉnh/thành, phường..." value={city} onChange={(e) => setCity(e.target.value)} />
            </label>

            <label className="report-filter-field">
              <span>Từ khóa</span>
              <input type="text" placeholder="Tên bé, đặc điểm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </label>

            <div className="date-filter-group">
              <span>Thời gian đăng tin</span>
              <div className="date-filter-inputs">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="Từ ngày" />
                <span>đến</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="Đến ngày" />
              </div>
            </div>
          </div>
        </div>

        <div className="all-reports-toolbar">
          <div className="all-reports-count"><strong>{filteredReports.length}</strong> báo cáo được tìm thấy</div>
          <label className="all-reports-sort">Sắp xếp:
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
            </select>
          </label>
        </div>

        {filteredReports.length > 0 ? (
          <div className="all-reports-grid">
            {filteredReports.map((report) => (
              <article className="all-report-card" key={report.post_id} onClick={() => setSelectedReport(report)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedReport(report) }}>
                <div className="all-report-image">
                  <img src={report.image_url || report.cover_image_url || mascot} alt={report.pet_name || 'Thú cưng'} />
                  <span className={`all-report-status ${report.post_type === 'LOST' ? 'is-lost' : 'is-found'}`}>{statusLabel(report.post_type)}</span>
                </div>
                <div className="all-report-info">
                  <div className="all-report-meta">{speciesLabel(report.species)} <span>•</span> {formatDate(report.created_at)}</div>
                  <h3>{report.pet_name || `Báo cáo ${speciesLabel(report.species).toLowerCase()}`}</h3>
                  <p className="all-report-location"><strong>Địa điểm:</strong> {addressOf(report)}</p>
                  <p className="all-report-description">{report.description || 'Chưa có mô tả.'}</p>
                  <button type="button" className="all-report-detail-link" onClick={(event) => { event.stopPropagation(); setSelectedReport(report) }}>Xem chi tiết <span aria-hidden="true">→</span></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="all-reports-empty">
            <h3>Không tìm thấy báo cáo phù hợp</h3>
            <p>Hãy thử thay đổi từ khóa hoặc bộ lọc để xem các báo cáo khác.</p>
            <button type="button" onClick={resetFilters}>Xóa bộ lọc</button>
          </div>
        )}
      </section>

      {selectedReport && (
        <div className="all-report-modal-backdrop" role="presentation" onClick={() => setSelectedReport(null)}>
          <section className="all-report-modal" role="dialog" aria-modal="true" aria-labelledby="all-report-modal-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="all-report-modal-close" onClick={() => setSelectedReport(null)} aria-label="Đóng">×</button>
            <div className="all-report-modal-header">
              <span className={`all-report-status ${selectedReport.post_type === 'LOST' ? 'is-lost' : 'is-found'}`}>{statusLabel(selectedReport.post_type)}</span>
              <h2 id="all-report-modal-title">{selectedReport.pet_name || `Báo cáo ${speciesLabel(selectedReport.species).toLowerCase()}`}</h2>
              <p>{speciesLabel(selectedReport.species)} · Đăng ngày {formatDate(selectedReport.created_at)}</p>
            </div>
            <div className="all-report-modal-body">
              <div className="all-report-modal-gallery">
                {imagesOf(selectedReport).length ? imagesOf(selectedReport).map((src, index) => <img key={src} src={src} alt={`Ảnh thú cưng ${index + 1}`} />) : <img src={mascot} alt="Hình minh họa PyPaws" />}
              </div>
              <div className="all-report-modal-details">
                <h3>Thông tin báo cáo</h3>
                <dl>
                  <div><dt>Loại báo cáo</dt><dd>{statusLabel(selectedReport.post_type)}</dd></div>
                  <div><dt>Loài</dt><dd>{speciesLabel(selectedReport.species)}</dd></div>
                  <div><dt>Giới tính</dt><dd>{genderLabel(selectedReport.gender || selectedReport.sex)}</dd></div>
                  <div><dt>Thời gian xảy ra</dt><dd>{formatDateTime(selectedReport.event_time || selectedReport.lost_time || selectedReport.found_time)}</dd></div>
                  <div><dt>Địa điểm</dt><dd>{addressOf(selectedReport)}</dd></div>
                  <div><dt>Ngày đăng</dt><dd>{formatDateTime(selectedReport.created_at)}</dd></div>
                  <div><dt>Mã báo cáo</dt><dd>{selectedReport.report_code || selectedReport.post_id || 'Chưa cập nhật'}</dd></div>
                  <div><dt>Trạng thái</dt><dd>{selectedReport.status === 'ACTIVE' ? 'Đang hiển thị' : selectedReport.status || 'Chưa cập nhật'}</dd></div>
                </dl>
                <h3>Mô tả chi tiết</h3>
                <p>{selectedReport.description || 'Người đăng chưa cung cấp mô tả.'}</p>
                {selectedReport.notes && <><h3>Ghi chú</h3><p>{selectedReport.notes}</p></>}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default AllReportsPage
