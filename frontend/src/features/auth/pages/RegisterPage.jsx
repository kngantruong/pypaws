import { useState } from 'react'
import AuthLayout from '../components/AuthLayout'
import AuthInput from '../components/AuthInput'
import PasswordInput from '../components/PasswordInput'
import { register } from '../../../services/api.js'

function RegisterPage({ onNavigate, onBackHome }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!fullName.trim() || !email.trim()) {
      setMessage('Vui lòng nhập họ tên và email.');
      return;
    }

    if (password.length < 8) {
      setMessage('Mật khẩu cần có ít nhất 8 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Mật khẩu xác nhận không khớp.')
      return
    }

    if (!acceptedTerms) {
      setMessage('Vui lòng đồng ý với điều khoản sử dụng.')
      return
    }

    setIsSubmitting(true)
    setMessage('')
    try {
      await register(fullName.trim(), email.trim(), phone.trim(), password)
      setMessage('Tạo tài khoản thành công. Đang chuyển đến trang đăng nhập...')
      setTimeout(() => onNavigate('login'), 700)
    } catch (error) {
      setMessage(error.message || 'Không thể tạo tài khoản. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle="Tham gia cộng đồng PyPaws để kết nối và giúp đỡ thú cưng."
      onBackHome={onBackHome}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthInput
          id="full-name"
          label="Họ và tên"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Nhập họ và tên"
          autoComplete="name"
        />

        <AuthInput
          id="register-email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="example@email.com"
          autoComplete="email"
        />

        <AuthInput
          id="register-phone"
          label="Số điện thoại"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Nhập số điện thoại"
          autoComplete="tel"
        />

        <PasswordInput
          id="register-password"
          label="Mật khẩu"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />

        <PasswordInput
          id="confirm-password"
          label="Xác nhận mật khẩu"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
        />

        <label className="auth-checkbox">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
          />
          <span>Tôi đồng ý với điều khoản sử dụng của PyPaws.</span>
        </label>

        <button type="submit" className="auth-submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
        </button>

        {message && (
          <p className="auth-message" role="status">
            {message}
          </p>
        )}
      </form>

      <p className="auth-switch-page">
        Đã có tài khoản?{' '}
        <button
          type="button"
          className="auth-text-button"
          onClick={() => onNavigate('login')}
        >
          Đăng nhập
        </button>
      </p>
    </AuthLayout>
  )
}

export default RegisterPage