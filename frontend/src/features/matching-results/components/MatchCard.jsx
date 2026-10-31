function MatchCard({ match, onViewDetail, onContact, onReject }) {
  const speciesLabel = {
    DOG: 'Chó',
    CAT: 'Mèo',
  }

  const formatDate = (date) => {
    if (!date) return 'Chưa cập nhật'
    const parsedDate = new Date(date)
    if (Number.isNaN(parsedDate.getTime())) return 'Chưa cập nhật'
    return parsedDate.toLocaleDateString('vi-VN')
  }

  const fullAddress = [
    match.address_detail,
    match.ward,
    match.province,
  ].filter(Boolean).join(', ') || match.location_text || 'Chưa cập nhật'

  return (
    <article className="matching-card">
      <div className="matching-card-image">
        <img
          src={match.image_url || '/placeholder-pet.png'}
          alt={match.pet_name || 'Thú cưng được tìm thấy'}
        />
        <span className="matching-card-status">FOUND</span>
      </div>

      <div className="matching-card-content">
        <div className="matching-card-title">
          <h3>{match.pet_name || 'Chưa đặt tên'}</h3>
          <span>{speciesLabel[match.species] || 'Chưa xác định'}</span>
        </div>

        <div className="matching-card-info">
          <p>Giới tính: {match.gender === 'MALE' ? 'Đực' : match.gender === 'FEMALE' ? 'Cái' : 'Chưa xác định'}</p>
          <p>Địa chỉ cụ thể: {fullAddress}</p>
          <p>Thời gian nhìn thấy: {formatDate(match.event_time || match.created_at)}</p>
        </div>

        <p className="matching-card-description">
          {match.description || 'Chưa có mô tả cho thú cưng này.'}
        </p>

        {typeof match.final_score === 'number' && (
          <div className="matching-score" aria-label="Điểm tương đồng do hệ thống tính">
            <strong>Điểm tương đồng: {(match.final_score * 100).toFixed(1)}%</strong>
          </div>
        )}

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
            Liên hệ người đăng
          </button>

          <button
            type="button"
            className="matching-reject-button"
            onClick={() => onReject?.(match)}
          >
            Không phải thú cưng của tôi
          </button>
        </div>
      </div>
    </article>
  )
}

export default MatchCard
