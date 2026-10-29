/**
 * Контроллер для управления растениями
 */
const { pool } = require('../config/database');

const validateConditions = ({ temperature, light }) => {
    if ([temperature, light].some(value => value != null && typeof value !== 'string')) {
        return 'Температура и освещение должны быть текстом';
    }
    if ([temperature, light].some(value => typeof value === 'string' && value.trim().length > 80)) {
        return 'Температура и освещение — не более 80 символов каждое';
    }
    return null;
};

const plantsController = {
    /**
     * Получить список всех растений
     */
    getPlants: async (req, res) => {
        try {
            const { rows } = await pool.query(
                'SELECT id, name, description, contains, image, temperature, light, is_preset, created_at FROM plants ORDER BY created_at'
            );
            res.json({
                count: rows.length,
                plants: rows.map(plant => ({
                    id: plant.id,
                    name: plant.name,
                    description: plant.description,
                    contains: plant.contains,
                    image: plant.image,
                    temperature: plant.temperature,
                    light: plant.light,
                    isPreset: plant.is_preset,
                    createdAt: plant.created_at,
                })),
            });
        } catch (error) {
            console.error('Ошибка получения растений:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    },

    /**
     * Создать новое растение
     */
    createPlant: async (req, res) => {
        try {
            const { id, name, description, contains, image, temperature, light } = req.body;

            if (!name || !description || !contains) {
                return res.status(400).json({ error: 'Название, описание и состав обязательны' });
            }
            const conditionError = validateConditions(req.body);
            if (conditionError) return res.status(400).json({ error: conditionError });

            const plantId = id || (name.toLowerCase().replace(/\s+/g, '_') + Date.now());
            const containsArray = Array.isArray(contains) ? contains : [contains];

            const { rows } = await pool.query(
                `INSERT INTO plants (id, name, description, contains, image, temperature, light)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id, name, description, contains, image, temperature, light, is_preset, created_at`,
                [plantId, name, description, containsArray, image || null, temperature?.trim() || null, light?.trim() || null]
            );

            res.status(201).json({
                message: 'Растение добавлено',
                plant: {
                    id: rows[0].id,
                    name: rows[0].name,
                    description: rows[0].description,
                    contains: rows[0].contains,
                    image: rows[0].image,
                    temperature: rows[0].temperature,
                    light: rows[0].light,
                    isPreset: rows[0].is_preset,
                    createdAt: rows[0].created_at,
                },
            });
        } catch (error) {
            console.error('Ошибка создания растения:', error);
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Растение с таким ID уже существует' });
            }
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    },

    /**
     * Удалить растение
     */
    deletePlant: async (req, res) => {
        try {
            const { id } = req.params;

            const { rows } = await pool.query(
                'DELETE FROM plants WHERE id = $1 RETURNING id, name',
                [id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Растение не найдено' });
            }

            res.json({
                message: `Растение "${rows[0].name}" удалено`,
                deletedPlant: rows[0],
            });
        } catch (error) {
            console.error('Ошибка удаления растения:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    },
    /**
     * Обновить растение
     */
    updatePlant: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, contains, image, temperature, light } = req.body;

            if (!name || !description || !contains) {
                return res.status(400).json({ error: 'Название, описание и состав обязательны' });
            }
            const conditionError = validateConditions(req.body);
            if (conditionError) return res.status(400).json({ error: conditionError });

            const containsArray = Array.isArray(contains) ? contains : [contains];

            const { rows } = await pool.query(
                `UPDATE plants
                 SET name = $1, description = $2, contains = $3, image = $4,
                     temperature = COALESCE($5, temperature), light = COALESCE($6, light)
                 WHERE id = $7
                 RETURNING id, name, description, contains, image, temperature, light, is_preset, created_at`,
                [name, description, containsArray, image || null, temperature?.trim() ?? null, light?.trim() ?? null, id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Растение не найдено' });
            }

            res.json({
                message: 'Растение обновлено',
                plant: {
                    id: rows[0].id,
                    name: rows[0].name,
                    description: rows[0].description,
                    contains: rows[0].contains,
                    image: rows[0].image,
                    temperature: rows[0].temperature,
                    light: rows[0].light,
                    isPreset: rows[0].is_preset,
                    createdAt: rows[0].created_at,
                },
            });
        } catch (error) {
            console.error('Ошибка обновления растения:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    },
};

module.exports = plantsController;
