const express = require('express');
const { Pool } = require('pg');
const mqtt = require('mqtt');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const cors = require('cors');

app.use(cors({
  origin: '*', // или конкретный домен
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(express.static('public'));
app.use(express.json());

// Конфигурация
const JWT_SECRET = 'supersecretjwttokenblabla'; // Ключ шифрования токенов

// PostgreSQL подключение
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'aquaponics_db',
  user: process.env.DB_USER || 'aquaponics_app',
  password: process.env.DB_PASSWORD || 'aserver',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Неожиданная ошибка на неактивном клиенте', err);
  process.exit(-1);
});

// Простая проверка подключения к БД при старте
(async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('PostgreSQL успешно подключен');
  } catch (err) {
    console.error(`Ошибка инициализации PostgreSQL: ${err.message}`);
    console.error('Убедитесь, что PostgreSQL запущен и таблицы созданы согласно схеме');
  }
})();

// Буфер для накопления данных за час
const hourlyBuffer = new Map(); // { deviceId: { humidity: [], light: [], temperature: [] } }

// Функция для добавления данных в буфер
function addToBuffer(deviceId, sensorType, value) {
  if (!hourlyBuffer.has(deviceId)) {
    hourlyBuffer.set(deviceId, { humidity: [], light: [], temperature: [] });
  }
  hourlyBuffer.get(deviceId)[sensorType].push(value);
}

// Функция для сохранения усредненных данных за час
async function saveHourlyData() {
  for (const [deviceId, sensorData] of hourlyBuffer.entries()) {
    for (const sensorType of ['humidity', 'light', 'temperature']) {
      const values = sensorData[sensorType];
      if (values.length > 0) {
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        const roundedAverage = Math.round(average * 100) / 100;
        
        try {
          // Используем функцию БД для записи времени получения данных (округлено до часа)
          const result = await pool.query(
            `INSERT INTO ${sensorType} (device_id, value, timestamp) 
             VALUES ($1, $2, date_trunc('hour', NOW() AT TIME ZONE 'UTC')) 
             RETURNING timestamp`,
            [deviceId, roundedAverage]
          );
          const timestamp = result.rows[0].timestamp;
          console.log(`Сохранено часовое значение ${sensorType} для ${deviceId}: ${roundedAverage} (${values.length} образцов) в ${timestamp.toISOString()}`);
        } catch (err) {
          console.error(`Ошибка при сохранении часового значения ${sensorType} для ${deviceId}: ${err.message}`);
        }
      }
    }
  }
  
  // Очищаем буфер после сохранения
  hourlyBuffer.clear();
}

// Запуск сохранения ровно в каждый час
function scheduleHourlySave() {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0); // Следующий час, 0 минут, 0 секунд
  
  const timeToNextHour = nextHour.getTime() - now.getTime();
  
  setTimeout(() => {
    saveHourlyData();
    // После первого сохранения запускаем интервал каждый час
    setInterval(saveHourlyData, 60 * 60 * 1000);
  }, timeToNextHour);
  
  console.log(`Следующее часовое сохранение запланировано на ${nextHour.toLocaleString()}`);
}

// Запускаем планировщик
scheduleHourlySave();


// Middleware для проверки JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ error: 'Требуется токен доступа' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный или истекший токен' });
    }
    req.user = user; // Сохраняем device_id из токена
    next();
  });
}

// MQTT подключение
const mqttClient = mqtt.connect('mqtt://147.45.102.173:1883', {
  reconnectPeriod: 1000,
  username: 'device1',
  password: 'aqua'
});

const latestData = new Map();
const controlModes = new Map(); // { [deviceId]: { light: 'auto'|'on'|'off', aeration: 'auto'|'on'|'off' } }

mqttClient.on('connect', () => {
  mqttClient.subscribe(['aquaponics/+/humidity', 'aquaponics/+/light', 'aquaponics/+/temperature', 'aquaponics/+/water', 'aquaponics/+/VklSvet'], (err) => {
    if (err) {
      console.error(`Ошибка подписки MQTT: ${err.message}`);
    }
  });
}); //подписка на топики

