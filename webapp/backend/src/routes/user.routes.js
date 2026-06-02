const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateToken } = require('../middleware/auth');

// Все маршруты требуют авторизации
router.use(authenticateToken);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/password', userController.changePassword);

// Устройства пользователя
router.get('/devices', userController.getDevices);
router.post('/devices', userController.addDevice);

module.exports = router;
