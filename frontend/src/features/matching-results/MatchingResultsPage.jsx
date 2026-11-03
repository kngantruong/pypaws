import { useEffect, useMemo, useState } from 'react'
import { getCandidates, runMatching, contactCandidate, rejectCandidate, resolveCandidate, resolveImageUrl } from '../../services/api'
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
  currentUser,
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
  const [liveCandidates, setLiveCandidates] = useState([])
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false)
  const [contactInfo, setContactInfo] = useState(null)
  const [currentRadius, setCurrentRadius] = useState(5)

  useEffect(() => {
    if (lostReport?.post_id) {
      setIsLoadingCandidates(true)
      getCandidates(lostReport.post_id)
        .then((items) => {
          if (items && items.length > 0) {
            setLiveCandidates(items)
          } else {
            return runMatching(lostReport.post_id, 5).then((res) => {
              setLiveCandidates(res.items || [])
            })
          }
        })
        .catch((err) => console.warn('Could not fetch live candidates:', err))
        .finally(() => setIsLoadingCandidates(false))
    }
  }, [lostReport?.post_id])

  const handleExpandRadius = async (newRadius) => {
    if (!lostReport?.post_id) return
    setIsLoadingCandidates(true)
    setCurrentRadius(newRadius)
    try {
      const res = await runMatching(lostReport.post_id, newRadius)
      setLiveCandidates(res.items || [])
    } catch (err) {
      console.error('Expand radius error:', err)
    } finally {
      setIsLoadingCandidates(false)
    }
  }

  const handleContactClick = async (match) => {
    setContactMatch(match)
    setContactInfo(null)
    if (!match.candidate_id) {
      setContactInfo({ error: 'Ứng viên này chưa có thông tin liên hệ hợp lệ.' })
      return
    }
    try {
      const info = await contactCandidate(match.candidate_id)
      setContactInfo(info)
    } catch (err) {
      setContactInfo({ error: err.message || 'Không thể lấy thông tin liên hệ.' })
    }
  }

  const handleRejectClick = async (match) => {
    const id = match.candidate_id || match.post_id
    if (!match.candidate_id) return
    try {
      await rejectCandidate(match.candidate_id)
      setRejectedIds((prev) => [...prev, id])
    } catch (err) {
      console.warn('Reject API error:', err)
    }
  }

  const eligibleMatches = useMemo(
    () => {
      const sourceList = liveCandidates.length > 0 ? liveCandidates : matches
      return sourceList.filter(
        (item) => !rejectedIds.includes(item.candidate_id || item.post_id),
      )
    },
    [liveCandidates, matches, rejectedIds],
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
        resolveImageUrl(selectedMatch.cover_image_url || selectedMatch.image_url),
        ...rawDetailImages.map((image) =>
          resolveImageUrl(typeof image === 'string' ? image : image?.url || image?.image_url),
        ),
      ].filter((image, index, all) => image && all.indexOf(image) === index)
    : []

  const formatDescription = (value) => String(value || '').split(/(?=(?:Màu lông, hoa văn|Độ dài lông|Đặc điểm tai, mắt, mõm, đuôi|Dấu hiệu nhận dạng đặc biệt):)/).map((part) => part.trim()).filter(Boolean)

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

        <SearchSummary report={lostReport} currentUser={currentUser} />

        {lostReport?.status !== 'RESOLVED' && lostReport?.status !== 'CANCELLED' && (
          <div className="matching-resolution-trigger-wrap">
            <div><strong>Đã tìm lại được thú cưng?</strong><p>Thông báo cho Pypaws để kết thúc quá trình tìm kiếm.</p></div>
            <button type="button" className="matching-resolution-trigger" onClick={() => { setResolutionStep('choice'); setResolutionSource(null); setSelectedFoundPost(null); setShowResolution(true) }}>Tôi đã tìm thấy thú cưng</button>
          </div>
        )}

        <section className="matching-results-section">
          <div className="matching-section-heading">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2>Các bài đăng có thể liên quan</h2>
                {isLoadingCandidates && <span style={{ fontSize: '14px', color: '#f59e0b', marginLeft: '10px' }}>⏳ Đang tìm kiếm ứng viên...</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Bán kính:</span>
                {[5, 10, 20].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleExpandRadius(r)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: currentRadius === r ? '2px solid #f59e0b' : '1px solid #d1d5db',
                      background: currentRadius === r ? '#fef3c7' : '#fff',
                      color: currentRadius === r ? '#b45309' : '#374151',
                      cursor: 'pointer',
                    }}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>
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
              <div><dt>Đặc điểm:</dt><dd className="matching-summary-description">{formatDescription(selectedMatch.description).length ? formatDescription(selectedMatch.description).map((part, index) => <span key={`${part}-${index}`}>{part}</span>) : 'Chưa cung cấp'}</dd></div>
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
            {contactInfo?.error ? (
              <p className="matching-modal-demo-note">{contactInfo.error}</p>
            ) : (
              <dl className="matching-detail-data matching-contact-data">
                <div><dt>Họ và tên</dt><dd>{contactInfo?.contact_name || contactInfo?.name || 'Chưa cập nhật'}</dd></div>
                <div><dt>Số điện thoại</dt><dd>{contactInfo?.contact_phone || contactInfo?.phone || 'Chưa cập nhật'}</dd></div>
                <div><dt>Email</dt><dd>{contactInfo?.contact_email || contactInfo?.email || 'Chưa cập nhật'}</dd></div>
              </dl>
            )}
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
                <h2 id="matching-resolution-title">Chọn bài đăng tìm thấy thú cưng</h2>
                <p className="matching-modal-demo-note">Chỉ hiện những bài đăng tìm thấy còn hoạt động và đã có kết quả ghép phù hợp.</p>
                {eligibleFoundPosts.length ? <div className="matching-resolution-list">{eligibleFoundPosts.map((item) => {
                  const id = item.candidate_id || item.post_id
                  return <button type="button" key={id} className={String(selectedFoundPost?.candidate_id || selectedFoundPost?.post_id) === String(id) ? 'matching-resolution-option selected' : 'matching-resolution-option'} onClick={() => setSelectedFoundPost(item)}><strong>{item.pet_name || 'Thú cưng được tìm thấy'} · FOUND #{item.post_id}</strong><span>{item.location_text || 'Chưa cập nhật địa điểm'} · {item.description || 'Chưa có mô tả'}</span></button>
                })}</div> : <p className="matching-resolution-empty">Không có bài FOUND nào thỏa điều kiện để chọn.</p>}
                <div className="matching-modal-actions"><button type="button" className="matching-modal-secondary" onClick={() => setResolutionStep('choice')}>Quay lại</button><button type="button" className="matching-modal-primary" disabled={!selectedFoundPost} onClick={() => setResolutionStep('confirm')}>Tiếp tục</button></div>
              </>
            ) : (
              <>
                <h2 id="matching-resolution-title">Xác nhận đã tìm thấy thú cưng?</h2>
                {resolutionSource === 'PYPAWS' ? <p>Bạn xác nhận đã tìm thấy bé nhờ bài đăng <strong>FOUND #{selectedFoundPost?.post_id}</strong> chứ?</p> : <p>Bạn xác nhận đã tự tìm lại được bé bằng cách khác?</p>}
                <p className="matching-modal-demo-note">Sau khi xác nhận, tin tìm thú cưng (LOST) của bạn sẽ được chuyển thành <strong>Đã tìm thấy</strong> và không tiếp tục ghép kết quả nữa. Bài đăng tìm thấy của người khác không được thêm vào mục “Tin đăng của tôi”.</p>
                <p className="matching-modal-demo-note"></p>
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
            <p className="matching-modal-demo-note">Kết quả này sẽ được đánh dấu từ chối và ẩn khỏi danh sách của bạn.</p>
            <div className="matching-modal-actions">
              <button type="button" className="matching-modal-secondary" onClick={() => setRejectMatch(null)}>Hủy</button>
              <button type="button" className="matching-modal-primary" onClick={() => {
                handleRejectClick(rejectMatch).then(() => {
                  onReject?.(rejectMatch)
                  setRejectMatch(null)
                })
              }}>Xác nhận</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default MatchingResultsPage
