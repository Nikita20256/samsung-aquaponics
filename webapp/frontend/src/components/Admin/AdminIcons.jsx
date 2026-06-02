/**
 * SVG иконки для админ-панели
 * Стиль: жёлто-зелёный stroke на прозрачном фоне
 */

export const UsersIcon = ({ size = 64, color = '#c8e06c' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Центральный человек */}
        <circle cx="32" cy="22" r="8" stroke={color} strokeWidth="2.5" fill="none"/>
        <path d="M20 52C20 42.059 25.373 36 32 36C38.627 36 44 42.059 44 52" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        {/* Левый человек */}
        <circle cx="14" cy="26" r="6" stroke={color} strokeWidth="2" fill="none"/>
        <path d="M4 52C4 44.268 8.477 39 14 39C17.2 39 19.96 40.84 22 44" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>
        {/* Правый человек */}
        <circle cx="50" cy="26" r="6" stroke={color} strokeWidth="2" fill="none"/>
        <path d="M60 52C60 44.268 55.523 39 50 39C46.8 39 44.04 40.84 42 44" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
);

export const AquaponicsIcon = ({ size = 64, color = '#c8e06c' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Вода — волнистая линия */}
        <path d="M8 42C14 38 20 46 26 42C32 38 38 46 44 42C50 38 56 46 56 42" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <line x1="8" y1="46" x2="56" y2="46" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        {/* Горшок/контейнер */}
        <path d="M12 46L16 56H48L52 46" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        {/* Растения */}
        <path d="M24 42V28" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M24 34C20 30 18 32 18 36" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M24 30C28 26 30 28 30 32" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="24" cy="24" r="3" stroke={color} strokeWidth="2" fill="none"/>
        <path d="M40 42V30" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M40 36C36 32 34 34 34 38" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M40 34C44 30 46 32 46 36" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="40" cy="26" r="3" stroke={color} strokeWidth="2" fill="none"/>
        {/* Рыбки */}
        <path d="M14 50C14 48.5 15.5 47 17 47C18.5 47 20 48.5 20 50C20 51.5 18.5 52 17 52" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M44 50C44 48.5 45.5 47 47 47C48.5 47 50 48.5 50 50C50 51.5 48.5 52 47 52" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
);

export const AdminIcon = ({ size = 64, color = '#c8e06c' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Человек */}
        <circle cx="28" cy="22" r="9" stroke={color} strokeWidth="2.5" fill="none"/>
        <path d="M12 56C12 44.954 19.163 36 28 36C31.5 36 34.7 37.2 37.4 39.3" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        {/* Звезда */}
        <path d="M48 28L50.5 35.5H58L52 40.5L54.5 48L48 43.5L41.5 48L44 40.5L38 35.5H45.5L48 28Z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill="none"/>
    </svg>
);

export const SearchIcon = ({ size = 20, color = '#0f2925' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" fill="none"/>
        <line x1="16" y1="16" x2="21" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
);

export const ChartIcon = ({ size = 64, color = '#c8e06c' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Ось */}
        <line x1="10" y1="52" x2="54" y2="52" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="10" y1="52" x2="10" y2="10" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        {/* Столбцы */}
        <rect x="16" y="36" width="8" height="16" rx="2" stroke={color} strokeWidth="2" fill="none"/>
        <rect x="28" y="24" width="8" height="28" rx="2" stroke={color} strokeWidth="2" fill="none"/>
        <rect x="40" y="30" width="8" height="22" rx="2" stroke={color} strokeWidth="2" fill="none"/>
        {/* Линия тренда */}
        <path d="M16 32L28 20L40 26L54 14" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <circle cx="16" cy="32" r="2.5" fill={color}/>
        <circle cx="28" cy="20" r="2.5" fill={color}/>
        <circle cx="40" cy="26" r="2.5" fill={color}/>
        <circle cx="54" cy="14" r="2.5" fill={color}/>
    </svg>
);
