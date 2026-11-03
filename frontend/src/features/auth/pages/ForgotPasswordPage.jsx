import { useState } from 'react'
import AuthLayout from '../components/AuthLayout'
import AuthInput from '../components/AuthInput'

function ForgotPasswordPage({ onNavigate, onBackHome }) {
  return (
    <AuthLayout
      eyebrow="ACCOUNT RECOVERY"
      title="Quên mật khẩu?"
      subtitle="Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu."
      onBackHome={onBackHome}
    >
      <div className="auth-form">
        <p className="auth-recovery-note">
          Tính năng đặt lại mật khẩu qua email hiện chưa được triển khai trên backend,
          nên PyPaws không hiển thị biểu mẫu giả hoặc báo đã gửi email khi chưa gửi thật.
        </p>
        <button type="button" className="auth-submit-button" onClick={() => onNavigate('login')}>
          Quay lại đăng nhập
        </button>
      </div>

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