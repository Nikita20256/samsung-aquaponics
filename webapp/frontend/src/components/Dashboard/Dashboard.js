import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import WaterLevel from '../WaterLevel/WaterLevel';
import Humidity from '../Humidity/Humidity';
import LightIntensity from '../LightIntensity/LightIntensity';
import SensorChart from '../SensorChart/SensorChart';
import AquaponicsInfoCard from '../AquaponicsInfoCard/AquaponicsInfoCard';
import './Dashboard.css';
import Temperature from '../Temperature/temperature';

// Импортируем фоновое изображение
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
  //baseURL: 'https://aquaponiks.ru',
  
  baseURL: 'http://localhost:3000',
  endpoints: {
    device: '/user/device',
    waterLevel: '/waterlevel',
    currentHumid: '/humidity',
    currentLight: '/lightlevel',
    currentTemp: '/temperature',
    historicalHumid: '/data/humidity',
    historicalLight: '/data/light',
    historicalTemp: '/data/temperature',
    lightSwitches: '/lightswitches'
  }
};

function Dashboard() {
  const [sensorData, setSensorData] = useState({
    waterLevel: null,
    humidity: null,
    light: null,
    temperature: null,
    lightSwitches: null
  });
  const [deviceId, setDeviceId] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [timeRange, setTimeRange] = useState({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: new Date()
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDeviceId = useCallback(async () => {
    let isMounted = true;
    const abortController = new AbortController();

    try {
      const response = await axios.get(API_CONFIG.endpoints.device, {
        baseURL: API_CONFIG.baseURL,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        signal: abortController.signal
      });

      if (isMounted) {
        setDeviceId(response.data.device_id);
      }
    } catch (err) {
      if (isMounted && !axios.isCancel(err)) {
        setError('Не удалось получить данные устройства');
      }
    }

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  const fetchCurrentData = useCallback(async () => {
    if (!deviceId) return;

    try {
      const [waterRes, humRes, lightRes, tempRes, switchesRes] = await Promise.all([
        axios.get(API_CONFIG.endpoints.waterLevel, {
          baseURL: API_CONFIG.baseURL,
          params: { device_id: deviceId },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }),
        axios.get(API_CONFIG.endpoints.currentHumid, {
          baseURL: API_CONFIG.baseURL,
          params: { device_id: deviceId },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }),
        axios.get(API_CONFIG.endpoints.currentLight, {
          baseURL: API_CONFIG.baseURL,
          params: { device_id: deviceId },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }),
        axios.get(API_CONFIG.endpoints.currentTemp, {
          baseURL: API_CONFIG.baseURL,
          params: { device_id: deviceId },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }),
        axios.get(API_CONFIG.endpoints.lightSwitches, {
          baseURL: API_CONFIG.baseURL,
          params: { device_id: deviceId },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);
      
      setSensorData({
        waterLevel: waterRes.data?.water ?? null,
        humidity: humRes.data?.humidity ?? null,
        light: lightRes.data?.light ?? null,
        temperature: tempRes.data?.temperature ?? null,
        lightSwitches: switchesRes.data?.count ?? 0
      });
    } catch (err) {
      console.error('Ошибка получения данных датчиков:', err);
    }
  }, [deviceId]);

  const fetchHistoricalData = useCallback(async (start, end) => {
    if (!deviceId) return;

    try {
      setLoading(true);
      const [humData, lightData, tempData] = await Promise.all([
        axios.get(API_CONFIG.endpoints.historicalHumid, {
          baseURL: API_CONFIG.baseURL,
          params: {
            device_id: deviceId,
            start: start.toISOString(),
            end: end.toISOString()
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }),
        axios.get(API_CONFIG.endpoints.historicalLight, {
          baseURL: 'https://aquaponiks.ru',
          params: {
            device_id: deviceId,
            start: start.toISOString(),
            end: end.toISOString()
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }),
        axios.get(API_CONFIG.endpoints.historicalTemp, {
          baseURL: API_CONFIG.baseURL,
          params: {
            device_id: deviceId,
            start: start.toISOString(),
            end: end.toISOString()
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);
      
      setHistoricalData({
        humidity: humData.data || null,
        light: lightData.data || null,
        temperature: tempData.data || null
      });
    } catch (err) {
      setError(`Ошибка загрузки исторических данных`);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  const handleTimeRangeChange = useCallback((newStartDate, newEndDate) => {
    setTimeRange({
      startDate: newStartDate,
      endDate: newEndDate
    });
    fetchHistoricalData(newStartDate, newEndDate);
  }, [fetchHistoricalData]);

  useEffect(() => {
    fetchDeviceId();
  }, [fetchDeviceId]);

  useEffect(() => {
    fetchCurrentData();
    const intervalId = setInterval(fetchCurrentData, 10000);
    return () => clearInterval(intervalId);
  }, [fetchCurrentData]);

  useEffect(() => {
    fetchHistoricalData(timeRange.startDate, timeRange.endDate);
  }, [fetchHistoricalData, timeRange]);

  if (error) {
    return (
      <div 
        className="dashboard-root" 
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="dashboard-container">
          <ErrorMessage 
            message={error} 
            onRetry={() => {
              setError(null);
              fetchDeviceId();
            }} 
          />
        </div>
      </div>
    );
  }

  if (!deviceId || loading) {
    return (
      <div 
        className="dashboard-root" 
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="dashboard-container">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="dashboard-root" 
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="dashboard-container">
        <div className="dashboard-cont"> 
          <div className="sensors-grid">
            <div className="sensors-cards">
              <WaterLevel waterLevel={sensorData.waterLevel} deviceId={deviceId}/>
              <Temperature temperature={sensorData.temperature}/>
              <Humidity humidity={sensorData.humidity}/>
              <LightIntensity 
                lightLevel={sensorData.light}
                lightSwitches={sensorData.lightSwitches}
                deviceId={deviceId}
              />
            </div>
            <div className="dashboard-SensorChart">
            {historicalData && (
              <SensorChart 
                historicalData={historicalData}
                startDate={timeRange.startDate}
                endDate={timeRange.endDate}
                onTimeRangeChange={handleTimeRangeChange}
                deviceId={deviceId}/>)}
            <AquaponicsInfoCard deviceId={deviceId} />
            </div>
          </div> 
        </div> 
      </div>
    </div>
  );
}

export default Dashboard;