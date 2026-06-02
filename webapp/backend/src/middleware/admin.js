/**
 * Middleware для проверки прав администратора
 */
const { pool } = require('../config/database');

/**
 * Проверяет, является ли пользователь администратором
 * Использовать после authenticateToken middleware
 */
const requireAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;

        if (!userId) {
            return res.status(401).json({ error: 'Пользователь не авторизован' });
        }

        const { rows } = await pool.query(
            'SELECT is_admin FROM users WHERE user_id = $1',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        if (!rows[0].is_admin) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора.' });
        }

        req.isAdmin = true;
        next();
    } catch (error) {
        console.error('Ошибка проверки прав админа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = { requireAdmin };
