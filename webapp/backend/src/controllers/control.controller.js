/**
 * Контроллер управления устройством
 */
const mqttService = require('../services/mqtt.service');

/**
 * Валидация режима
 */
const validateMode = (mode) => {
    return mode === 'auto' || mode === 'on' || mode === 'off';
};

/**
 * Получить текущие режимы управления
 * GET /api/control/modes
 */
const getModes = (req, res) => {
    const modes = mqttService.getDeviceModes(req.deviceId);
    res.json(modes);
};

/**
 * Установить режим освещения
 * POST /api/control/light
 */
const setLightMode = (req, res) => {
    const { mode } = req.body;

    if (!validateMode(mode)) {
        return res.status(400).json({ error: 'Неверный режим. Используйте auto|on|off' });
    }

    const modes = mqttService.getDeviceModes(req.deviceId);
    modes.light = mode;
    mqttService.publishControl(req.deviceId, 'light', mode);

    res.json({ ok: true, modes });
};

/**
 * Установить режим аэрации
 * POST /api/control/aeration
 */
const setAerationMode = (req, res) => {
    const { mode } = req.body;

    if (!validateMode(mode)) {
        return res.status(400).json({ error: 'Неверный режим. Используйте auto|on|off' });
    }

    const modes = mqttService.getDeviceModes(req.deviceId);
    modes.aeration = mode;
    mqttService.publishControl(req.deviceId, 'aeration', mode);

    res.json({ ok: true, modes });
};

module.exports = {
    getModes,
    setLightMode,
    setAerationMode,
};
