/**
 * Контроллер для управления уведомлениями
 */
const { pool } = require('../config/database');
const crypto = require('crypto');

/**
 * Получить настройки уведомлений и пороги пользователя
 */
const getSettings = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Получаем настройки
        const settingsResult = await pool.query(
            'SELECT email_enabled, notification_interval FROM notification_settings WHERE user_id = $1',
            [userId]
        );

        // Если настроек нет (новый пользователь), создаем дефолтные
        let settings = settingsResult.rows[0];
        if (!settings) {
            await pool.query('INSERT INTO notification_settings (user_id) VALUES ($1)', [userId]);
            const retry = await pool.query(
                'SELECT email_enabled, notification_interval FROM notification_settings WHERE user_id = $1',
                [userId]
            );
            settings = retry.rows[0];
        }

        // Получаем пороги
        const thresholdsResult = await pool.query(
            'SELECT sensor_type, min_value, max_value, is_active FROM user_thresholds WHERE user_id = $1',
            [userId]
        );

        res.json({
            settings,
            thresholds: thresholdsResult.rows
        });
    } catch (err) {
        console.error('Ошибка получения настроек уведомлений:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

/**
 * Обновить общие настройки (Email, интервал)
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
 * Обновить или создать пороги датчиков
 */
const updateThresholds = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { thresholds } = req.body; // Ожидаем массив [{sensor_type, min_value, max_value, is_active}]

        for (const t of thresholds) {
            await pool.query(
                `INSERT INTO user_thresholds (user_id, sensor_type, min_value, max_value, is_active)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id, sensor_type) 
                 DO UPDATE SET min_value = $3, max_value = $4, is_active = $5`,
                [userId, t.sensor_type, t.min_value, t.max_value, t.is_active]
            );
        }

        res.json({ message: 'Пороги датчиков обновлены' });
    } catch (err) {
        console.error('Ошибка обновления порогов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

/**
 * Отправить тестовое письмо текущему пользователю
 */
const testEmail = async (req, res) => {
    try {
        const userId = req.user.user_id;
        
        // Получаем email пользователя
        const userResult = await pool.query('SELECT email FROM users WHERE user_id = $1', [userId]);
        const email = userResult.rows[0]?.email;

        if (!email) {
            return res.status(400).json({ error: 'У вас не указан Email в профиле' });
        }

        const emailService = require('../services/email.service');
        const result = await emailService.sendTestEmail(email);

        if (result.ok) {
            res.json({ message: `Тестовое письмо успешно отправлено на ${email}` });
        } else {
            res.status(500).json({ error: `Ошибка SMTP: ${result.error}` });
        }
    } catch (err) {
        console.error('Ошибка отправки тестового email:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = {
    getSettings,
    updateSettings,
    updateThresholds,
    testEmail
};
