/**
 * Сервис данных датчиков
 */
import api from './api';
import config from '../config/api';

const sensorService = {
    /**
     * Получить все текущие данные датчиков (новый endpoint)
     */
    getAllCurrent: async (deviceId) => {
        try {
            const response = await api.get(config.endpoints.sensors.all, {
                params: { device_id: deviceId },
            });
            return response.data;
        } catch (error) {
            // Fallback: запрашиваем по отдельности
            const [humidity, light, temperature, water, switches] = await Promise.all([
                sensorService.getHumidity(deviceId),
                sensorService.getLightLevel(deviceId),
                sensorService.getTemperature(deviceId),
                sensorService.getWaterLevel(deviceId),
                sensorService.getLightSwitches(deviceId),
            ]);
            return {
                humidity: humidity.humidity,
                light: light.light,
                temperature: temperature.temperature,
                water: water.water,
                lightSwitches: switches.count,
            };
        }
    },

    /**
     * Получить статус устройства (в сети / не в сети)
     */
    getDeviceStatus: async (deviceId) => {
        const response = await api.get(config.endpoints.sensors.status, {
            params: { device_id: deviceId },
        });
        return response.data;
    },

    /**
     * Получить текущую влажность
     */
    getHumidity: async (deviceId) => {
        const response = await api.get(config.endpoints.legacy.humidity, {
            params: { device_id: deviceId },
        });
        return response.data;
    },

    /**
     * Получить текущий уровень освещенности
     */
    getLightLevel: async (deviceId) => {
        const response = await api.get(config.endpoints.legacy.lightlevel, {
            params: { device_id: deviceId },
        });
        return response.data;
    },

    /**
     * Получить текущую температуру
     */
    getTemperature: async (deviceId) => {
        const response = await api.get(config.endpoints.legacy.temperature, {
            params: { device_id: deviceId },
        });
        return response.data;
    },

    /**
     * Получить уровень воды
     */
    getWaterLevel: async (deviceId) => {
        const response = await api.get(config.endpoints.legacy.waterlevel, {
            params: { device_id: deviceId },
        });
        return response.data;
    },

    /**
     * Получить счетчик включений света
     */
    getLightSwitches: async (deviceId) => {
        const response = await api.get(config.endpoints.legacy.lightswitches, {
            params: { device_id: deviceId },
        });
        return response.data;
    },

    /**
     * Получить всю историю данных (новый endpoint)
     */
    getAllHistory: async (deviceId, start, end, limit = 100) => {
        try {
            const response = await api.get(config.endpoints.data.all, {
                params: {
                    device_id: deviceId,
                    start: start?.toISOString(),
                    end: end?.toISOString(),
                    limit,
                },
            });
            return response.data;
        } catch (error) {
            // Fallback: запрашиваем по отдельности
            const [humidity, light, temperature] = await Promise.all([
                sensorService.getHumidityHistory(deviceId, start, end, limit),
                sensorService.getLightHistory(deviceId, start, end, limit),
                sensorService.getTemperatureHistory(deviceId, start, end, limit),
            ]);
            return { humidity, light, temperature };
        }
    },

    /**
     * Получить историю влажности
     */
    getHumidityHistory: async (deviceId, start, end, limit = 100) => {
        const response = await api.get(config.endpoints.legacy.dataHumidity, {
            params: {
                device_id: deviceId,
                start: start?.toISOString(),
                end: end?.toISOString(),
                limit,
            },
        });
        return response.data;
    },

    /**
     * Получить историю освещенности
     */
    getLightHistory: async (deviceId, start, end, limit = 100) => {
        const response = await api.get(config.endpoints.legacy.dataLight, {
            params: {
                device_id: deviceId,
                start: start?.toISOString(),
                end: end?.toISOString(),
                limit,
            },
        });
        return response.data;
    },

    /**
     * Получить историю температуры
     */
    getTemperatureHistory: async (deviceId, start, end, limit = 100) => {
        const response = await api.get(config.endpoints.legacy.dataTemperature, {
            params: {
                device_id: deviceId,
                start: start?.toISOString(),
                end: end?.toISOString(),
                limit,
            },
        });
        return response.data;
    },

    /**
     * Получить режимы управления
     */
    getControlModes: async (deviceId) => {
        const response = await api.get(config.endpoints.control.modes, {
            params: { device_id: deviceId },
        });
        return response.data;
    },

    /**
     * Установить режим освещения
     */
    setLightMode: async (deviceId, mode) => {
        const response = await api.post(
            config.endpoints.control.light,
            { mode },
            { params: { device_id: deviceId } }
        );
        return response.data;
    },

    /**
     * Установить режим аэрации
     */
    setAerationMode: async (deviceId, mode) => {
        const response = await api.post(
            config.endpoints.control.aeration,
            { mode },
            { params: { device_id: deviceId } }
        );
        return response.data;
    },
};

export default sensorService;
