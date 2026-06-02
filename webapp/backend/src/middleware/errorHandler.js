const config = require('../config');

/**
 * Глобальный обработчик ошибок
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.message);

    if (config.isDev) {
        console.error(err.stack);
    }

    // PostgreSQL unique constraint violation
    if (err.code === '23505') {
        return res.status(400).json({
            error: 'Запись с такими данными уже существует'
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({
            error: 'Недействительный токен'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(403).json({
            error: 'Токен истек'
        });
    }

    // Default error
    res.status(err.status || 500).json({
        error: config.isDev ? err.message : 'Внутренняя ошибка сервера',
    });
};

/**
 * Обработчик для несуществующих маршрутов
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
};

module.exports = {
    errorHandler,
    notFoundHandler,
};
