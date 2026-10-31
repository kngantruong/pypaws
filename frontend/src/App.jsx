import MatchingResultsPage from './features/matching-results/MatchingResultsPage.jsx'
import ProfilePage from './features/profile/ProfilePage.jsx'
import AllReportsPage from './features/all-reports/AllReportsPage.jsx'
import LoginPage from './features/auth/pages/LoginPage.jsx'
import RegisterPage from './features/auth/pages/RegisterPage.jsx'
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage.jsx'
import { useState } from 'react'
import './App.css'
import logo from './assets/logo/pypaws_logo.png'
import mascot from './assets/logo/pypaws_mascot.png'
import PetReportPage from './features/pet-report/PetReportPage.jsx'


// Dữ liệu minh họa theo bảng SQL: posts
// Khi có API backend, thay dữ liệu mẫu bằng dữ liệu trả về từ SQL Server.
const reports = [
  {
    post_id: 1,
    report_code: 'LOST1',
    post_type: 'LOST',
    species: 'DOG',
    status: 'ACTIVE',
    location_text: 'TP. Hồ Chí Minh',
    created_at: null,
    description:
      'Chó nhà bị thất lạc. Hãy kiểm tra đặc điểm và liên hệ người đăng khi có thông tin phù hợp.',
  },
  {
    post_id: 2,
    report_code: 'FOUND1',
    post_type: 'FOUND',
    species: 'CAT',
    status: 'ACTIVE',
    location_text: 'Bình Dương',
    created_at: null,
    description:
      'Một bé mèo được cộng đồng phát hiện. Hãy chia sẻ thông tin để hỗ trợ bé tìm lại gia đình.',
  },
  {
    post_id: 3,
    report_code: 'LOST3',
    post_type: 'LOST',
    species: 'DOG',
    status: 'ACTIVE',
    location_text: 'TP. Hồ Chí Minh',
    created_at: null,
    description:
      'Kiểm tra các thông tin nhận dạng và cung cấp thông tin nếu bạn nhận ra bé.',
  },
]
const matchingResults = [
  {
    post_id: 101,
    pet_name: 'Milo',
    species: 'DOG',
    age: '8 tháng',
    location_text: 'TP. Hồ Chí Minh',
    created_at: '2026-10-28T09:00:00',
    description: 'Chó lông vàng, thân thiện, được tìm thấy gần khu dân cư.',
    image_url: null,
    passed_threshold: true,
    final_score: 0.91,
    image_score: 0.94,
    location_score: 0.88,
    time_score: 0.90,
  },
  {
    post_id: 102,
    pet_name: 'Bông',
    species: 'DOG',
    age: '1 tuổi',
    location_text: 'Bình Dương',
    created_at: '2026-10-27T14:30:00',
    description: 'Bé chó lông trắng, có đeo vòng cổ màu đỏ.',
    image_url: null,
    passed_threshold: true,
    final_score: 0.91,
    image_score: 0.94,
    location_score: 0.88,
    time_score: 0.90,
  },
  {
    post_id: 103,
    pet_name: 'Miu',
    species: 'CAT',
    age: '6 tháng',
    location_text: 'TP. Hồ Chí Minh',
    created_at: '2026-10-26T10:00:00',
    description: 'Mèo tam thể, khá dạn người và sạch sẽ.',
    image_url: null,
    passed_threshold: true,
    final_score: 0.91,
    image_score: 0.94,
    location_score: 0.88,
    time_score: 0.90,
  },
  {
    post_id: 104,
    pet_name: 'Đốm',
    species: 'DOG',
    age: '2 tuổi',
    location_text: 'Đồng Nai',
    created_at: '2026-10-25T08:00:00',
    description: 'Chó có bộ lông đốm nâu trắng, tính cách hiền.',
    image_url: null,
    passed_threshold: true,
    final_score: 0.91,
    image_score: 0.94,
    location_score: 0.88,
    time_score: 0.90,
  },
]

// Dữ liệu minh họa theo bảng SQL: adopt_pets

const speciesLabel = {
  DOG: 'Chó',
  CAT: 'Mèo',
}

const postTypeLabel = {
  LOST: 'LOST',
  FOUND: 'FOUND',
}

