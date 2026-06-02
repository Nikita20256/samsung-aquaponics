/**
 * Сервис MQTT для обработки сообщений от устройств
 */
const mqtt = require('mqtt');
const config = require('../config');
const { pool } = require('../config/database');
const { addToBuffer } = require('./buffer.service');
const notificationService = require('./notification.service');

const latestData = new Map();
const controlModes = new Map();

let mqttClient = null;

const getLatestData = (deviceId) => {
    return latestData.get(deviceId);
};

const hasDevice = (deviceId) => {
    return latestData.has(deviceId);
};

const getDeviceModes = (deviceId) => {
    if (!controlModes.has(deviceId)) {
        controlModes.set(deviceId, { light: 'auto', aeration: 'auto' });
    }
    return controlModes.get(deviceId);
};

const publishControl = (deviceId, target, mode) => {
    if (!mqttClient || !mqttClient.connected) {
        console.error('MQTT клиент не подключен');
        return false;
    }
    const topic = `aquaponics/${deviceId}/control/${target}`;
    mqttClient.publish(topic, mode, { qos: 1, retain: true });
    console.log(`Отправлена команда ${target}=${mode} на устройство ${deviceId}`);
    return true;
};

const handleMessage = async (topic, message) => {
    const messageStr = message.toString('utf8').trim();

    const topicParts = topic.split('/');
    if (topicParts.length !== 3) {
        console.error(`Неверный формат топика: ${topic}`);
        return;
    }

    const deviceId = topicParts[1];
    const sensorType = topicParts[2];

    if (!latestData.has(deviceId)) {
        latestData.set(deviceId, { humidity: 0, light: 0, temperature: 0, water: 0 });
    }

    if (sensorType === 'water') {
        const digitsOnly = messageStr.replace(/[^0-9-]/g, '');
        const numeric = parseInt(digitsOnly, 10);
        const waterLevel = Number.isNaN(numeric) ? 0 : (numeric > 0 ? 1 : 0);
        latestData.get(deviceId).water = waterLevel;
        console.log(`Получен уровень воды от ${deviceId}: ${waterLevel}`);
        return;
    }

    if (sensorType === 'VklSvet') {
        const digitsOnly = messageStr.replace(/[^0-9-]/g, '');
        const numeric = parseInt(digitsOnly, 10);

        if (!Number.isNaN(numeric) && numeric > 0) {
            console.log(`Получена активация переключателя света от ${deviceId}`);
            try {
                await pool.query(
                    'DELETE FROM light_switches WHERE device_id = $1 AND date != CURRENT_DATE',
                    [deviceId]
                );

                const result = await pool.query(
                    'SELECT date, count FROM light_switches WHERE device_id = $1 AND date = CURRENT_DATE',
                    [deviceId]
                );

                if (result.rows.length === 0) {
                    await pool.query(
                        'INSERT INTO light_switches (device_id, date, count) VALUES ($1, CURRENT_DATE, 1)',
                        [deviceId]
                    );
                } else {
                    await pool.query(
                        'UPDATE light_switches SET count = count + 1 WHERE device_id = $1 AND date = CURRENT_DATE',
                        [deviceId]
                    );
                }
            } catch (err) {
                console.error(`Ошибка PostgreSQL (light_switches): ${err.message}`);
            }
        }
        return;
    }

    const valueStr = messageStr.replace(/[^0-9.]/g, '');
    const value = parseFloat(valueStr);

    if (isNaN(value)) {
        console.error(`Некорректное значение на тему ${topic}: "${messageStr}"`);
        return;
    }

    try {
        const result = await pool.query('SELECT 1 FROM devices WHERE device_id = $1', [deviceId]);
        if (result.rows.length === 0) {
            console.error(`Неизвестный device_id: ${deviceId}`);
            return;
        }

        const deviceData = latestData.get(deviceId);

        if (sensorType === 'humidity') {
            deviceData.humidity = value;
            addToBuffer(deviceId, 'humidity', value);
            notificationService.checkThresholds(deviceId, 'humidity', value);
            console.log(`Влажность от ${deviceId}: ${value}%`);
        } else if (sensorType === 'light') {
            deviceData.light = value;
            addToBuffer(deviceId, 'light', value);
            notificationService.checkThresholds(deviceId, 'light', value);
            console.log(`Освещенность от ${deviceId}: ${value}`);
        } else if (sensorType === 'temperature') {
            deviceData.temperature = value;
            addToBuffer(deviceId, 'temperature', value);
            notificationService.checkThresholds(deviceId, 'temperature', value);
            console.log(`Температура от ${deviceId}: ${value}°C`);
        }
    } catch (err) {
        console.error(`Ошибка PostgreSQL (device check): ${err.message}`);
    }
};

const connect = () => {
    mqttClient = mqtt.connect(config.mqtt.host, config.mqtt.options);

    mqttClient.on('connect', () => {
        console.log('MQTT успешно подключен');
        mqttClient.subscribe([
            'aquaponics/+/humidity',
            'aquaponics/+/light',
            'aquaponics/+/temperature',
            'aquaponics/+/water',
            'aquaponics/+/VklSvet'
        ], (err) => {
            if (err) {
                console.error(`Ошибка подписки MQTT: ${err.message}`);
            } else {
                console.log('Подписка на MQTT топики успешна');
            }
        });
    });

    mqttClient.on('message', handleMessage);

    mqttClient.on('error', (err) => {
        console.error(`Ошибка MQTT: ${err.message}`);
    });

    return mqttClient;
};

const disconnect = () => {
    if (mqttClient) {
        mqttClient.end();
        console.log('MQTT отключен');
    }
};

module.exports = {
    connect,
    disconnect,
    getLatestData,
    hasDevice,
    getDeviceModes,
    publishControl,
    latestData,
    controlModes,
};
