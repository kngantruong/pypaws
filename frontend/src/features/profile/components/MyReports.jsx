
function MyReports({ reports = [] }) {
  const myReports = reports

  const getPostTypeLabel = (type) => {
    return type === 'LOST' ? 'Tìm thú cưng' : 'Đã tìm thấy'
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
                <img
                  src={report.image_url || '/placeholder-pet.png'}
                  alt="Thú cưng"
                />
              </div>

              <div className="my-report-info">
                <span className={`my-report-type ${report.post_type?.toLowerCase()}`}>
                  {getPostTypeLabel(report.post_type)}
                </span>

                <h3>
                  {report.pet_name || `Tin đăng #${report.post_id}`}
                </h3>

                <p>{report.description || 'Chưa có mô tả.'}</p>

                <span className="my-report-location">
                  {report.location_text || 'Chưa cập nhật địa điểm'}
                </span>

                <span className="my-report-status">
                  {getStatusLabel(report.status)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyReports
