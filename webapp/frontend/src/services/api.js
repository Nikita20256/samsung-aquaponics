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

// Response interceptor - обработка ошибок
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Если токен истек или недействителен
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Можно добавить логику автоматического logout
            console.warn('Authorization error:', error.response?.data?.error);
        }
        return Promise.reject(error);
    }
);

export default api;
