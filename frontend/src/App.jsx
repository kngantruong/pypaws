
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="navbar">
        <a className="logo" href="#home">
          <span className="logo-icon">🐾</span>
          PYPAWS
        </a>

        <nav className="nav-links">
          <a href="#home">Trang chủ</a>
          <a href="#pets">Tìm thú cưng</a>
          <a href="#about">Về chúng tôi</a>
        </nav>

        <button className="login-btn">Đăng nhập</button>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="eyebrow">RECONNECT WITH YOUR BEST FRIENDS</span>

            <h1>
              Mỗi thú cưng
              <br />
              đều cần <span>mái nhà.</span>
            </h1>

            <p className="hero-description">
              PYPAWS - ứng dụng AI hỗ trợ tìm kiếm thú cưng thất lạc,
              kết nối những người tìm thấy thú cưng với gia đình của các bé.
            </p>

            <div className="hero-actions">
              <button className="primary-btn">
                Tôi bị mất thú cưng
              </button>

              <button className="secondary-btn">
                Tôi tìm thấy thú cưng
              </button>
            </div>

            <div className="hero-note">
              <span>♥</span> Một cộng đồng nhỏ, hy vọng lớn.
            </div>
          </div>

          <div className="hero-visual">
            <div className="pet-circle">
              <span className="big-paw">🐾</span>
              <span className="pet-emoji">🐶</span>
            </div>
            <div className="floating-card">
              <span className="heart">♥</span>
              <div>
                <strong>Hy vọng đoàn tụ</strong>
                <p>Mỗi dấu chân đều đáng quý</p>
              </div>
            </div>
          </div>
        </section>

        <section className="pets-section" id="pets">
          <div className="section-heading">
            <span className="eyebrow">PYPAWS WITH YOU</span>
            <h2>Bạn đang tìm kiếm điều gì?</h2>
            <p>Chọn một mục bên dưới để bắt đầu hành trình.</p>
          </div>

          <div className="option-grid">
            <article className="option-card lost-card">
              <div className="option-icon">🔎</div>
              <h3>Tìm thú cưng thất lạc</h3>
              <p>
                Đăng tin về bé đang mất tích và tìm các trường hợp
                có đặc điểm tương đồng được AI gợi ý.
              </p>
              <button className="text-btn">
                Tìm thú cưng <span>→</span>
              </button>
            </article>

            <article className="option-card found-card">
              <div className="option-icon">🏡</div>
              <h3>Báo tin tìm thấy</h3>
              <p>
                Chia sẻ thông tin về thú cưng bạn tìm thấy để hỗ trợ
                các bé trở về với gia đình.
              </p>
              <button className="text-btn">
                Đăng tin tìm thấy <span>→</span>
              </button>
            </article>

            <article className="option-card adopt-card">
                <div className="option-icon">🐾</div>
                <h3>Nhận nuôi thú cưng</h3>
                <p>
                    Khám phá những bé chó, mèo đang tìm mái ấm mới
                    và gửi yêu cầu nhận nuôi để trở thành gia đình của bé.
                </p>
               <button className="text-btn">
                    Khám phá thú cưng <span>→</span>
               </button>
            </article>

          </div>
        </section>

        <section className="how-section">
          <div className="section-heading">
            <span className="eyebrow">ĐƠN GIẢN VÀ HIỆU QUẢ</span>
            <h2>PYPAWS hoạt động thế nào?</h2>
          </div>

          <div className="steps-grid">
            <div className="step">
              <span className="step-number">01</span>
              <h3>Đăng tin</h3>
              <p>Chia sẻ ảnh và thông tin về thú cưng.</p>
            </div>

            <div className="step">
              <span className="step-number">02</span>
              <h3>AI hỗ trợ tìm kiếm</h3>
              <p>Hệ thống đề xuất các bài đăng có đặc điểm tương đồng.</p>
            </div>

            <div className="step">
              <span className="step-number">03</span>
              <h3>Xác minh kết quả</h3>
              <p>Người dùng kiểm tra thông tin và chủ động liên hệ.</p>
            </div>
          </div>
        </section>
      </main>

      <footer id="about">
        <a className="logo footer-logo" href="#home">🐾 PYPAWS</a>
        <p>Chung tay giúp những người bạn nhỏ tìm đường về nhà.</p>
        <span>© 2026 PYPAWS</span>
      </footer>
    </div>
  )
}

export default App
