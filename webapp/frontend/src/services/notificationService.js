/**
 * Сервис для управления уведомлениями
 */
import api from './api';

const notificationService = {
    /**
     * Получить список устройств пользователя
     */
    getDevices: async () => {
        const response = await api.get('/user/devices');
        return response.data;
    },

    /**
     * Получить настройки и пороги для устройства
     */
    getSettings: async (deviceId) => {
        const response = await api.get('/notifications/settings', {
            params: deviceId ? { device_id: deviceId } : {},
        });
        return response.data;
    },

    /**
     * Сохранить общие настройки (почта, интервал)
     */
    updateSettings: async (settings) => {
        const response = await api.post('/notifications/settings', settings);
        return response.data;
    },

    /**
     * Сохранить устройство: вкл/выкл уведомлений и пороги
     */
    updateDevice: async (deviceId, { notifications_enabled, thresholds }) => {
        const response = await api.post('/notifications/device', {
            device_id: deviceId,
            notifications_enabled,
            thresholds,
        });
        return response.data;
    },

    /**
     * Сохранить пороги датчиков устройства
     */
    updateThresholds: async (deviceId, thresholds) => {
        const response = await api.post('/notifications/thresholds', { device_id: deviceId, thresholds });
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
