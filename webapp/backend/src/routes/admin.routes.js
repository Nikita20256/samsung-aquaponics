const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// Все маршруты требуют прав администратора
router.use(authenticateToken, requireAdmin);

// Пользователи
router.get('/users', adminController.getUsers);
router.post('/users/:id/toggle-admin', adminController.toggleAdmin);
router.delete('/users/:id', adminController.deleteUser);

// Устройства
router.get('/devices', adminController.getDevices);
router.post('/devices', adminController.createDevice);
router.delete('/devices/:id', adminController.deleteDevice);
router.delete('/devices/:deviceId/users/:userId', adminController.unbindDevice);

// Статистика
router.get('/stats', adminController.getStats);
router.get('/check', adminController.checkAdmin);

module.exports = router;
