/**
 * Express приложение
 */
const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// CORS настройки
const corsOptions = {
    origin: config.cors.origins.includes('*')
        ? '*'
        : (origin, callback) => {
            if (!origin || config.cors.origins.includes(origin)) {
                callback(null, true);
            } else {
                console.warn(`🚨 CORS blocked request from origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(express.static('public'));

// API роуты
app.use('/api', routes);

// Обработчик 404
app.use(notFoundHandler);

// Глобальный обработчик ошибок
app.use(errorHandler);

module.exports = app;
