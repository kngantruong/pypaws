import { useState } from 'react'
import AuthLayout from '../components/AuthLayout'
import AuthInput from '../components/AuthInput'
import PasswordInput from '../components/PasswordInput'
import { login } from '../../../services/api.js'

function LoginPage({ onNavigate, onBackHome, onLoginSuccess }) {  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
  event.preventDefault()

  if (!identifier.trim() || !password.trim()) {
    setMessage('Vui lòng nhập email/số điện thoại và mật khẩu.')
    return
  }

  setIsSubmitting(true)
  setMessage('')
  try {
    const data = await login(identifier.trim(), password)
    onLoginSuccess(data.user)
  } catch (error) {
    setMessage(error.message || 'Email hoặc mật khẩu không chính xác.')
  } finally {
    setIsSubmitting(false)
  }
    }

  return (
    <AuthLayout
      eyebrow="WELCOME BACK"
      title="Chào mừng trở lại!"
      subtitle="Đăng nhập để tiếp tục hành trình cùng PyPaws."
      onBackHome={onBackHome}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthInput
          id="identifier"
          label="Email"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="Nhập email"
          autoComplete="username"
        />

        <PasswordInput
          id="login-password"
          label="Mật khẩu"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <div className="auth-form-options">
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>

          <button
            type="button"
            className="auth-text-button"
            onClick={() => onNavigate('forgot')}
          >
            Quên mật khẩu?
          </button>
        </div>

        <button type="submit" className="auth-submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        {message && (
          <p className="auth-message" role="status">
            {message}
          </p>
        )}
      </form>

      <p className="auth-switch-page">
        Chưa có tài khoản?{' '}
        <button
          type="button"
          className="auth-text-button"
          onClick={() => onNavigate('register')}
        >
          Đăng ký ngay
        </button>
      </p>
    </AuthLayout>
  )
}

export default LoginPage