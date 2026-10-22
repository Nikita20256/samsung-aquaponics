const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { pool } = require('../config/database');


/**
 * Регистрация нового пользователя
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    const { login, password, email, timezone } = req.body;

    // Валидация
    if (!login || !password) {
        return res.status(400).json({ error: 'Требуются логин и пароль' });
    }

    if (login.length < 3) {
        return res.status(400).json({ error: 'Логин должен содержать не менее 3 символов' });
    }

    if (password.length < 3) {
        return res.status(400).json({ error: 'Пароль должен содержать не менее 3 символов' });
    }

    try {
        // Проверяем, не занят ли логин
        const existingUser = await pool.query('SELECT user_id FROM users WHERE login = $1', [login]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Логин уже существует' });
        }

        // Проверяем email, если указан
        if (email) {
            const existingEmail = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
            if (existingEmail.rows.length > 0) {
                return res.status(400).json({ error: 'Email уже существует' });
            }
        }

        // Хэшируем пароль пользователя (это оставляем!)
        const passwordHash = await bcrypt.hash(password, 10);

        // Создаем пользователя (часовой пояс берём из браузера, можно поменять в профиле)
        const result = await pool.query(
            'INSERT INTO users (login, password_hash, email, timezone) VALUES ($1, $2, $3, $4) RETURNING user_id',
            [login, passwordHash, email || null, timezone || null]
        );

        const userId = result.rows[0].user_id;

        // Если email указан — отправляем код подтверждения почты
        let emailVerification = { required: false };
        if (email) {
            const codeService = require('../services/code.service');
            const emailService = require('../services/email.service');

            const created = await codeService.createCode(userId, 'confirm_email');
            if (created.ok) {
                const sent = await emailService.sendVerificationCode(email, created.code);
                emailVerification = {
                    required: true,
                    sent: sent.ok,
                    resendAfter: Math.ceil(config.email.codeCooldownMs / 1000),
                };
            }
        }

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            emailVerification,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Подтверждение email кодом после регистрации
 * POST /api/auth/confirm-email
 */
const confirmEmail = async (req, res, next) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: 'Требуются email и код подтверждения' });
    }

    try {
        const userResult = await pool.query(
            'SELECT user_id, email_verified FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь с таким email не найден' });
        }

        const user = userResult.rows[0];
        if (user.email_verified) {
            return res.status(400).json({ error: 'Email уже подтверждён' });
        }

        const codeService = require('../services/code.service');
        const result = await codeService.verifyCode(user.user_id, 'confirm_email', code);
        if (!result.ok) {
            return res.status(400).json({ error: result.error });
        }

        await pool.query(
            'UPDATE users SET email_verified = TRUE WHERE user_id = $1',
            [user.user_id]
        );

        res.json({ message: 'Email успешно подтверждён. Теперь можно войти.' });
    } catch (err) {
        next(err);
    }
};

/**
 * Повторная отправка кода подтверждения почты
 * POST /api/auth/resend-confirm-code
 */
