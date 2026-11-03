
import { useEffect, useState } from 'react'

function PersonalInfo({ user }) {
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })

  useEffect(() => {
    setFormData({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    })
  }, [user])

  return (
    <div className="personal-info">
      <div className="profile-section-heading">
        <h2>Thông tin cá nhân</h2>
        <p>Quản lý thông tin tài khoản PyPaws của bạn.</p>
      </div>

      <div className="personal-info-form">
        <div className="profile-form-group">
          <label htmlFor="profile-full-name">Họ và tên</label>
          <input
            id="profile-full-name"
            name="full_name"
            type="text"
            value={formData.full_name}
            readOnly
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
            readOnly
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
            readOnly
            placeholder="Nhập số điện thoại"
          />
        </div>

        <p className="profile-readonly-note">Thông tin tài khoản hiện được hiển thị từ dữ liệu đăng ký. Chỉnh sửa thông tin sẽ được bổ sung khi backend hỗ trợ cập nhật hồ sơ.</p>
      </div>
    </div>
  )
}

export default PersonalInfo
