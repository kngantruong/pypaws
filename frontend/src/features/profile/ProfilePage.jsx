
import { useState } from 'react'
import PersonalInfo from './components/PersonalInfo'
import MyReports from './components/MyReports'
import Notifications from './components/Notifications'
import './profile.css'

function ProfilePage({ user, reports = [], notifications = [], initialTab = 'info', onOpenLostMatching, onOpenNotification }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  return (
    <main className="profile-page">
      <div className="profile-container">
        <div className="profile-heading">
          <h1>Tài khoản của tôi</h1>
          <p>Quản lý thông tin và hoạt động của bạn trên PyPaws.</p>
        </div>

        <div className="profile-layout">
          <aside className="profile-sidebar">
            <div className="profile-user-summary">
              <div className="profile-avatar">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <h3>{user?.full_name || 'Người dùng'}</h3>
              <p>{user?.email || 'Chưa có email'}</p>
            </div>

            <nav className="profile-navigation">
              <button
                className={activeTab === 'info' ? 'active' : ''}
                onClick={() => setActiveTab('info')}
              >
                Thông tin cá nhân
              </button>

              <button
                className={activeTab === 'reports' ? 'active' : ''}
                onClick={() => setActiveTab('reports')}
              >
                Tin đăng của tôi
              </button>

              <button
                className={activeTab === 'notifications' ? 'active' : ''}
                onClick={() => setActiveTab('notifications')}
              >
                Thông báo
              </button>
            </nav>
          </aside>

          <section className="profile-content">
            {activeTab === 'info' && (
              <PersonalInfo user={user} />
            )}

            {activeTab === 'reports' && (
              <MyReports reports={reports} onOpenLostMatching={onOpenLostMatching} />
            )}

            {activeTab === 'notifications' && (
              <Notifications notifications={notifications} onOpenNotification={onOpenNotification} />
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

export default ProfilePage
