import React from 'react';
import './AquaponicsCycle.css';

const AquaponicsCycle = () => {
  return (
    <div className="cycle-card">
      <svg viewBox="0 0 270 400" className="cycle-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a5c3e" />
            <stop offset="50%" stopColor="#0d7a54" />
            <stop offset="100%" stopColor="#085238" />
          </linearGradient>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#29b6f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0277bd" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="bedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8d6e63" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#5d4037" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Фон */}
        <rect x="0" y="0" width="270" height="400" fill="url(#bgGrad)" />

        {/* === GROW BED (горизонтальный ящик с растением) === */}
        <rect x="35" y="210" width="200" height="36" rx="8" fill="url(#bedGrad)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <rect x="35" y="210" width="200" height="10" rx="8" fill="rgba(161,136,127,0.25)" />

        {/* Растение — стебель */}
        <line x1="135" y1="210" x2="135" y2="55" stroke="#66bb6a" strokeWidth="4" strokeLinecap="round" className="stem" />

        {/* Листья (симметрично, 4 пары) */}
        <g className="leaf leaf-1">
          <ellipse cx="118" cy="175" rx="14" ry="7" fill="#81c784" transform="rotate(-35 118 175)" />
        </g>
        <g className="leaf leaf-1-r">
          <ellipse cx="152" cy="175" rx="14" ry="7" fill="#81c784" transform="rotate(35 152 175)" />
        </g>

        <g className="leaf leaf-2">
          <ellipse cx="115" cy="145" rx="16" ry="8" fill="#66bb6a" transform="rotate(-40 115 145)" />
        </g>
        <g className="leaf leaf-2-r">
          <ellipse cx="155" cy="145" rx="16" ry="8" fill="#66bb6a" transform="rotate(40 155 145)" />
        </g>

        <g className="leaf leaf-3">
          <ellipse cx="120" cy="115" rx="13" ry="6" fill="#a5d6a7" transform="rotate(-30 120 115)" />
        </g>
        <g className="leaf leaf-3-r">
          <ellipse cx="150" cy="115" rx="13" ry="6" fill="#a5d6a7" transform="rotate(30 150 115)" />
        </g>

        <g className="leaf leaf-4">
          <ellipse cx="124" cy="88" rx="11" ry="5" fill="#81c784" transform="rotate(-25 124 88)" />
        </g>
        <g className="leaf leaf-4-r">
          <ellipse cx="146" cy="88" rx="11" ry="5" fill="#81c784" transform="rotate(25 146 88)" />
        </g>

        {/* Цветок наверху */}
        <g className="flower">
          <circle cx="135" cy="65" r="6" fill="#ffca28" />
          <circle cx="135" cy="56" r="4" fill="#fff176" opacity="0.8" />
          <circle cx="127" cy="61" r="4" fill="#fff176" opacity="0.8" />
          <circle cx="143" cy="61" r="4" fill="#fff176" opacity="0.8" />
          <circle cx="129" cy="70" r="4" fill="#fff176" opacity="0.8" />
          <circle cx="141" cy="70" r="4" fill="#fff176" opacity="0.8" />
          <circle cx="135" cy="65" r="3" fill="#ffee58" />
        </g>

        {/* === АКВАРИУМ === */}
        <rect x="20" y="260" width="230" height="120" rx="14" fill="url(#waterGrad)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        {/* Поверхность воды */}
        <rect x="20" y="260" width="230" height="16" rx="14" fill="rgba(129,212,250,0.15)" />
        <path d="M20,270 Q67,265 135,270 Q202,275 250,270" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

        {/* Рыбка 1 (крупная, в центре) */}
        <g className="fish fish-1">
          <ellipse cx="135" cy="315" rx="22" ry="13" fill="#ff8a65" />
          <polygon points="113,315 100,304 100,326" fill="#ff8a65" />
          <circle cx="148" cy="310" r="3.5" fill="white" />
          <circle cx="149" cy="310" r="1.8" fill="#333" />
          {/* Плавники */}
          <path d="M125,324 Q135,330 145,324" stroke="#e64a19" strokeWidth="1.5" fill="none" opacity="0.4" />
          <ellipse cx="135" cy="302" rx="5" ry="3" fill="#ffab91" opacity="0.6" transform="rotate(-10 135 302)" />
        </g>

        {/* Рыбка 2 (поменьше, выше) */}
        <g className="fish fish-2">
          <ellipse cx="90" cy="285" rx="14" ry="9" fill="#ffb74d" />
          <polygon points="76,285 68,278 68,292" fill="#ffb74d" />
          <circle cx="99" cy="282" r="2.5" fill="white" />
          <circle cx="100" cy="282" r="1.2" fill="#333" />
        </g>

        {/* Рыбка 3 (маленькая, нижняя) */}
        <g className="fish fish-3">
          <ellipse cx="195" cy="350" rx="10" ry="6" fill="#ffcc80" />
          <polygon points="205,350 211,346 211,354" fill="#ffcc80" />
          <circle cx="188" cy="348" r="1.8" fill="white" />
          <circle cx="187" cy="348" r="0.9" fill="#333" />
        </g>

        {/* Пузырьки */}
        <circle cx="50" cy="360" r="3.5" fill="rgba(255,255,255,0.45)" className="bubble b1" />
        <circle cx="85" cy="370" r="2.5" fill="rgba(255,255,255,0.35)" className="bubble b2" />
        <circle cx="135" cy="365" r="4" fill="rgba(255,255,255,0.4)" className="bubble b3" />
        <circle cx="185" cy="355" r="3" fill="rgba(255,255,255,0.35)" className="bubble b4" />
        <circle cx="220" cy="368" r="2.5" fill="rgba(255,255,255,0.3)" className="bubble b5" />
        <circle cx="110" cy="375" r="2" fill="rgba(255,255,255,0.3)" className="bubble b6" />
        <circle cx="165" cy="372" r="2.5" fill="rgba(255,255,255,0.35)" className="bubble b7" />

        {/* Корни в воде (тонкие линии) */}
        <path d="M130,246 Q125,255 128,265" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" className="root" />
        <path d="M135,246 Q135,258 135,270" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" className="root" />
        <path d="M140,246 Q145,254 142,262" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" className="root" />
      </svg>
    </div>
  );
};

export default AquaponicsCycle;
