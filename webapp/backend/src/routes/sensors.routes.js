/**
 * Роуты текущих данных датчиков
 */
const express = require('express');
const router = express.Router();
const sensorsController = require('../controllers/sensors.controller');
const { authenticateToken, authorizeDevice } = require('../middleware/auth');

// Все роуты требуют авторизации и доступа к устройству
router.use(authenticateToken, authorizeDevice);

// GET /api/sensors/humidity - Текущая влажность
router.get('/humidity', sensorsController.getHumidity);

// GET /api/sensors/light - Текущий уровень освещенности
router.get('/light', sensorsController.getLightLevel);

// GET /api/sensors/temperature - Текущая температура
router.get('/temperature', sensorsController.getTemperature);

// GET /api/sensors/water - Уровень воды
router.get('/water', sensorsController.getWaterLevel);

// GET /api/sensors/lightswitches - Счетчик включений света
router.get('/lightswitches', sensorsController.getLightSwitches);

// GET /api/sensors/all - Все текущие данные (НОВЫЙ)
router.get('/all', sensorsController.getAllSensors);

module.exports = router;
