import { useState, useEffect } from 'react';
import axios from 'axios';
import NotificationSettings from './NotificationSettings';
import './Profile.css';
import {
  UserIcon,
  EmailIcon,
  LockIcon,
  ClockIcon,
  SaveIcon,
  CheckIcon,
  CrossIcon,
  InfoIcon
} from './ProfileIcons';


const API_BASE_URL = 'http://localhost:3000/api';

// Популярные часовые пояса (IANA) для ручного выбора в профиле
const TIMEZONE_IDS = [
  'UTC',
  'Europe/Kaliningrad', 'Europe/Moscow', 'Europe/Simferopol', 'Europe/Kirov', 'Europe/Volgograd',
  'Europe/Astrakhan', 'Europe/Samara', 'Europe/Saratov', 'Europe/Ulyanovsk',
  'Asia/Yekaterinburg', 'Asia/Omsk', 'Asia/Novosibirsk', 'Asia/Barnaul', 'Asia/Tomsk',
  'Asia/Novokuznetsk', 'Asia/Krasnoyarsk', 'Asia/Irkutsk', 'Asia/Chita', 'Asia/Yakutsk',
  'Asia/Khandyga', 'Asia/Vladivostok', 'Asia/Ust-Nera', 'Asia/Magadan', 'Asia/Sakhalin',
  'Asia/Srednekolymsk', 'Asia/Kamchatka', 'Asia/Anadyr',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Helsinki', 'Europe/Minsk',
  'Europe/Kyiv', 'Europe/Warsaw', 'Europe/Prague', 'Europe/Rome', 'Europe/Madrid',
  'Europe/Athens', 'Europe/Bucharest', 'Asia/Tbilisi', 'Asia/Yerevan', 'Asia/Baku',
  'Asia/Almaty', 'Asia/Tashkent', 'Asia/Bishkek', 'Asia/Dushanbe', 'Asia/Ashgabat',
  'Asia/Tehran', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka',
  'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Ho_Chi_Minh', 'Asia/Shanghai', 'Asia/Hong_Kong',
  'Asia/Taipei', 'Asia/Seoul', 'Asia/Tokyo',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'America/Honolulu', 'America/Sao_Paulo', 'America/Buenos_Aires',
  'America/Mexico_City', 'America/Toronto', 'America/Vancouver',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth', 'Pacific/Auckland',
];

// Собираем список с текущим смещением от UTC (учитывает летнее время)
const TIMEZONE_OPTIONS = TIMEZONE_IDS.map((id) => {
  let offset = '';
  try {
    offset = new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value || '';
  } catch (_) { /* зона не поддерживается — покажем просто ID */ }
  return { value: id, label: offset ? `${id} (${offset})` : id };
});

