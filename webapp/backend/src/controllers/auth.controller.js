const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { pool } = require('../config/database');


/**
 * Регистрация нового пользователя
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    const { login, password, email } = req.body;

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

        // Создаем пользователя
        const result = await pool.query(
            'INSERT INTO users (login, password_hash, email) VALUES ($1, $2, $3) RETURNING user_id',
            [login, passwordHash, email || null]
        );

        const userId = result.rows[0].user_id;

        // Если указан device_secret - игнорируем (старая логика)
        // Устройства добавляются через личный кабинет

        res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
    } catch (err) {
        next(err);
    }
};

/**
 * Авторизация пользователя
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
    const { login: userLogin, password } = req.body;

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
};
