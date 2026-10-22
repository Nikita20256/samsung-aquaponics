import { useState, useEffect, useRef } from 'react';
import notificationService from '../../services/notificationService';
import { useSensorData } from '../../hooks/useSensorData';
import {
  EmailIcon,
  ThermometerIcon,
  DropIcon,
  SunIcon,
  SaveIcon,
  BoltIcon,
  CheckIcon,
  CrossIcon,
  InfoIcon,
  BellIcon,
  ResetIcon,
  DeviceIcon
} from './ProfileIcons';
import './NotificationSettings.css';

// Описание датчиков: подпись, единица, иконка, диапазон шкалы и шаг изменения
const SENSOR_INFO = {
  temperature: {
    label: 'Температура',
    unit: '°C',
    icon: ThermometerIcon,
    color: '#e17055',
    gradient: 'linear-gradient(135deg, #ff8a65, #e17055)',
    domain: [-10, 50],
    step: 0.5,
  },
  humidity: {
    label: 'Влажность',
    unit: '%',
    icon: DropIcon,
    color: '#3498db',
    gradient: 'linear-gradient(135deg, #74b9ff, #3498db)',
    domain: [0, 100],
    step: 1,
  },
  light: {
    label: 'Освещение',
    unit: 'лк',
    icon: SunIcon,
    color: '#f0a500',
    gradient: 'linear-gradient(135deg, #fdcb6e, #f39c12)',
    domain: [0, 10000],
    step: 50,
  },
};

const SENSOR_ORDER = ['temperature', 'humidity', 'light'];

// Значения по умолчанию (для кнопки «По умолчанию» и подстраховки)
const DEFAULT_THRESHOLDS = [
  { sensor_type: 'temperature', min_value: 15, max_value: 35, is_active: true },
  { sensor_type: 'humidity', min_value: 30, max_value: 90, is_active: true },
  { sensor_type: 'light', min_value: 0, max_value: 10000, is_active: true },
];

const DEFAULT_BY_TYPE = DEFAULT_THRESHOLDS.reduce((acc, t) => {
  acc[t.sensor_type] = t;
  return acc;
}, {});

const sortThresholds = (rows) =>
  [...rows].sort(
    (a, b) => SENSOR_ORDER.indexOf(a.sensor_type) - SENSOR_ORDER.indexOf(b.sensor_type)
  );

const round2 = (v) => Math.round(v * 100) / 100;

/**
 * Карточка одного датчика: аккордеон + интерактивная шкала диапазона.
 */
