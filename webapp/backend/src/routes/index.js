/**
 * Главный роутер API
 */
const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const sensorsRoutes = require('./sensors.routes');
const controlRoutes = require('./control.routes');
const dataRoutes = require('./data.routes');
const adminRoutes = require('./admin.routes');
const userRoutes = require('./user.routes');
const notificationRoutes = require('./notification.routes');
const plantsRoutes = require('./plants.routes');
const { pool } = require('../config/database');

// Подключаем роуты
router.use('/auth', authRoutes);
router.use('/sensors', sensorsRoutes);
router.use('/control', controlRoutes);
router.use('/data', dataRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/plants', plantsRoutes);

// Health check endpoint for Docker
router.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(503).json({ status: 'error', message: 'Database connection failed' });
    }
});

// Обратная совместимость со старыми endpoints
// TODO: Удалить в следующей версии
const { authenticateToken, authorizeDevice } = require('../middleware/auth');
const sensorsController = require('../controllers/sensors.controller');
const dataController = require('../controllers/data.controller');

// Получить одно устройство (для обратной совместимости)
router.get('/user/device', authenticateToken, (req, res) => {
    // Возвращаем устройство из токена или первое найденное
    res.json({ device_id: req.user.device_id || (req.deviceId || null) });
});

router.get('/humidity', authenticateToken, authorizeDevice, sensorsController.getHumidity);
router.get('/lightlevel', authenticateToken, authorizeDevice, sensorsController.getLightLevel);
router.get('/temperature', authenticateToken, authorizeDevice, sensorsController.getTemperature);
router.get('/waterlevel', authenticateToken, authorizeDevice, sensorsController.getWaterLevel);
router.get('/lightswitches', authenticateToken, authorizeDevice, sensorsController.getLightSwitches);

router.get('/data/humidity', authenticateToken, authorizeDevice, dataController.getHumidityHistory);
router.get('/data/light', authenticateToken, authorizeDevice, dataController.getLightHistory);
router.get('/data/temperature', authenticateToken, authorizeDevice, dataController.getTemperatureHistory);

// Старые пути авторизации
const authController = require('../controllers/auth.controller');
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
