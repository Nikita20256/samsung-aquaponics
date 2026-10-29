import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Switch, Text, View } from 'react-native';
import { errorMessage } from '../api/client';
import type { Device, NotificationSettings, Profile, SensorHistory, SensorType } from '../api/types';
import { Button, Feedback, Field, formStyles as s } from '../components/FormControls';
import { useSession } from '../context/SessionContext';

function useTask() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const mounted = useRef(true);
  const locked = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = useCallback(async (action: () => Promise<void>, success?: string) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null); setMessage(null);
    try { await action(); if (mounted.current && success) setMessage(success); }
    catch (err) { if (mounted.current) setError(errorMessage(err)); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }, []);
  return { busy, run, feedback: <Feedback error={error} message={message} /> };
}

export function DevicePanel({ devices, selected, loading, error, onSelect, onReload }: {
  devices: Device[]; selected: string | null; loading: boolean; error: string | null;
  onSelect: (id: string) => void; onReload: () => Promise<void>;
}) {
  const { api } = useSession();
  const [deviceId, setDeviceId] = useState('');
  const [secret, setSecret] = useState('');
  const task = useTask();
  return <>
    <Text style={s.heading}>Мои установки</Text>
    <Feedback error={error} />
    {loading && <ActivityIndicator color="#B6D693" />}
    {!loading && !devices.length && !error && <Text style={s.text}>Привяжите установку по ID и секретному коду, выданным администратором.</Text>}
    {devices.map(device => <Button key={device.device_id} secondary={device.device_id !== selected}
      title={`${device.device_id}${device.device_id === selected ? ' · выбрана' : ''}`} onPress={() => onSelect(device.device_id)} />)}
    <Button secondary title="Обновить список" disabled={loading || task.busy} onPress={() => void onReload()} />
    <View style={s.section}>
      <Text style={s.text}>Добавить установку</Text>
      <Field label="ID устройства" value={deviceId} onChangeText={setDeviceId} editable={!task.busy} />
      <Field label="Секретный код устройства" value={secret} onChangeText={setSecret} secureTextEntry editable={!task.busy} />
      {task.feedback}
      <Button title="Привязать" busy={task.busy} disabled={!deviceId.trim() || !secret}
        onPress={() => void task.run(async () => {
          await api.addDevice(deviceId.trim(), secret); setSecret(''); await onReload(); onSelect(deviceId.trim());
        }, 'Установка привязана.')} />
    </View>
  </>;
}

