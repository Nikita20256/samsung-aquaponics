import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Humidity from '../Humidity/Humidity';
import LightIntensity from '../LightIntensity/LightIntensity';
import SensorChart from '../SensorChart/SensorChart';

import DeviceControlPanel from '../DeviceControlPanel/DeviceControlPanel';
import sensorService from '../../services/sensorService';
import './Dashboard.css';
import Temperature from '../Temperature/temperature';
import backgroundImage from '../assets/images/flot.png';

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Загрузка...</p>
  </div>
);

const ErrorMessage = ({ message, onRetry }) => (
  <div className="error-message">
    <p>{message}</p>
    <button className="retry-button" onClick={onRetry}>
      Повторить попытку
    </button>
  </div>
);

const API_CONFIG = {
  baseURL: 'http://localhost:3000/api',
  endpoints: {
    device: '/user/device',
    devices: '/user/devices',
    addDevice: '/user/devices',
    currentHumid: '/humidity',
    currentLight: '/lightlevel',
    currentTemp: '/temperature',
    historicalHumid: '/data/humidity',
    historicalLight: '/data/light',
    historicalTemp: '/data/temperature',
  }
};

// Рендерит «Не в сети · N мин назад» по времени последней связи
const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'Не в сети';
  const diffSec = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
  if (diffSec < 60) return 'Не в сети · только что';
  const minutes = Math.floor(diffSec / 60);
  if (minutes < 60) return `Не в сети · ${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Не в сети · ${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `Не в сети · ${days} дн назад`;
};

const ChevronIcon = ({ open }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      width: 16,
      height: 16,
      transition: 'transform 0.25s ease',
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const DeviceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" />
    <line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" />
    <line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" />
    <line x1="20" y1="14" x2="23" y2="14" />
    <line x1="1" y1="9" x2="4" y2="9" />
    <line x1="1" y1="14" x2="4" y2="14" />
  </svg>
);

function Dashboard() {
  const [sensorData, setSensorData] = useState({
    humidity: null,
    light: null,
    temperature: null,
  });

  const [deviceStatus, setDeviceStatus] = useState(null);

  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [timeRange, setTimeRange] = useState({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: new Date()
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceSecret, setNewDeviceSecret] = useState('');
  const [addDeviceError, setAddDeviceError] = useState('');

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchDevices = useCallback(async () => {
    let isMounted = true;
    const abortController = new AbortController();

    try {
      const response = await axios.get(API_CONFIG.endpoints.devices, {
        baseURL: API_CONFIG.baseURL,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        signal: abortController.signal
      });

      if (isMounted) {
        setDevices(response.data.devices);

        const savedId = localStorage.getItem('selectedDeviceId');
        const availableIds = response.data.devices.map(d => d.device_id);

        if (deviceId && availableIds.includes(deviceId)) {
          // Уже выбрано корректное устройство
        } else if (savedId && availableIds.includes(savedId)) {
          setDeviceId(savedId);
        } else if (response.data.current) {
          setDeviceId(response.data.current);
          localStorage.setItem('selectedDeviceId', response.data.current);
        } else if (availableIds.length > 0) {
          setDeviceId(availableIds[0]);
          localStorage.setItem('selectedDeviceId', availableIds[0]);
        } else {
          setDeviceId(null);
        }
      }
    } catch (err) {
      if (isMounted && !axios.isCancel(err)) {
        try {
          const oldResponse = await axios.get(API_CONFIG.endpoints.device, {
            baseURL: API_CONFIG.baseURL,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            signal: abortController.signal
          });
          if (isMounted && oldResponse.data.device_id) {
            setDevices([{ device_id: oldResponse.data.device_id }]);
            setDeviceId(oldResponse.data.device_id);
          } else {
            setDevices([]);
            setDeviceId(null);
          }
        } catch (oldErr) {
          setDevices([]);
          setDeviceId(null);
        }
      }
    } finally {
      if (isMounted) setLoading(false);
    }

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [deviceId]);

  const handleDeviceSelect = (newId) => {
    if (newId === 'add_new') {
      setIsAddDeviceModalOpen(true);
      setDropdownOpen(false);
      return;
    }

    setSensorData({
      humidity: null,
      light: null,
      temperature: null,
    });
    setHistoricalData(null);
    setDeviceStatus(null);
    setDeviceId(newId);
    localStorage.setItem('selectedDeviceId', newId);
    setDropdownOpen(false);
  };

  const handleAddDeviceSubmit = async () => {
    setAddDeviceError('');
    try {
      await axios.post(API_CONFIG.endpoints.addDevice, {
        device_id: newDeviceId,
        device_secret: newDeviceSecret
      }, {
        baseURL: API_CONFIG.baseURL,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setIsAddDeviceModalOpen(false);
      setNewDeviceId('');
      setNewDeviceSecret('');
      fetchDevices();
    } catch (err) {
      setAddDeviceError(err.response?.data?.error || 'Ошибка добавления устройства');
    }
  };

  const fetchCurrentData = useCallback(async () => {
    if (!deviceId) return;

    try {
      const [humRes, lightRes, tempRes] = await Promise.all([
        axios.get(API_CONFIG.endpoints.currentHumid, {
          baseURL: API_CONFIG.baseURL,
          params: { device_id: deviceId },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(API_CONFIG.endpoints.currentLight, {
          baseURL: API_CONFIG.baseURL,
          params: { device_id: deviceId },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(API_CONFIG.endpoints.currentTemp, {
          baseURL: API_CONFIG.baseURL,
          params: { device_id: deviceId },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
      ]);

      setSensorData({
        humidity: humRes.data?.humidity ?? null,
        light: lightRes.data?.light ?? null,
        temperature: tempRes.data?.temperature ?? null,
      });
    } catch (err) {
      console.error('Ошибка получения данных датчиков:', err);
    }
  }, [deviceId]);

  const fetchDeviceStatus = useCallback(async () => {
    if (!deviceId) return;
    try {
      const status = await sensorService.getDeviceStatus(deviceId);
      setDeviceStatus(status);
    } catch (err) {
      console.error('Ошибка получения статуса устройства:', err);
    }
  }, [deviceId]);

  const fetchHistoricalData = useCallback(async (start, end) => {
    if (!deviceId) return;

    try {
      const [humData, lightData, tempData] = await Promise.all([
        axios.get(API_CONFIG.endpoints.historicalHumid, {
          baseURL: API_CONFIG.baseURL,
          params: { device_id: deviceId, start: start.toISOString(), end: end.toISOString() },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(API_CONFIG.endpoints.historicalLight, {
          baseURL: API_CONFIG.baseURL,
          params: { device_id: deviceId, start: start.toISOString(), end: end.toISOString() },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(API_CONFIG.endpoints.historicalTemp, {
          baseURL: API_CONFIG.baseURL,
          params: { device_id: deviceId, start: start.toISOString(), end: end.toISOString() },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
      ]);

      setHistoricalData({
        humidity: humData.data || null,
        light: lightData.data || null,
        temperature: tempData.data || null,
      });
    } catch (err) {
      console.error('Ошибка загрузки исторических данных', err);
    }
  }, [deviceId]);

  const handleTimeRangeChange = useCallback((newStartDate, newEndDate) => {
    setTimeRange({ startDate: newStartDate, endDate: newEndDate });
    fetchHistoricalData(newStartDate, newEndDate);
  }, [fetchHistoricalData]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    if (deviceId) {
      fetchCurrentData();
      fetchDeviceStatus();
      const intervalId = setInterval(() => {
        fetchCurrentData();
        fetchDeviceStatus();
      }, 10000);
      return () => clearInterval(intervalId);
    }
  }, [fetchCurrentData, fetchDeviceStatus, deviceId]);

  useEffect(() => {
    if (deviceId) {
      fetchHistoricalData(timeRange.startDate, timeRange.endDate);
    }
  }, [fetchHistoricalData, timeRange, deviceId]);

  const selectedDeviceLabel = devices.find(d => d.device_id === deviceId)?.device_id || deviceId || 'Выберите устройство';

  if (error) {
    return (
      <div className="dashboard-root" style={{ backgroundImage: `url(${backgroundImage})` }}>
        <div className="dashboard-container">
          <ErrorMessage message={error} onRetry={() => { setError(null); fetchDevices(); }} />
        </div>
      </div>
    );
  }

  if (loading && devices.length === 0) {
    return (
      <div className="dashboard-root" style={{ backgroundImage: `url(${backgroundImage})` }}>
        <div className="dashboard-container">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-root" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="dashboard-container">

        {/* Хедер с выбором устройства */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">Мое устройство</h1>

          {devices.length > 0 && (
            <div className="device-selector-container" ref={dropdownRef}>
              <button
                className="device-selector-trigger"
                onClick={() => setDropdownOpen(o => !o)}
              >
                <DeviceIcon />
                <span className="device-selector-label">{selectedDeviceLabel}</span>
                {deviceStatus && deviceStatus.online !== null && deviceStatus.online !== undefined && (
                  <span className={`device-status ${deviceStatus.online ? 'status-online' : 'status-offline'}`}>
                    <span className="status-dot" />
                    {deviceStatus.online ? 'В сети' : formatLastSeen(deviceStatus.lastSeen)}
                  </span>
                )}
                <ChevronIcon open={dropdownOpen} />
              </button>

              {dropdownOpen && (
                <div className="device-selector-dropdown">
                  {devices.map(d => (
                    <div
                      key={d.device_id}
                      className={`device-selector-option ${d.device_id === deviceId ? 'active' : ''}`}
                      onClick={() => handleDeviceSelect(d.device_id)}
                    >
                      <DeviceIcon />
                      <span>{d.device_id}</span>
                      {d.device_id === deviceId && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="#38A169" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, marginLeft: 'auto' }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  ))}
                  <div className="device-selector-divider" />
                  <div
                    className="device-selector-option add-device-option"
                    onClick={() => handleDeviceSelect('add_new')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#0F2925" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Добавить устройство</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {devices.length === 0 ? (
          <div className="no-devices-placeholder">
            <h2>Добро пожаловать в Fish & Greens!</h2>
            <p>У вас пока нет подключенных устройств.</p>
            <p>Добавьте ваше первое устройство, чтобы начать мониторинг.</p>
            <button onClick={() => setIsAddDeviceModalOpen(true)} className="add-device-btn">
              Добавить устройство
            </button>
          </div>
        ) : (
          <div className="dashboard-content" key={deviceId}>
            {/* Все карточки в одну строку */}
            <div className="top-row">
              <Temperature temperature={sensorData.temperature} />
              <Humidity humidity={sensorData.humidity} />
              <LightIntensity lightLevel={sensorData.light} />
              <DeviceControlPanel deviceId={deviceId} />
            </div>

            {/* График и факт */}
            <section className="charts-section">
              <div className="charts-row">
                <div className="chart-wrapper">
                  {historicalData && (
                    <SensorChart
                      historicalData={historicalData}
                      startDate={timeRange.startDate}
                      endDate={timeRange.endDate}
                      onTimeRangeChange={handleTimeRangeChange}
                      deviceId={deviceId}
                    />
                  )}
                </div>

              </div>
            </section>
          </div>
        )}

        {/* Модальное окно добавления устройства */}
        {isAddDeviceModalOpen && (
          <div className="modal-overlay" onClick={(e) => {
            if (e.target.className === 'modal-overlay') setIsAddDeviceModalOpen(false);
          }}>
            <div className="modal-content">
              <h2>Добавить устройство</h2>
              <p>Введите ID и секретный код с корпуса устройства</p>

              <input
                className="modal-input"
                placeholder="Device ID (например: dev1)"
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
              />
              <input
                className="modal-input"
                type="password"
                placeholder="Secret Code"
                value={newDeviceSecret}
                onChange={(e) => setNewDeviceSecret(e.target.value)}
              />

              {addDeviceError && <div className="modal-error">{addDeviceError}</div>}

              <div className="modal-buttons">
                <button className="modal-cancel-btn" onClick={() => setIsAddDeviceModalOpen(false)}>Отмена</button>
                <button className="modal-submit-btn" onClick={handleAddDeviceSubmit}>Добавить</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Dashboard;
