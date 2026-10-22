/**
 * Сервис кодов подтверждения (email-верификация, смена почты, сброс пароля).
 * Коды хранятся в БД в виде SHA-256 хэша, с ограничением срока жизни,
 * числа попыток и интервала повторной отправки (антиспам).
 */
const crypto = require('crypto');
const config = require('../config');
const { pool } = require('../config/database');

/** Виды кодов: подтверждение почты, смена почты, смена пароля, сброс пароля */
const TYPES = ['confirm_email', 'change_email', 'change_password', 'reset_password'];

/** SHA-256 хэш кода (код не хранится в открытом виде) */
const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

/** Генерация 6-значного кода через криптографически безопасный генератор */
const generateCode = () => String(crypto.randomInt(100000, 1000000));

/**
 * Создать новый код для пользователя.
 * Предыдущие неиспользованные коды того же типа инвалидируются.
 * @returns {Promise<{ok: boolean, code?: string, error?: string}>}
 */
const createCode = async (userId, type, email = null) => {
    if (!TYPES.includes(type)) {
        return { ok: false, error: 'Неизвестный тип кода' };
    }

    // Антиспам: повторная отправка запрещена в течение cooldown
    const cooldown = await canResend(userId, type);
    if (!cooldown.ok) return { ok: false, error: cooldown.error };

    const code = generateCode();

    // Инвалидируем старые неиспользованные коды этого типа
    await pool.query(
        `UPDATE verification_codes SET used_at = NOW()
         WHERE user_id = $1 AND type = $2 AND used_at IS NULL`,
        [userId, type]
    );

    const expiresAt = new Date(Date.now() + config.email.codeTtlMs);
    await pool.query(
        `INSERT INTO verification_codes (user_id, type, code_hash, email, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, type, hashCode(code), email, expiresAt]
    );

    return { ok: true, code };
};

/** Проверка интервала повторной отправки */
const canResend = async (userId, type) => {
    const res = await pool.query(
        `SELECT created_at FROM verification_codes
         WHERE user_id = $1 AND type = $2 AND used_at IS NULL
         ORDER BY id DESC LIMIT 1`,
        [userId, type]
    );

    if (res.rows.length === 0) return { ok: true };

    const nextAllowed = new Date(res.rows[0].created_at).getTime() + config.email.codeCooldownMs;
    if (Date.now() < nextAllowed) {
        const waitSeconds = Math.max(1, Math.ceil((nextAllowed - Date.now()) / 1000));
        return { ok: false, error: `Подождите ${waitSeconds} сек перед повторной отправкой` };
    }

    return { ok: true };
};

/**
 * Проверить введённый код.
 * @param {number} userId
 * @param {string} type
 * @param {string} code - введённый код
 * @param {string|null} email - адрес, к которому привязан код (для change_email / reset_password)
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
const verifyCode = async (userId, type, code, email = null) => {
    const res = await pool.query(
        `SELECT id, code_hash, expires_at, attempts, email
         FROM verification_codes
         WHERE user_id = $1 AND type = $2 AND used_at IS NULL
         ORDER BY id DESC LIMIT 1`,
        [userId, type]
    );

    if (res.rows.length === 0) {
        return { ok: false, error: 'Код не найден или уже использован. Запросите новый код.' };
    }

    const record = res.rows[0];

    // Привязка к конкретному адресу (смена почты / сброс пароля)
    if (email && record.email !== email) {
        return { ok: false, error: 'Код не соответствует указанному email' };
    }

    // Исчерпаны попытки
    if (record.attempts >= config.email.codeMaxAttempts) {
        await pool.query('UPDATE verification_codes SET used_at = NOW() WHERE id = $1', [record.id]);
        return { ok: false, error: 'Слишком много неверных попыток. Запросите новый код.' };
    }

    // Истёк по времени
    if (new Date(record.expires_at) < new Date()) {
        await pool.query('UPDATE verification_codes SET used_at = NOW() WHERE id = $1', [record.id]);
        return { ok: false, error: 'Код истёк. Запросите новый код.' };
    }

    if (hashCode(code) !== record.code_hash) {
        await pool.query(
            'UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1',
            [record.id]
        );
        return { ok: false, error: 'Неверный код' };
    }

    // Успех — помечаем использованным
    await pool.query('UPDATE verification_codes SET used_at = NOW() WHERE id = $1', [record.id]);
    return { ok: true };
};

module.exports = { generateCode, createCode, verifyCode, hashCode };