/**
 * Контроллер текущих данных датчиков
 */
const mqttService = require('../services/mqtt.service');
const { pool } = require('../config/database');

/**
 * Получить текущую влажность
 * GET /api/sensors/humidity
 */
const getHumidity = (req, res) => {
    const data = mqttService.getLatestData(req.deviceId);
    if (!data) {
        return res.status(404).json({ error: 'Устройство не найдено' });
    }
    res.json({ humidity: data.humidity });
};

/**
 * Получить текущий уровень освещенности
 * GET /api/sensors/light
 */
const getLightLevel = (req, res) => {
    const data = mqttService.getLatestData(req.deviceId);
    if (!data) {
        return res.status(404).json({ error: 'Устройство не найдено' });
    }
    res.json({ light: data.light });
};

/**
 * Получить текущую температуру
 * GET /api/sensors/temperature
 */
const getTemperature = (req, res) => {
    const data = mqttService.getLatestData(req.deviceId);
    if (!data) {
        return res.status(404).json({ error: 'Устройство не найдено' });
    }
    res.json({ temperature: data.temperature });
};

/**
 * Получить уровень воды
 * GET /api/sensors/water
 */
const getWaterLevel = (req, res) => {
    const data = mqttService.getLatestData(req.deviceId);
    if (!data) {
        return res.status(404).json({ error: 'Устройство не найдено' });
    }
    res.json({ water: data.water || 0 });
};

/**
 * Получить счетчик включений света за сегодня
 * GET /api/sensors/lightswitches
 */
const getLightSwitches = async (req, res, next) => {
    try {
        // Удаляем старые записи
        await pool.query(
            'DELETE FROM light_switches WHERE device_id = $1 AND date != CURRENT_DATE',
            [req.deviceId]
        );

        const result = await pool.query(
            'SELECT count FROM light_switches WHERE device_id = $1 AND date = CURRENT_DATE',
            [req.deviceId]
        );

        res.json({ count: result.rows.length > 0 ? result.rows[0].count : 0 });
    } catch (err) {
        next(err);
    }
};

/**
 * Получить все текущие данные датчиков
 * GET /api/sensors/all
 */
const getAllSensors = async (req, res, next) => {
    try {
        const data = mqttService.getLatestData(req.deviceId);

        // Получаем счетчик включений
        const switchesResult = await pool.query(
            'SELECT count FROM light_switches WHERE device_id = $1 AND date = CURRENT_DATE',
            [req.deviceId]
        );

        res.json({
            humidity: data?.humidity ?? null,
            light: data?.light ?? null,
            temperature: data?.temperature ?? null,
            water: data?.water ?? 0,
            lightSwitches: switchesResult.rows.length > 0 ? switchesResult.rows[0].count : 0,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getHumidity,
    getLightLevel,
    getTemperature,
    getWaterLevel,
    getLightSwitches,
    getAllSensors,
};
