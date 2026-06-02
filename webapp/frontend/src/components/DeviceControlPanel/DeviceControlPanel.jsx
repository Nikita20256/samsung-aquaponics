import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './DeviceControlPanel.css';

const BASE_URL = 'http://localhost:3000/api';
const MODE_FROM_API = { off: 0, auto: 1, on: 2 };
const MODE_TO_API = { 0: 'off', 1: 'auto', 2: 'on' };

const LightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const AerationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12h4M18 12h4M12 2v4M12 18v4" />
    <circle cx="12" cy="12" r="3" />
    <path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const controlConfig = [
  { label: 'Выкл', value: 0, color: '#E53E3E' },
  { label: 'Авто', value: 1, color: '#3182CE' },
  { label: 'Вкл', value: 2, color: '#38A169' }
];

const DeviceControlPanel = ({ deviceId }) => {
  const [lightMode, setLightMode] = useState(1);
  const [aerationMode, setAerationMode] = useState(1);
  const [isSavingLight, setIsSavingLight] = useState(false);
  const [isSavingAeration, setIsSavingAeration] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    axios.get('/control/modes', {
      baseURL: BASE_URL,
      params: { device_id: deviceId },
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then((res) => {
      if (cancelled) return;
      const data = res.data;
      if (data?.light && data.light in MODE_FROM_API) {
        setLightMode(MODE_FROM_API[data.light]);
      }
      if (data?.aeration && data.aeration in MODE_FROM_API) {
        setAerationMode(MODE_FROM_API[data.aeration]);
      }
    }).catch((err) => {
      console.error('Не удалось получить режимы управления:', err);
    });
    return () => { cancelled = true; };
  }, [deviceId]);

  const handleLightChange = (value) => {
    if (!deviceId || isSavingLight) return;
    const prev = lightMode;
    const modeStr = MODE_TO_API[value] || 'auto';
    setLightMode(value);
    setIsSavingLight(true);
    axios.post('/control/light', { mode: modeStr }, {
      baseURL: BASE_URL,
      params: { device_id: deviceId },
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).catch((err) => {
      console.error('Не удалось установить режим света:', err);
      setLightMode(prev);
    }).finally(() => setIsSavingLight(false));
  };

  const handleAerationChange = (value) => {
    if (!deviceId || isSavingAeration) return;
    const prev = aerationMode;
    const modeStr = MODE_TO_API[value] || 'auto';
    setAerationMode(value);
    setIsSavingAeration(true);
    axios.post('/control/aeration', { mode: modeStr }, {
      baseURL: BASE_URL,
      params: { device_id: deviceId },
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).catch((err) => {
      console.error('Не удалось установить режим аэрации:', err);
      setAerationMode(prev);
    }).finally(() => setIsSavingAeration(false));
  };

  return (
    <div className="control-card">
      <div className="control-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="#0F2925" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
          <rect x="2" y="6" width="20" height="12" rx="2" ry="2" />
          <path d="M6 10h.01M6 14h.01M10 10h4M10 14h4M14 10h.01M14 14h.01M18 10h.01M18 14h.01" />
        </svg>
        <h3 className="control-title">Управление</h3>
      </div>

      <div className="control-body">
        {/* Свет */}
        <div className="ctrl-item">
          <div className="ctrl-item-label">
            <LightIcon />
            <span>Свет</span>
          </div>
          <div className="ctrl-pills">
            {controlConfig.map((mode) => (
              <button
                key={mode.value}
                className={`ctrl-pill ${lightMode === mode.value ? 'active' : ''}`}
                onClick={() => handleLightChange(mode.value)}
                disabled={isSavingLight}
                style={{ '--active-bg': mode.color }}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ctrl-divider" />

        {/* Аэрация */}
        <div className="ctrl-item">
          <div className="ctrl-item-label">
            <AerationIcon />
            <span>Аэрация</span>
          </div>
          <div className="ctrl-pills">
            {controlConfig.map((mode) => (
              <button
                key={mode.value}
                className={`ctrl-pill ${aerationMode === mode.value ? 'active' : ''}`}
                onClick={() => handleAerationChange(mode.value)}
                disabled={isSavingAeration}
                style={{ '--active-bg': mode.color }}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceControlPanel;