export function ProfilePanel() {
  const { api, baseUrl, signOut } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [timezone, setTimezone] = useState('');
  const task = useTask();
  const load = useCallback(async () => {
    const data = await api.profile(); setProfile(data); setEmail(data.email ?? '');
    setTimezone(data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [api]);
  useEffect(() => { void task.run(load); }, [load, task.run]);
  return <>
    <Text style={s.heading}>Профиль</Text>
    <Text style={s.text}>{profile?.login ?? 'Загрузка профиля…'}</Text>
    <Text selectable style={s.text}>{baseUrl}</Text>
    {task.feedback}
    {!profile && <Button secondary title="Повторить загрузку" busy={task.busy} onPress={() => void task.run(load)} />}
    {profile && <>
      <View style={s.section}>
        <Text style={s.text}>Почта: {profile.email_verified ? 'подтверждена' : 'не подтверждена'}</Text>
        <Field label="Почта" value={email} onChangeText={value => { setEmail(value); setEmailSent(null); setCode(''); }} keyboardType="email-address" editable={!task.busy} />
        <Button secondary title="Получить код подтверждения" disabled={task.busy || !email.trim()}
          onPress={() => void task.run(async () => {
            if (Date.now() < resendAt) throw new Error(`Повторите через ${Math.ceil((resendAt - Date.now()) / 1000)} сек.`);
            const address = email.trim();
            const result = address === profile.email ? await api.resendCode(address) : await api.requestEmailChange(address);
            setResendAt(Date.now() + (result.resendAfter ?? 60) * 1000); setEmailSent(address);
          }, 'Код отправлен. Введите его ниже.')} />
        {emailSent && <>
          <Field label="Код из письма" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} editable={!task.busy} />
          <Button title="Подтвердить почту" busy={task.busy} disabled={!code.trim()}
            onPress={() => void task.run(async () => {
              if (emailSent === profile.email) await api.confirmEmail(emailSent, code.trim());
              else await api.confirmEmailChange(emailSent, code.trim());
              setCode(''); setEmailSent(null); await load();
            }, 'Почта подтверждена.')} />
        </>}
      </View>
      <View style={s.section}>
        <Field label="Текущий пароль" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry editable={!task.busy} />
        <Field label="Новый пароль" value={newPassword} onChangeText={setNewPassword} secureTextEntry editable={!task.busy} />
        <Button title="Изменить пароль" busy={task.busy} disabled={!currentPassword || newPassword.length < 3}
          onPress={() => void task.run(async () => {
            await api.changePassword(currentPassword, newPassword); setCurrentPassword(''); setNewPassword('');
          }, 'Пароль изменён.')} />
      </View>
      <View style={s.section}>
        <Field label="Часовой пояс" value={timezone} onChangeText={setTimezone} placeholder="Asia/Novosibirsk" editable={!task.busy} />
        <Button secondary title="Сохранить часовой пояс" disabled={task.busy || !timezone.trim()}
          onPress={() => void task.run(async () => { await api.updateTimezone(timezone.trim()); await load(); }, 'Часовой пояс сохранён.')} />
        <Button secondary title="Использовать часовой пояс телефона" disabled={task.busy}
          onPress={() => void task.run(async () => { await api.updateTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone, true); await load(); }, 'Автоматический часовой пояс включён.')} />
      </View>
    </>}
    <Button secondary title="Выйти из аккаунта" disabled={task.busy} onPress={() => void signOut()} />
  </>;
}

