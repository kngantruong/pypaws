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
    post_type: 'LOST',
    species: 'DOG',
    status: 'ACTIVE',
    location_text: 'TP. Hồ Chí Minh',
    created_at: null,
    description:
      'Kiểm tra các thông tin nhận dạng và cung cấp thông tin nếu bạn nhận ra bé.',
  },
]

// Dữ liệu minh họa theo bảng SQL: adopt_pets
const adoptionPets = [
  {
    pet_id: 1,
    pet_name: 'Một người bạn mèo',
    species: 'CAT',
    breed: null,
    city: 'TP. Hồ Chí Minh',
    status: 'AVAILABLE',
  },
  {
    pet_id: 2,
    pet_name: 'Một người bạn chó',
    species: 'DOG',
    breed: null,
    city: 'Bình Dương',
    status: 'AVAILABLE',
  },
]

const speciesLabel = {
  DOG: 'Chó',
  CAT: 'Mèo',
}

const postTypeLabel = {
  LOST: 'ĐANG TÌM',
  FOUND: 'ĐÃ TÌM THẤY',
}

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  if (currentPage === 'report') {
    return <PetReportPage onBack={() => setCurrentPage('home')} />
  }

  return (
    <div className="app" id="home">
      <header className="navbar">
        <a className="brand" href="#home" aria-label="PyPaws - Trang chủ">
          <img className="brand-logo" src={logo} alt="PyPaws" />
        </a>

        <nav className="nav-links" aria-label="Điều hướng chính">
          <a href="#home">Trang chủ</a>
          <a href="#reports">Tìm thú cưng</a>
          <a href="#adoption">Nhận nuôi</a>
          <a href="#about">Về PyPaws</a>
        </nav>

        <a className="nav-cta" href="#report-options">
          Bắt đầu <span aria-hidden="true">↗</span>
        </a>
      </header>

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
              Tìm kiếm chó mèo thất lạc, kết nối các báo cáo có đặc điểm
              tương đồng và khám phá những người bạn đang chờ một mái ấm.
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

                <a className="secondary-btn" href="#adoption">
                    Khám phá nhận nuôi
                </a>
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
            <p>
              Chọn hành động phù hợp để bắt đầu giúp một người bạn nhỏ.
            </p>
          </div>

          <div className="tool-grid">
            <a
               className="tool-card tool-lost"
               href="#reports"
               onClick={(e) => {
                   e.preventDefault()
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

            <a className="tool-card tool-adopt" href="#adoption">
              <span className="tool-icon">♡</span>
              <span className="tool-kicker">MỞ LÒNG ĐÓN BẠN MỚI</span>
              <h3>Nhận nuôi thú cưng</h3>
              <p>
                Khám phá những người bạn đang chờ được yêu thương và tìm hiểu
                về hành trình nhận nuôi.
              </p>
              <span className="tool-link">
                Khám phá các bé <span>→</span>
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
                  Theo dõi các báo cáo để kịp thời chia sẻ thông tin hữu ích.
                </p>
              </div>

              <a className="outline-link" href="#report-options">
                Xem cách báo tin <span>→</span>
              </a>
            </div>

            <div className="report-grid">
              {reports.map((report) => (
                <article className="report-card" key={report.post_id}>
                  <div className="report-placeholder">
                    <img src={mascot} alt="Linh vật PyPaws" />

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

            <p className="demo-note">
              Lưu ý: Đây là dữ liệu minh họa theo cấu trúc bảng posts, không
              phải báo cáo thật từ SQL Server.
            </p>
          </div>
        </section>

        {/* GIỚI THIỆU AI */}
        <section className="ai-section">
          <div className="section-wrap ai-layout">
            <div className="ai-visual">
              <div className="ai-circle">
                <span className="ai-spark spark-one">✳</span>
                <img src={mascot} alt="Py hỗ trợ tìm kiếm thú cưng" />
                <span className="ai-spark spark-two">✦</span>
              </div>

              <div className="ai-label">
                <span>✦</span> AI hỗ trợ đối chiếu
              </div>
            </div>

            <div className="ai-content">
              <span className="eyebrow">
                CÔNG NGHỆ VỚI SỰ QUAN TÂM
              </span>

              <h2>
                Tìm kiếm thông minh hơn.
                <br />
                <span>Hy vọng gần hơn.</span>
              </h2>

              <p>
                Hệ thống có thể sử dụng đặc điểm và hình ảnh thú cưng để hỗ
                trợ đối chiếu các báo cáo, từ đó gợi ý những trường hợp đáng
                chú ý để người dùng xác minh.
              </p>

              <div className="ai-benefits">
                <div className="ai-benefit">
                  <span>01</span>
                  <div>
                    <strong>Chia sẻ thông tin</strong>
                    <p>
                      Lưu báo cáo và đường dẫn ảnh theo cấu trúc dữ liệu
                      của dự án.
                    </p>
                  </div>
                </div>

                <div className="ai-benefit">
                  <span>02</span>
                  <div>
                    <strong>Hỗ trợ đối chiếu</strong>
                    <p>
                      AI có thể tạo embedding ảnh và hỗ trợ xếp hạng
                      các trường hợp tương đồng.
                    </p>
                  </div>
                </div>

                <div className="ai-benefit">
                  <span>03</span>
                  <div>
                    <strong>Xác minh cùng cộng đồng</strong>
                    <p>
                      Người dùng kiểm tra thông tin trước khi liên hệ
                      hoặc kết luận.
                    </p>
                  </div>
                </div>
              </div>

              <a className="primary-btn" href="#report-options">
                Bắt đầu hành trình <span>→</span>
              </a>
            </div>
          </div>
        </section>

        {/* NHẬN NUÔI */}
        <section className="adoption-section section-wrap" id="adoption">
          <div className="section-heading">
            <span className="eyebrow">MỘT MÁI ẤM ĐANG CHỜ</span>
            <h2>Người bạn tiếp theo của bạn</h2>
            <p>
              Mỗi lần nhận nuôi có trách nhiệm là thêm một cơ hội cho một bé.
            </p>
          </div>

          <div className="adoption-grid">
            {adoptionPets.map((pet) => (
              <article className="adoption-card" key={pet.pet_id}>
                <div className="adoption-placeholder">
                  <img src={mascot} alt="Linh vật PyPaws" />
                </div>

                <div className="adoption-body">
                  <span className="adoption-label">ĐANG TÌM MÁI ẤM</span>

                  <h3>{pet.pet_name || 'Thú cưng chưa có tên'}</h3>

                  <p>
                    {speciesLabel[pet.species] || 'Chưa xác định'}
                    {pet.breed ? ` · ${pet.breed}` : ''}
                  </p>

                  <p>{pet.city || 'Chưa cập nhật khu vực'}</p>

                  <a className="text-link" href="#about">
                    Tìm hiểu thêm <span>→</span>
                  </a>
                </div>
              </article>
            ))}
          </div>

          <p className="demo-note">
            Dữ liệu nhận nuôi đang được minh họa theo bảng adopt_pets.
            Thông tin thực tế cần được lấy từ backend.
          </p>
        </section>

        {/* KÊU GỌI HÀNH ĐỘNG */}
        <section className="closing-cta" id="about">
          <div className="closing-content">
            <span className="eyebrow">
              HÀNH ĐỘNG NHỎ, HY VỌNG LỚN
            </span>

            <h2>Cùng Py đưa những người bạn nhỏ về nhà.</h2>

            <p>
              Chia sẻ thông tin, giúp đỡ cộng đồng và mở lòng với những bé
              đang cần một gia đình.
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
            <a href="#adoption">Nhận nuôi</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 PyPaws</span>
          <span>Vì những người bạn nhỏ.</span>
        </div>
      </footer>
    </div>
  )
}

export default App
