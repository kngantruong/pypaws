import { API_BASE } from '../../../services/api'

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
  const rawCover =
    match.cover_image_url ||
    match.image_url ||
    match.primary_image ||
    (typeof imageList[0] === 'string' ? imageList[0] : imageList[0]?.url || imageList[0]?.image_url)

  const coverImage = rawCover
    ? (rawCover.startsWith('http') || rawCover.startsWith('blob:') ? rawCover : `${API_BASE}${rawCover.startsWith('/') ? '' : '/'}${rawCover}`)
    : `${API_BASE}/uploads/cat_same_2.jpg`

  const provinceName = match.province || match.location_text || 'Chưa cập nhật tỉnh/thành'

  return (
    <article className="matching-card">
      <div className="matching-card-image">
        <img
          src={coverImage}
          alt={match.pet_name || match.report_code || 'Thú cưng được tìm thấy'}
          onError={(e) => {
            e.currentTarget.src = `${API_BASE}/uploads/cat_same_2.jpg`
          }}
        />
        <span className="matching-card-status">🟢 FOUND</span>
      </div>

      <div className="matching-card-content">
        <div className="matching-card-title">
          <h3>{match.pet_name || match.report_code || 'Bé được tìm thấy'}</h3>
          <span>{speciesLabel[match.species] || 'Chó/Mèo'}</span>
        </div>

        <div className="matching-card-quick-info">
          <span>📍 {provinceName}</span>
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

        {match.final_score !== undefined && match.final_score !== null && (
          <div className="matching-score">
            ✨ Điểm tương đồng <strong>{(match.final_score > 1 ? match.final_score : match.final_score * 100).toFixed(1)}%</strong>
            {match.image_similarity && (
              <span style={{ fontSize: '12px', marginLeft: '8px', color: '#6b7280' }}>
                (AI DINOv2: {(match.image_similarity * 100).toFixed(1)}% {match.distance_km !== null && match.distance_km !== undefined ? `· Cách ${match.distance_km}km` : ''})
              </span>
            )}
          </div>
        )}

        <div className="matching-card-actions">
          <button type="button" className="matching-button-primary" onClick={() => onContact?.(match)}>
            Liên hệ người đăng
          </button>
          <button type="button" className="matching-button-secondary" onClick={() => onViewDetail?.(match)}>
            Xem chi tiết
          </button>
          <button type="button" className="matching-button-ghost" onClick={() => onReject?.(match)}>
            Bỏ qua
          </button>
        </div>
      </div>
    </article>
  )
}

export default MatchCard
