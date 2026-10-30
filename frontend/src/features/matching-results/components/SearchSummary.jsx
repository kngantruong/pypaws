function SearchSummary({ report }) {
  if (!report) {
    return null
  }

  const speciesLabel = {
    DOG: 'Chó',
    CAT: 'Mèo',
  }

  return (
    <section className="matching-summary">
      <div className="matching-summary-heading">
        <div>
          <p className="matching-summary-eyebrow">THÔNG TIN TÌM KIẾM</p>
          <h2>Tiêu chí tìm kiếm của bạn</h2>
        </div>
      </div>

      <div className="matching-summary-content">
        <div className="matching-summary-item">
          <span>Loài thú cưng</span>
          <strong>{speciesLabel[report.species] || 'Chưa xác định'}</strong>
        </div>

        <div className="matching-summary-item">
          <span>Loại tin đăng</span>
          <strong>Thú cưng thất lạc</strong>
        </div>

        <div className="matching-summary-item">
          <span>Khu vực</span>
          <strong>{report.location_text || 'Chưa cung cấp'}</strong>
        </div>

        <div className="matching-summary-item">
          <span>Mô tả</span>
          <strong>{report.description || 'Không có mô tả'}</strong>
        </div>
      </div>
    </section>
  )
}

export default SearchSummary