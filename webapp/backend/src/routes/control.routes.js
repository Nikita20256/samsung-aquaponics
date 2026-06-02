/**
 * Роуты управления устройством
 */
const express = require('express');
const router = express.Router();
const controlController = require('../controllers/control.controller');
const { authenticateToken, authorizeDevice } = require('../middleware/auth');

// Все роуты требуют авторизации и доступа к устройству
router.use(authenticateToken, authorizeDevice);

// GET /api/control/modes - Получить текущие режимы
router.get('/modes', controlController.getModes);

// POST /api/control/light - Установить режим освещения
router.post('/light', controlController.setLightMode);

// POST /api/control/aeration - Установить режим аэрации
router.post('/aeration', controlController.setAerationMode);

module.exports = router;
