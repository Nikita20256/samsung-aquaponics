const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Начальные устройства для разработки/тестирования
const DEVICES = [
  {
    device_id: 'dev1',
    password: '123',
  },
  {
    device_id: 'dev2',
    password: '456',
  },
];

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'aquaponics_db',
  user: process.env.DB_USER || 'aquaponics_app',
  password: process.env.DB_PASSWORD || 'aserver',
  max: 5,
});

async function initDevices() {
  try {
    await pool.query('SELECT NOW()');
    console.log('PostgreSQL подключен, начинаем добавление устройств...');

    for (const device of DEVICES) {
      try {
        const passwordHash = await bcrypt.hash(device.password, 10);
        await pool.query(
          'INSERT INTO devices (device_id, device_secret) VALUES ($1, $2) ON CONFLICT (device_id) DO NOTHING',
          [device.device_id, passwordHash]
        );
        console.log(`Устройство ${device.device_id} добавлено (или уже существовало).`);
      } catch (err) {
        console.error(`Ошибка при добавлении устройства ${device.device_id}: ${err.message}`);
      }
    }

    console.log('Инициализация устройств завершена.');
  } catch (err) {
    console.error(`Ошибка подключения/инициализации PostgreSQL: ${err.message}`);
  } finally {
    await pool.end();
  }
}

initDevices();