const resendConfirmCode = async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Требуется email' });
    }

    try {
        const userResult = await pool.query(
            'SELECT user_id, email_verified FROM users WHERE email = $1',
            [email]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь с таким email не найден' });
        }

        const user = userResult.rows[0];
        if (user.email_verified) {
            return res.status(400).json({ error: 'Email уже подтверждён' });
        }

        const emailService = require('../services/email.service');
        if (!emailService.isReady()) {
            return res.status(503).json({ error: 'Почтовый сервис не настроен' });
        }

        const codeService = require('../services/code.service');
        const created = await codeService.createCode(user.user_id, 'confirm_email');
        if (!created.ok) {
            return res.status(429).json({ error: created.error });
        }

        const sent = await emailService.sendVerificationCode(email, created.code);
        if (!sent.ok) {
            return res.status(500).json({ error: 'Не удалось отправить письмо' });
        }

        res.json({
            message: 'Код отправлен повторно',
            resendAfter: Math.ceil(config.email.codeCooldownMs / 1000),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Запрос восстановления пароля (код на почту)
 * POST /api/auth/forgot-password
 * Принимает логин ИЛИ email аккаунта.
 */
const forgotPassword = async (req, res, next) => {
    const { identifier } = req.body;

    if (!identifier || !String(identifier).trim()) {
        return res.status(400).json({ error: 'Укажите логин или email' });
    }

    const input = String(identifier).trim();

    try {
        const emailService = require('../services/email.service');
        const userResult = await pool.query(
            'SELECT user_id, email, email_verified FROM users WHERE login = $1 OR email = $1',
            [input]
        );

        if (userResult.rows.length > 0 && emailService.isReady()) {
            const user = userResult.rows[0];
            // Код отправляем только если к аккаунту привязана подтверждённая почта
            if (user.email && user.email_verified) {
                const codeService = require('../services/code.service');
                const created = await codeService.createCode(
                    user.user_id,
                    'reset_password',
                    user.email
                );
                if (created.ok) {
                    await emailService.sendPasswordResetCode(user.email, created.code);
                }
            }
        }

        // Отвечаем одинаково для всех — не раскрываем, существует ли аккаунт
        res.json({
            message: 'Если указанный логин/email зарегистрирован и к нему привязана почта, код отправлен',
            resendAfter: Math.ceil(config.email.codeCooldownMs / 1000),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Смена пароля по коду (после forgot-password)
 * POST /api/auth/reset-password
 * Принимает логин ИЛИ email аккаунта (должен совпадать с тем, что вводили при запросе кода).
 */
const resetPassword = async (req, res, next) => {
    const { identifier, code, newPassword } = req.body;

    if (!identifier || !code || !newPassword) {
        return res.status(400).json({ error: 'Требуются логин/email, код и новый пароль' });
    }

    if (newPassword.length < 3) {
        return res.status(400).json({ error: 'Пароль должен содержать не менее 3 символов' });
    }

    try {
        const userResult = await pool.query(
            'SELECT user_id, email FROM users WHERE login = $1 OR email = $1',
            [String(identifier).trim()]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const user = userResult.rows[0];
        if (!user.email) {
            return res.status(400).json({ error: 'К аккаунту не привязана почта для восстановления' });
        }

        const codeService = require('../services/code.service');
        const result = await codeService.verifyCode(
            user.user_id,
            'reset_password',
            code,
            user.email
        );
        if (!result.ok) {
            return res.status(400).json({ error: result.error });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE user_id = $2',
            [passwordHash, user.user_id]
        );

        res.json({ message: 'Пароль успешно изменён. Теперь можно войти с новым паролем.' });
    } catch (err) {
        next(err);
    }
};

/**
 * Авторизация пользователя
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
    const { login: userLogin, password, timezone } = req.body;

    if (!userLogin || !password) {
        return res.status(400).json({ error: 'Требуются логин и пароль' });
    }

    try {
        const userResult = await pool.query(
            'SELECT user_id, password_hash, is_admin FROM users WHERE login = $1',
            [userLogin]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный логин' });
        }

        const user = userResult.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(401).json({ error: 'Неверный пароль' });
        }

        // Автообновление часового пояса из браузера — но только если пользователь
        // не выбрал его вручную в профиле (иначе вход в поездке перезапишет зону)
        if (timezone) {
            await pool.query(
                'UPDATE users SET timezone = $1 WHERE user_id = $2 AND timezone_manual = FALSE',
                [timezone, user.user_id]
            );
        }

        // Получаем device_id (первое попавшееся, если есть)
        const deviceResult = await pool.query(
            'SELECT device_id FROM user_devices WHERE user_id = $1 LIMIT 1',
            [user.user_id]
        );

        const device_id = deviceResult.rows.length > 0 ? deviceResult.rows[0].device_id : null;

        // Создаём JWT-токен
        const token = jwt.sign(
            {
                user_id: user.user_id,
                device_id: device_id, // Может быть null
                isAdmin: user.is_admin
            },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        res.json({ token });
    } catch (err) {
        next(err);
    }
};

/**
 * Получить device_id текущего пользователя
 * GET /api/auth/device
 */
const getDevice = (req, res) => {
    res.json({ device_id: req.user.device_id });
};

module.exports = {
    register,
    login,
    getDevice,
    confirmEmail,
    resendConfirmCode,
    forgotPassword,
    resetPassword,
};
