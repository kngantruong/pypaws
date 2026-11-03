import AuthLayout from '../components/AuthLayout'

function ForgotPasswordPage({ onNavigate, onBackHome }) {
  return (
    <AuthLayout
      eyebrow="ACCOUNT RECOVERY"
      title="Quên mật khẩu?"
      subtitle="Tính năng đặt lại mật khẩu qua email chưa được triển khai trên backend."
      onBackHome={onBackHome}
    >
      <div className="auth-form">
        <p className="auth-recovery-note">
          PyPaws chưa gửi email đặt lại mật khẩu thật, nên hệ thống không hiển thị
          thông báo giả rằng yêu cầu đã được gửi.
        </p>
        <button type="button" className="auth-submit-button" onClick={() => onNavigate('login')}>
          Quay lại đăng nhập
        </button>
      </div>

      <p className="auth-switch-page">
        Nhớ mật khẩu rồi?{' '}
        <button
          type="button"
          className="auth-text-button"
          onClick={() => onNavigate('login')}
        >
          Quay lại đăng nhập
        </button>
      </p>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
