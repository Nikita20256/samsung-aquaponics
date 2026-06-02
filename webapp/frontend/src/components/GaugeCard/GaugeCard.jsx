import React, { useMemo } from 'react';
import './GaugeCard.css';

/**
 * Полукруглый gauge-индикатор на SVG.
 *
 * Props:
 *  - label: string — заголовок карточки
 *  - value: number|null — текущее значение
 *  - min: number — минимум шкалы
 *  - max: number — максимум шкалы
 *  - unit: string — единица измерения
 *  - icon: ReactNode — SVG-иконка слева от заголовка
 *  - colorStops: Array<{offset:number, color:string}> — градиент дуги
 *  - status: { text: string, color: string, bg: string } — статусная плашка (optional)
 */

const GaugeCard = ({
  label,
  value,
  min = 0,
  max = 100,
  unit = '',
  icon = null,
  colorStops = [
    { offset: 0, color: '#5D9CEC' },
    { offset: 50, color: '#8ED7C6' },
    { offset: 100, color: '#FFA726' },
  ],
  status = null,
  decimals = 0,
}) => {
  const RADIUS = 80;
  const STROKE = 14;
  const CENTER = 100;
  const BASE_Y = 100;

  // Длина полукруга
  const arcLength = Math.PI * RADIUS; // ~251.3

  const percent = useMemo(() => {
    if (value === null || value === undefined) return 0;
    const p = ((value - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, p));
  }, [value, min, max]);

  const dashOffset = arcLength * (1 - percent / 100);

  // Градиентный id
  const gradId = useMemo(
    () => `grad-${label?.replace(/\s/g, '')}-${Math.random().toString(36).slice(2, 8)}`,
    [label]
  );

  // Цвет стрелки — берём цвет ближайшего к проценту colorStop
  const needleColor = useMemo(() => {
    if (!colorStops.length) return '#333';
    const sorted = [...colorStops].sort((a, b) => a.offset - b.offset);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (percent >= sorted[i].offset && percent <= sorted[i + 1].offset) {
        return sorted[i + 1].color;
      }
    }
    return sorted[sorted.length - 1].color;
  }, [percent, colorStops]);

  // Угол стрелки в градусах: 180° (left) → 0° (right)
  const angleDeg = 180 - (percent / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  const needleLen = RADIUS - 4;
  const needleX = CENTER + needleLen * Math.cos(angleRad);
  const needleY = BASE_Y - needleLen * Math.sin(angleRad);

  // Метки шкалы
  const ticks = useMemo(() => {
    const count = 5;
    const arr = [];
    for (let i = 0; i <= count; i++) {
      const p = i / count;
      const a = Math.PI - p * Math.PI; // от π до 0
      const x = CENTER + (RADIUS + 18) * Math.cos(a);
      const y = BASE_Y - (RADIUS + 18) * Math.sin(a);
      const val = Math.round(min + (max - min) * p);
      arr.push({ x, y, val });
    }
    return arr;
  }, [min, max]);

  const hasValue = value !== null && value !== undefined;

  return (
    <div className="gauge-card">
      <div className="gauge-header">
        {icon && <span className="gauge-icon">{icon}</span>}
        <h3 className="gauge-title">{label}</h3>
      </div>

      <div className="gauge-body">
        <svg
          viewBox="0 0 200 120"
          className="gauge-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              {colorStops.map((stop, i) => (
                <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} />
              ))}
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Фоновая дуга */}
          <path
            d={`M ${CENTER - RADIUS} ${BASE_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER + RADIUS} ${BASE_Y}`}
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />

          {/* Дуга прогресса */}
          <path
            d={`M ${CENTER - RADIUS} ${BASE_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER + RADIUS} ${BASE_Y}`}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            filter="url(#glow)"
          />

          {/* Мелкие деления */}
          {Array.from({ length: 21 }).map((_, i) => {
            const p = i / 20;
            const a = Math.PI - p * Math.PI;
            const x1 = CENTER + (RADIUS - 10) * Math.cos(a);
            const y1 = BASE_Y - (RADIUS - 10) * Math.sin(a);
            const x2 = CENTER + (RADIUS - 2) * Math.cos(a);
            const y2 = BASE_Y - (RADIUS - 2) * Math.sin(a);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={i % 5 === 0 ? 2 : 1}
              />
            );
          })}

          {/* Стрелка */}
          {hasValue && (
            <g>
              <line
                x1={CENTER}
                y1={BASE_Y}
                x2={needleX}
                y2={needleY}
                stroke={needleColor}
                strokeWidth={3}
                strokeLinecap="round"
                filter="url(#glow)"
                style={{ transition: 'all 1s ease-out' }}
              />
              <circle
                cx={CENTER}
                cy={BASE_Y}
                r={5}
                fill={needleColor}
                stroke="rgba(255,255,255,0.8)"
                strokeWidth={2}
              />
            </g>
          )}

          {/* Цифры шкалы */}
          {ticks.map((t, i) => (
            <text
              key={i}
              x={t.x}
              y={t.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#4A5568"
              fontSize="9"
              fontWeight="600"
            >
              {t.val}
            </text>
          ))}
        </svg>

        {/* Центральное значение */}
        <div className="gauge-value-wrap">
          <span className="gauge-value" style={{ color: needleColor }}>
            {hasValue ? value.toFixed(decimals) : '--'}
          </span>
          <span className="gauge-unit">{unit}</span>
        </div>
      </div>

      {status && (
        <div
          className="gauge-status"
          style={{
            backgroundColor: status.bg,
            color: status.color,
          }}
        >
          {status.text}
        </div>
      )}
    </div>
  );
};

export default GaugeCard;
