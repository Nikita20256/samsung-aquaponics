/**
 * Email-сервис для отправки уведомлений через SMTP (nodemailer)
 */
const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

/**
 * Инициализация транспортера. Вызывается один раз при старте приложения.
 */
const init = () => {
    if (!config.email.host || !config.email.user) {
        console.warn('⚠️  Email-сервис не настроен (EMAIL_HOST или EMAIL_USER не указаны). Email-уведомления отключены.');
        return;
    }

    transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465,
        auth: {
            user: config.email.user,
            pass: config.email.pass,
        },
    });

    transporter.verify((err) => {
        if (err) {
            console.error(`❌ Ошибка подключения к SMTP: ${err.message}`);
            transporter = null;
        } else {
            console.log(`✅ Email-сервис готов (${config.email.host})`);
        }
    });
};

/**
 * Отправка HTML-письма с уведомлением о выходе датчика за пороги.
 * @param {string} to - Адрес получателя
 * @param {object} alert - { deviceId, sensorType, value, minValue, maxValue }
 */
const sendThresholdAlert = async (to, alert) => {
    if (!transporter) return false;

    const { deviceId, sensorType, value, minValue, maxValue } = alert;

    const sensorNames = {
        temperature: 'Температура',
        humidity:    'Влажность',
        light:       'Освещённость',
    };
    const sensorUnits = {
        temperature: '°C',
        humidity:    '%',
        light:       'lx',
    };
    const sensorIcons = {
        temperature: '🌡️',
        humidity:    '💧',
        light:       '☀️',
    };
    const sensorRecommendations = {
        temperature: {
            high: 'Рекомендуется включить вентиляцию или охлаждение. Проверьте работу нагревателя.',
            low:  'Рекомендуется включить обогрев или утеплить установку. Проверьте работу датчика.',
        },
        humidity: {
            high: 'Рекомендуется включить вентиляцию или проверить систему циркуляции воды.',
            low:  'Рекомендуется увеличить полив или включить увлажнитель воздуха.',
        },
        light: {
            high: 'Рекомендуется отключить дополнительную подсветку или уменьшить её интенсивность.',
            low:  'Рекомендуется включить подсветку или увеличить её интенсивность.',
        },
    };

    const name   = sensorNames[sensorType]  || sensorType;
    const unit   = sensorUnits[sensorType]  || '';
    const icon   = sensorIcons[sensorType]  || '⚠️';
    const isHigh = value > maxValue;
    const limit  = isHigh ? maxValue : minValue;
    const arrow  = isHigh ? '▲' : '▼';
    const statusColor = isHigh ? '#e74c3c' : '#3498db';
    const statusBg    = isHigh ? '#fdeaea' : '#eaf2fd';
    const statusText  = isHigh ? 'Превышение допустимого значения' : 'Значение ниже нормы';
    const recommendation = sensorRecommendations[sensorType]?.[isHigh ? 'high' : 'low'] || '';

    // Вычисляем процент отклонения от нормы для визуализации
    const range = maxValue - minValue;
    const deviation = isHigh ? value - maxValue : minValue - value;
    const deviationPercent = range > 0 ? Math.min(Math.round((deviation / range) * 100), 100) : 0;

    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Уведомление — Aquaponics</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f0f7f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; padding: 24px 16px; box-sizing: border-box; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(15, 41, 37, 0.10); }
    
    /* Header */
    .header { background: linear-gradient(135deg, #0F2925 0%, #138962 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
    .header-icon { font-size: 48px; margin-bottom: 8px; }
    .header-title { font-size: 22px; font-weight: 700; margin: 0 0 4px 0; letter-spacing: 0.3px; }
    .header-subtitle { font-size: 13px; opacity: 0.85; margin: 0; }
    
    /* Alert banner */
    .alert-banner { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 24px; background: ${statusBg}; border-left: 4px solid ${statusColor}; }
    .alert-icon { width: 28px; height: 28px; border-radius: 50%; background: ${statusColor}; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
    .alert-text { font-size: 15px; font-weight: 600; color: ${statusColor}; margin: 0; }
    
    /* Body */
    .body { padding: 28px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #138962; margin: 0 0 12px 0; }
    
    /* Metric card */
    .metric-card { background: linear-gradient(135deg, #f4fbf7 0%, #e8f5ee 100%); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px; border: 1px solid rgba(19, 137, 98, 0.12); }
    .metric-icon { font-size: 36px; margin-bottom: 4px; }
    .metric-value { font-size: 36px; font-weight: 800; color: #0F2925; margin: 0; line-height: 1.2; }
    .metric-unit { font-size: 18px; font-weight: 500; color: #138962; }
    .metric-label { font-size: 13px; color: #5a7a70; margin-top: 4px; }
    
    /* Deviation bar */
    .deviation-section { margin-bottom: 20px; }
    .deviation-label { display: flex; justify-content: space-between; font-size: 12px; color: #5a7a70; margin-bottom: 6px; }
    .deviation-bar-bg { height: 8px; background: #e0ece6; border-radius: 4px; overflow: hidden; }
    .deviation-bar-fill { height: 100%; width: ${deviationPercent}%; background: linear-gradient(90deg, ${statusColor} 0%, ${isHigh ? '#c0392b' : '#2980b9'} 100%); border-radius: 4px; transition: width 0.6s ease; }
    
    /* Details grid */
    .details-grid { display: table; width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .detail-row { display: table-row; }
    .detail-cell { display: table-cell; padding: 10px 12px; border-bottom: 1px solid #eef5f1; font-size: 14px; vertical-align: middle; }
    .detail-cell:first-child { width: 45%; color: #5a7a70; }
    .detail-cell:last-child { font-weight: 600; color: #0F2925; text-align: right; }
    .detail-row:last-child .detail-cell { border-bottom: none; }
    
    /* Recommendation */
    .recommendation { background: #fff9e6; border-left: 4px solid #f5d742; border-radius: 0 10px 10px 0; padding: 14px 18px; margin-bottom: 24px; }
    .recommendation-title { font-size: 13px; font-weight: 700; color: #8a6d0b; margin: 0 0 4px 0; }
    .recommendation-text { font-size: 13px; color: #5a4a0a; margin: 0; line-height: 1.5; }
    
    /* Button */
    .btn-wrap { text-align: center; margin-bottom: 8px; }
    .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #138962 0%, #0d6a4a 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(19, 137, 98, 0.35); }
    
    /* Footer */
    .footer { padding: 20px 28px; background: #f8fbf9; text-align: center; border-top: 1px solid #e8f0ec; }
    .footer-text { font-size: 12px; color: #8aa89c; margin: 0 0 6px 0; }
    .footer-brand { font-size: 12px; font-weight: 700; color: #138962; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <!-- Header -->
      <div class="header">
        <div class="header-icon">🌿</div>
        <p class="header-title">Aquaponics</p>
        <p class="header-subtitle">Система мониторинга умной аквапоники</p>
      </div>
      
      <!-- Alert Banner -->
      <div class="alert-banner">
        <span class="alert-icon">${arrow}</span>
        <p class="alert-text">${statusText}</p>
      </div>
      
      <!-- Body -->
      <div class="body">
        <p class="section-title">Параметр датчика</p>
        
        <div class="metric-card">
          <div class="metric-icon">${icon}</div>
          <p class="metric-value">${value}<span class="metric-unit">${unit}</span></p>
          <p class="metric-label">${name} · Устройство <strong>${deviceId}</strong></p>
        </div>
        
        <div class="deviation-section">
          <div class="deviation-label">
            <span>Отклонение от нормы</span>
            <span>${deviationPercent}%</span>
          </div>
          <div class="deviation-bar-bg">
            <div class="deviation-bar-fill"></div>
          </div>
        </div>
        
        <p class="section-title">Детали</p>
        <div class="details-grid">
          <div class="detail-row">
            <div class="detail-cell">Тип датчика</div>
            <div class="detail-cell">${icon} ${name}</div>
          </div>
          <div class="detail-row">
            <div class="detail-cell">Устройство</div>
            <div class="detail-cell">${deviceId}</div>
          </div>
          <div class="detail-row">
            <div class="detail-cell">Допустимый диапазон</div>
            <div class="detail-cell">${minValue}${unit} — ${maxValue}${unit}</div>
          </div>
          <div class="detail-row">
            <div class="detail-cell">Текущее значение</div>
            <div class="detail-cell" style="color:${statusColor}">${value}${unit}</div>
          </div>
          <div class="detail-row">
            <div class="detail-cell">Нарушен предел</div>
            <div class="detail-cell">${isHigh ? 'Максимум' : 'Минимум'} (${limit}${unit})</div>
          </div>
          <div class="detail-row">
            <div class="detail-cell">Время фиксации</div>
            <div class="detail-cell">${new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
        
        <div class="recommendation">
          <p class="recommendation-title">💡 Рекомендация</p>
          <p class="recommendation-text">${recommendation}</p>
        </div>
        
        <div class="btn-wrap">
          <a class="btn" href="#">Открыть дашборд</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p class="footer-text">Вы получили это письмо, так как включили email-уведомления в настройках.</p>
        <p class="footer-brand">Aquaponics Monitor</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    try {
        await transporter.sendMail({
            from: `"Aquaponics" <${config.email.user}>`,
            to,
            subject: `🌿 ${icon} ${name}: ${isHigh ? 'превышен' : 'ниже'} порога — ${deviceId}`,
            html,
        });
        return true;
    } catch (err) {
        console.error(`❌ Ошибка отправки email на ${to}: ${err.message}`);
        return false;
    }
};

/**
 * Тестовая отправка (для проверки настроек).
 */
const sendTestEmail = async (to) => {
    if (!transporter) return { ok: false, error: 'SMTP не настроен' };
    try {
        await transporter.sendMail({
            from: `"Aquaponics" <${config.email.user}>`,
            to,
            subject: 'System Notification Check',
            text: `This is a simple system check for your Aquaponics Monitor account.
            If you received this email, your notification settings are correct.
            Sent at: ${new Date().toUTCString()}`,
        });
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
};

const isReady = () => !!transporter;

module.exports = { init, sendThresholdAlert, sendTestEmail, isReady };
