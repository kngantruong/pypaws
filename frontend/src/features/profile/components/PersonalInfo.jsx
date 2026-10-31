
import { useEffect, useState } from 'react'

function PersonalInfo({ user }) {
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })

  const [message, setMessage] = useState('')

  useEffect(() => {
    setFormData({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    })
  }, [user])

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    setMessage('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    setMessage('Thông tin đã được cập nhật trên giao diện.')
  }

  return (
    <div className="personal-info">
      <div className="profile-section-heading">
        <h2>Thông tin cá nhân</h2>
        <p>Quản lý thông tin tài khoản PyPaws của bạn.</p>
      </div>

      <form className="personal-info-form" onSubmit={handleSubmit}>
        <div className="profile-form-group">
          <label htmlFor="profile-full-name">Họ và tên</label>
          <input
            id="profile-full-name"
            name="full_name"
            type="text"
            value={formData.full_name}
            onChange={handleChange}
            placeholder="Nhập họ và tên"
          />
        </div>

        <div className="profile-form-group">
          <label htmlFor="profile-email">Email</label>
          <input
            id="profile-email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Nhập email"
          />
        </div>

        <div className="profile-form-group">
          <label htmlFor="profile-phone">Số điện thoại</label>
          <input
            id="profile-phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Nhập số điện thoại"
          />
        </div>

        <button type="submit" className="profile-save-button">
          Lưu thay đổi
        </button>

        {message && (
          <p className="profile-success-message" role="status">
            {message}
          </p>
        )}
      </form>
    </div>
  )
}

export default PersonalInfo
