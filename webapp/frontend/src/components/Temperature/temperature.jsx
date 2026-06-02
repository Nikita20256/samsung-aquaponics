import React, { useMemo } from 'react';
import './Temperature.css';

const TempIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#E05038" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </svg>
);

const Temperature = ({ temperature }) => {
  const status = useMemo(() => {
    if (temperature === null || temperature === undefined) {
      return { text: 'Нет данных', color: '#718096', bg: 'rgba(237,242,247,0.8)' };
    }
    if (temperature >= 30) return { text: 'Жарко!', color: '#C53030', bg: 'rgba(255,245,245,0.85)' };
    if (temperature >= 24) return { text: 'Тепло', color: '#D97706', bg: 'rgba(255,251,235,0.85)' };
    if (temperature >= 16) return { text: 'Комфортно', color: '#2F855A', bg: 'rgba(240,255,244,0.85)' };
    return { text: 'Холодно', color: '#3182CE', bg: 'rgba(235,248,255,0.85)' };
  }, [temperature]);

  const fillPercent = useMemo(() => {
    if (temperature === null || temperature === undefined) return 0;
    return Math.max(5, Math.min(95, ((temperature + 5) / 55) * 100));
  }, [temperature]);

  const liquidColor = useMemo(() => {
    if (temperature === null) return '#A0AEC0';
    if (temperature >= 30) return '#E53E3E';
    if (temperature >= 24) return '#FFA726';
    if (temperature >= 16) return '#48BB78';
    return '#3182CE';
  }, [temperature]);

  return (
    <div className="temp-card">
      <div className="temp-header">
        <TempIcon />
        <h3 className="temp-title">Температура</h3>
      </div>

      <div className="temp-body">
        {/* Стеклянный термометр */}
        <div className="thermo-glass">
          <div className="thermo-tube">
            <div
              className="thermo-liquid"
              style={{
                height: `${fillPercent}%`,
                background: `linear-gradient(to top, ${liquidColor}, ${liquidColor}dd)`,
              }}
            />
            {/* Пузырьки */}
            <div className="thermo-bubbles">
              <span style={{ left: '30%', animationDelay: '0s' }} />
              <span style={{ left: '60%', animationDelay: '1.2s' }} />
              <span style={{ left: '45%', animationDelay: '2.5s' }} />
            </div>
          </div>
          <div className="thermo-bulb">
            <div className="thermo-bulb-inner" style={{ background: liquidColor }} />
          </div>
        </div>

        <div className="temp-value-block">
          <span className="temp-value" style={{ color: liquidColor }}>
            {temperature !== null ? temperature.toFixed(1) : '--'}
          </span>
          <span className="temp-unit">°C</span>
        </div>
      </div>

      <div
        className="temp-status"
        style={{ backgroundColor: status.bg, color: status.color }}
      >
        {status.text}
      </div>
    </div>
  );
};

export default Temperature;
