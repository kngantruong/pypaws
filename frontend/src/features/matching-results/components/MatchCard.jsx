function MatchCard({ match, onViewDetail, onContact, onReject }) {
  const speciesLabel = { DOG: 'Chó', CAT: 'Mèo' }
  const genderLabel = { MALE: '♂ Đực', FEMALE: '♀ Cái', UNKNOWN: 'Chưa xác định' }

  const formatDateTime = (value) => {
    if (!value) return 'Chưa cập nhật'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật'
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const imageList = match.images || match.image_urls || match.photos || []
  const coverImage =
    match.cover_image_url ||
    match.image_url ||
    (typeof imageList[0] === 'string' ? imageList[0] : imageList[0]?.url || imageList[0]?.image_url) ||
    '/placeholder-pet.png'

  const fullAddress = [
    match.address_detail,
    match.ward,
    match.province,
  ].filter(Boolean).join(', ') || match.location_text || 'Chưa cập nhật'

  return (
    <article className="matching-card">
      <div className="matching-card-image">
        <img src={coverImage} alt={match.pet_name || 'Thú cưng được tìm thấy'} />
        <span className="matching-card-status">🟢 FOUND</span>
      </div>

      <div className="matching-card-content">
        <div className="matching-card-title">
          <h3>{match.pet_name || 'Thú cưng được tìm thấy'}</h3>
          <span>{speciesLabel[match.species] || 'Chưa xác định'}</span>
        </div>

        <div className="matching-card-quick-info">
          <span>📍 {fullAddress}</span>
          <i>•</i>
          <span>🕒 {formatDateTime(match.event_time || match.created_at)}</span>
          <i>•</i>
          <span>{genderLabel[match.gender] || 'Chưa xác định'}</span>
        </div>

        {(match.description || match.notes) && (
          <p className="matching-card-description">
            {[match.description, match.notes].filter(Boolean).join(' · ')}
          </p>
        )}

        {typeof match.final_score === 'number' && (
          <div className="matching-score">
            ✨ Điểm tương đồng <strong>{(match.final_score * 100).toFixed(1)}%</strong>
          </div>
        )}

        <div className="matching-card-actions">
          <button type="button" className="matching-detail-button" onClick={() => onViewDetail?.(match)}>
            Xem chi tiết <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="matching-contact-button" onClick={() => onContact?.(match)}>
            Liên hệ người đăng
          </button>
          <button type="button" className="matching-reject-button" onClick={() => onReject?.(match)}>
            Không phải thú cưng của tôi
          </button>
        </div>
      </div>
    </article>
  )
}

export default MatchCard
