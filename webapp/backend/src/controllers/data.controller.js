/**
 * Контроллер исторических данных датчиков
 */
const { pool } = require('../config/database');

/**
 * Вспомогательная функция для получения исторических данных
 */
const getHistoricalData = async (tableName, deviceId, start, end, limit) => {
    const startDate = start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    const queryLimit = parseInt(limit, 10) || 100;

    const result = await pool.query(
        `SELECT value, timestamp AT TIME ZONE 'UTC' as timestamp 
     FROM ${tableName} 
     WHERE device_id = $1 AND timestamp BETWEEN $2::timestamptz AND $3::timestamptz 
     ORDER BY timestamp ASC LIMIT $4`,
        [deviceId, startDate.toISOString(), endDate.toISOString(), queryLimit]
    );

    return result.rows.map(row => ({
        value: row.value,
        timestamp: row.timestamp.toISOString(),
    }));
};

/**
 * Получить историю влажности
 * GET /api/data/humidity
 */
const getHumidityHistory = async (req, res, next) => {
    try {
        const { start, end, limit } = req.query;
        const data = await getHistoricalData('humidity', req.deviceId, start, end, limit);
        res.json(data);
    } catch (err) {
        next(err);
    }
};

/**
 * Получить историю освещенности
 * GET /api/data/light
 */
const getLightHistory = async (req, res, next) => {
    try {
        const { start, end, limit } = req.query;
        const data = await getHistoricalData('light', req.deviceId, start, end, limit);
        res.json(data);
    } catch (err) {
        next(err);
    }
};

/**
 * Получить историю температуры
 * GET /api/data/temperature
 */
const getTemperatureHistory = async (req, res, next) => {
    try {
        const { start, end, limit } = req.query;
        const data = await getHistoricalData('temperature', req.deviceId, start, end, limit);
        res.json(data);
    } catch (err) {
        next(err);
    }
};

/**
 * Получить всю историю (все датчики)
 * GET /api/data/all
 */
const getAllHistory = async (req, res, next) => {
    try {
        const { start, end, limit } = req.query;

        const [humidity, light, temperature] = await Promise.all([
            getHistoricalData('humidity', req.deviceId, start, end, limit),
            getHistoricalData('light', req.deviceId, start, end, limit),
            getHistoricalData('temperature', req.deviceId, start, end, limit),
        ]);

        res.json({ humidity, light, temperature });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getHumidityHistory,
    getLightHistory,
    getTemperatureHistory,
    getAllHistory,
};
