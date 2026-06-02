import { useState, useEffect } from 'react';
import axios from 'axios';
import NotificationSettings from './NotificationSettings';
import './Profile.css';
import {
  UserIcon,
  EmailIcon,
  LockIcon,
  CheckIcon,
  CrossIcon,
  InfoIcon
} from './ProfileIcons';


const API_BASE_URL = 'http://localhost:3000/api';

function Profile({ token }) {
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [currentEmail, setCurrentEmail] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [emailMessage, setEmailMessage] = useState({ text: '', type: '' });
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data) {
          setLogin(response.data.login || 'Пользователь');
          setCurrentEmail(response.data.email);
        }
      } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
      }
    };
    fetchProfile();
  }, [token]);

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setEmailMessage({ text: '', type: '' });
    try {
      await axios.put(
        `${API_BASE_URL}/user/profile`,
        { email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEmailMessage({ text: 'Email успешно обновлен', type: 'success' });
      setCurrentEmail(email);
      setEmail('');
    } catch (err) {
      setEmailMessage({
        text: err.response?.data?.error || 'Ошибка обновления email',
        type: 'error'
      });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ text: '', type: '' });
    if (newPassword.length < 3) {
      setPasswordMessage({ text: 'Новый пароль слишком короткий', type: 'error' });
      return;
    }
    try {
      await axios.put(
        `${API_BASE_URL}/user/password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordMessage({ text: 'Пароль успешно изменен', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordMessage({
        text: err.response?.data?.error || 'Ошибка смены пароля',
        type: 'error'
      });
    }
  };

  const statusIcon = (type) => {
    if (type === 'success') return <CheckIcon size={18} color="#155724" />;
    if (type === 'error') return <CrossIcon size={18} color="#721c24" />;
    return <InfoIcon size={18} color="#1565c0" />;
  };

  return (
    <div className="profile-root">
      <div className="profile-container">
        <h2 className="profile-header">Личный кабинет</h2>

        <div className="profile-tabs">
          <button
            className={`profile-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <UserIcon size={18} /> Профиль
          </button>
          <button
            className={`profile-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <EmailIcon size={18} /> Уведомления
          </button>
        </div>

        {activeTab === 'info' && (
          <div className="tab-content profile-layout">
            {/* Левая колонка — карточка пользователя */}
            <div className="profile-left">
              <div className="profile-user-card">
                <div className="profile-avatar">
                  <span className="profile-avatar-letter">
                    {login ? login[0].toUpperCase() : 'U'}
                  </span>
                </div>
                <div className="profile-card-body">
                  <h3 className="profile-card-name">{login}</h3>
                  <div className="profile-card-detail">
                    <EmailIcon size={16} color="#138962" />
                    {currentEmail ? (
                      <span>{currentEmail}</span>
                    ) : (
                      <span className="empty">Email не указан</span>
                    )}
                  </div>
                </div>
                <div className="profile-card-wave" />
              </div>
            </div>

            {/* Правая колонка — формы */}
            <div className="profile-right">
              <div className="profile-section">
                <div className="section-header">
                  <EmailIcon size={22} color="#0F2925" />
                  <h3>Сменить контакты</h3>
                </div>
                <form onSubmit={handleUpdateEmail} className="profile-form">
                  <div className="form-group">
                    <label>Новый Email</label>
                    <div className="input-wrapper">
                      <EmailIcon size={18} color="#138962" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@mail.com"
                        className="profile-input"
                      />
                    </div>
                  </div>
                  <button type="submit" className="profile-button">
                    <CheckIcon size={18} color="#f5d742" /> Сохранить
                  </button>
                  {emailMessage.text && (
                    <div className={`message ${emailMessage.type}`}>
                      {statusIcon(emailMessage.type)}
                      {emailMessage.text}
                    </div>
                  )}
                </form>
              </div>

              <div className="profile-section">
                <div className="section-header">
                  <LockIcon size={22} color="#0F2925" />
                  <h3>Безопасность</h3>
                </div>
                <form onSubmit={handleChangePassword} className="profile-form">
                  <div className="form-group">
                    <label>Текущий пароль</label>
                    <div className="input-wrapper">
                      <LockIcon size={18} color="#138962" />
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="profile-input"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Новый пароль</label>
                    <div className="input-wrapper">
                      <LockIcon size={18} color="#138962" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="profile-input"
                        required
                        minLength={3}
                      />
                    </div>
                  </div>
                  <button type="submit" className="profile-button">
                    <LockIcon size={18} color="#f5d742" /> Сменить пароль
                  </button>
                  {passwordMessage.text && (
                    <div className={`message ${passwordMessage.type}`}>
                      {statusIcon(passwordMessage.type)}
                      {passwordMessage.text}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="tab-content">
            <div className="profile-section notif-section">
              <NotificationSettings />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
