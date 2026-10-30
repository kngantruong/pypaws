
import { useState } from 'react'
import SearchSummary from './components/SearchSummary'
import MatchCard from './components/MatchCard'
import './matching-results.css'

function MatchingResultsPage({
  lostReport,
  matches = [],
  onViewDetail,
  onContact,
  onBackHome,
}) {
  const [sortBy, setSortBy] = useState('newest')
  const [speciesFilter, setSpeciesFilter] = useState('ALL')

  const filteredMatches = matches
    .filter((item) => {
      return speciesFilter === 'ALL' || item.species === speciesFilter
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.created_at) - new Date(b.created_at)
      }

      return new Date(b.created_at) - new Date(a.created_at)
    })

  return (
    <main className="matching-page">
      <div className="matching-container">

        <section className="matching-hero">
          <p className="matching-eyebrow">PYPAWS AI MATCHING</p>
          <h1>Những kết quả dành cho bạn!</h1>
        </section>

        <SearchSummary report={lostReport} />

        <section className="matching-results-section">
          <div className="matching-section-heading">
            <div>
              <h2>Kết quả tìm kiếm</h2>
              <p>
                Tìm thấy {filteredMatches.length} tin đăng được đề xuất.
              </p>
            </div>
          </div>

          <div className="matching-filters">
            <select
              value={speciesFilter}
              onChange={(event) => setSpeciesFilter(event.target.value)}
            >
              <option value="ALL">Tất cả</option>
              <option value="DOG">Chó</option>
              <option value="CAT">Mèo</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
            </select>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="matching-empty-state">
              <h3>Chưa tìm thấy kết quả</h3>
              <p>
                Hiện chưa có tin đăng phù hợp với tiêu chí tìm kiếm.
                Bạn có thể quay lại kiểm tra sau.
              </p>
            </div>
          ) : (
            <div className="matching-grid">
              {filteredMatches.map((match) => (
                <MatchCard
                  key={match.post_id}
                  match={match}
                  onViewDetail={onViewDetail}
                  onContact={onContact}
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
