import { useState } from 'react'
import AuthLayout from '../components/AuthLayout'
import AuthInput from '../components/AuthInput'
import PasswordInput from '../components/PasswordInput'

function RegisterPage({ onNavigate, onBackHome }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()

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

    setMessage(
      'Thông tin hợp lệ. Cần kết nối backend để tạo tài khoản thật.'
    )
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

        <button type="submit" className="auth-submit-button">
          Tạo tài khoản
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