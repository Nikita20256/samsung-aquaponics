import { useState, useEffect } from 'react';
import notificationService from '../../services/notificationService';
import {
  EmailIcon,
  ThermometerIcon,
  DropIcon,
  SunIcon,
  SaveIcon,
  BoltIcon,
  CheckIcon,
  CrossIcon,
  InfoIcon,
  BellIcon
} from './ProfileIcons';
import './NotificationSettings.css';

function NotificationSettings() {
  const [settings, setSettings] = useState({
    email_enabled: false,
    notification_interval: 60
  });
  const [thresholds, setThresholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await notificationService.getSettings();
      setSettings({
        email_enabled: data.settings.email_enabled,
        notification_interval: data.settings.notification_interval
      });
      setThresholds(data.thresholds);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки настроек:', err);
      setLoading(false);
    }
  };

  const handleToggleSetting = (name) => {
    setSettings(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleThresholdChange = (index, field, value) => {
    const newThresholds = [...thresholds];
    newThresholds[index][field] = parseFloat(value);
    setThresholds(newThresholds);
  };

  const handleThresholdToggle = (index) => {
    const newThresholds = [...thresholds];
    newThresholds[index].is_active = !newThresholds[index].is_active;
    setThresholds(newThresholds);
  };

  const saveSettings = async () => {
    try {
      await notificationService.updateSettings(settings);
      await notificationService.updateThresholds(thresholds);
      setMessage({ text: 'Настройки успешно сохранены!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setMessage({ text: 'Ошибка при сохранении настроек', type: 'error' });
    }
  };

  const handleTestEmail = async () => {
    setMessage({ text: 'Отправка тестового письма...', type: 'info' });
    try {
      const res = await notificationService.testEmail();
      setMessage({ text: res.message, type: 'success' });
    } catch (err) {
      setMessage({
        text: err.response?.data?.error || 'Ошибка при отправке теста',
        type: 'error'
      });
    }
  };

  if (loading) return (
    <div className="notif-loading">
      <BellIcon size={32} color="#138962" />
      <p>Загрузка настроек...</p>
    </div>
  );

  const sensorInfo = {
    temperature: { label: 'Температура', unit: '°C', icon: ThermometerIcon, color: '#e17055', bg: 'linear-gradient(135deg, #e17055, #d35400)' },
    humidity: { label: 'Влажность', unit: '%', icon: DropIcon, color: '#3498db', bg: 'linear-gradient(135deg, #74b9ff, #3498db)' },
    light: { label: 'Освещение', unit: 'lx', icon: SunIcon, color: '#fdcb6e', bg: 'linear-gradient(135deg, #fdcb6e, #f39c12)' }
  };

  const statusIcon = (type) => {
    if (type === 'success') return <CheckIcon size={20} color="#155724" />;
    if (type === 'error') return <CrossIcon size={20} color="#721c24" />;
    return <InfoIcon size={20} color="#1565c0" />;
  };

  return (
    <div className="notif-modern-container">
      <div className="notif-header-section">
        <div className="notif-header-icon">
          <BellIcon size={28} color="#138962" />
        </div>
        <div>
          <h3 className="notif-title">Система уведомлений</h3>
          <p className="notif-subtitle">Настройте пороги срабатывания датчиков и способы получения алертов</p>
        </div>
      </div>

      {/* Email Channel Card */}
      <div className="notif-main-grid">
        <div className={`notif-card channel-card ${settings.email_enabled ? 'active' : ''}`}>
          <div className="card-header">
            <div className="card-icon-wrapper">
              <EmailIcon size={26} color="#fff" />
            </div>
            <div className="card-title-group">
              <span className="card-name">Email Оповещения</span>
              <span className="card-status">
                {settings.email_enabled ? 'Активно' : 'Выключено'}
              </span>
            </div>
            <label className="modern-switch">
              <input
                type="checkbox"
                checked={settings.email_enabled}
                onChange={() => handleToggleSetting('email_enabled')}
              />
              <span className="modern-slider"></span>
            </label>
          </div>
          {settings.email_enabled && (
            <div className="card-content fade-in">
              <label className="input-label">Частота проверок (мин)</label>
              <input
                type="number"
                className="modern-number-input"
                value={settings.notification_interval}
                onChange={(e) => setSettings({ ...settings, notification_interval: parseInt(e.target.value) })}
                min="1"
              />
            </div>
          )}
        </div>
      </div>

      <h4 className="section-divider">
        <ThermometerIcon size={20} color="#138962" />
        Пороги датчиков
      </h4>

      {/* Threshold Grid */}
      <div className="threshold-grid">
        {thresholds.map((t, index) => {
          const info = sensorInfo[t.sensor_type] || {
            label: t.sensor_type,
            unit: '',
            icon: () => null,
            color: '#fff',
            bg: 'linear-gradient(135deg, #999, #666)'
          };
          const SensorIcon = info.icon;
          return (
            <div key={t.sensor_type} className={`threshold-card-modern ${t.is_active ? 'active' : 'disabled'}`}>
              <div className="t-card-header">
                <div className="t-icon" style={{ background: info.bg }}>
                  <SensorIcon size={22} color="#fff" />
                </div>
                <div className="t-title-group">
                  <span className="t-name">{info.label}</span>
                  <span className="t-unit">{info.unit}</span>
                </div>
                <label className="modern-switch small">
                  <input
                    type="checkbox"
                    checked={t.is_active}
                    onChange={() => handleThresholdToggle(index)}
                  />
                  <span className="modern-slider"></span>
                </label>
              </div>

              <div className="t-card-controls">
                <div className="t-range-input">
                  <span className="range-label">Мин</span>
                  <input
                    type="number"
                    value={t.min_value}
                    onChange={(e) => handleThresholdChange(index, 'min_value', e.target.value)}
                  />
                </div>
                <div className="t-range-divider"></div>
                <div className="t-range-input">
                  <span className="range-label">Макс</span>
                  <input
                    type="number"
                    value={t.max_value}
                    onChange={(e) => handleThresholdChange(index, 'max_value', e.target.value)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="notif-footer-actions">
        <button onClick={saveSettings} className="save-btn-modern">
          <SaveIcon size={20} color="#f5d742" /> Сохранить изменения
        </button>
        <button
          onClick={handleTestEmail}
          className="test-btn-modern"
          disabled={!settings.email_enabled}
        >
          <BoltIcon size={20} color="#0F2925" /> Тест связи
        </button>
      </div>

      {message.text && (
        <div className={`modern-status-msg ${message.type}`}>
          <span className="status-icon">{statusIcon(message.type)}</span>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default NotificationSettings;
