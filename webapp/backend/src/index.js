/**
 * Точка входа сервера Aquaponics
 */
const app = require('./app');
const config = require('./config');
const { initDatabase, pool } = require('./config/database');
const mqttService = require('./services/mqtt.service');
const { scheduleHourlySave } = require('./services/buffer.service');
const emailService = require('./services/email.service');

const startServer = async () => {
    console.log('Aquaponics Server');
    console.log('============================');
    console.log(`Environment: ${config.nodeEnv}`);

    const dbConnected = await initDatabase();
    if (!dbConnected) {
        console.error('Не удалось подключиться к базе данных');
        process.exit(1);
    }

    mqttService.connect();
    scheduleHourlySave();
    emailService.init();

    const server = app.listen(config.port, '0.0.0.0', () => {
        console.log(`Сервер запущен на http://0.0.0.0:${config.port}`);
        console.log('============================');
    });

    const shutdown = async (signal) => {
        console.log(`\nПолучен ${signal}. Завершение работы...`);

        server.close(async () => {
            console.log('HTTP сервер остановлен');
            mqttService.disconnect();
            await pool.end();
            console.log('PostgreSQL отключен');
            console.log('Сервер полностью остановлен');
            process.exit(0);
        });

        setTimeout(() => {
            console.error('Принудительное завершение после таймаута');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((err) => {
    console.error('Ошибка запуска сервера:', err);
    process.exit(1);
});

