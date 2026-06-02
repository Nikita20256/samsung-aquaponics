const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

/**
 * Получить все устройства пользователя
 * GET /api/user/devices
 */
const getDevices = async (req, res, next) => {
    const userId = req.user.user_id;

    try {
        const result = await pool.query(
            'SELECT d.device_id FROM devices d INNER JOIN user_devices ud ON d.device_id = ud.device_id WHERE ud.user_id = $1 ORDER BY d.device_id',
            [userId]
        );

        const devices = result.rows;
        const current = devices.length > 0 ? devices[0].device_id : null;

        res.json({ devices, current });
    } catch (err) {
        next(err);
    }
};

/**
 * Привязать устройство к пользователю
 * POST /api/user/devices
 */
const addDevice = async (req, res, next) => {
    const { device_id, device_secret } = req.body;
    const userId = req.user.user_id;

    if (!device_id || !device_secret) {
        return res.status(400).json({ error: 'Требуются ID устройства и секретный код' });
    }

    try {
        // Проверяем существование устройства
        const deviceResult = await pool.query(
            'SELECT device_id, device_secret FROM devices WHERE device_id = $1',
            [device_id]
        );

        if (deviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Устройство не найдено' });
        }

        const device = deviceResult.rows[0];

        // Проверяем секретный код
        const secretMatch = await bcrypt.compare(device_secret, device.device_secret);
        if (!secretMatch) {
            return res.status(401).json({ error: 'Неверный секретный код устройства' });
        }

        // Проверяем, не привязано ли уже
        const existing = await pool.query(
            'SELECT 1 FROM user_devices WHERE user_id = $1 AND device_id = $2',
            [userId, device_id]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Устройство уже привязано к вашему аккаунту' });
        }

        // Привязываем устройство к пользователю
        await pool.query(
            'INSERT INTO user_devices (user_id, device_id) VALUES ($1, $2)',
            [userId, device_id]
        );

        res.status(201).json({ message: 'Устройство успешно добавлено', device_id });
    } catch (err) {
        next(err);
    }
};

/**
 * Обновление профиля (почта)
 * PUT /api/user/profile
 */
const updateProfile = async (req, res, next) => {
    const { email } = req.body;
    const userId = req.user.user_id;

    try {
        // Если email передан, проверяем уникальность
        if (email) {
            const existingEmail = await pool.query(
                'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
                [email, userId]
            );

            if (existingEmail.rows.length > 0) {
                return res.status(400).json({ error: 'Email уже занят другим пользователем' });
            }
        }

        // Обновляем email (или сбрасываем в NULL если пустая строка)
        const newEmail = email ? email : null;

        await pool.query(
            'UPDATE users SET email = $1 WHERE user_id = $2',
            [newEmail, userId]
        );

        res.json({ message: 'Профиль обновлен', email: newEmail });
    } catch (err) {
        next(err);
    }
};

/**
 * Смена пароля
 * PUT /api/user/password
 */
const changePassword = async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.user_id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Требуются текущий и новый пароль' });
    }

    if (newPassword.length < 3) {
        return res.status(400).json({ error: 'Новый пароль должен содержать не менее 3 символов' });
    }

    try {
        // Получаем текущий хэш пароля
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE user_id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const user = userResult.rows[0];

        // Проверяем старый пароль
        const match = await bcrypt.compare(currentPassword, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Неверный текущий пароль' });
        }

        // Хэшируем новый пароль
        const newHash = await bcrypt.hash(newPassword, 10);

        // Обновляем в БД
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE user_id = $2',
            [newHash, userId]
        );

        res.json({ message: 'Пароль успешно изменен' });
    } catch (err) {
        next(err);
    }
};

/**
 * Получение профиля (текущий email)
 * GET /api/user/profile
 */
const getProfile = async (req, res, next) => {
    const userId = req.user.user_id;

    try {
        const result = await pool.query(
            'SELECT email, login FROM users WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    updateProfile,
    changePassword,
    getProfile,
    getDevices,
    addDevice
};
