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

// POST /api/auth/confirm-email - Подтверждение почты кодом
router.post('/confirm-email', authController.confirmEmail);

// POST /api/auth/resend-confirm-code - Повторная отправка кода подтверждения
router.post('/resend-confirm-code', authController.resendConfirmCode);

// POST /api/auth/forgot-password - Код восстановления пароля
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password - Смена пароля по коду
router.post('/reset-password', authController.resetPassword);

// GET /api/auth/device - Получить device_id (требует авторизации)
router.get('/device', authenticateToken, authController.getDevice);

module.exports = router;
