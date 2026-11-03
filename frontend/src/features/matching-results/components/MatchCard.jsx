import { API_BASE, resolveImageUrl } from '../../../services/api'

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

  const coverImage = resolveImageUrl(rawCover) || `${API_BASE}/uploads/cat_same_2.jpg`

  const truncate = (value, length = 150) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim()
    return text.length > length ? text.slice(0, length).trimEnd() + '…' : text
  }

  const address = match.province || match.location_text || 'Chưa cập nhật địa điểm'
  const score = match.final_score !== undefined && match.final_score !== null
    ? (match.final_score > 1 ? match.final_score : match.final_score * 100)
    : null
  const imageScore = match.image_similarity !== undefined && match.image_similarity !== null
    ? match.image_similarity * 100
    : match.image_score !== undefined && match.image_score !== null
      ? match.image_score * 100
      : null

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
        {score !== null && <span className="matching-card-score-badge">{score.toFixed(1)}%</span>}
      </div>

      <div className="matching-card-content">
        <div className="matching-card-title">
          <div>
            <h3>{match.pet_name || 'Bé được tìm thấy'}</h3>
            <span className="matching-card-code">{match.report_code || ('FOUND-' + (match.post_id || ''))}</span>
          </div>
          <span className="matching-card-species">{speciesLabel[match.species] || 'Chó/Mèo'}</span>
        </div>

        <div className="matching-card-quick-info">
          <span>📍 {address}</span>
          <i>•</i>
          <span>🕒 {formatDateTime(match.event_time || match.created_at)}</span>
          <i>•</i>
          <span>{genderLabel[match.gender] || 'Chưa xác định'}</span>
        </div>

        {(match.description || match.notes) && (
          <p className="matching-card-description" title={[match.description, match.notes].filter(Boolean).join(' · ')}>
            {truncate([match.description, match.notes].filter(Boolean).join(' · '))}
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
