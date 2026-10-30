function MatchCard({ match, onViewDetail, onContact }) {
  const speciesLabel = {
    DOG: 'Chó',
    CAT: 'Mèo',
  }

  const formatDate = (date) => {
    if (!date) return 'Chưa cập nhật'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Chưa cập nhật'
    }

    return parsedDate.toLocaleDateString('vi-VN')
  }

  return (
    <article className="matching-card">
      <div className="matching-card-image">
        <img
          src={match.image_url || '/placeholder-pet.png'}
          alt={match.pet_name || 'Thú cưng'}
        />

        <span className="matching-card-status">Đang tìm chủ</span>
      </div>

      <div className="matching-card-content">
        <div className="matching-card-title">
          <h3>{match.pet_name || 'Chưa đặt tên'}</h3>
          <span>{speciesLabel[match.species] || 'Chưa xác định'}</span>
        </div>

        <div className="matching-card-info">
          <p>Tuổi: {match.age || 'Chưa cập nhật'}</p>
          <p>Khu vực: {match.location_text || 'Chưa cập nhật'}</p>
          <p>Ngày đăng: {formatDate(match.created_at)}</p>
        </div>

        <p className="matching-card-description">
          {match.description || 'Chưa có mô tả cho thú cưng này.'}
        </p>

        <div className="matching-card-actions">
          <button
            type="button"
            className="matching-detail-button"
            onClick={() => onViewDetail?.(match)}
          >
            Xem chi tiết
          </button>

          <button
            type="button"
            className="matching-contact-button"
            onClick={() => onContact?.(match)}
          >
            Liên hệ
          </button>
        </div>
      </div>
    </article>
  )
}

export default MatchCard