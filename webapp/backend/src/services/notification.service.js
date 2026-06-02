/**
 * Ядро системы уведомлений: проверка порогов и отправка оповещений
 */
const { pool } = require('../config/database');
const emailService = require('./email.service');

/**
 * Проверка значения датчика на выход за границы
 * @param {string} deviceId - ID устройства
 * @param {string} sensorType - Тип датчика (temperature, humidity, light)
 * @param {number} value - Текущее значение
 */
const checkThresholds = async (deviceId, sensorType, value) => {
    try {
        // Находим всех пользователей, у которых привязано это устройство
        const usersResult = await pool.query(`
            SELECT 
                u.user_id, 
                u.email,
                ns.email_enabled,
                ns.notification_interval,
                ut.min_value, 
                ut.max_value,
                ut.is_active,
                nl.last_sent_at
            FROM user_devices ud
            JOIN users u ON ud.user_id = u.user_id
            JOIN notification_settings ns ON u.user_id = ns.user_id
            JOIN user_thresholds ut ON (u.user_id = ut.user_id AND ut.sensor_type = $2)
            LEFT JOIN notification_log nl ON (u.user_id = nl.user_id AND nl.device_id = $1 AND nl.sensor_type = $2)
            WHERE ud.device_id = $1
        `, [deviceId, sensorType]);

        for (const user of usersResult.rows) {
            if (!user.is_active) continue;

            const isOutOfBounds = value < user.min_value || value > user.max_value;

            if (isOutOfBounds) {
                // Проверка интервала (анти-спам)
                const now = new Date();
                const lastSent = user.last_sent_at ? new Date(user.last_sent_at) : null;
                const minutesSinceLast = lastSent ? (now - lastSent) / (1000 * 60) : Infinity;

                if (minutesSinceLast >= user.notification_interval) {
                    const alertData = {
                        deviceId,
                        sensorType,
                        value,
                        minValue: user.min_value,
                        maxValue: user.max_value
                    };

                    // Отправка Email
                    if (user.email_enabled && user.email) {
                        await emailService.sendThresholdAlert(user.email, alertData);
                    }


                    // Обновляем лог уведомлений
                    await pool.query(`
                        INSERT INTO notification_log (user_id, device_id, sensor_type, last_sent_at)
                        VALUES ($1, $2, $3, NOW())
                        ON CONFLICT (user_id, device_id, sensor_type) 
                        DO UPDATE SET last_sent_at = NOW()
                    `, [user.user_id, deviceId, sensorType]);
                }
            } else if (user.last_sent_at) {
                // Если значение вернулось в норму — сбрасываем лог, 
                // чтобы при следующем выходе за границы уведомление пришло сразу
                await pool.query(`
                    DELETE FROM notification_log 
                    WHERE user_id = $1 AND device_id = $2 AND sensor_type = $3
                `, [user.user_id, deviceId, sensorType]);
            }
        }
    } catch (err) {
        console.error('Ошибка в Notification Service:', err);
    }
};

module.exports = { checkThresholds };
