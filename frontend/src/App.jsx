import MatchingResultsPage from './features/matching-results/MatchingResultsPage.jsx'
import { getPosts, getNotifications, markNotificationRead, getMe, getAuthToken, getStoredUser, setAuthToken, resolveImageUrl } from './services/api.js'
import ProfilePage from './features/profile/ProfilePage.jsx'
import AllReportsPage from './features/all-reports/AllReportsPage.jsx'
import LoginPage from './features/auth/pages/LoginPage.jsx'
import RegisterPage from './features/auth/pages/RegisterPage.jsx'
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage.jsx'
import { useState,useEffect } from 'react'
import './App.css'
import logo from './assets/logo/pypaws_logo.png'
import mascot from './assets/logo/pypaws_mascot.png'
import PetReportPage from './features/pet-report/PetReportPage.jsx'


const speciesLabel = {
  DOG: 'Chó',
  CAT: 'Mèo',
}

const postTypeLabel = {
  LOST: 'LOST',
  FOUND: 'FOUND',
}

function App() {
  const [user, setUser] = useState(() => getStoredUser())
  const [userReports, setUserReports] = useState([])
  const [publicReports, setPublicReports] = useState([])
  const [myReports, setMyReports] = useState([])
  const [notifications, setNotifications] = useState([])
  const [activeLostReport, setActiveLostReport] = useState(null)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [profileInitialTab, setProfileInitialTab] = useState('info')
  const [currentPage, setCurrentPage] = useState('home')
  const [initialPostType, setInitialPostType] = useState('LOST')
  const [reportNavSelection, setReportNavSelection] = useState('')
  const [authPage, setAuthPage] = useState('login')
  const [selectedHomeReport, setSelectedHomeReport] = useState(null)
  const [homeReportSort, setHomeReportSort] = useState('newest')

  useEffect(() => {
    if (!getAuthToken()) {
      setUser(null)
      return
    }
    getMe()
      .then((freshUser) => setUser(freshUser))
      .catch((error) => {
        if (error?.status === 401) setUser(null)
        else console.warn('Không thể xác minh phiên đăng nhập lúc này:', error)
      })
  }, [])
  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      setMyReports([])
      return
    }

    let cancelled = false

    const loadAccountData = async () => {
      try {
        const [notificationItems, ...postLists] = await Promise.all([
          getNotifications(false),
          getPosts({ status: 'ACTIVE', page_size: 100 }),
          getPosts({ status: 'RESOLVED', page_size: 100 }),
          getPosts({ status: 'CANCELLED', page_size: 100 }),
        ])

        if (cancelled) return
        setNotifications(notificationItems)

        const allPosts = postLists.flatMap((response) => response || [])
        const ownPosts = allPosts.filter(
          (post) => String(post.owner_id ?? post.user_id) === String(user.id),
        )
        setMyReports(ownPosts)
      } catch (error) {
        if (!cancelled) {
          console.warn('Could not load account data:', error)
          setNotifications([])
          setMyReports([])
        }
      }
    }

    loadAccountData()

    // A candidate can be created by another user's FOUND post.
    // Poll notifications so the LOST owner sees the match promptly.
    const notificationTimer = window.setInterval(async () => {
      try {
        const notificationItems = await getNotifications(false)
        if (!cancelled) setNotifications(notificationItems)
      } catch (error) {
        if (!cancelled) console.warn('Could not refresh notifications:', error)
      }
    }, 10000)

    return () => {
      cancelled = true
      window.clearInterval(notificationTimer)
    }
  }, [user?.id])
  const handleCreateReport = () => {
    if (!user) {
      setAuthPage('login')
      setCurrentPage('auth')
      return
    }
    setInitialPostType('LOST')
    setCurrentPage('report')
  }
  const unreadNotificationCount = notifications.filter((item) => !item.is_read).length
  const handleOpenNotification = async (notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id)
        setNotifications((previous) => previous.map((item) => item.id === notification.id ? { ...item, is_read: true } : item))
      } catch (error) {
        console.warn('Could not mark notification as read:', error)
      }
    }
    const relatedReport = userReports.find((item) => String(item.post_id) === String(notification.post_id))
    if (relatedReport?.post_type === 'LOST') {
      setActiveLostReport(relatedReport)
      setCurrentPage('matching-results')
    } else {
      setProfileInitialTab('reports')
      setCurrentPage('profile')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const handleLocalReportSubmit = (payload, images, coverIndex, reportData) => {
    const imageUrls = images.map((file) => resolveImageUrl(typeof file === 'string' ? file : URL.createObjectURL(file)))
    const newReport = reportData ? {
      ...payload,
      ...reportData,
      image_url: reportData.image_url || imageUrls[coverIndex] || imageUrls[0],
      images: imageUrls,
    } : {
      ...payload,
      post_id: Date.now(),
      report_code: `${payload.post_type}${userReports.filter((item) => item.post_type === payload.post_type).length + 1}`,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      image_url: imageUrls[coverIndex] || null,
      images: imageUrls,
    }
    setUserReports((previous) => [newReport, ...previous])
    setPublicReports((previous) => [newReport, ...previous])
    setMyReports((previous) => [newReport, ...previous])
    if (payload.post_type === 'LOST') {
      setActiveLostReport(newReport)
      setCurrentPage('matching-results')
    }
    return newReport
  }

  // Load real posts from backend on mount
  useEffect(() => {
    Promise.all([
      getPosts({ status: 'ACTIVE', page_size: 100 }),
      getPosts({ status: 'RESOLVED', page_size: 100 }),
      getPosts({ status: 'CANCELLED', page_size: 100 }),
    ])
      .then((lists) => {
        const items = lists.flatMap((list) => list || [])
        if (items.length > 0) {
          const formatted = items.map((p) => ({
            post_id: p.post_id,
            report_code: p.report_code,
            post_type: p.post_type,
            species: p.species,
            gender: p.gender,
            breed: p.breed,
            coat_color: p.coat_color,
            appearance_notes: p.appearance_notes,
            description: p.description,
            created_at: p.created_at,
            event_time: p.event_time,
            location_text: p.location_text,
            status: p.status,
            owner_id: p.owner_id,
            owner_name: p.owner_name,
            contact_name: String(p.owner_id) === String(user?.id) ? user.full_name : null,
            contact_phone: String(p.owner_id) === String(user?.id) ? user.phone : null,
            contact_email: String(p.owner_id) === String(user?.id) ? user.email : null,
            image_url: resolveImageUrl(p.primary_image),
            primary_image: p.primary_image,
          }))
          setPublicReports(formatted.filter((item) => item.status === 'ACTIVE'))
          setUserReports((prev) => {
            const ids = new Set(formatted.map(f => String(f.post_id)))
            return [...formatted, ...prev.filter(pr => !ids.has(String(pr.post_id)))]
          })
        }
      })
      .catch((err) => console.warn('Could not fetch posts from backend:', err))
  }, [user?.id])

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

  const truncateText = (value, maxLength) => {
    const text = String(value || '').trim()
    if (!text) return ''
    return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text
  }

  const homeReports = [...userReports]
    .filter((report) => report.status === 'ACTIVE')
    .sort((a, b) => {
      const getTimestamp = (report) => {
        const value = report.created_at || report.event_time
        const timestamp = value ? new Date(value).getTime() : 0
        return Number.isNaN(timestamp) ? 0 : timestamp
      }
      return homeReportSort === 'newest'
        ? getTimestamp(b) - getTimestamp(a)
        : getTimestamp(a) - getTimestamp(b)
    })
    .slice(0, 5)

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
                  if (!user) { setAuthPage('login'); setCurrentPage('auth'); return }
                  setInitialPostType('LOST')
                  setCurrentPage('report')
                }}
              >
                Tạo báo cáo thất lạc
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!user) { setAuthPage('login'); setCurrentPage('auth'); return }
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
                    setAuthToken('')
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
            reports={publicReports}
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
     ) : currentPage === 'matching-results' && activeLostReport ? (
      <MatchingResultsPage
        lostReport={activeLostReport}
        matches={[]}
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
                if (!user) { setAuthPage('login'); setCurrentPage('auth'); return }
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
                    if (!user) { setAuthPage('login'); setCurrentPage('auth'); return }
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
                <span className="eyebrow">CẬP NHẬT MỚI NHẤT</span>
                <h2>Báo cáo mới nhất</h2>
                <p>Những tin LOST và FOUND mới nhất từ cộng đồng PyPaws.</p>
              </div>
              <div className="reports-heading-actions">
                <label className="report-sort">
                  <span>Sắp xếp:</span>
                  <select value={homeReportSort} onChange={(event) => setHomeReportSort(event.target.value)} aria-label="Sắp xếp báo cáo">
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                  </select>
                </label>
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
            </div>

            <div className="report-grid">
              {homeReports.map((report) => {
                const eventTime = report.event_time || report.lost_time || report.found_time
                const formattedTime = eventTime && !Number.isNaN(new Date(eventTime).getTime())
                  ? new Date(eventTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
                  : 'Chưa cập nhật thời gian'
                const gender = ({ MALE: 'Đực', FEMALE: 'Cái', UNKNOWN: 'Chưa xác định' })[report.gender || report.sex] || 'Chưa xác định'
                return (
                  <article className="report-card" key={report.post_id}>
                    <div className="report-image-wrap">
                      <img src={resolveImageUrl(report.image_url || report.cover_image_url) || mascot} alt={speciesLabel[report.species] || 'Thú cưng'} />
                      <span className={`status-pill status-${(report.post_type || 'FOUND').toLowerCase()}`}>
                        {report.post_type === 'LOST' ? '🔴 LOST' : '🟢 FOUND'}
                      </span>
                    </div>
                    <div className="report-body">
                      <div className="report-title-row">
                        <h3>{speciesLabel[report.species] || 'Thú cưng'}</h3>
                      </div>
                      <div className="report-quick-info">
                        <span title={report.location_text || 'Chưa cập nhật địa điểm'}>📍 {truncateText(report.location_text || 'Chưa cập nhật địa điểm', 48)}</span>
                        <span>🕒 {formattedTime}</span>
                        <span>⚧ {gender}</span>
                      </div>
                      <p className="report-description" title={report.description || 'Chưa có mô tả.'}>{truncateText(report.description || 'Chưa có mô tả.', 125)}</p>
                      <button
                        type="button"
                        className="report-link"
                        onClick={() => setSelectedHomeReport(report)}
                      >
                        Xem chi tiết <span>→</span>
                      </button>
                    </div>
                  </article>
                )
              })}
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
      {selectedHomeReport && currentPage === 'home' && (
        <div className="home-report-modal-backdrop" role="presentation" onClick={() => setSelectedHomeReport(null)}>
          <section className="home-report-modal" role="dialog" aria-modal="true" aria-label="Chi tiết báo cáo" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="home-report-modal-close" onClick={() => setSelectedHomeReport(null)} aria-label="Đóng">×</button>
            <div className="home-report-modal-image">
              <img src={resolveImageUrl(selectedHomeReport.image_url || selectedHomeReport.cover_image_url) || mascot} alt={speciesLabel[selectedHomeReport.species] || 'Thú cưng'} />
              <span className={`status-pill status-${(selectedHomeReport.post_type || 'FOUND').toLowerCase()}`}>
                {selectedHomeReport.post_type === 'LOST' ? '🔴 LOST' : '🟢 FOUND'}
              </span>
            </div>
            <div className="home-report-modal-content">
              <span className="home-report-modal-eyebrow">{selectedHomeReport.post_type === 'LOST' ? 'BÁO CÁO THẤT LẠC' : 'BÁO CÁO TÌM THẤY'}</span>
              <h2>{speciesLabel[selectedHomeReport.species] || 'Thú cưng'}</h2>
              <div className="home-report-modal-meta">
                <span>📍 {selectedHomeReport.location_text || 'Chưa cập nhật địa điểm'}</span>
                <span>🕒 {new Date(selectedHomeReport.event_time || selectedHomeReport.created_at).toLocaleString('vi-VN')}</span>
                <span>⚧ {{ MALE: 'Đực', FEMALE: 'Cái', UNKNOWN: 'Chưa xác định' }[selectedHomeReport.gender] || 'Chưa xác định'}</span>
              </div>
              <h3>Đặc điểm</h3>
              <p>{selectedHomeReport.description || 'Chưa có mô tả.'}</p>
              <div className="home-report-modal-actions">
                <button type="button" className="home-report-modal-secondary" onClick={() => setSelectedHomeReport(null)}>Đóng</button>
                <button type="button" className="home-report-modal-primary" onClick={() => { setSelectedHomeReport(null); setCurrentPage('all-reports'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                  Mở tất cả báo cáo <span>→</span>
                </button>
              </div>
            </div>
          </section>
        </div>
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
