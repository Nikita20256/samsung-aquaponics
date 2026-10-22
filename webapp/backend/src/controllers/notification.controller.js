/**
 * Контроллер для управления уведомлениями
 */
const { pool } = require('../config/database');
const crypto = require('crypto');

// Проверка, что устройство привязано к пользователю
const ownsDevice = async (userId, deviceId) => {
    const r = await pool.query(
        'SELECT 1 FROM user_devices WHERE user_id = $1 AND device_id = $2',
        [userId, deviceId]
    );
    return r.rows.length > 0;
};

// Идемпотентно создаём дефолтные пороги для конкретного устройства
const seedThresholds = async (userId, deviceId) => {
    await pool.query(
        `INSERT INTO user_thresholds (user_id, device_id, sensor_type, min_value, max_value, is_active)
         SELECT $1::bigint, $2::text, t.sensor_type, t.min_val, t.max_val, TRUE
         FROM (
             VALUES
                 ('temperature', 15.0, 35.0),
                 ('humidity',    30.0, 90.0),
                 ('light',        0.0, 10000.0)
         ) AS t(sensor_type, min_val, max_val)
         ON CONFLICT (user_id, device_id, sensor_type) DO NOTHING`,
        [userId, deviceId]
    );
};

/**
 * Получить настройки уведомлений и пороги для устройства
 * GET /api/notifications/settings?device_id=...
 */
const getSettings = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Общие настройки (канал)
        let settingsResult = await pool.query(
            'SELECT email_enabled, notification_interval FROM notification_settings WHERE user_id = $1',
            [userId]
        );
        if (settingsResult.rows.length === 0) {
            await pool.query('INSERT INTO notification_settings (user_id) VALUES ($1)', [userId]);
            const retry = await pool.query(
                'SELECT email_enabled, notification_interval FROM notification_settings WHERE user_id = $1',
                [userId]
            );
            settingsResult = retry;
        }
        const settings = settingsResult.rows[0];

        // Список устройств пользователя
        const devicesResult = await pool.query(
            `SELECT d.device_id, ud.notifications_enabled
             FROM devices d
             INNER JOIN user_devices ud ON d.device_id = ud.device_id
             WHERE ud.user_id = $1
             ORDER BY d.device_id`,
            [userId]
        );
        const devices = devicesResult.rows;

        // Выбранное устройство: из query или первое доступное
        let deviceId = req.query.device_id || (devices[0] && devices[0].device_id) || null;

        if (deviceId && !devices.some((d) => d.device_id === deviceId)) {
            return res.status(403).json({ error: 'Устройство не привязано к пользователю' });
        }

        let thresholds = [];
        let device = null;
        if (deviceId) {
            device = devices.find((d) => d.device_id === deviceId) || null;
            await seedThresholds(userId, deviceId);
            const thresholdsResult = await pool.query(
                `SELECT sensor_type, min_value, max_value, is_active
                 FROM user_thresholds
                 WHERE user_id = $1 AND device_id = $2`,
                [userId, deviceId]
            );
            thresholds = thresholdsResult.rows;
        }

        res.json({
            settings,
            device_id: deviceId,
            device,
            devices,
            thresholds,
        });
    } catch (err) {
        console.error('Ошибка получения настроек уведомлений:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

/**
 * Обновить общие настройки (Email, интервал) — общие для аккаунта
 */
const updateSettings = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { email_enabled, notification_interval } = req.body;
        await pool.query(
            `UPDATE notification_settings 
             SET email_enabled = $1, notification_interval = $2 
             WHERE user_id = $3`,
            [email_enabled, notification_interval, userId]
        );

        res.json({ message: 'Настройки обновлены' });
    } catch (err) {
        console.error('Ошибка обновления настроек уведомлений:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

/**
 * Обновить устройство: вкл/выкл уведомлений и пороги датчиков
 * body: { device_id, notifications_enabled?, thresholds?: [{sensor_type, min_value, max_value, is_active}] }
 */
const updateDevice = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { device_id, notifications_enabled, thresholds } = req.body;

        if (!device_id) {
            return res.status(400).json({ error: 'Не указано устройство' });
        }
        if (!(await ownsDevice(userId, device_id))) {
            return res.status(403).json({ error: 'Устройство не привязано к пользователю' });
        }

        if (typeof notifications_enabled === 'boolean') {
            await pool.query(
                'UPDATE user_devices SET notifications_enabled = $1 WHERE user_id = $2 AND device_id = $3',
                [notifications_enabled, userId, device_id]
            );
        }

        if (Array.isArray(thresholds)) {
            for (const t of thresholds) {
                await pool.query(
                    `INSERT INTO user_thresholds (user_id, device_id, sensor_type, min_value, max_value, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (user_id, device_id, sensor_type) 
                     DO UPDATE SET min_value = $4, max_value = $5, is_active = $6`,
                    [userId, device_id, t.sensor_type, t.min_value, t.max_value, t.is_active]
                );
            }
        }

        res.json({ message: 'Настройки устройства обновлены' });
    } catch (err) {
        console.error('Ошибка обновления настроек устройства:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

/**
 * Обновить или создать пороги датчиков (совместимость)
 * body: { device_id, thresholds }
 */
const updateThresholds = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { device_id, thresholds } = req.body; // [{sensor_type, min_value, max_value, is_active}]

        if (!device_id) {
            return res.status(400).json({ error: 'Не указано устройство' });
        }
        if (!(await ownsDevice(userId, device_id))) {
            return res.status(403).json({ error: 'Устройство не привязано к пользователю' });
        }

        for (const t of thresholds) {
            await pool.query(
                `INSERT INTO user_thresholds (user_id, device_id, sensor_type, min_value, max_value, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (user_id, device_id, sensor_type) 
                 DO UPDATE SET min_value = $4, max_value = $5, is_active = $6`,
                [userId, device_id, t.sensor_type, t.min_value, t.max_value, t.is_active]
            );
        }

        res.json({ message: 'Пороги датчиков обновлены' });
    } catch (err) {
        console.error('Ошибка обновления порогов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

/**
 * Отправить тестовое письмо на почту пользователя
 */
const testEmail = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const userResult = await pool.query(
            'SELECT email, email_verified, timezone FROM users WHERE user_id = $1',
            [userId]
        );
        const user = userResult.rows[0];

        if (!user || !user.email) {
            return res.status(400).json({ error: 'Сначала укажите почту в профиле' });
        }
        if (!user.email_verified) {
            return res.status(400).json({ error: 'Почта не подтверждена. Подтвердите её в профиле.' });
        }

        const emailService = require('../services/email.service');
        const result = await emailService.sendTestEmail(user.email, user.timezone || null);

        if (result && result.ok === false) {
            return res.status(502).json({ error: result.error || 'Ошибка отправки письма' });
        }

        res.json({ message: 'Тестовое письмо отправлено. Проверьте почту.' });
    } catch (err) {
        console.error('Ошибка отправки тестового email:', err);
        res.status(500).json({ error: 'Ошибка отправки письма' });
    }
};

module.exports = {
    getSettings,
    updateSettings,
    updateDevice,
    updateThresholds,
    testEmail
};