const metrics: { key: SensorType; label: string; unit: string }[] = [
  { key: 'humidity', label: 'Влажность почвы', unit: '%' },
  { key: 'temperature', label: 'Температура', unit: '°C' },
  { key: 'light', label: 'Освещённость', unit: 'лк' },
];
export function HistoryPanel({ deviceId }: { deviceId: string | null }) {
  const { api } = useSession();
  const [days, setDays] = useState(1);
  const [history, setHistory] = useState<SensorHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!deviceId) return;
    const controller = new AbortController();
    setLoading(true); setError(null); setHistory(null);
    const end = new Date(); const start = new Date(end.getTime() - days * 86400000);
    api.history(deviceId, start.toISOString(), end.toISOString(), controller.signal)
      .then(result => { if (!controller.signal.aborted) setHistory(result); })
      .catch(err => { if (!controller.signal.aborted) setError(errorMessage(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [api, deviceId, days, retry]);
  return <>
    <Text style={s.heading}>История датчиков</Text>
    <Text style={s.text}>{deviceId ?? 'Сначала выберите или привяжите установку.'}</Text>
    {deviceId && <>
      <View style={s.row}>
        <Button title="За сутки" secondary={days !== 1} onPress={() => setDays(1)} />
        <Button title="За неделю" secondary={days !== 7} onPress={() => setDays(7)} />
      </View>
      {loading && <ActivityIndicator color="#B6D693" />}
      <Feedback error={error} />
      <Button secondary title="Обновить" disabled={loading} onPress={() => setRetry(value => value + 1)} />
      <Text style={s.text}>Сервер сохраняет показания раз в час. Здесь — последние 20 записей каждого датчика за выбранный период.</Text>
      {history && metrics.map(metric => <View style={s.section} key={metric.key}>
        <Text style={s.text}>{metric.label}</Text>
        {!history[metric.key].length && <Text style={s.text}>За этот период записей нет.</Text>}
        {history[metric.key].slice(-20).reverse().map((point, index) => <View key={`${point.timestamp}-${index}`} style={s.row}>
          <Text style={[s.text, { flex: 1 }]}>{new Date(point.timestamp).toLocaleString('ru-RU')}</Text>
          <Text style={s.text}>{Number(point.value).toLocaleString('ru-RU')} {metric.unit}</Text>
        </View>)}
      </View>)}
    </>}
  </>;
}

export function NotificationsPanel({ deviceId }: { deviceId: string | null }) {
  const { api } = useSession();
  const [data, setData] = useState<NotificationSettings | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [interval, setIntervalValue] = useState('60');
  const [enabled, setEnabled] = useState(true);
  const [thresholds, setThresholds] = useState<{ sensor_type: SensorType; min_value: string; max_value: string; is_active: boolean }[]>([]);
  const task = useTask();
  const load = useCallback(async () => {
    const settings = await api.notifications(deviceId ?? undefined); setData(settings);
    setEmailEnabled(settings.settings.email_enabled); setIntervalValue(String(settings.settings.notification_interval));
    setEnabled(settings.device?.notifications_enabled ?? true);
    setThresholds(settings.thresholds.map(t => ({ ...t, min_value: String(t.min_value), max_value: String(t.max_value) })));
  }, [api, deviceId]);
  useEffect(() => { void task.run(load); }, [load, task.run]);
  return <>
    <Text style={s.heading}>Уведомления</Text>
    <Text style={s.text}>Письма о выходе показаний за заданные пороги. Для получения писем подтвердите почту в профиле.</Text>
    {task.feedback}
    {!data ? <Button secondary title="Загрузить настройки" busy={task.busy} onPress={() => void task.run(load)} /> : <>
      <View style={s.section}>
        <View style={s.row}><Text style={[s.text, { flex: 1 }]}>Оповещения на почту</Text><Switch accessibilityLabel="Оповещения на почту" value={emailEnabled} disabled={task.busy} onValueChange={setEmailEnabled} /></View>
        <Field label="Интервал между письмами (минуты)" value={interval} onChangeText={setIntervalValue} keyboardType="number-pad" editable={!task.busy} />
        <Button title="Сохранить общие настройки" busy={task.busy} onPress={() => void task.run(async () => {
          const minutes = Number(interval);
          if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) throw new Error('Укажите интервал от 1 до 1440 минут.');
          await api.saveNotifications(emailEnabled, minutes);
        }, 'Настройки сохранены.')} />
      </View>
      {deviceId && <View style={s.section}>
        <Text style={s.text}>Установка {deviceId}</Text>
        <View style={s.row}><Text style={[s.text, { flex: 1 }]}>Уведомления установки</Text><Switch accessibilityLabel="Уведомления установки" value={enabled} disabled={task.busy} onValueChange={setEnabled} /></View>
        {thresholds.map((threshold, i) => <View key={threshold.sensor_type} style={{ gap: 10 }}>
          <View style={s.row}><Text style={s.text}>{metrics.find(m => m.key === threshold.sensor_type)?.label}</Text>
            <Switch accessibilityLabel={`Порог ${threshold.sensor_type}`} disabled={task.busy} value={threshold.is_active}
              onValueChange={value => setThresholds(items => items.map((t, index) => index === i ? { ...t, is_active: value } : t))} /></View>
          <Field label="Минимум" value={threshold.min_value} keyboardType="numbers-and-punctuation" editable={!task.busy}
            onChangeText={value => setThresholds(items => items.map((t, index) => index === i ? { ...t, min_value: value } : t))} />
          <Field label="Максимум" value={threshold.max_value} keyboardType="numbers-and-punctuation" editable={!task.busy}
            onChangeText={value => setThresholds(items => items.map((t, index) => index === i ? { ...t, max_value: value } : t))} />
        </View>)}
        <Button title="Сохранить пороги установки" busy={task.busy} onPress={() => void task.run(async () => {
          const values = thresholds.map(t => ({ ...t, min_value: Number(t.min_value.replace(',', '.')), max_value: Number(t.max_value.replace(',', '.')) }));
          if (thresholds.some(t => !t.min_value.trim() || !t.max_value.trim()) || values.some(t => !Number.isFinite(t.min_value) || !Number.isFinite(t.max_value) || t.min_value > t.max_value)) {
            throw new Error('Введите числовые границы: минимум должен быть не больше максимума.');
          }
          await api.saveThresholds(deviceId, enabled, values);
        }, 'Пороги сохранены.')} />
      </View>}
    </>}
  </>;
}
