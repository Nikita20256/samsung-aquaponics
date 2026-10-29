/**
 * Роуты для управления растениями
 */
const express = require('express');
const router = express.Router();
const plantsController = require('../controllers/plants.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// Публичный endpoint — получить все растения (доступен всем, авторизация не требуется)
router.get('/', plantsController.getPlants);

// Любой авторизованный пользователь может добавить растение в общий каталог
router.post('/', authenticateToken, plantsController.createPlant);

// Только админ — удалить растение
router.delete('/:id', authenticateToken, requireAdmin, plantsController.deletePlant);

// Только админ — обновить растение
router.put('/:id', authenticateToken, requireAdmin, plantsController.updatePlant);

module.exports = router;
