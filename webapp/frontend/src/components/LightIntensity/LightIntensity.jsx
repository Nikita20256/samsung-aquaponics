import React, { useMemo } from 'react';
import './LightIntensity.css';

const LightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#F0A830" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const LightIntensity = ({ lightLevel }) => {
  const status = useMemo(() => {
    if (lightLevel === null || lightLevel === undefined) {
      return { text: 'Нет данных', color: '#718096', bg: 'rgba(237,242,247,0.8)' };
    }
    if (lightLevel < 200) return { text: 'Темно', color: '#4A5568', bg: 'rgba(226,232,240,0.85)' };
    if (lightLevel < 400) return { text: 'Сумерки', color: '#5a6c5a', bg: 'rgba(232,245,233,0.85)' };
    if (lightLevel <= 800) return { text: 'Комфортно', color: '#2F855A', bg: 'rgba(240,255,244,0.85)' };
    return { text: 'Ярко', color: '#D97706', bg: 'rgba(255,251,235,0.85)' };
  }, [lightLevel]);

  const percent = useMemo(() => {
    if (lightLevel === null || lightLevel === undefined) return 0;
    return Math.max(2, Math.min(100, (lightLevel / 1000) * 100));
  }, [lightLevel]);

  const sunColor = useMemo(() => {
    if (lightLevel === null) return '#A0AEC0';
    if (lightLevel < 200) return '#718096';
    if (lightLevel < 400) return '#48BB78';
    if (lightLevel <= 800) return '#F0A830';
    return '#F6AD55';
  }, [lightLevel]);

  // SVG ring progress
  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - percent / 100);

  return (
    <div className="light-card">
      <div className="light-header">
        <LightIcon />
        <h3 className="light-title">Освещенность</h3>
      </div>

      <div className="light-body">
        <div className="sun-gauge-wrap">
          <svg viewBox="0 0 100 100" className="sun-svg">
            <defs>
              <linearGradient id="sun-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={sunColor} stopOpacity="0.9" />
                <stop offset="100%" stopColor={sunColor} stopOpacity="0.4" />
              </linearGradient>
              <filter id="sun-glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Фоновое кольцо */}
            <circle
              cx="50" cy="50" r={R}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Прогресс */}
            <circle
              cx="50" cy="50" r={R}
              fill="none"
              stroke="url(#sun-grad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease' }}
              transform="rotate(-90 50 50)"
              filter="url(#sun-glow)"
            />

            {/* Солнце в центре */}
            <g filter="url(#sun-glow)">
              <circle cx="50" cy="50" r="14" fill={sunColor} opacity="0.9" />
              {/* Лучи */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const x1 = 50 + 20 * Math.cos(rad);
                const y1 = 50 + 20 * Math.sin(rad);
                const x2 = 50 + 28 * Math.cos(rad);
                const y2 = 50 + 28 * Math.sin(rad);
                return (
                  <line
                    key={deg}
                    x1={x1} y1={y1}
                    x2={x2} y2={y2}
                    stroke={sunColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                );
              })}
            </g>
          </svg>

          <div className="light-value-overlay">
            <span className="light-value" style={{ color: sunColor }}>
              {lightLevel !== null ? Math.round(lightLevel) : '--'}
            </span>
            <span className="light-unit">lux</span>
          </div>
        </div>
      </div>

      <div
        className="light-status"
        style={{ backgroundColor: status.bg, color: status.color }}
      >
        {status.text}
      </div>
    </div>
  );
};

export default LightIntensity;
