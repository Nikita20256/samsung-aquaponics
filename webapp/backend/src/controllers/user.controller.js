const bcrypt = require('bcrypt');
const config = require('../config');
const { pool } = require('../config/database');

/**
 * Получить все устройства пользователя
 * GET /api/user/devices
 */
const getDevices = async (req, res, next) => {
    const userId = req.user.user_id;

    try {
        const result = await pool.query(
            'SELECT d.device_id, ud.notifications_enabled FROM devices d INNER JOIN user_devices ud ON d.device_id = ud.device_id WHERE ud.user_id = $1 ORDER BY d.device_id',
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
 * Прямая смена email теперь запрещена — требуется подтверждение кодом.
 * Возможные операции:
 *  - email пустой/удалён -> отвязать почту
 *  - email === текущий -> ничего не делать
 *  - любой другой email -> 400 с инструкцией (используйте /api/user/email/request)
 */
const updateProfile = async (req, res, next) => {
    const { email } = req.body;
    const userId = req.user.user_id;

    const normalized = (email === undefined || email === null)
        ? null
        : (String(email).trim() || null);

    try {
        const current = await pool.query(
            'SELECT email FROM users WHERE user_id = $1',
            [userId]
        );
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const currentEmail = current.rows[0].email;

        // Отвязать почту
        if (normalized === null) {
            await pool.query(
                'UPDATE users SET email = NULL, email_verified = FALSE WHERE user_id = $1',
                [userId]
            );
            return res.json({ message: 'Email удалён', email: null, emailVerified: false });
        }

        // Уже привязан
        if (normalized === currentEmail) {
            return res.json({ message: 'Этот email уже привязан к аккаунту', email: currentEmail });
        }

        // Любая установка/смена email — через подтверждение кодом
        return res.status(400).json({
            error: 'Смена email требует подтверждения: сначала отправьте код (POST /api/user/email/request), затем подтвердите (POST /api/user/email/confirm)',
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Шаг 1 смены почты: отправить код на новый адрес
 * POST /api/user/email/request
 */
const requestEmailChange = async (req, res, next) => {
    const { newEmail } = req.body;
    const userId = req.user.user_id;

    const email = newEmail ? String(newEmail).trim() : null;
    if (!email) {
        return res.status(400).json({ error: 'Требуется новый Email' });
    }
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
        return res.status(400).json({ error: 'Неверный формат Email' });
    }

    try {
        // Уже привязан к текущему аккаунту
        const current = await pool.query(
            'SELECT email FROM users WHERE user_id = $1',
            [userId]
        );
        if (current.rows[0]?.email === email) {
            return res.status(400).json({ error: 'Этот email уже привязан к вашему аккаунту' });
        }

        // Занят другим
        const taken = await pool.query(
            'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
            [email, userId]
        );
        if (taken.rows.length > 0) {
            return res.status(400).json({ error: 'Этот email уже используется другим пользователем' });
        }

        const emailService = require('../services/email.service');
        if (!emailService.isReady()) {
            return res.status(503).json({ error: 'Почтовый сервис не настроен' });
        }

        const codeService = require('../services/code.service');
        const created = await codeService.createCode(userId, 'change_email', email);
        if (!created.ok) {
            return res.status(429).json({ error: created.error });
        }

        const sent = await emailService.sendEmailChangeCode(email, created.code);
        if (!sent.ok) {
            return res.status(500).json({ error: 'Не удалось отправить письмо на новый адрес' });
        }

        res.json({
            message: `Код отправлен на ${email}. Введите его для подтверждения.`,
            resendAfter: Math.ceil(config.email.codeCooldownMs / 1000),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Шаг 2 смены почты: подтвердить кодом и привязать новый адрес
 * POST /api/user/email/confirm
 */
const confirmEmailChange = async (req, res, next) => {
    const { newEmail, code } = req.body;
    const userId = req.user.user_id;

    const email = newEmail ? String(newEmail).trim() : null;
    if (!email || !code) {
        return res.status(400).json({ error: 'Требуются новый Email и код подтверждения' });
    }

    try {
        const codeService = require('../services/code.service');
        const result = await codeService.verifyCode(userId, 'change_email', code, email);
        if (!result.ok) {
            return res.status(400).json({ error: result.error });
        }

        await pool.query(
            'UPDATE users SET email = $1, email_verified = TRUE WHERE user_id = $2',
            [email, userId]
        );

        res.json({ message: 'Email успешно изменён и подтверждён', email, emailVerified: true });
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
 * Шаг 1 смены пароля: отправить код на почту
 * POST /api/user/password/request
 * Требует привязанную и подтверждённую почту.
 */
const requestPasswordChange = async (req, res, next) => {
    const userId = req.user.user_id;

    try {
        const userResult = await pool.query(
            'SELECT email, email_verified FROM users WHERE user_id = $1',
            [userId]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const user = userResult.rows[0];
        if (!user.email || !user.email_verified) {
            return res.status(400).json({
                error: 'Для смены пароля по коду привяжите и подтвердите email в профиле',
            });
        }

        const emailService = require('../services/email.service');
        const codeService = require('../services/code.service');

        const created = await codeService.createCode(userId, 'change_password', user.email);
        if (!created.ok) {
            return res.status(429).json({ error: created.error });
        }

        const sent = await emailService.sendPasswordChangeCode(user.email, created.code);
        if (!sent.ok) {
            return res.status(500).json({ error: 'Не удалось отправить письмо' });
        }

        res.json({
            message: `Код отправлен на ${user.email}. Введите его для смены пароля.`,
            resendAfter: Math.ceil(config.email.codeCooldownMs / 1000),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Шаг 2 смены пароля: подтвердить кодом и обновить пароль
 * POST /api/user/password/confirm
 */
const confirmPasswordChange = async (req, res, next) => {
    const { code, newPassword } = req.body;
    const userId = req.user.user_id;

    if (!code || !newPassword) {
        return res.status(400).json({ error: 'Требуются код подтверждения и новый пароль' });
    }
    if (newPassword.length < 3) {
        return res.status(400).json({ error: 'Пароль должен содержать не менее 3 символов' });
    }

    try {
        const userResult = await pool.query(
            'SELECT email FROM users WHERE user_id = $1',
            [userId]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const email = userResult.rows[0].email;
        if (!email) {
            return res.status(400).json({ error: 'У аккаунта не привязана почта' });
        }

        const codeService = require('../services/code.service');
        const result = await codeService.verifyCode(userId, 'change_password', code, email);
        if (!result.ok) {
            return res.status(400).json({ error: result.error });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE user_id = $2',
            [newHash, userId]
        );

        res.json({ message: 'Пароль успешно изменён' });
    } catch (err) {
        next(err);
    }
};

/**
 * Ручная установка часового пояса в профиле
 * PUT /api/user/profile/timezone
 * body: { timezone: 'Europe/Moscow' } — ручной выбор (не перезапишется при входе)
 *       { timezone: 'Europe/Moscow', auto: true } — «как в браузере» (автообновление при входах)
 */
const updateTimezone = async (req, res, next) => {
    const { timezone, auto } = req.body;
    const userId = req.user.user_id;

    const tz = (timezone && typeof timezone === 'string') ? timezone.trim() : '';

    // Валидация IANA-зоны там, где есть строка
    if (tz && !auto) {
        try {
            new Intl.DateTimeFormat('en-US', { timeZone: tz });
        } catch (_) {
            return res.status(400).json({ error: 'Неизвестный часовой пояс' });
        }
    }

    try {
        if (auto) {
            // Автоматический режим: обновлять при входах из браузера
            await pool.query(
                'UPDATE users SET timezone = $1, timezone_manual = FALSE WHERE user_id = $2',
                [tz || null, userId]
            );
        } else {
            // Ручной режим: фиксируем, входы из браузера не трогают
            await pool.query(
                'UPDATE users SET timezone = $1, timezone_manual = TRUE WHERE user_id = $2',
                [tz || null, userId]
            );
        }

        const result = await pool.query(
            'SELECT timezone, timezone_manual FROM users WHERE user_id = $1',
            [userId]
        );
        res.json({
            timezone: result.rows[0].timezone,
            timezoneManual: result.rows[0].timezone_manual,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Получение профиля (текущий email, статус подтверждения)
 * GET /api/user/profile
 */
const getProfile = async (req, res, next) => {
    const userId = req.user.user_id;

    try {
        const result = await pool.query(
            'SELECT email, login, email_verified, timezone, timezone_manual FROM users WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const row = result.rows[0];
        res.json({
            email: row.email,
            login: row.login,
            email_verified: row.email_verified,
            timezone: row.timezone,
            timezoneManual: row.timezone_manual,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    updateProfile,
    changePassword,
    getProfile,
    getDevices,
    addDevice,
    updateTimezone,
    requestEmailChange,
    confirmEmailChange,
    requestPasswordChange,
    confirmPasswordChange,
};
