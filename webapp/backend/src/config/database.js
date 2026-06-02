const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool(config.db);

pool.on('error', (err) => {
    console.error('Неожиданная ошибка на неактивном клиенте PostgreSQL:', err.message);
    process.exit(-1);
});

const initDatabase = async () => {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('PostgreSQL успешно подключен');
        return true;
    } catch (err) {
        console.error(`Ошибка подключения к PostgreSQL: ${err.message}`);
        console.error('Убедитесь, что PostgreSQL запущен и таблицы созданы');
        return false;
    }
};

module.exports = {
    pool,
    initDatabase,
};

