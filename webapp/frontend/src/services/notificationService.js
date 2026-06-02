/**
 * Сервис для управления уведомлениями
 */
import api from './api';

const notificationService = {
    /**
     * Получить настройки и пороги
     */
    getSettings: async () => {
        const response = await api.get('/notifications/settings');
        return response.data;
    },

    /**
     * Сохранить общие настройки
     */
    updateSettings: async (settings) => {
        const response = await api.post('/notifications/settings', settings);
        return response.data;
    },

    /**
     * Сохранить пороги датчиков
     */
    updateThresholds: async (thresholds) => {
        const response = await api.post('/notifications/thresholds', { thresholds });
        return response.data;
    },

    /**
     * Отправить тестовое письмо
     */
    testEmail: async () => {
        const response = await api.post('/notifications/test-email');
        return response.data;
    }
};

export default notificationService;
