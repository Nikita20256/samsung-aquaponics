/**
 * Роуты аутентификации
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/register - Регистрация
router.post('/register', authController.register);

// POST /api/auth/login - Авторизация
router.post('/login', authController.login);

// GET /api/auth/device - Получить device_id (требует авторизации)
router.get('/device', authenticateToken, authController.getDevice);

module.exports = router;
