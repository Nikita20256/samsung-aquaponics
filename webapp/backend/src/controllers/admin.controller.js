/**
 * Контроллер админ-панели
 */
const { pool } = require('../config/database');
const bcrypt = require('bcrypt');


const adminController = {
    /**
     * Получить список всех пользователей
     */
    getUsers: async (req, res) => {
        try {
            const { rows } = await pool.query(`
        SELECT 
          u.user_id,
          u.login,
          u.email,
          u.is_admin,
          ARRAY_AGG(ud.device_id) as device_ids
        FROM users u
        LEFT JOIN user_devices ud ON u.user_id = ud.user_id
        GROUP BY u.user_id, u.login, u.email, u.is_admin
        ORDER BY u.user_id
      `);

            res.json({
                count: rows.length,
                users: rows.map(user => ({
                    id: user.user_id,
                    login: user.login,
                    email: user.email,
                    isAdmin: user.is_admin,
                    devices: user.device_ids.filter(id => id !== null),
                })),
            });
        } catch (error) {
            console.error('Ошибка получения пользователей:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    },

    /**
     * Получить список всех устройств с привязанными пользователями
     */
    getDevices: async (req, res) => {
        try {
            const { rows } = await pool.query(`
        SELECT 
          d.device_id,
          d.device_secret,
          COALESCE(
            json_agg(
              json_build_object('id', u.user_id, 'login', u.login)
            ) FILTER (WHERE u.user_id IS NOT NULL),
            '[]'
          ) as users
        FROM devices d
        LEFT JOIN user_devices ud ON d.device_id = ud.device_id
        LEFT JOIN users u ON ud.user_id = u.user_id
        GROUP BY d.device_id
        ORDER BY d.device_id
      `);

            res.json({
                count: rows.length,
                devices: rows.map(device => ({
                    id: device.device_id,
                    deviceId: device.device_id,
                    users: device.users,
                })),
            });
        } catch (error) {
            console.error('Ошибка получения устройств:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    },

    /**
     * Получить статистику
     */
    getStats: async (req, res) => {
        try {
            const usersResult = await pool.query('SELECT COUNT(*) FROM users');
            const devicesResult = await pool.query('SELECT COUNT(*) FROM devices');
            const adminsResult = await pool.query('SELECT COUNT(*) FROM users WHERE is_admin = true');

            let recordsLast24h = 0;
            try {
                const recentDataResult = await pool.query(`
          SELECT COUNT(*) FROM humidity 
          WHERE timestamp > NOW() - INTERVAL '24 hours'
        `);
                recordsLast24h = parseInt(recentDataResult.rows[0].count);
            } catch {
                // Ignore if table doesn't exist
            }

            res.json({
                totalUsers: parseInt(usersResult.rows[0].count),
                totalDevices: parseInt(devicesResult.rows[0].count),
                totalAdmins: parseInt(adminsResult.rows[0].count),
                recordsLast24h,
            });
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    },

    /**
     * Назначить/снять админа
     */
    toggleAdmin: async (req, res) => {
        try {
            const { id } = req.params;
            const currentUserId = req.user.user_id;

            if (parseInt(id) === currentUserId) {
                return res.status(400).json({ error: 'Нельзя изменить свои права администратора' });
            }

            const { rows } = await pool.query(
                'UPDATE users SET is_admin = NOT is_admin WHERE user_id = $1 RETURNING user_id, login, is_admin',
                [id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            res.json({
                message: rows[0].is_admin
                    ? `Пользователь ${rows[0].login} назначен администратором`
                    : `Права администратора у ${rows[0].login} сняты`,
                user: rows[0],
            });
        } catch (error) {
            console.error('Ошибка изменения прав:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    },

    /**
     * Удалить пользователя
     */
    deleteUser: async (req, res) => {
        try {
            const { id } = req.params;
            const currentUserId = req.user.user_id;

            if (parseInt(id) === currentUserId) {
                return res.status(400).json({ error: 'Нельзя удалить свой аккаунт' });
            }

            await pool.query('DELETE FROM user_devices WHERE user_id = $1', [id]);
            const { rows } = await pool.query(
                'DELETE FROM users WHERE user_id = $1 RETURNING user_id, login',
                [id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            res.json({
                message: `Пользователь ${rows[0].login} удален`,
                deletedUser: rows[0],
            });
        } catch (error) {
            console.error('Ошибка удаления пользователя:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    },

    /**
     * Создать устройство
     */
    createDevice: async (req, res) => {
        try {
            const { device_id, secret } = req.body;

            if (!device_id || !secret) {
                return res.status(400).json({ error: 'device_id и secret обязательны' });
            }

            const existing = await pool.query(
                'SELECT device_id FROM devices WHERE device_id = $1',
                [device_id]
            );

            if (existing.rows.length > 0) {
                return res.status(409).json({ error: 'Устройство с таким ID уже существует' });
            }


            const hashedSecret = await bcrypt.hash(secret, 10);

            const { rows } = await pool.query(
                'INSERT INTO devices (device_id, device_secret) VALUES ($1, $2) RETURNING device_id',
                [device_id, hashedSecret]
            );

            res.status(201).json({
                message: 'Устройство создано',
                device: {
                    deviceId: rows[0].device_id,
                },
            });
        } catch (error) {
            console.error('Ошибка создания устройства:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    },

    /**
     * Удалить устройство
     */
    deleteDevice: async (req, res) => {
        try {
            const { id } = req.params;

            // Сначала удаляем связанные данные (каскадное удаление в БД должно работать, но лучше перестраховаться/логировать)
            // В схеме стоит ON DELETE CASCADE, так что достаточно удалить из devices
            const { rowCount } = await pool.query('DELETE FROM devices WHERE device_id = $1', [id]);

            if (rowCount === 0) {
                return res.status(404).json({ error: 'Устройство не найдено' });
            }

            res.json({ message: `Устройство ${id} удалено` });
        } catch (error) {
            console.error('Ошибка удаления устройства:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    },

    /**
     * Удалить связь (Unbind)
     */
    unbindDevice: async (req, res) => {
        try {
            const { deviceId, userId } = req.params;

            const { rowCount } = await pool.query(
                'DELETE FROM user_devices WHERE device_id = $1 AND user_id = $2',
                [deviceId, userId]
            );

            if (rowCount === 0) {
                return res.status(404).json({ error: 'Связь не найдена' });
            }

            res.json({ message: 'Устройство отвязано от пользователя' });
        } catch (error) {
            console.error('Ошибка отвязки устройства:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    },

    checkAdmin: async (req, res) => {
        res.json({ isAdmin: true });
    },
};

module.exports = adminController;
