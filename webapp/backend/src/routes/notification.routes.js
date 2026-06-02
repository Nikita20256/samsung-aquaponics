/**
 * Роуты для системы уведомлений
 */
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticateToken } = require('../middleware/auth');

// Все маршруты требуют авторизации
router.use(authenticateToken);

router.get('/settings', notificationController.getSettings);
router.post('/settings', notificationController.updateSettings);
router.post('/thresholds', notificationController.updateThresholds);
router.post('/test-email', notificationController.testEmail);

module.exports = router;
