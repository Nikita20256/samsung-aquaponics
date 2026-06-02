/**
 * Роуты исторических данных
 */
const express = require('express');
const router = express.Router();
const dataController = require('../controllers/data.controller');
const { authenticateToken, authorizeDevice } = require('../middleware/auth');

// Все роуты требуют авторизации и доступа к устройству
router.use(authenticateToken, authorizeDevice);

// GET /api/data/humidity - История влажности
router.get('/humidity', dataController.getHumidityHistory);

// GET /api/data/light - История освещенности
router.get('/light', dataController.getLightHistory);

// GET /api/data/temperature - История температуры
router.get('/temperature', dataController.getTemperatureHistory);

// GET /api/data/all - Вся история (НОВЫЙ)
router.get('/all', dataController.getAllHistory);

module.exports = router;
