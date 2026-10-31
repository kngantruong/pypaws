import { useMemo, useState } from 'react'
import SearchSummary from './components/SearchSummary'
import MatchCard from './components/MatchCard'
import './matching-results.css'

function MatchingResultsPage({
  lostReport,
  matches = [],
  onViewDetail,
  onReject,
  onBackHome,
}) {
  const [sortBy, setSortBy] = useState('newest')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [rejectMatch, setRejectMatch] = useState(null)
  const [rejectedIds, setRejectedIds] = useState([])

  const eligibleMatches = useMemo(
    () => matches.filter(
      (item) => item.passed_threshold === true && item.species === lostReport?.species && !rejectedIds.includes(item.candidate_id || item.post_id),
    ),
    [matches, lostReport?.species, rejectedIds],
  )

  const filteredMatches = useMemo(() => [...eligibleMatches].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0)
    return new Date(b.created_at || 0) - new Date(a.created_at || 0)
  }), [eligibleMatches, sortBy])

  const rawDetailImages = selectedMatch
    ? (selectedMatch.images || selectedMatch.image_urls || selectedMatch.photos || [])
    : []
  const detailImages = selectedMatch
    ? [
        selectedMatch.cover_image_url || selectedMatch.image_url,
        ...rawDetailImages.map((image) =>
          typeof image === 'string' ? image : image?.url || image?.image_url,
        ),
      ].filter((image, index, all) => image && all.indexOf(image) === index)
    : []

  const formatDateTime = (value) => {
    if (!value) return 'Chưa cập nhật'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật'
    return date.toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', weekday: 'long',
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  }

  const fullAddress = selectedMatch
    ? [selectedMatch.address_detail, selectedMatch.ward, selectedMatch.province].filter(Boolean).join(', ') || selectedMatch.location_text || 'Chưa cập nhật'
    : ''

  return (
    <main className="matching-page">
      <div className="matching-container">
        <section className="matching-hero">
          <p className="matching-eyebrow">PYPAWS AI MATCHING</p>
          <h1>Kết quả tìm kiếm của bạn</h1>
        </section>

        <SearchSummary report={lostReport} />

        <section className="matching-results-section">
          <div className="matching-section-heading">
            <div><h2>Các bài đăng có thể liên quan</h2></div>
          </div>
          <div className="matching-filters">
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sắp xếp kết quả">
              <option value="newest">Bài mới nhất</option>
              <option value="oldest">Bài cũ nhất</option>
            </select>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="matching-empty-state">
              <h3>Hiện chưa có bài đăng phù hợp</h3>
              <p>PYPAWS sẽ tiếp tục tìm kiếm. Khi có bài FOUND mới đạt ngưỡng tương đồng, bạn sẽ nhận được thông báo trong tài khoản.</p>
              {onBackHome && <button type="button" onClick={onBackHome}>Về trang chủ</button>}
            </div>
          ) : (
            <div className="matching-grid">
              {filteredMatches.map((match) => (
                <MatchCard
                  key={match.candidate_id || match.post_id}
                  match={match}
                  onViewDetail={(item) => {
                    setSelectedMatch(item)
                    onViewDetail?.(item)
                  }}
                  onReject={(item) => setRejectMatch(item)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedMatch && (
        <div className="matching-detail-backdrop" role="presentation" onClick={() => setSelectedMatch(null)}>
          <section className="matching-detail-modal" role="dialog" aria-modal="true" aria-labelledby="matching-detail-title" onClick={(event) => event.stopPropagation()}>
            <button className="matching-detail-close" type="button" onClick={() => setSelectedMatch(null)} aria-label="Đóng">×</button>
            <h2 id="matching-detail-title">Chi tiết bài đăng FOUND</h2>
            <p className="matching-detail-pet-name">{selectedMatch.pet_name || 'Thú cưng được tìm thấy'}</p>
            <div className="matching-detail-gallery">
              {detailImages.length ? detailImages.map((src, index) => (
                <img key={src || index} src={src} alt={`Ảnh thú cưng ${index + 1}`} />
              )) : <p>Chưa có hình ảnh.</p>}
            </div>
            <dl className="matching-detail-data">
              <div><dt>Loài:</dt><dd>{selectedMatch.species === 'DOG' ? 'Chó' : selectedMatch.species === 'CAT' ? 'Mèo' : 'Chưa xác định'}</dd></div>
              <div><dt>Giới tính:</dt><dd>{selectedMatch.gender === 'MALE' ? 'Đực' : selectedMatch.gender === 'FEMALE' ? 'Cái' : 'Chưa xác định'}</dd></div>
              <div><dt>Thời gian:</dt><dd>{formatDateTime(selectedMatch.event_time || selectedMatch.created_at)}</dd></div>
              <div><dt>Địa điểm tìm thấy:</dt><dd>{fullAddress}</dd></div>
              <div><dt>Đặc điểm:</dt><dd>{selectedMatch.description || 'Chưa cung cấp'}</dd></div>
              {selectedMatch.notes && <div><dt>Ghi chú:</dt><dd>{selectedMatch.notes}</dd></div>}
            </dl>
            <p className="matching-modal-demo-note">Hãy đối chiếu địa điểm và thời gian tìm thấy với thông tin thú cưng bị mất trước khi đến khu vực này. Không nên tự ý vào khu vực riêng tư.</p>
          </section>
        </div>
      )}

      {rejectMatch && (
        <div className="matching-detail-backdrop" role="presentation" onClick={() => setRejectMatch(null)}>
          <section className="matching-action-modal" role="dialog" aria-modal="true" aria-labelledby="matching-reject-title" onClick={(event) => event.stopPropagation()}>
            <button className="matching-detail-close" type="button" onClick={() => setRejectMatch(null)} aria-label="Đóng">×</button>
            <h2 id="matching-reject-title">Xác nhận từ chối kết quả?</h2>
            <p>Bạn xác nhận bé <strong>{rejectMatch.pet_name || 'thú cưng này'}</strong> không phải thú cưng bạn đang tìm?</p>
            <p className="matching-modal-demo-note">Trong bản demo, kết quả sẽ được ẩn khỏi danh sách hiện tại.</p>
            <div className="matching-modal-actions">
              <button type="button" className="matching-modal-secondary" onClick={() => setRejectMatch(null)}>Hủy</button>
              <button type="button" className="matching-modal-primary" onClick={() => {
                setRejectedIds((previous) => [...previous, rejectMatch.candidate_id || rejectMatch.post_id])
                onReject?.(rejectMatch)
                setRejectMatch(null)
              }}>Xác nhận</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default MatchingResultsPage
