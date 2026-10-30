import '../styles/auth.css'

function AuthLayout({ children, eyebrow, title, subtitle, onBackHome }) {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-form-container">
          <button
            type="button"
            className="auth-back-home"
            onClick={onBackHome}
          >
            ← Quay về trang chủ
          </button>


          <div className="auth-heading">
            {eyebrow && <span className="auth-eyebrow">{eyebrow}</span>}
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          {children}
        </div>
      </section>

      <aside className="auth-visual">
        <div className="auth-visual-overlay">
          <div className="auth-visual-content">
            <span className="auth-visual-label">
              A HOME FOR EVERY PAWS
            </span>

            <h2>
              Trao yêu thương,
              <br />
              tìm thấy <span>mái nhà.</span>
            </h2>

            <p>
              Mỗi kết nối đều có thể mở ra một hành trình đoàn tụ
              và một mái ấm mới cho những người bạn bốn chân.
            </p>
          </div>
        </div>
      </aside>
    </main>
  )
}

export default AuthLayout