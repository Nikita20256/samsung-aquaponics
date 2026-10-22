const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateToken } = require('../middleware/auth');

// Все маршруты требуют авторизации
router.use(authenticateToken);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/password', userController.changePassword);

// Смена / привязка почты с подтверждением кодом
router.post('/email/request', userController.requestEmailChange);
router.post('/email/confirm', userController.confirmEmailChange);

// Часовой пояс (ручной выбор в профиле)
router.put('/profile/timezone', userController.updateTimezone);

// Смена пароля по коду (в профиле)
router.post('/password/request', userController.requestPasswordChange);
router.post('/password/confirm', userController.confirmPasswordChange);

// Устройства пользователя
router.get('/devices', userController.getDevices);
router.post('/devices', userController.addDevice);

module.exports = router;
