/**
 * Конфигурация API
 */

// Определяем базовый URL в зависимости от окружения
const getApiBaseUrl = () => {
    // Проверяем переменную окружения
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }

    // Для разработки используем localhost
    if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:3000/api';
    }

    // Для production используем относительный путь или домен
    return '/api';
};

const config = {
    baseURL: getApiBaseUrl(),

    endpoints: {
        // Auth
        login: '/auth/login',
        register: '/auth/register',
        device: '/auth/device',

        // Current sensor data
        sensors: {
            all: '/sensors/all',
            humidity: '/sensors/humidity',
            light: '/sensors/light',
            temperature: '/sensors/temperature',
            water: '/sensors/water',
            lightSwitches: '/sensors/lightswitches',
        },

        // Historical data
        data: {
            all: '/data/all',
            humidity: '/data/humidity',
            light: '/data/light',
            temperature: '/data/temperature',
        },

        // Control
        control: {
            modes: '/control/modes',
            light: '/control/light',
            aeration: '/control/aeration',
        },

        // Legacy endpoints (backwards compatibility)
        legacy: {
            userDevice: '/user/device',
            humidity: '/humidity',
            lightlevel: '/lightlevel',
            temperature: '/temperature',
            waterlevel: '/waterlevel',
            lightswitches: '/lightswitches',
            dataHumidity: '/data/humidity',
            dataLight: '/data/light',
            dataTemperature: '/data/temperature',
        },
    },

    // Request timeout in ms
    timeout: 10000,

    // Refresh interval for sensor data (ms)
    refreshInterval: 10000,
};

export default config;