function ThresholdCard({
  t, index, info, currentValue, expanded,
  onToggleExpand, onToggleActive, onRangeChange, onReset,
}) {
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const [active, setActive] = useState(null); // 'min' | 'max' | 'band' | null
  // «Свежие» пропсы для обработчиков, живущих на window во время перетаскивания
  const latest = useRef({});
  latest.current = { t, index, info, onRangeChange };

  const [dMin, dMax] = info.domain;
  const step = info.step;
  const span = dMax - dMin;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const pct = (val) => {
    const v = Number(val);
    if (!Number.isFinite(v)) return 0;
    return clamp(((v - dMin) / span) * 100, 0, 100);
  };

  // Пересчёт значений по позиции курсора
  const applyDrag = (clientX) => {
    const d = dragRef.current;
    if (!d) return;
    const cur = latest.current;
    const [dom0, dom1] = cur.info.domain;
    const st = cur.info.step;
    const delta = ((clientX - d.startX) / d.width) * (dom1 - dom0);
    let min = d.startMin;
    let max = d.startMax;

    if (d.mode === 'band') {
      let shift = Math.round(delta / st) * st;
      shift = clamp(shift, dom0 - d.startMin, dom1 - d.startMax);
      min = d.startMin + shift;
      max = d.startMax + shift;
    } else if (d.mode === 'min') {
      min = Math.round((d.startMin + delta) / st) * st;
      min = clamp(min, dom0, d.startMax - st);
    } else {
      max = Math.round((d.startMax + delta) / st) * st;
      max = clamp(max, d.startMin + st, dom1);
    }
    cur.onRangeChange(cur.index, { min_value: round2(min), max_value: round2(max) });
  };

  const startDrag = (mode) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      mode,
      width: rect.width || 1,
      startX: e.clientX,
      startMin: Number(t.min_value),
      startMax: Number(t.max_value),
    };
    setActive(mode);

    const move = (ev) => applyDrag(ev.clientX);
    const up = () => {
      dragRef.current = null;
      setActive(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onKeyDown = (mode) => (e) => {
    let dir = 0;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') dir = -1;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') dir = 1;
    else return;
    e.preventDefault();
    const mult = e.shiftKey ? 10 : 1;
    const delta = dir * step * mult;
    let min = Number(t.min_value);
    let max = Number(t.max_value);

    if (mode === 'band') {
      let shift = clamp(delta, dMin - min, dMax - max);
      min += shift;
      max += shift;
    } else if (mode === 'min') {
      min = clamp(min + delta, dMin, max - step);
    } else {
      max = clamp(max + delta, min + step, dMax);
    }
    onRangeChange(index, { min_value: round2(min), max_value: round2(max) });
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleExpand(t.sensor_type);
    }
  };

  return (
    <div className={`threshold-card-modern ${t.is_active ? 'active' : 'disabled'} ${expanded ? 'expanded' : 'collapsed'} ${active ? 'dragging' : ''}`}>
      {/* Заголовок — клик разворачивает карточку */}
      <div className="t-card-header" role="button" tabIndex={0} onClick={() => onToggleExpand(t.sensor_type)} onKeyDown={handleKey}>
        <div className="t-icon" style={{ background: info.gradient }}>
          <info.icon size={22} color="#fff" />
        </div>
        <div className="t-title-group">
          <span className="t-name">{info.label}</span>
          <span className="t-inline-range">
            {t.is_active
              ? `${t.min_value}–${t.max_value} ${info.unit}`
              : 'выключен'}
            {currentValue !== null && currentValue !== undefined && (
              <span className="t-inline-now"> · сейчас {currentValue}{info.unit}</span>
            )}
          </span>
        </div>
        <label className="modern-switch small" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={t.is_active}
            onChange={() => onToggleActive(index)}
          />
          <span className="modern-slider"></span>
        </label>
        <span className={`t-caret ${expanded ? 'open' : ''}`}>▾</span>
      </div>

      {expanded && (
        <div className="t-body fade-in">
          {/* Поля значений */}
          <div className="t-values">
            <div className="t-value-field">
              <span className="t-value-label">Не ниже</span>
              <div className="t-value-input">
                <input
                  type="number"
                  value={t.min_value}
                  onChange={(e) => onRangeChange(index, { min_value: e.target.value, max_value: t.max_value })}
                />
                <span className="t-value-unit">{info.unit}</span>
              </div>
            </div>
            <div className="t-value-sep">—</div>
            <div className="t-value-field">
              <span className="t-value-label">Не выше</span>
              <div className="t-value-input">
                <input
                  type="number"
                  value={t.max_value}
                  onChange={(e) => onRangeChange(index, { min_value: t.min_value, max_value: e.target.value })}
                />
                <span className="t-value-unit">{info.unit}</span>
              </div>
            </div>
          </div>

          {/* Интерактивная шкала */}
          <div className="range-visual">
            <div className="range-track" ref={trackRef}>
              <div className="range-clip">
                {/* Зоны вне нормы — «светофор» */}
                <div className="range-zone danger" style={{ left: 0, width: `${pct(t.min_value)}%` }} />
                <div className="range-zone danger" style={{ left: `${pct(t.max_value)}%`, width: `${100 - pct(t.max_value)}%` }} />
                {/* Рабочая зона */}
                <div className="range-fill" style={{ left: `${pct(t.min_value)}%`, width: `${Math.max(pct(t.max_value) - pct(t.min_value), 1)}%` }} />
              </div>

              {/* Полоса диапазона — тянется целиком */}
              <div
                className="range-band"
                style={{ left: `${pct(t.min_value)}%`, width: `${Math.max(pct(t.max_value) - pct(t.min_value), 1)}%` }}
                role="slider"
                tabIndex={0}
                aria-label="Сдвинуть весь диапазон"
                aria-valuemin={dMin}
                aria-valuemax={dMax}
                aria-valuenow={Number(t.min_value)}
                onPointerDown={startDrag('band')}
                onKeyDown={onKeyDown('band')}
              />

              {/* Маркер текущего значения */}
              {currentValue !== null && currentValue !== undefined && Number.isFinite(Number(currentValue)) && (
                <span className="range-marker" style={{ left: `${pct(currentValue)}%` }} title={`Текущее значение: ${currentValue} ${info.unit}`} />
              )}

              {/* Ручки */}
              <span
                className={`range-handle ${active === 'min' ? 'active' : ''}`}
                style={{ left: `${pct(t.min_value)}%` }}
                role="slider"
                tabIndex={0}
                aria-label="Нижняя граница"
                aria-valuemin={dMin}
                aria-valuemax={dMax}
                aria-valuenow={Number(t.min_value)}
                onPointerDown={startDrag('min')}
                onKeyDown={onKeyDown('min')}
              />
              <span
                className={`range-handle ${active === 'max' ? 'active' : ''}`}
                style={{ left: `${pct(t.max_value)}%` }}
                role="slider"
                tabIndex={0}
                aria-label="Верхняя граница"
                aria-valuemin={dMin}
                aria-valuemax={dMax}
                aria-valuenow={Number(t.max_value)}
                onPointerDown={startDrag('max')}
                onKeyDown={onKeyDown('max')}
              />

              {/* Пузырёк со значением при перетаскивании */}
              {active && (
                <span className="range-bubble" style={{ left: `${bubblePct(active, pct(t.min_value), pct(t.max_value))}%` }}>
                  {active === 'min' && `${t.min_value} ${info.unit}`}
                  {active === 'max' && `${t.max_value} ${info.unit}`}
                  {active === 'band' && `${t.min_value}–${t.max_value} ${info.unit}`}
                </span>
              )}
            </div>

            <div className="range-bounds">
              <span>{dMin}{info.unit}</span>
              <span>{dMax}{info.unit}</span>
            </div>
          </div>

          {/* Текущее значение + сброс */}
          <div className="t-body-footer">
            <span className="t-current">
              {currentValue !== null && currentValue !== undefined
                ? `Сейчас: ${currentValue} ${info.unit}`
                : 'Нет текущих данных'}
            </span>
            <button
              type="button"
              className="t-reset"
              onClick={(e) => {
                e.stopPropagation();
                onReset(index);
              }}
              title="Вернуть значения по умолчанию"
            >
              <ResetIcon size={15} /> По умолчанию
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Пузырёк не должен уезжать за края шкалы
function bubblePct(mode, lo, hi) {
  const p = mode === 'min' ? lo : mode === 'max' ? hi : (lo + hi) / 2;
  return Math.min(100, Math.max(0, p));
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    email_enabled: false,
    notification_interval: 60,
  });
  const [thresholds, setThresholds] = useState([]);
  const [devices, setDevices] = useState([]); // [{ device_id, notifications_enabled }]
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceEnabled, setDeviceEnabled] = useState(true);
  const [expanded, setExpanded] = useState({}); // по sensor_type
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [dirty, setDirty] = useState(false);

  // Текущие показания датчиков выбранного устройства
  const sensors = useSensorData(selectedDevice);
  const currentByType = {
    temperature: sensors.temperature,
    humidity: sensors.humidity,
    light: sensors.light,
  };

  const applySettingsData = (data, fallbackDevice) => {
    if (data.settings) {
      setSettings({
        email_enabled: !!data.settings.email_enabled,
        notification_interval: data.settings.notification_interval ?? 60,
      });
    }
    const rows = Array.isArray(data.thresholds) && data.thresholds.length
      ? data.thresholds
      : DEFAULT_THRESHOLDS;
    setThresholds(sortThresholds(rows));
    if (Array.isArray(data.devices) && data.devices.length) {
      setDevices(data.devices);
    }
    setDeviceEnabled(data.device ? !!data.device.notifications_enabled : true);
    setSelectedDevice(data.device_id || fallbackDevice || null);
    setDirty(false);
  };

  const loadDevice = async (deviceId, initial = false) => {
    if (!initial) setSwitching(true);
    try {
      const data = await notificationService.getSettings(deviceId);
      applySettingsData(data, deviceId);
    } catch (err) {
      console.error('Ошибка загрузки настроек:', err);
      setThresholds(sortThresholds(DEFAULT_THRESHOLDS));
      setMessage({ text: 'Не удалось загрузить настройки уведомлений', type: 'error' });
    } finally {
      setLoading(false);
      setSwitching(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await notificationService.getDevices();
        const list = Array.isArray(data.devices) ? data.devices : [];
        setDevices(list);
        const ids = list.map((d) => d.device_id);
        const saved = localStorage.getItem('selectedDeviceId');
        const pick =
          saved && ids.includes(saved)
            ? saved
            : data.current && ids.includes(data.current)
              ? data.current
              : ids[0] || null;
        await loadDevice(pick, true);
      } catch (err) {
        console.error('Ошибка загрузки устройств:', err);
        await loadDevice(null, true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectDevice = async (deviceId) => {
    if (deviceId === selectedDevice || switching) return;
    localStorage.setItem('selectedDeviceId', deviceId);
    setExpanded({});
    await loadDevice(deviceId);
  };

  const handleToggleSetting = (name) => {
    setSettings((prev) => ({ ...prev, [name]: !prev[name] }));
    setDirty(true);
  };

  const handleToggleDeviceEnabled = () => {
    setDeviceEnabled((prev) => !prev);
    setDevices((prev) =>
      prev.map((d) =>
        d.device_id === selectedDevice ? { ...d, notifications_enabled: !deviceEnabled } : d
      )
    );
    setDirty(true);
  };

  const handleToggleActive = (index) => {
    setThresholds((prev) =>
      prev.map((t, i) => (i === index ? { ...t, is_active: !t.is_active } : t))
    );
    setDirty(true);
  };

  const handleRangeChange = (index, patch) => {
    setThresholds((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...patch } : t))
    );
    setDirty(true);
  };

  const handleExpand = (type) => {
    setExpanded((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleReset = (index) => {
    setThresholds((prev) =>
      prev.map((t, i) => {
        if (i !== index) return t;
        const def = DEFAULT_BY_TYPE[t.sensor_type];
        return def ? { ...t, min_value: def.min_value, max_value: def.max_value } : t;
      })
    );
    setDirty(true);
  };

  const saveSettings = async () => {
    const interval = Number(settings.notification_interval);
    if (settings.email_enabled && (!Number.isFinite(interval) || interval < 1)) {
      setMessage({ text: 'Укажите, через сколько минут можно присылать повторное письмо (минимум 1)', type: 'error' });
      return;
    }

    const payload = thresholds.map((t) => ({
      sensor_type: t.sensor_type,
      min_value: Number(t.min_value),
      max_value: Number(t.max_value),
      is_active: t.is_active,
    }));

    for (const t of payload) {
      const info = SENSOR_INFO[t.sensor_type];
      const name = info ? info.label : t.sensor_type;
      if (!Number.isFinite(t.min_value) || !Number.isFinite(t.max_value)) {
        setMessage({ text: `Укажите числовые значения для датчика «${name}»`, type: 'error' });
        return;
      }
      if (t.min_value >= t.max_value) {
        setMessage({ text: `У датчика «${name}» нижняя граница должна быть меньше верхней`, type: 'error' });
        return;
      }
    }

      try {
      await notificationService.updateSettings(settings);
      await notificationService.updateDevice(selectedDevice, {
        notifications_enabled: deviceEnabled,
        thresholds: payload,
      });
      setDirty(false);
      setMessage({ text: 'Настройки сохранены', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setMessage({
        text: err.response?.data?.error || 'Ошибка при сохранении настроек',
        type: 'error',
      });
    }
  };

  const handleTestEmail = async () => {
    setMessage({ text: 'Отправляем тестовое письмо...', type: 'info' });
    try {
      const res = await notificationService.testEmail();
      setMessage({ text: res.message, type: 'success' });
    } catch (err) {
      setMessage({
        text: err.response?.data?.error || 'Ошибка при отправке тестового письма',
        type: 'error',
      });
    }
  };

  const statusIcon = (type) => {
    if (type === 'success') return <CheckIcon size={20} color="#155724" />;
    if (type === 'error') return <CrossIcon size={20} color="#721c24" />;
    return <InfoIcon size={20} color="#1565c0" />;
  };

  if (loading) {
    return (
      <div className="notif-loading">
        <BellIcon size={32} color="#138962" />
        <p>Загрузка настроек...</p>
      </div>
    );
  }

  const activeCount = thresholds.filter((t) => t.is_active).length;

  return (
    <div className="notif-modern-container">
      {/* Заголовок */}
      <div className="notif-header-section">
        <div className="notif-header-icon">
          <BellIcon size={26} color="#f5d742" />
        </div>
        <div>
          <h3 className="notif-title">Уведомления</h3>
          <p className="notif-subtitle">
            Настройте, куда отправлять письма и при каких значениях датчиков их присылать
          </p>
        </div>
      </div>

      {/* Канал доставки — Email */}
      <div className={`notif-channel ${settings.email_enabled ? 'active' : ''}`}>
        <div className="channel-icon">
          <EmailIcon size={24} color="#fff" />
        </div>
        <div className="channel-titles">
          <span className="channel-name">Письма на почту</span>
          <span className="channel-status">
            {settings.email_enabled
              ? 'Включены — письма приходят на почту из профиля'
              : 'Выключены — письма не отправляются'}
          </span>
        </div>
        <label className="modern-switch">
          <input
            type="checkbox"
            checked={settings.email_enabled}
            onChange={() => handleToggleSetting('email_enabled')}
          />
          <span className="modern-slider"></span>
        </label>
      </div>

      {settings.email_enabled && (
        <div className="channel-extra fade-in">
          <span className="repeat-label">Повторное письмо — не раньше чем через</span>
          <div className="repeat-field">
            <input
              type="number"
              className="modern-number-input"
              value={settings.notification_interval}
              onChange={(e) => {
                setSettings({ ...settings, notification_interval: parseInt(e.target.value) });
                setDirty(true);
              }}
              min="1"
            />
            <span className="repeat-unit">мин</span>
          </div>
        </div>
      )}

      {/* Выбор устройства и переключатель уведомлений для него */}
      {devices.length > 0 && (
        <div className="device-section">
          <div className="section-head">
            <h4 className="section-title">
              <DeviceIcon size={20} color="#138962" />
              Устройство
            </h4>
            <p className="section-hint">
              Пороги и уведомления настраиваются отдельно для каждого устройства.
            </p>
          </div>

          {devices.length > 1 && (
            <div className="device-chips" role="tablist" aria-label="Выбор устройства">
              {devices.map((d) => (
                <button
                  key={d.device_id}
                  type="button"
                  role="tab"
                  aria-selected={d.device_id === selectedDevice}
                  className={`device-chip ${d.device_id === selectedDevice ? 'active' : ''} ${d.notifications_enabled ? '' : 'muted'}`}
                  onClick={() => handleSelectDevice(d.device_id)}
                  disabled={switching}
                >
                  <span className="device-chip-dot" />
                  {d.device_id}
                </button>
              ))}
            </div>
          )}

          <div className={`device-toggle ${deviceEnabled ? 'on' : 'off'}`}>
            <div className="device-toggle-text">
              <span className="device-toggle-title">
                Уведомления для устройства «{selectedDevice}»
              </span>
              <span className="device-toggle-status">
                {deviceEnabled
                  ? 'Включены — письма приходят при выходе значений за рамки'
                  : 'Выключены — письма по этому устройству не отправляются'}
              </span>
            </div>
            <label className="modern-switch">
              <input
                type="checkbox"
                checked={deviceEnabled}
                onChange={handleToggleDeviceEnabled}
              />
              <span className="modern-slider"></span>
            </label>
          </div>
        </div>
      )}

      {/* Пороги датчиков */}
      <div className="section-head">
        <h4 className="section-title">
          <ThermometerIcon size={20} color="#138962" />
          Пороги датчиков
          {dirty && <span className="dirty-dot" title="Есть несохранённые изменения" />}
        </h4>
        <p className="section-hint">
          Тяните ручки на шкале или двигайте весь диапазон целиком. Письмо придёт, когда
          значение выйдет за рамки. Включены <strong>{activeCount}</strong> из {thresholds.length} датчиков.
        </p>
      </div>

      {!selectedDevice ? (
        <div className="notif-empty">
          <DeviceIcon size={28} color="#95a5a6" />
          <p>К аккаунту не привязано ни одного устройства.</p>
        </div>
      ) : (
        <div className={`threshold-grid ${deviceEnabled ? '' : 'device-off'} ${switching ? 'is-switching' : ''}`}>
          {thresholds.map((t, index) => {
            const info = SENSOR_INFO[t.sensor_type] || {
              label: t.sensor_type,
              unit: '',
              icon: () => null,
              color: '#636e72',
              gradient: 'linear-gradient(135deg, #b2bec3, #636e72)',
              domain: [0, 100],
              step: 1,
            };
            return (
              <ThresholdCard
                key={`${selectedDevice}-${t.sensor_type}`}
                t={t}
                index={index}
                info={info}
                currentValue={currentByType[t.sensor_type] ?? null}
                expanded={!!expanded[t.sensor_type]}
                onToggleExpand={handleExpand}
                onToggleActive={handleToggleActive}
                onRangeChange={handleRangeChange}
                onReset={handleReset}
              />
            );
          })}
        </div>
      )}

      {/* Действия: индикатор изменений + плавающее «Сохранить» */}
      <div className={`notif-actions-bar ${dirty ? 'dirty' : ''}`}>
        <span className="save-state">
          {dirty ? (
            <>
              <span className="save-state-dot" /> Есть несохранённые изменения
            </>
          ) : (
            'Все изменения сохранены'
          )}
        </span>
        <div className="notif-actions-buttons">
          <button onClick={saveSettings} className="save-btn-modern" disabled={!dirty}>
            <SaveIcon size={20} color="#f5d742" /> Сохранить
          </button>
          <button
            onClick={handleTestEmail}
            className="test-btn-modern"
            disabled={!settings.email_enabled}
          >
            <BoltIcon size={20} color="#0F2925" /> Проверить почту
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`message notif-message ${message.type}`}>
          {statusIcon(message.type)}
          {message.text}
        </div>
      )}
    </div>
  );
}

export default NotificationSettings;