function App() {
  const [user, setUser] = useState(null)
  const [userReports, setUserReports] = useState(reports)
  const [myReports, setMyReports] = useState([])
  const [notifications, setNotifications] = useState([
    { id: 'demo-match-1', type: 'MATCH', title: 'Tìm thấy bài đăng có thể phù hợp', message: 'PYPAWS AI phát hiện một bài FOUND có đặc điểm tương đồng với tin LOST của bạn. Nhấn để xem kết quả matching.', created_at: '2026-10-31T19:45:00+07:00', is_read: false, post_id: 1 },
    { id: 'demo-match-2', type: 'MATCH', title: 'Có thêm kết quả matching mới', message: 'Một bài đăng FOUND mới có thể liên quan đến bé cún bạn đang tìm.', created_at: '2026-10-31T18:20:00+07:00', is_read: false, post_id: 3 },
    { id: 'demo-system-1', type: 'SYSTEM', title: 'Tin LOST đang được hiển thị', message: 'Tin tìm thú cưng của bạn đã được đăng thành công trên PYPAWS.', created_at: '2026-10-31T16:10:00+07:00', is_read: true, post_id: 1 },
  ])
  const [activeLostReport, setActiveLostReport] = useState(reports[0])
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [profileInitialTab, setProfileInitialTab] = useState('info')
  const [currentPage, setCurrentPage] = useState('home')
  const [initialPostType, setInitialPostType] = useState('LOST')
  const [reportNavSelection, setReportNavSelection] = useState('')
  const [authPage, setAuthPage] = useState('login')
  const handleCreateReport = () => {
  setInitialPostType('LOST')
  setCurrentPage('report')
  }
  const unreadNotificationCount = notifications.filter((item) => !item.is_read).length
  const handleOpenNotification = (notification) => {
    setNotifications((previous) => previous.map((item) => item.id === notification.id ? { ...item, is_read: true } : item))
    const relatedReport = userReports.find((item) => String(item.post_id) === String(notification.post_id)) || reports.find((item) => String(item.post_id) === String(notification.post_id))
    if (relatedReport?.post_type === 'LOST') {
      setActiveLostReport(relatedReport)
      setCurrentPage('matching-results')
    } else {
      setProfileInitialTab('reports')
      setCurrentPage('profile')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const handleLocalReportSubmit = (payload, images, coverIndex) => {
    const imageUrls = images.map((file) => URL.createObjectURL(file))
    const newReport = {
      ...payload,
      post_id: Date.now(),
      report_code: `${payload.post_type}${userReports.filter((item) => item.post_type === payload.post_type).length + 1}`,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      image_url: imageUrls[coverIndex] || null,
      images: imageUrls,
    }
    setUserReports((previous) => [newReport, ...previous])
    setMyReports((previous) => [newReport, ...previous])
    if (payload.post_type === 'LOST') {
      setActiveLostReport(newReport)
      setCurrentPage('matching-results')
    }
    return newReport
  }

  const handleResolveLostReport = ({ source, foundPost, lostReport }) => {
    const lostId = String(lostReport?.post_id)
    const foundId = foundPost ? String(foundPost.post_id) : null
    const updateReport = (report) => {
      if (String(report.post_id) === lostId) return { ...report, status: 'RESOLVED' }
      if (source === 'PYPAWS' && foundId && String(report.post_id) === foundId) return { ...report, status: 'RESOLVED' }
      return report
    }
    setUserReports((previous) => previous.map(updateReport))
    setMyReports((previous) => {
      const hasLost = previous.some((item) => String(item.post_id) === lostId)
      const updated = previous.map(updateReport)
      if (!hasLost) updated.unshift({ ...lostReport, status: 'RESOLVED' })
      return updated
    })
    setActiveLostReport((previous) => previous && String(previous.post_id) === lostId ? { ...previous, status: 'RESOLVED' } : previous)
    setCurrentPage('profile')
    setProfileInitialTab('reports')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleReportNavigation = (e) => {
  const value = e.target.value


  if (value === 'ALL') {
    setCurrentPage('home')

    document.getElementById('reports')?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  if (value === 'LOST') {
    setInitialPostType('LOST')
    setCurrentPage('report')
  }

  if (value === 'FOUND') {
    setInitialPostType('FOUND')
    setCurrentPage('report')
  }

  // Đưa select về trạng thái mặc định "Báo cáo"
  setReportNavSelection('')
}

  return (
    <div className="app" id="home">
      {currentPage !== 'auth' && (
      <header className="navbar">
        <a className="brand" href="#home" aria-label="PyPaws - Trang chủ">
          <img className="brand-logo" src={logo} alt="PyPaws" />
        </a>


        <nav className="nav-links" aria-label="Điều hướng chính">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault()
              setCurrentPage('home')
              window.scrollTo({
                top: 0,
                behavior: 'smooth',
              })
            }}
          >
            Trang chủ
          </a>

          <div className="nav-report-dropdown">
            <button
              type="button"
              className="nav-report-trigger"
              aria-label="Mở danh sách báo cáo"
            >
              Báo cáo
              <span className="nav-report-arrow" aria-hidden="true"></span>
            </button>

            <div className="nav-report-menu">
              <button
                type="button"
                onClick={() => {
                setCurrentPage('all-reports')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              >
                Tất cả báo cáo
              </button>

              <button
                type="button"
                onClick={() => {
                  setInitialPostType('LOST')
                  setCurrentPage('report')
                }}
              >
                Tạo báo cáo thất lạc
              </button>

              <button
                type="button"
                onClick={() => {
                  setInitialPostType('FOUND')
                  setCurrentPage('report')
                }}
              >
                Tạo báo cáo tìm thấy
              </button>
            </div>
          </div>


          <a
            href="#about"
            onClick={(e) => {
              e.preventDefault()
              setCurrentPage('home')
              setTimeout(() => {
                document.getElementById('about')?.scrollIntoView({
                  behavior: 'smooth',
                })
              }, 0)
            }}
          >
            Về PyPaws
          </a>
        </nav>


        {!user ? (
          <button
            type="button"
            className="nav-cta"
            onClick={() => {
              setAuthPage('login')
              setCurrentPage('auth')
            }}
          >
            Đăng nhập <span aria-hidden="true">↗</span>
          </button>
        ) : (
          <div className="nav-user-actions">
            <div className={`nav-notification-wrap ${isNotificationOpen ? "open" : ""}`} onMouseLeave={() => setIsNotificationOpen(false)}>
              <button type="button" className="nav-notification-button" aria-label="Xem thông báo" title="Thông báo" aria-expanded={isNotificationOpen} onClick={() => setIsNotificationOpen((open) => !open)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M10 21h4" />
                </svg>
                {unreadNotificationCount > 0 && <span className="nav-notification-count">{unreadNotificationCount}</span>}
              </button>
              <div className="nav-notification-dropdown">
                <div className="nav-notification-heading"><strong>Thông báo</strong><span>{unreadNotificationCount} chưa đọc</span></div>
                <div className="nav-notification-list">
                  {notifications.map((notification) => (
                    <button type="button" key={notification.id} className={`nav-notification-item ${notification.is_read ? 'read' : 'unread'}`} onClick={() => { setIsNotificationOpen(false); handleOpenNotification(notification) }}>
                      <span className="nav-notification-item-icon">{notification.type === 'MATCH' ? '🔎' : 'ℹ️'}</span>
                      <span className="nav-notification-item-content">
                        <strong>{notification.title}</strong>
                        <span>{notification.message}</span>
                        <small>{new Date(notification.created_at).toLocaleString('vi-VN')}</small>
                      </span>
                      {!notification.is_read && <i aria-label="Chưa đọc" />}
                    </button>
                  ))}
                </div>
                <button type="button" className="nav-notification-see-all" onClick={() => { setIsNotificationOpen(false); setProfileInitialTab('notifications'); setCurrentPage('profile') }}>Xem tất cả thông báo</button>
              </div>
            </div>

            <div className="nav-report-dropdown">
              <button
                type="button"
                className="nav-report-trigger"
                aria-label="Mở danh sách tài khoản"
              >
                {user.full_name}
                <span className="nav-report-arrow" aria-hidden="true"></span>
              </button>

              <div className="nav-report-menu">
                <button
                  type="button"
                  onClick={() => {
                    setProfileInitialTab('info')
                    setCurrentPage('profile')
                  }}
                >
                  Tài khoản
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUser(null)
                    setCurrentPage('home')
                  }}
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        )}
        </header>
      )}
     {currentPage === 'all-reports' ? (
        <AllReportsPage
            reports={userReports.filter((item) => item.status === 'ACTIVE')}
            onCreateReport={handleCreateReport}
            onBackHome={() => {
          setCurrentPage('home')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
          />
    ) : currentPage === 'auth' ? (
        authPage === 'register' ? (
        <RegisterPage
          onNavigate={setAuthPage}
          onBackHome={() => setCurrentPage('home')}
        />
      ) : authPage === 'forgot' ? (
        <ForgotPasswordPage
          onNavigate={setAuthPage}
          onBackHome={() => setCurrentPage('home')}
        />
      ) : (
    <LoginPage
      onNavigate={setAuthPage}
      onBackHome={() => setCurrentPage('home')}
      onLoginSuccess={(userData) => {
        setUser(userData)
        setCurrentPage('home')
      }}
    />
  )
    ) : currentPage === 'matching-results' ? (
      <MatchingResultsPage
        lostReport={activeLostReport || reports[0]}
        matches={matchingResults.filter((item) => item.species === (activeLostReport || reports[0]).species)}
        onResolve={handleResolveLostReport}
        onBackHome={() => setCurrentPage('home')}
        onViewDetail={(match) => {
          console.log('Xem chi tiết thú cưng:', match)
        }}
        onContact={(match) => {
          console.log('Liên hệ người đăng:', match)
        }}
      />

    ) : currentPage === 'profile' ? (
      <ProfilePage
        user={user}
        reports={myReports}
        onOpenLostMatching={(report) => {
          setActiveLostReport(report)
          setCurrentPage('matching-results')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        notifications={notifications}
        onOpenNotification={handleOpenNotification}
        initialTab={profileInitialTab}
      />
    ) : currentPage === 'report' ? (
      <PetReportPage
        initialPostType={initialPostType}
        onBack={() => {
          setCurrentPage('home')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        onSubmitReport={handleLocalReportSubmit}
      />
    ) : (
      <main>
        {/* HERO */}
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              RECONNECT WITH YOUR BEST FRIENDS
            </span>

            <h1>
              Mỗi dấu chân
              <br />
              đều dẫn lối <span>về nhà.</span>
            </h1>

            <p className="hero-description">
              Tìm kiếm chó mèo thất lạc, kết nối các báo cáo có đặc điểm tương đồng.
              Cùng PyPaws giúp hành trình đoàn tụ gần hơn.
            </p>

            <div className="hero-actions">
                <button
                   className="primary-btn"
                   type="button"
                    onClick={() => setCurrentPage('report')}
                    >
                     Báo mất / thấy thú cưng <span>→</span>
                </button>
            </div>

            <div className="hero-trust">
              <span className="trust-icon">♡</span>
              <p>Một cộng đồng quan tâm. Thêm cơ hội đoàn tụ.</p>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-sun" />

            <div className="mascot-frame">
              <img
                className="hero-mascot"
                src={mascot}
                alt="Py, linh vật của PyPaws"
              />
            </div>

            <div className="mascot-caption">
              <span className="caption-paw">🐾</span>
              <div>
                <strong>Py luôn đồng hành</strong>
                <p>Vì mỗi bé đều xứng đáng có một mái nhà.</p>
              </div>
            </div>

            <span className="decor-paw paw-one">🐾</span>
            <span className="decor-paw paw-two">♡</span>
          </div>
        </section>

        {/* CÁC CHỨC NĂNG CHÍNH */}
        <section className="tools-section section-wrap" id="report-options">
          <div className="section-heading">
            <span className="eyebrow">PYPAWS CÙNG BẠN</span>
            <h2>Bạn cần giúp đỡ điều gì?</h2>
          </div>

          <div className="tool-grid">
            <a
               className="tool-card tool-lost"
               href="#reports"
               onClick={(e) => {
                e.preventDefault()
                setInitialPostType('LOST')
                setCurrentPage('report')
          }}
            >
              <span className="tool-icon">⌕</span>
              <span className="tool-kicker">CHƯA TÌM THẤY BÉ?</span>
              <h3>Báo mất thú cưng</h3>
              <p>
                Chia sẻ hình ảnh, đặc điểm và địa điểm thất lạc để cộng đồng
                cùng hỗ trợ tìm kiếm.
              </p>
              <span className="tool-link">
                Tìm bé ngay <span>→</span>
              </span>
            </a>

            <a
                className="tool-card tool-found"
                href="#reports"
                onClick={(e) => {
                    e.preventDefault()
                    setInitialPostType('FOUND')
                    setCurrentPage('report')
            }}
            >
            <span className="tool-icon">⌖</span>
            <span className="tool-kicker">BẠN VỪA GẶP MỘT BÉ?</span>
            <h3>Báo tin tìm thấy</h3>
            <p>
                Đăng thông tin chó mèo bạn bắt gặp để giúp bé có cơ hội trở
                về với gia đình.
            </p>
            <span className="tool-link">
                Chia sẻ thông tin <span>→</span>
            </span>
            </a>


          </div>
        </section>

        {/* BÁO CÁO THẤT LẠC / TÌM THẤY */}
        <section className="reports-section" id="reports">
          <div className="section-wrap">
            <div className="section-heading section-heading-row">
              <div>
                <span className="eyebrow">CỘNG ĐỒNG PYPAWS</span>
                <h2>Cùng nhau tìm bé về nhà</h2>
                <p>
                  Theo dõi báo cáo mới và chia sẻ thông tin để giúp các bé sớm trở về nhà.
                </p>
              </div>

              <button
              type="button"
              className="outline-link"
              onClick={() => {
                setCurrentPage('all-reports')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              Xem tất cả <span>→</span>
            </button>
            </div>

            <div className="report-grid">
              {userReports.filter((report) => report.status === 'ACTIVE').slice(0, 3).map((report) => (
                <article className="report-card" key={report.post_id}>
                  <div className="report-image-wrap">
                    <img src={report.image_url || report.cover_image_url || mascot} alt={report.pet_name || 'Thú cưng trong báo cáo'} />

                    <span
                      className={`status-pill status-${report.post_type.toLowerCase()}`}
                    >
                      <span />
                      {postTypeLabel[report.post_type]}
                    </span>
                  </div>

                  <div className="report-body">
                    <span className="report-date">
                      {report.created_at
                        ? new Date(report.created_at).toLocaleDateString(
                            'vi-VN',
                          )
                        : 'Thông tin minh họa'}
                    </span>

                    <h3>
                      {speciesLabel[report.species]}{' '}
                      {report.post_type === 'LOST'
                        ? 'thất lạc'
                        : 'được tìm thấy'}
                    </h3>

                    <p className="report-location">
                      <span aria-hidden="true">⌖</span>{' '}
                      {report.location_text || 'Chưa cập nhật địa điểm'}
                    </p>

                    <p className="report-description">
                      {report.description}
                    </p>

                    <a className="report-link" href="#report-options">
                      Xem hướng dẫn báo tin <span>→</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>


          </div>
        </section>


        {/* KÊU GỌI HÀNH ĐỘNG */}
        <section className="closing-cta" id="about">
          <div className="closing-content">
            <span className="eyebrow">
              HÀNH ĐỘNG NHỎ, HY VỌNG LỚN
            </span>

            <h2>Cùng Py đưa những người bạn nhỏ về nhà.</h2>

            <p>
              Vì chúng tôi tin rằng mọi thú cưng đều xứng đáng có cơ hội trở về nhà.
            </p>

            <a className="closing-btn" href="#report-options">
              Cùng bắt đầu <span>→</span>
            </a>
          </div>

          <img
            className="closing-mascot"
            src={mascot}
            alt="PyPaws mascot Py"
          />
        </section>
      </main>
      )}
      {currentPage !== 'auth' && (
      <footer className="footer">
        <div className="footer-main">
          <a className="footer-brand" href="#home">
            <img src={logo} alt="PyPaws" />
          </a>

          <p>
            Công nghệ và cộng đồng cùng chung tay giúp chó mèo thất lạc tìm
            đường về nhà.
          </p>

          <div className="footer-links">
            <a href="#home">Trang chủ</a>
            <a href="#reports">Tìm thú cưng</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 PyPaws</span>
          <span>Vì những người bạn nhỏ.</span>
        </div>
        </footer>
        )}
    </div>
  )
}

export default App
