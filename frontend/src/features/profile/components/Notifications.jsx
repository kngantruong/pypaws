
function Notifications({ notifications = [], onOpenNotification }) {
  const getNotificationIcon = (type) => {
    const icons = {
      MATCH: '🔎',
      VERIFY: '✓',
      REPORT: '📢',
      SYSTEM: 'ℹ',
    }

    return icons[type] || '🔔'
  }

  return (
    <div className="profile-notifications">
      <div className="profile-section-heading">
        <h2>Thông báo</h2>
        <p>Cập nhật những hoạt động mới nhất liên quan đến tài khoản của bạn.</p>
      </div>

      {notifications.length === 0 ? (
        <div className="profile-empty-state">
          <h3>Bạn chưa có thông báo nào</h3>
          <p>Thông báo về tin đăng và kết quả tìm kiếm sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <article
              className={`notification-card ${notification.is_read ? 'read' : 'unread'}`}
              key={notification.id}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>

              <div className="notification-content">
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
                <span>
                  {notification.created_at
                    ? new Date(notification.created_at).toLocaleString('vi-VN')
                    : 'Vừa xong'}
                </span>
              </div>

              {!notification.is_read && (
                <span className="notification-dot" />
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default Notifications
