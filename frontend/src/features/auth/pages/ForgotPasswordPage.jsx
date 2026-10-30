import { useState } from 'react'
import AuthLayout from '../components/AuthLayout'
import AuthInput from '../components/AuthInput'

function ForgotPasswordPage({ onNavigate, onBackHome }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()

    setSubmitted(true)
    setMessage(
      'Yêu cầu đã được ghi nhận. Chức năng gửi email đặt lại mật khẩu cần kết nối backend.'
    )
  }

  return (
    <AuthLayout
      eyebrow="ACCOUNT RECOVERY"
      title="Quên mật khẩu?"
      subtitle="Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu."
      onBackHome={onBackHome}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthInput
          id="forgot-email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="example@email.com"
          autoComplete="email"
        />

        <button type="submit" className="auth-submit-button">
          Gửi yêu cầu
        </button>

        {message && (
          <p className="auth-message" role="status">
            {message}
          </p>
        )}
      </form>

      {submitted && (
        <p className="auth-recovery-note">
          Đây là thông báo mô phỏng; email đặt lại mật khẩu chưa được gửi thật.
        </p>
      )}

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