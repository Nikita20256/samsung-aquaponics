/**
 * Email-сервис для отправки уведомлений через SMTP (nodemailer)
 */
const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

/**
 * Абсолютное время в UTC — используется как запасной вариант,
 * когда часовой пояс пользователя неизвестен или некорректен.
 */
const formatUtcTime = (date) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${p(date.getUTCDate())}.${p(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}, ${p(date.getUTCHours())}:${p(date.getUTCMinutes())} UTC`;
};

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

    const { deviceId, sensorType, value, minValue, maxValue, timezone = null, sentAt = new Date() } = alert;

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
            high: 'Откройте окно или переставьте установку в более прохладное место.',
            low:  'Закройте окно и переставьте установку в более тёплое место.',
        },
        humidity: {
            high: 'Почва переувлажнена — уменьшите полив и проверьте, не застаивается ли вода.',
            low:  'Почва пересохла — полейте и проверьте работу насоса.',
        },
        light: {
            high: 'Освещённость выше нормы — выключите или приглушите дополнительное освещение.',
            low:  'Освещённость ниже нормы — включите дополнительное освещение или придвиньте лампу ближе к растениям.',
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

    // Время фиксации — в часовом поясе пользователя (хранится в профиле, IANA-зона).
// Если зона неизвестна — показываем абсолютное UTC.
const formatAlertTime = (date, tz) => {
    if (tz) {
        try {
            return new Intl.DateTimeFormat('ru-RU', {
                timeZone: tz,
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(date);
        } catch (_) {
            // Битый/неизвестный IANA-код — откат на UTC
        }
    }
    return formatUtcTime(date);
};
const alertTime = formatAlertTime(sentAt, timezone);

const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Уведомление — Aquaponics</title>
  <style>
    body { margin: 0; padding: 0; background-color: #eaf3ee; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; }
    .shell { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
    .card { background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 40px rgba(11, 46, 38, 0.12); }

    /* Header */
    .header { background: linear-gradient(135deg, #0B2E26 0%, #0F4A3A 55%, #138962 100%); padding: 36px 28px 28px 28px; text-align: center; border-bottom: 3px solid #F5D742; }
    .badge { display: inline-block; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.25); border-radius: 50px; padding: 10px 14px; font-size: 26px; line-height: 1; margin-bottom: 14px; }
    .header-title { font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0; letter-spacing: 0.5px; }
    .header-subtitle { font-size: 13px; color: #B9E6D2; margin: 0; letter-spacing: 0.4px; }

    /* Status banner */
    .status-banner { padding: 18px 24px; text-align: center; background: ${statusBg}; border-bottom: 1px solid ${statusColor}40; }
    .status-icon { width: 34px; height: 34px; border-radius: 50%; background: ${statusColor}; color: #ffffff; display: inline-block; text-align: center; line-height: 34px; font-size: 16px; font-weight: 700; margin-bottom: 8px; }
    .status-text { font-size: 16px; font-weight: 700; color: ${statusColor}; margin: 0; }
    .status-sub { font-size: 12.5px; color: ${statusColor}CC; margin: 6px 0 0 0; }

    /* Body */
    .body { padding: 32px 28px 28px 28px; }
    .eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.6px; color: #8FB3A4; margin: 0 0 14px 0; text-align: center; }

    /* Metric card */
    .metric-card { background: linear-gradient(135deg, #F3FAF6 0%, #E5F2EB 100%); border: 1px solid rgba(19, 137, 98, 0.12); border-radius: 16px; padding: 24px 20px; text-align: center; margin-bottom: 22px; }
    .metric-icon { font-size: 38px; margin-bottom: 6px; }
    .metric-value { font-size: 40px; font-weight: 800; color: #0B2E26; margin: 0; line-height: 1.2; }
    .metric-unit { font-size: 20px; font-weight: 500; color: #138962; }
    .metric-label { font-size: 13px; color: #5A7A70; margin-top: 6px; }

    /* Details table */
    .details { border-collapse: collapse; width: 100%; margin-bottom: 22px; }
    .details td { padding: 11px 6px; border-bottom: 1px solid #EEF5F1; font-size: 14px; }
    .detail-label { color: #5A7A70; }
    .detail-value { font-weight: 600; color: #0B2E26; text-align: right; }
    .details tr:last-child td { border-bottom: none; }

    /* Recommendation */
    .recommendation { background: #FFF9E6; border-left: 4px solid #F5D742; border-radius: 0 12px 12px 0; padding: 14px 18px; margin-bottom: 26px; }
    .recommendation-title { font-size: 13px; font-weight: 700; color: #8A6D0B; margin: 0 0 4px 0; }
    .recommendation-text { font-size: 13px; color: #5A4A0A; margin: 0; line-height: 1.55; }

    /* Button */
    .btn-wrap { text-align: center; }
    .btn { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #138962 0%, #0D6A4A 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 600; box-shadow: 0 6px 18px rgba(19, 137, 98, 0.35); }

    /* Footer */
    .footer { padding: 22px 28px; background: #F6FAF8; text-align: center; border-top: 1px solid #E3EEE8; }
    .footer-text { font-size: 12px; color: #8AA89C; margin: 0 0 6px 0; line-height: 1.5; }
    .footer-brand { font-size: 12px; font-weight: 700; color: #138962; margin: 0; letter-spacing: 1px; text-transform: uppercase; }
  </style>
</head>
<body bgcolor="#eaf3ee">
  <div class="wrapper">
    <div class="shell">
      <div class="card">
        <!-- Header -->
        <div class="header">
          <span class="badge">🌿</span>
          <h1 class="header-title">Aquaponics</h1>
          <p class="header-subtitle">Система мониторинга умной аквапоники</p>
        </div>

        <!-- Status banner -->
        <div class="status-banner">
          <div class="status-icon">${arrow}</div>
          <p class="status-text">${statusText}</p>
          <p class="status-sub">Устройство ${deviceId} · ${name} ${icon}</p>
        </div>

        <!-- Body -->
        <div class="body">
          <p class="eyebrow">Параметр датчика</p>

          <div class="metric-card">
            <div class="metric-icon">${icon}</div>
            <p class="metric-value">${value}<span class="metric-unit">${unit}</span></p>
            <p class="metric-label">${name} · Устройство <strong>${deviceId}</strong></p>
          </div>

          <table class="details" role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td class="detail-label">Тип датчика</td>
              <td class="detail-value">${icon} ${name}</td>
            </tr>
            <tr>
              <td class="detail-label">Устройство</td>
              <td class="detail-value">${deviceId}</td>
            </tr>
            <tr>
              <td class="detail-label">Допустимый диапазон</td>
              <td class="detail-value">${minValue}${unit} — ${maxValue}${unit}</td>
            </tr>
            <tr>
              <td class="detail-label">Текущее значение</td>
              <td class="detail-value" style="color:${statusColor};">${value}${unit}</td>
            </tr>
            <tr>
              <td class="detail-label">Нарушен предел</td>
              <td class="detail-value">${isHigh ? 'Максимум' : 'Минимум'} (${limit}${unit})</td>
            </tr>
            <tr>
              <td class="detail-label">Время фиксации</td>
              <td class="detail-value">${alertTime}</td>
            </tr>
          </table>

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
  </div>
</body>
</html>`;

    try {
        await transporter.sendMail({
            from: `"Aquaponics" <${config.email.user}>`,
            to,
            subject: `🌿 ${icon} ${name}: ${isHigh ? 'порог превышен' : 'ниже порога'} — ${deviceId}`,
            html,
        });
        return true;
    } catch (err) {
        console.error(`❌ Ошибка отправки email на ${to}: ${err.message}`);
        return false;
    }
};

