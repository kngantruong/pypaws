import { useState } from 'react'

function PasswordInput({
  id,
  label = 'Mật khẩu',
  value,
  onChange,
  placeholder = 'Nhập mật khẩu',
  autoComplete = 'current-password',
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>

      <div className="auth-password-input">
        <input
          id={id}
          name={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? 'Ẩn' : 'Hiện'}
        </button>
      </div>
    </div>
  )
}

export default PasswordInput