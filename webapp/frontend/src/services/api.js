/**
 * Axios instance с настройками для API
 */
import axios from 'axios';
import config from '../config/api';

// Создаем axios instance
const api = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - добавляем токен к каждому запросу
api.interceptors.request.use(
    (requestConfig) => {
        const token = localStorage.getItem('token');
        if (token) {
            requestConfig.headers.Authorization = `Bearer ${token}`;
        }
        return requestConfig;
    },
    (error) => {
        return Promise.reject(error);
    }
);

let isHandlingAuthError = false;

// Response interceptor - обработка ошибок
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const code = error.response?.data?.code;
        const message = error.response?.data?.error;

        // Токен истёк/недействителен/отсутствует для защищённого запроса
        const isTokenProblem =
            code === 'TOKEN_EXPIRED' ||
            code === 'INVALID_TOKEN' ||
            (status === 401 && message === 'Токен доступа отсутствует');

        // Не разлогиниваем при отказе в правах (например, не-админ на /admin/*)
        const isPermissionDenied = status === 403 && !isTokenProblem;

        if ((status === 401 || status === 403) && isTokenProblem && !isPermissionDenied) {
            if (!isHandlingAuthError) {
                isHandlingAuthError = true;
                localStorage.removeItem('token');
                delete api.defaults.headers.common['Authorization'];
                if (window.location.pathname !== '/login') {
                    window.location.replace('/login');
                } else {
                    // Уже на странице входа — просто сбросим флаг позже
                    setTimeout(() => {
                        isHandlingAuthError = false;
                    }, 1000);
                }
            }
        } else if (status === 401 || status === 403) {
            console.warn('Authorization error:', message || code);
        }

        return Promise.reject(error);
    }
);

export default api;