function Profile({ token }) {
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [currentEmail, setCurrentEmail] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailStep, setEmailStep] = useState('idle'); // 'idle' | 'code'
  const [emailCode, setEmailCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordStep, setPasswordStep] = useState('idle'); // 'idle' | 'code'
  const [passwordCode, setPasswordCode] = useState('');
  const [emailMessage, setEmailMessage] = useState({ text: '', type: '' });
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });
  const [timezoneDraft, setTimezoneDraft] = useState('auto');
  const [timezoneMessage, setTimezoneMessage] = useState({ text: '', type: '' });
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
          setEmailVerified(!!response.data.email_verified);
          setTimezoneDraft(response.data.timezoneManual ? (response.data.timezone || 'auto') : 'auto');
        }
      } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
      }
    };
    fetchProfile();
  }, [token]);

  // Шаг 1 смены почты: отправить код на новый адрес
  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    setEmailMessage({ text: '', type: '' });
    try {
      const response = await axios.post(
        `${API_BASE_URL}/user/email/request`,
        { newEmail: email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEmailStep('code');
      setEmailMessage({ text: response.data.message || 'Код отправлен на новый адрес', type: 'success' });
    } catch (err) {
      setEmailMessage({
        text: err.response?.data?.error || 'Ошибка отправки кода',
        type: 'error'
      });
    }
  };

  // Шаг 2 смены почты: подтвердить кодом
  const handleConfirmEmailChange = async (e) => {
    e.preventDefault();
    setEmailMessage({ text: '', type: '' });
    try {
      const response = await axios.post(
        `${API_BASE_URL}/user/email/confirm`,
        { newEmail: email, code: emailCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEmailMessage({ text: 'Email изменён и подтверждён', type: 'success' });
      setCurrentEmail(response.data.email);
      setEmailVerified(true);
      setEmail('');
      setEmailCode('');
      setEmailStep('idle');
    } catch (err) {
      setEmailMessage({
        text: err.response?.data?.error || 'Ошибка подтверждения',
        type: 'error'
      });
    }
  };

  // Отвязать почту
  const handleRemoveEmail = async () => {
    setEmailMessage({ text: '', type: '' });
    try {
      await axios.put(
        `${API_BASE_URL}/user/profile`,
        { email: '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentEmail(null);
      setEmailVerified(false);
      setEmail('');
      setEmailCode('');
      setEmailStep('idle');
      setEmailMessage({ text: 'Email удалён', type: 'success' });
    } catch (err) {
      setEmailMessage({
        text: err.response?.data?.error || 'Ошибка удаления email',
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

  // Шаг 1 смены пароля по коду: отправить код на почту
  const handleRequestPasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage({ text: '', type: '' });
    try {
      const response = await axios.post(
        `${API_BASE_URL}/user/password/request`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordStep('code');
      setPasswordMessage({ text: response.data.message || 'Код отправлен на почту', type: 'success' });
    } catch (err) {
      setPasswordMessage({
        text: err.response?.data?.error || 'Ошибка отправки кода',
        type: 'error'
      });
    }
  };

  // Шаг 2 смены пароля по коду: подтвердить и сменить
  const handleConfirmPasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage({ text: '', type: '' });
    if (newPassword.length < 3) {
      setPasswordMessage({ text: 'Новый пароль слишком короткий', type: 'error' });
      return;
    }
    try {
      await axios.post(
        `${API_BASE_URL}/user/password/confirm`,
        { code: passwordCode, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordMessage({ text: 'Пароль успешно изменён', type: 'success' });
      setPasswordCode('');
      setNewPassword('');
      setPasswordStep('idle');
    } catch (err) {
      setPasswordMessage({
        text: err.response?.data?.error || 'Ошибка смены пароля',
        type: 'error'
      });
    }
  };

  // Сохранение часового пояса (ручной выбор или «автоматически из браузера»)
  const handleSaveTimezone = async (e) => {
    e.preventDefault();
    setTimezoneMessage({ text: '', type: '' });
    try {
      const isAuto = timezoneDraft === 'auto' || !timezoneDraft;
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await axios.put(
        `${API_BASE_URL}/user/profile/timezone`,
        { timezone: isAuto ? browserTz : timezoneDraft, auto: isAuto },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTimezoneDraft(response.data.timezoneManual ? (response.data.timezone || 'auto') : 'auto');
      setTimezoneMessage({
        text: response.data.timezoneManual
          ? 'Часовой пояс сохранён. Входы из браузера больше не будут его менять.'
          : 'Часовой пояс будет определяться автоматически — как в браузере.',
        type: 'success',
      });
    } catch (err) {
      setTimezoneMessage({
        text: err.response?.data?.error || 'Ошибка сохранения часового пояса',
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
                    <EmailIcon size={14} color="#138962" />
                    {currentEmail ? (
                      <span className="profile-card-email">{currentEmail}</span>
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
                  <h3>Email</h3>
                  {currentEmail && (
                    <span className={`email-badge ${emailVerified ? 'verified' : 'unverified'}`}>
                      {emailVerified ? 'Подтверждён' : 'Не подтверждён'}
                    </span>
                  )}
                </div>

                {emailStep === 'idle' ? (
                  <form onSubmit={handleRequestEmailChange} className="profile-form">
                    <div className="form-group">
                      <label>Новый Email</label>
                      <div className="input-wrapper">
                        <EmailIcon size={18} color="#138962" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={currentEmail || 'example@mail.com'}
                          className="profile-input"
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="profile-button" disabled={!email}>
                      <EmailIcon size={18} color="#f5d742" /> Отправить код
                    </button>
                    {emailMessage.text && (
                      <div className={`message ${emailMessage.type}`}>
                        {statusIcon(emailMessage.type)}
                        {emailMessage.text}
                      </div>
                    )}
                  </form>
                ) : (
                  <form onSubmit={handleConfirmEmailChange} className="profile-form">
                    <p className="email-hint">
                      Код отправлен на <strong>{email}</strong>. Введите его, чтобы подтвердить смену.
                    </p>
                    <div className="form-group">
                      <label>Код подтверждения</label>
                      <div className="input-wrapper">
                        <EmailIcon size={18} color="#138962" />
                        <input
                          type="text"
                          value={emailCode}
                          onChange={(e) => setEmailCode(e.target.value)}
                          className="profile-input"
                          placeholder="6-значный код"
                          required
                          inputMode="numeric"
                          maxLength={6}
                        />
                      </div>
                    </div>
                    <div className="profile-actions">
                      <button type="submit" className="profile-button">
                        <CheckIcon size={18} color="#f5d742" /> Подтвердить
                      </button>
                      <button
                        type="button"
                        className="profile-button-secondary"
                        onClick={() => {
                          setEmailStep('idle');
                          setEmailMessage({ text: '', type: '' });
                          setEmailCode('');
                        }}
                      >
                        Отмена
                      </button>
                    </div>
                    {emailMessage.text && (
                      <div className={`message ${emailMessage.type}`}>
                        {statusIcon(emailMessage.type)}
                        {emailMessage.text}
                      </div>
                    )}
                  </form>
                )}

                {currentEmail && (
                  <button type="button" className="profile-remove-email" onClick={handleRemoveEmail}>
                    Удалить email
                  </button>
                )}
              </div>

              <div className="profile-section">
                <div className="section-header">
                  <ClockIcon size={22} color="#0F2925" />
                  <h3>Часовой пояс</h3>
                </div>
                <form onSubmit={handleSaveTimezone} className="profile-form">
                  <div className="form-group">
                    <label>Время в письмах и уведомлениях</label>
                    <div className="input-wrapper select-wrapper">
                      <ClockIcon size={18} color="#138962" />
                      <select
                        value={timezoneDraft}
                        onChange={(e) => setTimezoneDraft(e.target.value)}
                        className="profile-input profile-select"
                      >
                        <option value="auto">Автоматически (как в браузере)</option>
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="profile-button">
                    <SaveIcon size={18} color="#f5d742" /> Сохранить
                  </button>
                  {timezoneMessage.text && (
                    <div className={`message ${timezoneMessage.type}`}>
                      {statusIcon(timezoneMessage.type)}
                      {timezoneMessage.text}
                    </div>
                  )}
                </form>
              </div>

              <div className="profile-section">
                <div className="section-header">
                  <LockIcon size={22} color="#0F2925" />
                  <h3>Безопасность</h3>
                </div>

                {emailVerified ? (
                  passwordStep === 'idle' ? (
                    <form onSubmit={handleRequestPasswordChange} className="profile-form">
                      <p className="email-hint">
                        <span>Смена пароля подтверждается кодом из письма.</span>
                        <span className="email-hint-dest">
                          <EmailIcon size={14} color="#138962" />
                          <span>
                            Код будет отправлен на <strong>{currentEmail}</strong>.
                          </span>
                        </span>
                      </p>
                      <button type="submit" className="profile-button">
                        <LockIcon size={18} color="#f5d742" /> Отправить код
                      </button>
                      {passwordMessage.text && (
                        <div className={`message ${passwordMessage.type}`}>
                          {statusIcon(passwordMessage.type)}
                          {passwordMessage.text}
                        </div>
                      )}
                    </form>
                  ) : (
                    <form onSubmit={handleConfirmPasswordChange} className="profile-form">
                      <div className="form-group">
                        <label>Код из письма</label>
                        <div className="input-wrapper">
                          <LockIcon size={18} color="#138962" />
                          <input
                            type="text"
                            value={passwordCode}
                            onChange={(e) => setPasswordCode(e.target.value)}
                            className="profile-input"
                            placeholder="6-значный код"
                            required
                            inputMode="numeric"
                            maxLength={6}
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
                      <div className="profile-actions">
                        <button type="submit" className="profile-button">
                          <LockIcon size={18} color="#f5d742" /> Сменить пароль
                        </button>
                        <button
                          type="button"
                          className="profile-button-secondary"
                          onClick={() => {
                            setPasswordStep('idle');
                            setPasswordMessage({ text: '', type: '' });
                            setPasswordCode('');
                            setNewPassword('');
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                      {passwordMessage.text && (
                        <div className={`message ${passwordMessage.type}`}>
                          {statusIcon(passwordMessage.type)}
                          {passwordMessage.text}
                        </div>
                      )}
                    </form>
                  )
                ) : (
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
                    <p className="email-hint">
                      Привяжите и подтвердите email в профиле, чтобы менять пароль по коду из письма.
                    </p>
                    {passwordMessage.text && (
                      <div className={`message ${passwordMessage.type}`}>
                        {statusIcon(passwordMessage.type)}
                        {passwordMessage.text}
                      </div>
                    )}
                  </form>
                )}
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
