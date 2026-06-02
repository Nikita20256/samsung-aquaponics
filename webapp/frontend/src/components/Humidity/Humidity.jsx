import React, { useMemo } from 'react';
import './Humidity.css';

const HumidIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#3182CE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

const Humidity = ({ humidity }) => {
  const status = useMemo(() => {
    if (humidity === null || humidity === undefined) {
      return { text: 'Нет данных', color: '#718096', bg: 'rgba(237,242,247,0.8)' };
    }
    if (humidity < 25) return { text: 'Очень сухо', color: '#C05621', bg: 'rgba(255,245,235,0.85)' };
    if (humidity < 40) return { text: 'Сухо', color: '#D97706', bg: 'rgba(255,251,235,0.85)' };
    if (humidity <= 65) return { text: 'Комфортно', color: '#2F855A', bg: 'rgba(240,255,244,0.85)' };
    if (humidity <= 80) return { text: 'Влажно', color: '#2B6CB0', bg: 'rgba(235,248,255,0.85)' };
    return { text: 'Очень влажно', color: '#1E3A5F', bg: 'rgba(219,234,254,0.85)' };
  }, [humidity]);

  const fillPercent = useMemo(() => {
    if (humidity === null || humidity === undefined) return 0;
    return Math.max(2, Math.min(98, humidity));
  }, [humidity]);

  const waterColor = useMemo(() => {
    if (humidity === null) return '#A0AEC0';
    if (humidity < 30) return '#ED8936';
    if (humidity < 50) return '#38B2AC';
    if (humidity <= 75) return '#3182CE';
    return '#2B6CB0';
  }, [humidity]);

  // SVG wave path
  const wavePath = useMemo(() => {
    const y = 100 - fillPercent;
    return `M0,${y} Q25,${y - 6} 50,${y} T100,${y} V100 H0 Z`;
  }, [fillPercent]);

  return (
    <div className="humid-card">
      <div className="humid-header">
        <HumidIcon />
        <h3 className="humid-title">Влажность</h3>
      </div>

      <div className="humid-body">
        {/* Круг с водной волной */}
        <div className="wave-circle-wrap">
          <svg viewBox="0 0 100 100" className="wave-svg">
            <defs>
              <clipPath id="wave-clip">
                <circle cx="50" cy="50" r="46" />
              </clipPath>
            </defs>

            {/* Фон круга */}
            <circle cx="50" cy="50" r="46" fill="rgba(255,255,255,0.35)" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />

            {/* Вода с волной */}
            <g clipPath="url(#wave-clip)">
              <rect x="0" y="0" width="100" height="100" fill="transparent" />
              <path
                d={wavePath}
                fill={waterColor}
                opacity="0.85"
                style={{ transition: 'd 1s ease-out' }}
              >
                <animate
                  attributeName="d"
                  dur="3s"
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
                  values={`
                    M0,${100 - fillPercent} Q25,${100 - fillPercent - 5} 50,${100 - fillPercent} T100,${100 - fillPercent} V100 H0 Z;
                    M0,${100 - fillPercent} Q25,${100 - fillPercent + 5} 50,${100 - fillPercent} T100,${100 - fillPercent} V100 H0 Z;
                    M0,${100 - fillPercent} Q25,${100 - fillPercent - 5} 50,${100 - fillPercent} T100,${100 - fillPercent} V100 H0 Z
                  `}
                />
              </path>
              {/* Отражение */}
              <ellipse cx="50" cy="55" rx="30" ry="8" fill="rgba(255,255,255,0.15)" />
            </g>

            {/* Обводка */}
            <circle cx="50" cy="50" r="46" fill="none" stroke={waterColor} strokeWidth="2.5" opacity="0.6" />
          </svg>

          <div className="humid-value-overlay">
            <span className="humid-value" style={{ color: waterColor }}>
              {humidity !== null ? Math.round(humidity) : '--'}
            </span>
            <span className="humid-unit">%</span>
          </div>
        </div>
      </div>

      <div
        className="humid-status"
        style={{ backgroundColor: status.bg, color: status.color }}
      >
        {status.text}
      </div>
    </div>
  );
};

export default Humidity;
