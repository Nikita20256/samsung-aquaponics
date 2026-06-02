/**
 * Сервис буферизации данных датчиков
 * Собирает данные за час и сохраняет усредненные значения
 */
const { pool } = require('../config/database');

const hourlyBuffer = new Map();

const addToBuffer = (deviceId, sensorType, value) => {
    if (!hourlyBuffer.has(deviceId)) {
        hourlyBuffer.set(deviceId, { humidity: [], light: [], temperature: [] });
    }
    const deviceBuffer = hourlyBuffer.get(deviceId);
    if (deviceBuffer[sensorType]) {
        deviceBuffer[sensorType].push(value);
    }
};

const saveHourlyData = async () => {
    for (const [deviceId, sensorData] of hourlyBuffer.entries()) {
        for (const sensorType of ['humidity', 'light', 'temperature']) {
            const values = sensorData[sensorType];
            if (values.length > 0) {
                const average = values.reduce((sum, val) => sum + val, 0) / values.length;
                const roundedAverage = Math.round(average * 100) / 100;

                try {
                    const result = await pool.query(
                        `INSERT INTO ${sensorType} (device_id, value, timestamp) 
             VALUES ($1, $2, date_trunc('hour', NOW() AT TIME ZONE 'UTC')) 
             RETURNING timestamp`,
                        [deviceId, roundedAverage]
                    );
                    const timestamp = result.rows[0].timestamp;
                    console.log(`Сохранено часовое значение ${sensorType} для ${deviceId}: ${roundedAverage} (${values.length} образцов) в ${timestamp.toISOString()}`);
                } catch (err) {
                    console.error(`Ошибка при сохранении часового значения ${sensorType} для ${deviceId}: ${err.message}`);
                }
            }
        }
    }

    hourlyBuffer.clear();
};

const scheduleHourlySave = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);

    const timeToNextHour = nextHour.getTime() - now.getTime();

    setTimeout(() => {
        saveHourlyData();
        setInterval(saveHourlyData, 60 * 60 * 1000);
    }, timeToNextHour);

    console.log(`Следующее часовое сохранение запланировано на ${nextHour.toLocaleString()}`);
};

module.exports = {
    addToBuffer,
    saveHourlyData,
    scheduleHourlySave,
    hourlyBuffer,
};
