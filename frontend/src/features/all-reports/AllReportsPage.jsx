
import { useMemo, useState } from 'react'
import mascot from '../../assets/logo/pypaws_mascot.png'
import './all-reports.css'

function AllReportsPage({ reports = [], onCreateReport, onBackHome }) {
  const [reportType, setReportType] = useState('ALL')
  const [species, setSpecies] = useState('ALL')
  const [city, setCity] = useState('')
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const filteredReports = useMemo(() => {
    let result = [...reports]

    if (reportType !== 'ALL') {
      result = result.filter(
        (report) => report.post_type === reportType
      )
    }

    if (species !== 'ALL') {
      result = result.filter(
        (report) => report.species === species
      )
    }

    if (city.trim()) {
      result = result.filter((report =>
        (report.location_text || '')
          .toLowerCase()
          .includes(city.toLowerCase())
      ))
    }

    if (keyword.trim()) {
      result = result.filter((report) =>
        `${report.description || ''} ${report.location_text || ''}`
          .toLowerCase()
          .includes(keyword.toLowerCase())
      )
    }
    if (fromDate) {
      result = result.filter((report) => {
        if (!report.created_at) return false
        return new Date(report.created_at) >= new Date(`${fromDate}T00:00:00`)
      })
    }

    if (toDate) {
      result = result.filter((report) => {
        if (!report.created_at) return false
        return new Date(report.created_at) <= new Date(`${toDate}T23:59:59`)
      })
    }

    result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()

      return sortBy === 'newest'
        ? dateB - dateA
        : dateA - dateB
    })

    return result
 }, [reports, reportType, species, city, keyword, fromDate, toDate, sortBy])

  const getDateLabel = (report) => {
    return report.post_type === 'LOST'
      ? 'Lost date'
      : 'Found date'
  }

  const getStatusLabel = (type) => {
    return type === 'LOST' ? 'LOST' : 'FOUND'
  }

  return (
    <main className="all-reports-page">
      <section className="all-reports-heading">

        <h1>Tất cả báo cáo</h1>

        <p>
          Tìm kiếm và theo dõi các báo cáo thú cưng thất lạc
          hoặc được tìm thấy trong cộng đồng PyPaws.
        </p>

      </section>

      <section className="all-reports-content">
        <div className="report-filters">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="ALL">All report types</option>
            <option value="LOST">Lost</option>
            <option value="FOUND">Found</option>
          </select>

          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
          >
            <option value="ALL">Dog/Cat</option>
            <option value="DOG">Dog</option>
            <option value="CAT">Cat</option>
          </select>

          <input
            type="text"
            placeholder="City / Location"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          <input
            type="text"
            placeholder="Search keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <div className="date-filter-group">
      <label>Thời gian đăng tin</label>

      <div className="date-filter-inputs">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          aria-label="Ngày bắt đầu"
        />

        <span>đến</span>

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          aria-label="Ngày kết thúc"
        />
      </div>
    </div>

          <button
            type="button"
            className="filter-reset"
            onClick={() => {
              setReportType('ALL')
              setSpecies('ALL')
              setCity('')
              setKeyword('')
              setFromDate('')
              setToDate('')
              setSortBy('newest')
            }}
          >
            Reset
          </button>
        </div>

        <div className="all-reports-toolbar">
          <span>
            {filteredReports.length} reports found
          </span>

          <label>
            Sort by:
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>

        {filteredReports.length > 0 ? (
          <div className="all-reports-grid">
            {filteredReports.map((report) => (
              <article
                className="all-report-card"
                key={report.post_id}
              >
                <div className="all-report-image">
                  <img
                    src={report.image_url || mascot}
                    alt={report.pet_name || 'Thú cưng'}
                  />

                  <span
                    className={`all-report-status ${
                      report.post_type === 'LOST'
                        ? 'is-lost'
                        : 'is-found'
                    }`}
                  >
                    {getStatusLabel(report.post_type)}
                  </span>
                </div>

                <div className="all-report-info">
                  <h3>
                    {report.pet_name ||
                      `${report.species === 'DOG' ? 'Dog' : 'Cat'} report`}
                  </h3>

                  <p>
                    <strong>Location:</strong>{' '}
                    {report.location_text || 'Not updated'}
                  </p>

                  <p>
                    <strong>{getDateLabel(report)}:</strong>{' '}
                    {report.created_at
                      ? new Date(report.created_at).toLocaleDateString('vi-VN')
                      : 'Not updated'}
                  </p>

                  <p>
                    <strong>Sex:</strong>{' '}
                    {report.sex || 'Unknown'}
                  </p>

                  <p className="all-report-description">
                    {report.description || 'No description'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="all-reports-empty">
            <h3>No reports found</h3>
            <p>Thử thay đổi bộ lọc để tìm báo cáo khác.</p>
          </div>
        )}
      </section>
    </main>
  )
}

export default AllReportsPage
