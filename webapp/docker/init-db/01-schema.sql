-- ============================================
-- Aquaponics - Database Schema
-- Auto-executed on first Docker startup
-- ============================================

-- ============================================
-- 1. Devices table
-- ============================================
CREATE TABLE IF NOT EXISTS devices (
  device_id      TEXT PRIMARY KEY,
  device_secret  TEXT NOT NULL
);

-- ============================================
-- 2. Users table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  user_id       BIGSERIAL PRIMARY KEY,
  login         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email         TEXT UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  timezone      TEXT,
  timezone_manual BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin      BOOLEAN DEFAULT FALSE,
  CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ============================================
-- 3. User-Device link
-- ============================================
CREATE TABLE IF NOT EXISTS user_devices (
  user_id               BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  device_id             TEXT   NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, device_id)
);

-- ============================================
-- 3b. Verification codes (email confirm, email change, password reset)
-- ============================================
CREATE TABLE IF NOT EXISTS verification_codes (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('confirm_email', 'change_email', 'change_password', 'reset_password')),
  code_hash  TEXT NOT NULL,
  email      TEXT,
  expires_at TIMESTAMP NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  used_at    TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user_type
  ON verification_codes (user_id, type, used_at);

-- ============================================
-- 4. Sensor readings
-- ============================================
CREATE TABLE IF NOT EXISTS humidity (
  id         BIGSERIAL PRIMARY KEY,
  device_id  TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  value      NUMERIC(10,2) NOT NULL CHECK (value >= 0 AND value <= 100),
  timestamp  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_humidity_device_ts
  ON humidity (device_id, timestamp);

CREATE TABLE IF NOT EXISTS light (
  id         BIGSERIAL PRIMARY KEY,
  device_id  TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  value      NUMERIC(10,2) NOT NULL CHECK (value >= 0),
  timestamp  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_light_device_ts
  ON light (device_id, timestamp);

CREATE TABLE IF NOT EXISTS temperature (
  id         BIGSERIAL PRIMARY KEY,
  device_id  TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  value      NUMERIC(10,2) NOT NULL CHECK (value >= -50 AND value <= 150),
  timestamp  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_temperature_device_ts
  ON temperature (device_id, timestamp);

-- ============================================
-- 5. Plants catalog
-- ============================================
CREATE TABLE IF NOT EXISTS plants (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL,
  contains      TEXT[] NOT NULL DEFAULT '{}',
  image         TEXT,
  temperature   TEXT,
  light         TEXT,
  is_preset     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- ============================================
-- 6. Light switch counter
-- ============================================
CREATE TABLE IF NOT EXISTS light_switches (
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  date      DATE NOT NULL,
  count     INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (device_id, date)
);

-- ============================================
-- 7. Notification settings
-- ============================================
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id               BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  email_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  notification_interval INTEGER NOT NULL DEFAULT 60
);

-- ============================================
-- 8. Sensor thresholds per user + device
-- ============================================
CREATE TABLE IF NOT EXISTS user_thresholds (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  device_id   TEXT   NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  sensor_type TEXT NOT NULL CHECK (sensor_type IN ('temperature', 'humidity', 'light')),
  min_value   NUMERIC(10,2) NOT NULL,
  max_value   NUMERIC(10,2) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (user_id, device_id, sensor_type)
);

-- ============================================
-- 9. Notification log (anti-spam)
-- ============================================
CREATE TABLE IF NOT EXISTS notification_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  device_id   TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  sensor_type TEXT NOT NULL,
  last_sent_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  UNIQUE (user_id, device_id, sensor_type)
);

-- ============================================
-- 10. Default thresholds for existing users
-- ============================================
INSERT INTO notification_settings (user_id)
  SELECT user_id FROM users
  ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_thresholds (user_id, device_id, sensor_type, min_value, max_value)
  SELECT ud.user_id, ud.device_id, t.sensor_type, t.min_val, t.max_val
  FROM user_devices ud
  CROSS JOIN (
    VALUES
      ('temperature', 15.0, 35.0),
      ('humidity',    30.0, 90.0),
      ('light',        0.0, 10000.0)
  ) AS t(sensor_type, min_val, max_val)
  ON CONFLICT (user_id, device_id, sensor_type) DO NOTHING;

-- ============================================
-- 11. Permissions
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'aquaponics_app') THEN
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT ALL ON TABLES TO aquaponics_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT ALL ON SEQUENCES TO aquaponics_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT ALL ON FUNCTIONS TO aquaponics_app;

    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aquaponics_app;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aquaponics_app;
  END IF;
END
$$;

-- ============================================
-- Done! Schema created successfully.
-- ============================================
