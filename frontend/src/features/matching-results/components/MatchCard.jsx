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
      <div className="matching-card-content">
        <div className="matching-card-title">
          <div>
            <h3>{match.pet_name || 'Chưa đặt tên'}</h3>
            <span className="matching-card-species">
              {speciesLabel[match.species] || 'Chưa xác định'}
            </span>
          </div>
          <span className="matching-card-status">FOUND</span>
        </div>

        <section className="matching-pet-information">
          <h4>Thông tin thú cưng</h4>
          <div className="matching-card-info">
            <p><strong>Giới tính:</strong> {match.gender === 'MALE' ? 'Đực' : match.gender === 'FEMALE' ? 'Cái' : 'Chưa xác định'}</p>
            <p><strong>Địa chỉ cụ thể:</strong> {fullAddress}</p>
            <p><strong>Thời gian nhìn thấy:</strong> {formatDate(match.event_time || match.created_at)}</p>
            {match.description && (
              <p><strong>Đặc điểm:</strong> {match.description}</p>
            )}
            {match.notes && (
              <p><strong>Ghi chú:</strong> {match.notes}</p>
            )}
          </div>
        </section>

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

      <div className="matching-card-image">
        <img
          src={match.image_url || '/placeholder-pet.png'}
          alt={match.pet_name || 'Thú cưng được tìm thấy'}
        />
      </div>
    </article>
  )
}

export default MatchCard
