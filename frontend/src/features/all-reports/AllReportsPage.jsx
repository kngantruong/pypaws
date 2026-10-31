import { useMemo, useState } from 'react'
import mascot from '../../assets/logo/pypaws_mascot.png'
import { getProvinces, getWards } from '../pet-report/data/vietnamAddress.js'
import './all-reports.css'

function AllReportsPage({ reports = [], onBackHome }) {
  const [reportType, setReportType] = useState('ALL')
  const [species, setSpecies] = useState('ALL')
  const [provinceOptions, setProvinceOptions] = useState([])
  const [wardOptions, setWardOptions] = useState([])
  const [province, setProvince] = useState('')
  const [ward, setWard] = useState('')
  const [period, setPeriod] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [selectedReport, setSelectedReport] = useState(null)

  useEffect(() => {
    getProvinces().then(setProvinceOptions).catch((error) => console.error('Không tải được danh sách tỉnh/thành:', error))
  }, [])

  useEffect(() => {
    if (!province) { setWardOptions([]); setWard(''); return }
    const selected = provinceOptions.find((item) => item.name === province)
    if (!selected) { setWardOptions([]); return }
    getWards(selected.code).then(setWardOptions).catch((error) => console.error('Không tải được danh sách phường/xã:', error))
    setWard('')
  }, [province, provinceOptions])

  const filteredReports = useMemo(() => {
    let result = [...reports]
    if (reportType !== 'ALL') result = result.filter((report) => report.post_type === reportType)
    if (species !== 'ALL') result = result.filter((report) => report.species === species)

    if (province) result = result.filter((report) => report.province === province)
    if (ward) result = result.filter((report) => report.ward === ward)
    if (period !== 'all') {
      const cutoff = Date.now() - Number(period) * 24 * 60 * 60 * 1000
      result = result.filter((report) => report.created_at && new Date(report.created_at).getTime() >= cutoff)
    }

    result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB
    })
    return result
  }, [reports, reportType, species, province, ward, period, sortBy])

  const resetFilters = () => {
    setReportType('ALL')
    setSpecies('ALL')
    setProvince('')
    setWard('')
    setPeriod('all')
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
  const statusLabel = (value) => value === 'LOST' ? 'LOST' : 'FOUND'
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
              <p>Lọc theo loại báo cáo, loài thú cưng, khu vực và thời gian đăng.</p>
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
                <option value="LOST">LOST</option>
                <option value="FOUND">FOUND</option>
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
              <span>Tỉnh/thành phố</span>
              <select value={province} onChange={(e) => setProvince(e.target.value)}>
                <option value="">Tất cả tỉnh/thành phố</option>
                {provinceOptions.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
              </select>
            </label>

            <label className="report-filter-field">
              <span>Phường/xã</span>
              <select value={ward} onChange={(e) => setWard(e.target.value)} disabled={!province}>
                <option value="">Tất cả phường/xã</option>
                {wardOptions.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
              </select>
            </label>

            <label className="report-filter-field">
              <span>Thời gian đăng</span>
              <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="all">Tất cả thời gian</option>
                <option value="1">1 day ago</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
              </select>
            </label>
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
                  <div className="all-report-facts">
                    <p><strong>Giới tính:</strong> {genderLabel(report.gender || report.sex)}</p>
                    <p><strong>Thời gian xảy ra:</strong> {formatDateTime(report.event_time || report.lost_time || report.found_time)}</p>
                    <p><strong>Địa điểm:</strong> {addressOf(report)}</p>
                    <p><strong>Ngày đăng:</strong> {formatDate(report.created_at)}</p>
                    <p className="all-report-description"><strong>Mô tả:</strong> {report.description || 'Chưa có mô tả.'}</p>
                  </div>
                  <button type="button" className="all-report-detail-link" onClick={(event) => { event.stopPropagation(); setSelectedReport(report) }}>Xem chi tiết ảnh <span aria-hidden="true">→</span></button>
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
          <section className="all-report-modal all-report-images-only" role="dialog" aria-modal="true" aria-label="Tất cả ảnh thú cưng" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="all-report-modal-close" onClick={() => setSelectedReport(null)} aria-label="Đóng">×</button>
            <div className="all-report-modal-gallery">
              {imagesOf(selectedReport).length ? imagesOf(selectedReport).map((src, index) => <img key={src} src={src} alt={`Ảnh thú cưng ${index + 1}`} />) : <img src={mascot} alt="Hình minh họa PyPaws" />}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default AllReportsPage
