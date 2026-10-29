const jwt = require('jsonwebtoken');
const config = require('../config');
const { pool } = require('../config/database');

/**
 * Middleware для проверки JWT токена
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ code: 'AUTH_REQUIRED', error: 'Требуется токен доступа' });
    }

    jwt.verify(token, config.jwt.secret, (err, user) => {
        if (err) {
            return res.status(403).json({ code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN', error: 'Недействительный или истекший токен' });
        }
        req.user = user;
        next();
    });
};

/**
 * Middleware для проверки доступа к устройству
 */
const authorizeDevice = async (req, res, next) => {
    const deviceId = req.query.device_id || req.body.device_id;

    if (!deviceId) {
        return res.status(400).json({ error: 'Device ID не указан' });
    }

    // Если устройство совпадает с тем, что в токене (для обратной совместимости или эффективности)
    if (req.user.device_id && req.user.device_id === deviceId) {
        req.deviceId = deviceId;
        return next();
    }

    try {
        const result = await pool.query(
            'SELECT 1 FROM user_devices WHERE user_id = $1 AND device_id = $2',
            [req.user.user_id, deviceId]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Несанкционированный доступ к устройству' });
        }

        req.deviceId = deviceId;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        return res.status(500).json({ error: 'Ошибка сервера при проверке доступа' });
    }
};

module.exports = {
    authenticateToken,
    authorizeDevice,
};
