/**
 * Маршруты предзаказов (публичные)
 */
const express = require('express');
const router = express.Router();
const preorderController = require('../controllers/preorder.controller');

router.post('/', preorderController.create);

module.exports = router;