/**
 * Письмо с кодом подтверждения (общий шаблон для всех фич).
 * @param {string} to - Адрес получателя
 * @param {object} opts - { code, subject, icon, title, intro, note }
 */
const sendCodeEmail = async (to, opts) => {
    if (!transporter) return { ok: false, error: 'SMTP не настроен' };

    const {
        code,
        subject,
        icon = '🔐',
        title,
        intro,
        note = 'Если вы не запрашивали этот код, просто проигнорируйте письмо.',
    } = opts;

    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject} — Aquaponics</title>
  <style>
    body { margin: 0; padding: 0; background-color: #eaf3ee; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; }
    .shell { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
    .card { background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 40px rgba(11, 46, 38, 0.12); }

    /* Header */
    .header { background: linear-gradient(135deg, #0B2E26 0%, #0F4A3A 55%, #138962 100%); padding: 36px 28px 30px 28px; text-align: center; border-bottom: 3px solid #F5D742; }
    .badge { display: inline-block; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.25); border-radius: 50px; padding: 10px 14px; font-size: 26px; line-height: 1; margin-bottom: 14px; }
    .header-title { font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0; letter-spacing: 0.5px; }
    .header-subtitle { font-size: 13px; color: #B9E6D2; margin: 0; letter-spacing: 0.4px; }

    /* Body */
    .body { padding: 32px 28px 28px 28px; }
    .eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.6px; color: #8FB3A4; margin: 0 0 10px 0; text-align: center; }
    .title { font-size: 20px; font-weight: 700; color: #0B2E26; margin: 0 0 12px 0; text-align: center; }
    .intro { font-size: 14px; line-height: 1.65; color: #3C5A50; margin: 0 0 24px 0; text-align: center; }

    /* Code box */
    .code-box { background: linear-gradient(135deg, #F3FAF6 0%, #E5F2EB 100%); border: 2px dashed #9CC9B4; border-radius: 16px; padding: 28px 20px 22px 20px; text-align: center; margin-bottom: 22px; }
    .code { font-family: 'Courier New', Menlo, Consolas, monospace; font-size: 42px; font-weight: 700; letter-spacing: 14px; padding-right: 14px; color: #0B2E26; margin: 0; line-height: 1.15; }
    .code-slot { font-size: 14px; letter-spacing: 11px; padding-right: 11px; color: #7FA88F; font-weight: 700; margin: 6px 0 0 0; }
    .code-meta { font-size: 12px; color: #5A7A70; margin: 10px 0 0 0; }
    .tint { color: #138962; font-weight: 700; }

    /* Note */
    .note { background: #FFF9E6; border-left: 4px solid #F5D742; border-radius: 0 12px 12px 0; padding: 14px 18px; font-size: 12.5px; color: #5A4A0A; margin: 0; line-height: 1.55; }

    /* Footer */
    .footer { padding: 22px 28px; background: #F6FAF8; text-align: center; border-top: 1px solid #E3EEE8; }
    .footer-text { font-size: 12px; color: #8AA89C; margin: 0 0 6px 0; line-height: 1.5; }
    .footer-brand { font-size: 12px; font-weight: 700; color: #138962; margin: 0; letter-spacing: 1px; text-transform: uppercase; }
  </style>
</head>
<body bgcolor="#eaf3ee">
  <div class="wrapper">
    <div class="shell">
      <div class="card">
        <div class="header">
          <span class="badge">${icon}</span>
          <h1 class="header-title">Aquaponics</h1>
          <p class="header-subtitle">Система мониторинга умной аквапоники</p>
        </div>
        <div class="body">
          <p class="eyebrow">${icon} код подтверждения</p>
          <h2 class="title">${title}</h2>
          <p class="intro">${intro}</p>
          <div class="code-box">
            <p class="code">${code}</p>
            <p class="code-slot">_ _ _ _ _ _</p>
            <p class="code-meta">⏳ Код действителен <span class="tint">${Math.round((config.email.codeTtlMs || 15 * 60 * 1000) / 60000)} минут</span>. Никому не сообщайте его.</p>
          </div>
          <p class="note">ℹ️ ${note}</p>
        </div>
        <div class="footer">
          <p class="footer-text">Вы получили это письмо, так как адрес используется в аккаунте Aquaponics.</p>
          <p class="footer-brand">Aquaponics Monitor</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    try {
        await transporter.sendMail({
            from: `"Aquaponics" <${config.email.user}>`,
            to,
            subject: `🌿 ${subject}`,
            html,
        });
        return { ok: true };
    } catch (err) {
        console.error(`❌ Ошибка отправки email на ${to}: ${err.message}`);
        return { ok: false, error: err.message };
    }
};

/** Подтверждение почты (регистрация / повторная отправка) */
const sendVerificationCode = (to, code) => sendCodeEmail(to, {
    code,
    subject: 'Подтверждение почты',
    icon: '📧',
    title: 'Подтверждение почты',
    intro: `Здравствуйте! Для завершения регистрации подтвердите ваш email, введя код ниже на сайте.`,
});

/** Смена / привязка почты в профиле */
const sendEmailChangeCode = (to, code) => sendCodeEmail(to, {
    code,
    subject: 'Смена почты',
    icon: '✉️',
    title: 'Смена почты',
    intro: `Вы запросили смену email. Чтобы привязать новый адрес, введите код ниже в профиле.`,
});

/** Смена пароля в профиле */
const sendPasswordChangeCode = (to, code) => sendCodeEmail(to, {
    code,
    subject: 'Смена пароля',
    icon: '🔒',
    title: 'Смена пароля',
    intro: `Вы запросили смену пароля в профиле. Чтобы подтвердить действие, введите код ниже.`,
    note: 'Если это были не вы, просто проигнорируйте письмо — пароль останется прежним.',
});

/** Восстановление пароля */
const sendPasswordResetCode = (to, code) => sendCodeEmail(to, {
    code,
    subject: 'Восстановление пароля',
    icon: '🔑',
    title: 'Восстановление пароля',
    intro: `Вы запросили восстановление пароля. Для установки нового пароля введите код ниже.`,
    note: 'Если это были не вы, просто проигнорируйте письмо — пароль останется прежним.',
});

/**
 * Время в часовом поясе получателя (для текстов писем).
 * Если зона неизвестна — абсолютное время в UTC.
 */
const formatUserTime = (date, tz) => {
    if (tz) {
        try {
            return new Intl.DateTimeFormat('ru-RU', {
                timeZone: tz,
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(date);
        } catch (_) {
            // некорректная зона — откат на UTC
        }
    }
    return formatUtcTime(date);
};

/**
 * Тестовая отправка (для проверки настроек).
 */
const sendTestEmail = async (to, timezone = null) => {
    if (!transporter) return { ok: false, error: 'SMTP не настроен' };

    const now = new Date();
    const timeStr = formatUserTime(now, timezone);

    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Проверка уведомлений — Aquaponics</title>
  <style>
    body { margin: 0; padding: 0; background-color: #eaf3ee; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; }
    .shell { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
    .card { background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 40px rgba(11, 46, 38, 0.12); }
    .header { background: linear-gradient(135deg, #0B2E26 0%, #0F4A3A 55%, #138962 100%); padding: 36px 28px 30px 28px; text-align: center; border-bottom: 3px solid #F5D742; }
    .badge { display: inline-block; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.25); border-radius: 50px; padding: 10px 14px; font-size: 26px; line-height: 1; margin-bottom: 14px; }
    .header-title { font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0; letter-spacing: 0.5px; }
    .header-subtitle { font-size: 13px; color: #B9E6D2; margin: 0; letter-spacing: 0.4px; }
    .body { padding: 32px 28px 28px 28px; }
    .eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.6px; color: #8FB3A4; margin: 0 0 10px 0; text-align: center; }
    .title { font-size: 20px; font-weight: 700; color: #0B2E26; margin: 0 0 12px 0; text-align: center; }
    .intro { font-size: 14px; line-height: 1.65; color: #3C5A50; margin: 0 0 24px 0; text-align: center; }
    .status-box { background: linear-gradient(135deg, #F3FAF6 0%, #E5F2EB 100%); border: 2px dashed #9CC9B4; border-radius: 16px; padding: 26px 20px 20px 20px; text-align: center; margin-bottom: 22px; }
    .status-icon { font-size: 40px; line-height: 1; margin: 0 0 10px 0; }
    .status-text { font-size: 16px; font-weight: 700; color: #0B2E26; margin: 0 0 8px 0; }
    .status-meta { font-size: 12px; color: #5A7A70; margin: 0; }
    .tint { color: #138962; font-weight: 700; }
    .note { background: #FFF9E6; border-left: 4px solid #F5D742; border-radius: 0 12px 12px 0; padding: 14px 18px; font-size: 12.5px; color: #5A4A0A; margin: 0; line-height: 1.55; }
    .footer { padding: 22px 28px; background: #F6FAF8; text-align: center; border-top: 1px solid #E3EEE8; }
    .footer-text { font-size: 12px; color: #8AA89C; margin: 0 0 6px 0; line-height: 1.5; }
    .footer-brand { font-size: 12px; font-weight: 700; color: #138962; margin: 0; letter-spacing: 1px; text-transform: uppercase; }
  </style>
</head>
<body bgcolor="#eaf3ee">
  <div class="wrapper">
    <div class="shell">
      <div class="card">
        <div class="header">
          <span class="badge">🔔</span>
          <h1 class="header-title">Aquaponics</h1>
          <p class="header-subtitle">Система мониторинга умной аквапоники</p>
        </div>
        <div class="body">
          <p class="eyebrow">🔔 проверка уведомлений</p>
          <h2 class="title">Тестовое письмо</h2>
          <p class="intro">Здравствуйте! Это тестовое письмо от системы Aquaponics. Если вы его получили, значит уведомления на вашу почту доставляются корректно.</p>
          <div class="status-box">
            <p class="status-icon">✅</p>
            <p class="status-text">Почта подключена</p>
            <p class="status-meta">Время проверки: <span class="tint">${timeStr}</span></p>
          </div>
          <p class="note">ℹ️ Действий с вашей стороны не требуется. Настроить пороги и интервал уведомлений можно в личном кабинете.</p>
        </div>
        <div class="footer">
          <p class="footer-text">Вы получили это письмо, так как запросили проверку настроек в своём аккаунте Aquaponics.</p>
          <p class="footer-brand">Aquaponics Monitor</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    try {
        await transporter.sendMail({
            from: `"Aquaponics" <${config.email.user}>`,
            to,
            subject: '🌿 Проверка уведомлений',
            text: `Тестовое письмо Aquaponics. Почта подключена. Время проверки: ${timeStr}. Действий не требуется.`,
            html,
        });
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
};

const isReady = () => !!transporter;

module.exports = {
    init,
    sendThresholdAlert,
    sendTestEmail,
    sendVerificationCode,
    sendEmailChangeCode,
    sendPasswordChangeCode,
    sendPasswordResetCode,
    isReady,
};
