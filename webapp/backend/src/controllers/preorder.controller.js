/**
 * Контроллер предзаказов (публичная форма на главной странице)
 */
const { pool } = require('../config/database');

const normalizePhone = (phone) => String(phone || '').replace(/\s+/g, ' ').trim();

const isValidPhone = (phone) => {
    const normalized = String(phone || '').trim();
    if (!/^\+?[\d\s()-]+$/.test(normalized)) return false;
    const digits = normalized.replace(/\D/g, '');
    // международные и локальные форматы (в т.ч. СНГ), 10–15 цифр
    return digits.length >= 10 && digits.length <= 15;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const preorderController = {
    /**
     * Создать предзаказ (публичный endpoint)
     */
    create: async (req, res) => {
        try {
            const fullName = String(req.body?.fullName || '').trim();
            const phone = normalizePhone(req.body?.phone);
            const city = String(req.body?.city || '').trim();
            const emailRaw = String(req.body?.email || '').trim();
            const email = emailRaw ? emailRaw.toLowerCase() : null;
            const consent = req.body?.consent;

            if (!fullName) {
                return res.status(400).json({ error: 'Укажите ваше ФИО' });
            }
            if (fullName.length > 150) {
                return res.status(400).json({ error: 'ФИО слишком длинное' });
            }
            if (!phone || !isValidPhone(phone)) {
                return res.status(400).json({ error: 'Укажите корректный номер телефона (например, +7 900 000-00-00)' });
            }
            if (phone.length > 30) {
                return res.status(400).json({ error: 'Номер телефона слишком длинный' });
            }
            if (!city) {
                return res.status(400).json({ error: 'Укажите город' });
            }
            if (city.length > 100) {
                return res.status(400).json({ error: 'Название города слишком длинное' });
            }
            if (email && !isValidEmail(email)) {
                return res.status(400).json({ error: 'Укажите корректный email' });
            }
            if (email && email.length > 254) {
                return res.status(400).json({ error: 'Email слишком длинный' });
            }
            if (consent !== true) {
                return res.status(400).json({ error: 'Необходимо согласие на обработку персональных данных' });
            }

            const { rows } = await pool.query(
                `INSERT INTO preorders (full_name, phone, city, email)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, full_name, phone, city, email, created_at`,
                [fullName, phone, city, email]
            );

            res.status(201).json({
                message: 'Заявка на предзаказ принята',
                preorder: rows[0],
            });
        } catch (error) {
            console.error('Ошибка создания предзаказа:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    },
};

module.exports = preorderController;
