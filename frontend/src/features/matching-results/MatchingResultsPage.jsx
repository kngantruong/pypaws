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
}) {
  const [sortBy, setSortBy] = useState('newest')

  // Backend is responsible for calculating the combined image, location,
  // and time score. The UI must never decide whether a candidate qualifies.
  // Only records explicitly marked passed_threshold are eligible for display.
  const eligibleMatches = useMemo(
    () => matches.filter(
      (item) => item.passed_threshold === true && item.species === lostReport?.species,
    ),
    [matches, lostReport?.species],
  )

  const filteredMatches = useMemo(() => {
    return eligibleMatches
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.created_at || 0) - new Date(b.created_at || 0)
        }

        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      })
  }, [eligibleMatches, sortBy])

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
            <div>
              <h2>Các bài đăng có thể liên quan</h2>
            </div>
          </div>

          <div className="matching-filters">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Sắp xếp kết quả"
            >
              <option value="newest">Bài mới nhất</option>
              <option value="oldest">Bài cũ nhất</option>
            </select>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="matching-empty-state">
              <h3>Hiện chưa có bài đăng phù hợp</h3>
              <p>
                PYPAWS sẽ tiếp tục tìm kiếm. Khi có bài FOUND mới đạt ngưỡng
                tương đồng, bạn sẽ nhận được thông báo trong tài khoản.
              </p>
              {onBackHome && (
                <button type="button" onClick={onBackHome}>
                  Về trang chủ
                </button>
              )}
            </div>
          ) : (
            <div className="matching-grid">
              {filteredMatches.map((match) => (
                <MatchCard
                  key={match.candidate_id || match.post_id}
                  match={match}
                  onViewDetail={onViewDetail}
                  onContact={onContact}
                  onReject={onReject}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default MatchingResultsPage
