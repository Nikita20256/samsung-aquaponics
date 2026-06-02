/**
 * Сервис авторизации
 */
import api from './api';
import config from '../config/api';

const authService = {
    /**
     * Авторизация пользователя
     */
    login: async (login, password) => {
        // Пробуем новый endpoint, fallback на старый
        try {
            const response = await api.post(config.endpoints.login, { login, password });
            return response.data;
        } catch (error) {
            // Fallback на старый endpoint
            const response = await api.post('/login', { login, password });
            return response.data;
        }
    },

    /**
     * Регистрация пользователя
     */
    register: async (login, password, deviceSecret, email = null) => {
        try {
            const response = await api.post(config.endpoints.register, {
                login,
                password,
                device_secret: deviceSecret,
                email,
            });
            return response.data;
        } catch (error) {
            // Fallback на старый endpoint
            const response = await api.post('/register', {
                login,
                password,
                device_secret: deviceSecret,
                email,
            });
            return response.data;
        }
    },

    /**
     * Получить device_id текущего пользователя
     */
    getDevice: async () => {
        try {
            const response = await api.get(config.endpoints.device);
            return response.data;
        } catch (error) {
            // Fallback на старый endpoint
            const response = await api.get(config.endpoints.legacy.userDevice);
            return response.data;
        }
    },

    /**
     * Сохранить токен в localStorage
     */
    setToken: (token) => {
        localStorage.setItem('token', token);
    },

    /**
     * Получить токен из localStorage
     */
    getToken: () => {
        return localStorage.getItem('token');
    },

    /**
     * Удалить токен (logout)
     */
    removeToken: () => {
        localStorage.removeItem('token');
    },

    /**
     * Проверить, авторизован ли пользователь
     */
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },
};

export default authService;