mqttClient.on('message', async (topic, message) => {
  const messageStr = message.toString('utf8').trim(); // Явно указываем кодировку UTF-8 и удаляем пробелы
  //console.log(`Raw message received on topic ${topic}: "${messageStr}"`);
  
  // Выводим коды символов для отладки
  //console.log(`Character codes: ${[...messageStr].map(c => c.charCodeAt(0)).join(', ')}`);

  const topicParts = topic.split('/');
  if (topicParts.length !== 3) {
    console.error(`Неверный формат топика: ${topic}`);
    return;
  }
  const deviceId = topicParts[1];
  const sensorType = topicParts[2];

  // Обработка water (1 или 0)
  if (sensorType === 'water') {
    // Убираем все нецифровые символы (включая скрытые, переносы строк и т.п.)
    const digitsOnly = messageStr.replace(/[^0-9-]/g, '');
    const numeric = parseInt(digitsOnly, 10);
    const waterLevel = Number.isNaN(numeric) ? 0 : (numeric > 0 ? 1 : 0);

    // Логируем уровень воды
    console.log(`Получен уровень воды от устройства ${deviceId}: ${waterLevel}`);

    // Обновляем последние значения
    if (!latestData.has(deviceId)) {
      latestData.set(deviceId, { humidity: 0, light: 0, temperature: 0, water: 0 });
    }
    latestData.get(deviceId).water = waterLevel;
    return;
  }

  // Обработка VklSvet (счетчик включений)
  if (sensorType === 'VklSvet') {
    // Убираем все нецифровые символы и приводим к числу
    const digitsOnly = messageStr.replace(/[^0-9-]/g, '');
    const numeric = parseInt(digitsOnly, 10);
    if (!Number.isNaN(numeric) && numeric > 0) {
      // Логируем включение света
      console.log(`Получена активация переключателя света от устройства ${deviceId}`);
      
      try {
        // Удаляем все записи, которые не за сегодняшний день (автоматический сброс при новом дне)
        await pool.query(
          'DELETE FROM light_switches WHERE device_id = $1 AND date != CURRENT_DATE',
          [deviceId]
        );
        
        // Используем функцию БД для получения текущей даты
        const result = await pool.query(
          'SELECT date, count FROM light_switches WHERE device_id = $1 AND date = CURRENT_DATE',
          [deviceId]
        );
        
        if (result.rows.length === 0) {
          // Первое включение сегодня - создаем запись
          await pool.query(
            'INSERT INTO light_switches (device_id, date, count) VALUES ($1, CURRENT_DATE, 1)',
            [deviceId]
          );
        } else {
          // Увеличиваем счетчик для сегодняшнего дня
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

  // Обработка humidity и light (числовые значения)
  const valueStr = messageStr.replace(/[^0-9.]/g, '');
  const value = parseFloat(valueStr);

  if (isNaN(value)) {
    console.error(`Некорректное значение получено на тему ${topic}: "${messageStr}" (очищенное: "${valueStr}")`);
    return;
  }

  //console.log(`Получено значение на тему ${topic}: ${value}`);

  // Проверяем, существует ли устройство
  try {
    const result = await pool.query('SELECT 1 FROM devices WHERE device_id = $1', [deviceId]);
    if (result.rows.length === 0) {
      console.error(`Неизвестный device_id: ${deviceId}`);
      return;
    }

    // Логируем полученные данные в консольку
    console.log(`Получено значение ${sensorType} от устройства ${deviceId}: ${value}`);

    // Обновляем последние значения
    if (!latestData.has(deviceId)) {
      latestData.set(deviceId, { humidity: 0, light: 0, temperature: 0, water: 0 });
    }
    const deviceData = latestData.get(deviceId);

    // Обновляем текущие значения и добавляем в буфер для часового усреднения
    if (sensorType === 'humidity') {
      deviceData.humidity = value;
      addToBuffer(deviceId, 'humidity', value);
    } else if (sensorType === 'light') {
      deviceData.light = value;
      addToBuffer(deviceId, 'light', value);
    } else if (sensorType === 'temperature') {
      deviceData.temperature = value;
      addToBuffer(deviceId, 'temperature', value);
    }
  } catch (err) {
    console.error(`Ошибка выбора PostgreSQL (device): ${err.message}`);
  }
});

mqttClient.on('error', (err) => {
  console.error(`Ошибка MQTT: ${err.message}`);
});

// API для регистрации
app.post('/api/register', async (req, res) => {
  const { login, password, email, device_secret } = req.body;
  
  if (!login || !password || !device_secret) {
    return res.status(400).json({ error: 'Требуются логин, пароль и device_secret' });
  }

  // Простая валидация логина
  if (login.length < 3) {
    return res.status(400).json({ error: 'Логин должен содержать не менее 3 символов' });
  }

  // Простая валидация пароля
  if (password.length < 3) {
    return res.status(400).json({ error: 'Пароль должен содержать не менее 3 символов' });
  }

  try {
    // Проверяем, не занят ли логин
    const existingUser = await pool.query('SELECT user_id FROM users WHERE login = $1', [login]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Логин уже существует' });
    }

    // Проверяем email, если указан
    if (email) {
      const existingEmail = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ error: 'Email уже существует' });
      }
    }

    // Хэшируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const result = await pool.query(
      'INSERT INTO users (login, password_hash, email) VALUES ($1, $2, $3) RETURNING user_id',
      [login, passwordHash, email || null]
    );

    const userId = result.rows[0].user_id;

    // Связывание с устройством по device_secret (пароль устройства) - обязательное поле
    // Ищем устройство, проверяя пароль через bcrypt
    const devicesResult = await pool.query('SELECT device_id, device_secret FROM devices');
    
    let foundDevice = null;
    for (const device of devicesResult.rows) {
      const match = await bcrypt.compare(device_secret, device.device_secret);
      if (match) {
        foundDevice = device;
        break;
      }
    }

    if (!foundDevice) {
      // Устройство не найдено, но пользователь уже создан - удаляем его
      await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
      return res.status(400).json({ error: 'Неверный device_secret' });
    }

    const deviceId = foundDevice.device_id;

    // Проверяем, не занято ли устройство другим пользователем
    const deviceCheck = await pool.query(
      'SELECT user_id FROM user_devices WHERE device_id = $1',
      [deviceId]
    );

    if (deviceCheck.rows.length > 0) {
      // Устройство занято, удаляем созданного пользователя
      await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
      return res.status(400).json({ error: 'Устройство уже связано с другим пользователем' });
    }

    // Связываем пользователя с устройством
    await pool.query(
      'INSERT INTO user_devices (user_id, device_id) VALUES ($1, $2)',
      [userId, deviceId]
    );

    res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
  } catch (err) {
    console.error(`Ошибка PostgreSQL (register): ${err.message}`);
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Логин или email уже существует' });
    }
    return res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// API для аутентификации
app.post('/api/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Требуются логин и пароль' });
  }

  try {
    // Логиним только пользователей по их логину
    const userResult = await pool.query('SELECT user_id, password_hash FROM users WHERE login = $1', [login]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный логин' });
    }

    const user = userResult.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    // Получаем device_id из таблицы user_devices
    const deviceResult = await pool.query(
      'SELECT device_id FROM user_devices WHERE user_id = $1 LIMIT 1',
      [user.user_id]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(403).json({ error: 'У пользователя нет связанных устройств' });
    }

    const device_id = deviceResult.rows[0].device_id;
    
    // Создаём JWT-токен с device_id
    const token = jwt.sign({ device_id: device_id, user_id: user.user_id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } catch (err) {
    console.error(`Ошибка выбора PostgreSQL (login): ${err.message}`);
    return res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// API для текущих данных (доступ только авторизованным пользователям)
app.get('/api/humidity', authenticateToken, (req, res) => {
  const deviceId = req.query.device_id;
  if (!deviceId || deviceId !== req.user.device_id) {
    return res.status(403).json({ error: 'Несанкционированный доступ к устройству' });
  }
  if (!latestData.has(deviceId)) {
    return res.status(404).json({ error: 'Устройство не найдено' });
  }
  res.json({ humidity: latestData.get(deviceId).humidity });
});

app.get('/api/lightlevel', authenticateToken, (req, res) => {
  const deviceId = req.query.device_id;
  if (!deviceId || deviceId !== req.user.device_id) {
    return res.status(403).json({ error: 'Несанкционированный доступ к устройству' });
  }
  if (!latestData.has(deviceId)) {
    return res.status(404).json({ error: 'Устройство не найдено' });
  }
  res.json({ light: latestData.get(deviceId).light });
});

// Текущая температура
app.get('/api/temperature', authenticateToken, (req, res) => {
  const deviceId = req.query.device_id;
  if (!deviceId || deviceId !== req.user.device_id) {
    return res.status(403).json({ error: 'Несанкционированный доступ к устройству' });
  }
  if (!latestData.has(deviceId)) {
    return res.status(404).json({ error: 'Устройство не найдено' });
  }
  res.json({ temperature: latestData.get(deviceId).temperature });
});

// API для получения статуса воды
app.get('/api/waterlevel', authenticateToken, (req, res) => {
  const deviceId = req.query.device_id;
  if (!deviceId || deviceId !== req.user.device_id) {
    return res.status(403).json({ error: 'Несанкционированный доступ к устройству' });
  }
  if (!latestData.has(deviceId)) {
    return res.status(404).json({ error: 'Устройство не найдено' });
  }
  res.json({ water: latestData.get(deviceId).water || 0 });
});

// Управление режимами света и аэрации
function validateMode(mode) {
  return mode === 'auto' || mode === 'on' || mode === 'off';
}

function getDeviceModes(deviceId) {
  if (!controlModes.has(deviceId)) {
    controlModes.set(deviceId, { light: 'auto', aeration: 'auto' });
  }
  return controlModes.get(deviceId);
}

function publishControl(deviceId, target, mode) {
  const topic = `aquaponics/${deviceId}/control/${target}`; // e.g. aquaponics/dev1/control/light
  const payload = mode; // 'auto' | 'on' | 'off'
  mqttClient.publish(topic, payload, { qos: 1, retain: true });
}

// GET текущие режимы
app.get('/api/control/modes', authenticateToken, (req, res) => {
  const deviceId = req.query.device_id;
  if (!deviceId || deviceId !== req.user.device_id) {
    return res.status(403).json({ error: 'Unauthorized device access' });
  }
  const modes = getDeviceModes(deviceId);
  res.json(modes);
});

// SET режим света
app.post('/control/light', authenticateToken, (req, res) => {
  const deviceId = req.query.device_id;
  const { mode } = req.body;
  if (!deviceId || deviceId !== req.user.device_id) {
    return res.status(403).json({ error: 'Unauthorized device access' });
  }
  if (!validateMode(mode)) {
    return res.status(400).json({ error: 'Неверный режим. Используйте auto|on|off' });
  }
  const modes = getDeviceModes(deviceId);
  modes.light = mode;
  publishControl(deviceId, 'light', mode);
  res.json({ ok: true, modes });
});

// SET режим аэрации
app.post('/api/control/aeration', authenticateToken, (req, res) => {
  const deviceId = req.query.device_id;
  const { mode } = req.body;
  if (!deviceId || deviceId !== req.user.device_id) {
    return res.status(403).json({ error: 'Unauthorized device access' });
  }
  if (!validateMode(mode)) {
    return res.status(400).json({ error: 'Неверный режим. Используйте auto|on|off' });
  }
  const modes = getDeviceModes(deviceId);
  modes.aeration = mode;
  publishControl(deviceId, 'aeration', mode);
  res.json({ ok: true, modes });
});

// API для получения счетчика включений света
app.get('/api/lightswitches', authenticateToken, async (req, res) => {
  const deviceId = req.query.device_id;
  if (!deviceId || deviceId !== req.user.device_id) {
    return res.status(403).json({ error: 'Unauthorized device access' });
  }

  try {
    // Удаляем все записи, которые не за сегодняшний день (автоматический сброс)
    await pool.query(
      'DELETE FROM light_switches WHERE device_id = $1 AND date != CURRENT_DATE',
      [deviceId]
    );
    
    // Используем функцию БД для получения текущей даты
    // Если записи нет, автоматически возвращаем 0 (новый день = счетчик сброшен)
    const result = await pool.query(
      'SELECT count FROM light_switches WHERE device_id = $1 AND date = CURRENT_DATE',
      [deviceId]
    );
    res.json({ count: result.rows.length > 0 ? result.rows[0].count : 0 });
  } catch (err) {
    console.error(`Ошибка выбора PostgreSQL (light_switches): ${err.message}`);
    return res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// API графика
app.get('/api/data/humidity', authenticateToken, async (req, res) => {
  const { device_id, start, end, limit, timezone } = req.query;
  if (!device_id || device_id !== req.user.device_id) {
    return res.status(403).json({ error: 'Unauthorized device access' });
  }
  const queryLimit = parseInt(limit) || 100;
  // Преобразуем ISO строки в формат для PostgreSQL
  const startTime = start 
    ? new Date(start).toISOString().slice(0, 19).replace('T', ' ')
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const endTime = end 
    ? new Date(end).toISOString().slice(0, 19).replace('T', ' ')
    : new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    // Преобразуем ISO строки в timestamp для PostgreSQL
    const startDate = start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    const startTimeUTC = startDate.toISOString();
    const endTimeUTC = endDate.toISOString();
    
    console.log(`[humidity] Запрос: device_id=${device_id}, startTime=${startTimeUTC}, endTime=${endTimeUTC}`);
    // Возвращаем timestamp в формате ISO (UTC), фронтенд преобразует в локальное время
    const result = await pool.query(
      `SELECT value, timestamp AT TIME ZONE 'UTC' as timestamp 
       FROM humidity 
       WHERE device_id = $1 AND timestamp BETWEEN $2::timestamptz AND $3::timestamptz 
       ORDER BY timestamp ASC LIMIT $4`,
      [device_id, startTimeUTC, endTimeUTC, queryLimit]
    );
    console.log(`[humidity] Найдено ${result.rows.length} записей`);
    // PostgreSQL автоматически преобразует timestamp в ISO формат при сериализации JSON
    const rows = result.rows.map(row => ({
      value: row.value,
      timestamp: row.timestamp.toISOString()
    }));
    res.json(rows);
  } catch (err) {
    console.error(`Ошибка выбора PostgreSQL (humidity): ${err.message}`);
    return res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.get('/api/data/light', authenticateToken, async (req, res) => {
  const { device_id, start, end, limit, timezone } = req.query;
  if (!device_id || device_id !== req.user.device_id) {
    return res.status(403).json({ error: 'Unauthorized device access' });
  }
  const queryLimit = parseInt(limit) || 100;

  try {
    // Преобразуем ISO строки в timestamp для PostgreSQL
    const startDate = start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    const startTimeUTC = startDate.toISOString();
    const endTimeUTC = endDate.toISOString();
    
    // Возвращаем timestamp в формате ISO (UTC), фронтенд преобразует в локальное время
    const result = await pool.query(
      `SELECT value, timestamp AT TIME ZONE 'UTC' as timestamp 
       FROM light 
       WHERE device_id = $1 AND timestamp BETWEEN $2::timestamptz AND $3::timestamptz 
       ORDER BY timestamp ASC LIMIT $4`,
      [device_id, startTimeUTC, endTimeUTC, queryLimit]
    );
    // PostgreSQL автоматически преобразует timestamp в ISO формат при сериализации JSON
    const rows = result.rows.map(row => ({
      value: row.value,
      timestamp: row.timestamp.toISOString()
    }));
    res.json(rows);
  } catch (err) {
    console.error(`Ошибка выбора PostgreSQL (light): ${err.message}`);
    return res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// История температуры
app.get('/api/data/temperature', authenticateToken, async (req, res) => {
  const { device_id, start, end, limit, timezone } = req.query;
  if (!device_id || device_id !== req.user.device_id) {
    return res.status(403).json({ error: 'Unauthorized device access' });
  }
  const queryLimit = parseInt(limit) || 100;

  try {
    // Преобразуем ISO строки в timestamp для PostgreSQL
    const startDate = start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    const startTimeUTC = startDate.toISOString();
    const endTimeUTC = endDate.toISOString();
    
    // Возвращаем timestamp в формате ISO (UTC), фронтенд преобразует в локальное время
    const result = await pool.query(
      `SELECT value, timestamp AT TIME ZONE 'UTC' as timestamp 
       FROM temperature 
       WHERE device_id = $1 AND timestamp BETWEEN $2::timestamptz AND $3::timestamptz 
       ORDER BY timestamp ASC LIMIT $4`,
      [device_id, startTimeUTC, endTimeUTC, queryLimit]
    );
    // PostgreSQL автоматически преобразует timestamp в ISO формат при сериализации JSON
    const rows = result.rows.map(row => ({
      value: row.value,
      timestamp: row.timestamp.toISOString()
    }));
    res.json(rows);
  } catch (err) {
    console.error(`Ошибка выбора PostgreSQL (temperature): ${err.message}`);
    return res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// API для получения списка устройств (в будующем, если у одного пользователя несколько устройств)
app.get('/api/devices', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT device_id FROM devices WHERE device_id = $1', [req.user.device_id]);
    res.json({ devices: result.rows.map(row => row.device_id) });
  } catch (err) {
    console.error(`Ошибка выбора PostgreSQL (devices): ${err.message}`);
    return res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.get('/api/user/device', authenticateToken, (req, res) => {
  // извлечение device_id
  res.json({ device_id: req.user.device_id });
});

// Запуск сервера
const server = app.listen(3000, '0.0.0.0', () => {
  console.log('Сервер запущен на http://0.0.0.0:3000');
});

// мягкое отключение сервера
process.on('SIGTERM', async () => {
  console.log('Получен SIGTERM. Корректное завершение работы...');
  server.close(async () => {
    await pool.end();
    mqttClient.end();
    console.log('Сервер остановлен');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('Получен SIGINT. Корректное завершение работы...');
  server.close(async () => {
    await pool.end();
    mqttClient.end();
    console.log('Сервер остановлен');
    process.exit(0);
  });
});
