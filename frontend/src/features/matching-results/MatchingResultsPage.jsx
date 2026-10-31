import { useMemo, useState } from 'react'
import SearchSummary from './components/SearchSummary'
import MatchCard from './components/MatchCard'
import './matching-results.css'

function MatchingResultsPage({
  lostReport,
  matches = [],
  onViewDetail,
  onContact,
  onReject,
  onBackHome,
  onResolve,
}) {
  const [sortBy, setSortBy] = useState('newest')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [contactMatch, setContactMatch] = useState(null)
  const [rejectMatch, setRejectMatch] = useState(null)
  const [rejectedIds, setRejectedIds] = useState([])
  const [resolutionStep, setResolutionStep] = useState('choice')
  const [selectedFoundPost, setSelectedFoundPost] = useState(null)
  const [resolutionSource, setResolutionSource] = useState(null)
  const [showResolution, setShowResolution] = useState(false)

  const eligibleMatches = useMemo(
    () => matches.filter(
      (item) => item.passed_threshold === true && item.species === lostReport?.species && !rejectedIds.includes(item.candidate_id || item.post_id),
    ),
    [matches, lostReport?.species, rejectedIds],
  )

  const eligibleFoundPosts = eligibleMatches.filter((item) => {
    const status = item.status || 'ACTIVE'
    const matchingStatus = item.matching_status || item.candidate_status || 'PENDING'
    return status === 'ACTIVE' && ['PENDING', 'CONTACTED'].includes(matchingStatus)
  })

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

  return (
    <main className="matching-page">
      <div className="matching-container">
        <section className="matching-hero">
          <p className="matching-eyebrow">PYPAWS AI MATCHING</p>
          <h1>Kết quả tìm kiếm của bạn</h1>
        </section>

        <SearchSummary report={lostReport} />

        {lostReport?.status !== 'RESOLVED' && lostReport?.status !== 'CANCELLED' && (
          <div className="matching-resolution-trigger-wrap">
            <div><strong>Đã tìm lại được thú cưng?</strong><p>Thông báo cho Pypaws để kết thúc quá trình tìm kiếm.</p></div>
            <button type="button" className="matching-resolution-trigger" onClick={() => { setResolutionStep('choice'); setResolutionSource(null); setSelectedFoundPost(null); setShowResolution(true) }}>Tôi đã tìm thấy thú cưng</button>
          </div>
        )}

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
                  onContact={(item) => {
                    setContactMatch(item)
                    onContact?.(item)
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
              <div><dt>Địa chỉ:</dt><dd>{[selectedMatch.address_detail, selectedMatch.ward, selectedMatch.province].filter(Boolean).join(', ') || selectedMatch.location_text || 'Chưa cập nhật'}</dd></div>
              <div><dt>Đặc điểm:</dt><dd>{selectedMatch.description || 'Chưa cung cấp'}</dd></div>
              {selectedMatch.notes && <div><dt>Ghi chú:</dt><dd>{selectedMatch.notes}</dd></div>}
            </dl>
          </section>
        </div>
      )}

      {contactMatch && (
        <div className="matching-detail-backdrop" role="presentation" onClick={() => setContactMatch(null)}>
          <section className="matching-action-modal" role="dialog" aria-modal="true" aria-labelledby="matching-contact-title" onClick={(event) => event.stopPropagation()}>
            <button className="matching-detail-close" type="button" onClick={() => setContactMatch(null)} aria-label="Đóng">×</button>
            <h2 id="matching-contact-title">Thông tin người đăng tin FOUND</h2>
            <p className="matching-modal-demo-note">Thông tin minh họa để kiểm thử giao diện, chưa phải dữ liệu người dùng thật.</p>
            <dl className="matching-detail-data matching-contact-data">
              <div><dt>Họ và tên</dt><dd>{contactMatch.contact_name || 'Nguyễn Minh Anh (DEMO)'}</dd></div>
              <div><dt>Số điện thoại</dt><dd>{contactMatch.contact_phone || '0901 234 567'}</dd></div>
              <div><dt>Email</dt><dd>{contactMatch.contact_email || 'minhanh.demo@example.com'}</dd></div>
            </dl>
            <p className="matching-modal-demo-note">Bạn có thể chủ động trao đổi với người đăng để xác nhận đặc điểm thú cưng và địa điểm tìm thấy.</p>
          </section>
        </div>
      )}


      {showResolution && (
        <div className="matching-detail-backdrop" role="presentation" onClick={() => setShowResolution(false)}>
          <section className="matching-action-modal matching-resolution-modal" role="dialog" aria-modal="true" aria-labelledby="matching-resolution-title" onClick={(event) => event.stopPropagation()}>
            <button className="matching-detail-close" type="button" onClick={() => setShowResolution(false)} aria-label="Đóng">×</button>
            {resolutionStep === 'choice' ? (
              <>
                <h2 id="matching-resolution-title">Bạn đã tìm thấy thú cưng bằng cách nào?</h2>
                <p className="matching-modal-demo-note">Chọn nguồn giúp bạn tìm lại thú cưng để Pypaws cập nhật đúng các bài đăng liên quan.</p>
                <button type="button" className="matching-resolution-option" onClick={() => { setResolutionSource('PYPAWS'); setResolutionStep('found') }}><strong>Tôi tìm thấy nhờ bài đăng trên Pypaws</strong><span>Chọn bài FOUND đã giúp bạn tìm thấy thú cưng.</span></button>
                <button type="button" className="matching-resolution-option" onClick={() => { setResolutionSource('OTHER'); setResolutionStep('confirm') }}><strong>Tôi tự tìm thấy bằng cách khác</strong><span>Không thông qua bài đăng FOUND trên Pypaws.</span></button>
                <div className="matching-modal-actions"><button type="button" className="matching-modal-secondary" onClick={() => setShowResolution(false)}>Hủy</button></div>
              </>
            ) : resolutionStep === 'found' ? (
              <>
                <h2 id="matching-resolution-title">Chọn bài đăng FOUND tương ứng</h2>
                <p className="matching-modal-demo-note">Chỉ hiển thị bài FOUND còn hiệu lực và có matching ở trạng thái PENDING hoặc CONTACTED.</p>
                {eligibleFoundPosts.length ? <div className="matching-resolution-list">{eligibleFoundPosts.map((item) => {
                  const id = item.candidate_id || item.post_id
                  return <button type="button" key={id} className={String(selectedFoundPost?.candidate_id || selectedFoundPost?.post_id) === String(id) ? 'matching-resolution-option selected' : 'matching-resolution-option'} onClick={() => setSelectedFoundPost(item)}><strong>{item.pet_name || 'Thú cưng được tìm thấy'} · FOUND #{item.post_id}</strong><span>{item.location_text || 'Chưa cập nhật địa điểm'} · {item.description || 'Chưa có mô tả'}</span></button>
                })}</div> : <p className="matching-resolution-empty">Không có bài FOUND nào thỏa điều kiện để chọn.</p>}
                <div className="matching-modal-actions"><button type="button" className="matching-modal-secondary" onClick={() => setResolutionStep('choice')}>Quay lại</button><button type="button" className="matching-modal-primary" disabled={!selectedFoundPost} onClick={() => setResolutionStep('confirm')}>Tiếp tục</button></div>
              </>
            ) : (
              <>
                <h2 id="matching-resolution-title">Xác nhận đã tìm thấy thú cưng?</h2>
                {resolutionSource === 'PYPAWS' ? <p>Bạn xác nhận đã tìm thấy thú cưng nhờ bài FOUND <strong>#{selectedFoundPost?.post_id}</strong>?</p> : <p>Bạn xác nhận đã tự tìm thấy thú cưng bằng nguồn khác, không thông qua Pypaws?</p>}
                <p className="matching-modal-demo-note">Sau khi xác nhận, bài LOST sẽ chuyển sang RESOLVED và ngừng matching. {resolutionSource === 'PYPAWS' ? 'Bài FOUND được chọn cũng sẽ chuyển sang RESOLVED.' : 'Các bài FOUND khác vẫn giữ nguyên trạng thái.'} Thao tác này không xóa bài đăng.</p>
                <div className="matching-modal-actions"><button type="button" className="matching-modal-secondary" onClick={() => setResolutionStep(resolutionSource === 'PYPAWS' ? 'found' : 'choice')}>Quay lại</button><button type="button" className="matching-modal-primary" onClick={() => { onResolve?.({ source: resolutionSource, foundPost: selectedFoundPost, lostReport }); setShowResolution(false) }}>Xác nhận hoàn tất</button></div>
              </>
            )}
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
