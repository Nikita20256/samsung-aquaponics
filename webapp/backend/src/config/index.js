require('dotenv').config();

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'aquaponics_db',
    user: process.env.DB_USER || 'aquaponics_app',
    password: process.env.DB_PASSWORD || 'aserver',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretjwttokenblabla',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // MQTT
  mqtt: {
    host: process.env.MQTT_HOST || 'mqtt://localhost:1883',
    options: {
      reconnectPeriod: 1000,
      username: process.env.MQTT_USERNAME || 'device',
      password: process.env.MQTT_PASSWORD || 'device_password',
    },
  },

  // Устройство
  device: {
    // Через сколько секунд без сообщений устройство считается offline
    offlineTimeoutSeconds: parseInt(process.env.DEVICE_OFFLINE_TIMEOUT_SECONDS, 10) || 120,
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
      : ['*'],
  },

  // Email (SMTP)
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    // Коды подтверждения (верификация email, смена почты, сброс пароля)
    codeTtlMs: (parseInt(process.env.EMAIL_CODE_TTL_MINUTES, 10) || 15) * 60 * 1000,   // срок жизни кода
    codeCooldownMs: (parseInt(process.env.EMAIL_CODE_RESEND_SECONDS, 10) || 60) * 1000, // повторная отправка
    codeMaxAttempts: parseInt(process.env.EMAIL_CODE_MAX_ATTEMPTS, 10) || 5,             // попыток ввода
  },

};

// Warn if using default secrets in production
if (!config.isDev && config.jwt.secret === 'supersecretjwttokenblabla') {
  console.warn('⚠️  WARNING: Using default JWT secret in production is insecure!');
}

module.exports = config;
