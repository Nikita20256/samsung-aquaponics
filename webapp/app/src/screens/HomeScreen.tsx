import { useState } from 'react';
import {
  Modal, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlassSurface from '../components/GlassSurface';
import HomeBackground from '../components/HomeBackground';
import HomeIcon, { HomeIconName } from '../components/HomeIcon';
import ModeSelector, { DeviceMode } from '../components/ModeSelector';
import WaterLevelIndicator from '../components/WaterLevelIndicator';
import useAquaponics from '../hooks/useAquaponics';
import { errorMessage } from '../api/client';
import type { ControlMode } from '../api/types';
import { Button, Feedback, FormScroll, formStyles } from '../components/FormControls';
import { DevicePanel, HistoryPanel, NotificationsPanel, ProfilePanel } from './AccountPanels';
import { colors } from '../theme';

const modeLabels: Record<ControlMode, DeviceMode> = { off: 'Выкл', auto: 'Авто', on: 'Вкл' };
const modeValues: Record<DeviceMode, ControlMode> = { Выкл: 'off', Авто: 'auto', Вкл: 'on' };
type Panel = 'devices' | 'history' | 'control' | 'profile' | 'notifications';
const navigation: { label: string; icon: HomeIconName }[] = [
  { label: 'Главная', icon: 'home' },
  { label: 'Датчики', icon: 'sensors' },
  { label: 'Управление', icon: 'control' },
  { label: 'Профиль', icon: 'user' },
];

function CardHeading({ icon, title, subtitle }: { icon: HomeIconName; title: string; subtitle?: string }) {
  return (
    <View style={styles.cardHeading}>
      <HomeIcon name={icon} />
      <View style={styles.headingText}>
        <Text style={[styles.cardTitle, subtitle && styles.smallTitle]}>{title}</Text>
        {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

function ProgressTrack({ value, color = '#79B653' }: { value: number; color?: string }) {
  return (
    <View style={styles.track}>
      <View style={[styles.trackFill, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }]} />
    </View>
  );
}

function TemperatureGauge({ value }: { value: number }) {
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.gauge}>
      <View style={styles.ticks}>
        {Array.from({ length: 9 }, (_, i) => <View key={i} style={[styles.tick, { height: i % 2 ? 4 : 7, opacity: i % 2 ? 0.4 : 0.8 }]} />)}
      </View>
      <View style={styles.thermometer}>
        <View style={[styles.mercury, { width: `${Math.min(100, Math.max(0, value / 40 * 100))}%` }]}>
          <View style={styles.mercuryEnd} />
        </View>
        <View style={styles.bulb}><View style={styles.bulbCore} /></View>
      </View>
      <View style={styles.temperatureLabels}>
        {['0°', '20°', '40°'].map(label => <Text key={label} style={styles.scaleLabel}>{label}</Text>)}
      </View>
    </View>
  );
}

function SoilReading({ value }: { value: number | null }) {
  return (
    <>
      <View style={styles.smallReading} accessible accessibilityLabel={`Влажность почвы: ${value === null ? 'нет данных' : `${Math.round(value)} процентов`}`}>
        <Text style={styles.sensorNumber}>{value === null ? '—' : Math.round(value)}</Text><Text style={styles.sensorUnit}>%</Text>
      </View>
      <View style={styles.soilBars} accessible={false}>
        {Array.from({ length: 20 }, (_, i) => (
          <View key={i} style={styles.soilBar}>
            <View style={[StyleSheet.absoluteFill, styles.soilBarFill, {
              opacity: Math.min(1, Math.max(0, (value ?? 0) / 5 - i)) * Math.min(1, 0.45 + i * 0.04),
            }]} />
          </View>
        ))}
      </View>
      <Text style={styles.sensorFootnote}>Датчик влажности почвы</Text>
    </>
  );
}

function TemperatureReading({ value, range }: { value: number | null; range: { lowest: number; highest: number } | null }) {
  const format = (reading: number) => reading.toFixed(1).replace('.', ',');
  return (
    <>
      <View style={styles.smallReading} accessible accessibilityLabel={`Температура среды: ${value === null ? 'нет данных' : `${format(value)} градуса Цельсия`}`}>
        <Text style={styles.sensorNumber}>{value === null ? '—' : format(value)}</Text><Text style={styles.sensorUnit}>°C</Text>
      </View>
      <TemperatureGauge value={value ?? 0} />
      <Text style={styles.temperatureFootnote}>{range ? `Сеанс: ${format(range.lowest)}°…${format(range.highest)}°` : 'Нет показаний'}</Text>
    </>
  );
}

function LightCard({ mode, onChange, value, count, disabled }: {
  mode: DeviceMode | null; onChange: (mode: DeviceMode) => void; value: number | null; count: number | null; disabled: boolean;
}) {
  return (
    <GlassSurface style={styles.lightCard}>
      <View style={styles.lightTop}>
        <View style={styles.lightMain}>
          <CardHeading icon="sun" title="Освещённость" />
          <View style={styles.lightReading} accessible accessibilityLabel={`Освещённость: ${value === null ? 'нет данных' : `${Math.round(value)} люкс`}`}>
            <Text style={styles.lightNumber}>{value === null ? '—' : Math.round(value).toLocaleString('ru-RU')}</Text>
            <Text style={styles.sensorUnit}>лк</Text>
          </View>
        </View>
        <View style={styles.dailyCount} accessible accessibilityLabel={`Включений света: ${count ?? 'нет данных'}`}>
          <Text style={styles.dailyLabel}>Включений</Text>
          <Text style={styles.dailyNumber}>{count ?? '—'}</Text>
        </View>
      </View>
      <ProgressTrack value={(value ?? 0) / 2000 * 100} color="#91AF5A" />
      <View style={styles.lightDivider} />
      <ModeSelector label="Режим света" value={mode} onChange={onChange} disabled={disabled} />
    </GlassSurface>
  );
}

function WaterCard({ mode, onChange, water, disabled }: { mode: DeviceMode | null; onChange: (mode: DeviceMode) => void; water: number | null; disabled: boolean }) {
  return (
    <GlassSurface style={styles.waterCard}>
      <View style={styles.waterBody}>
        <CardHeading icon="drop" title="Вода в аквапонике" />
        <WaterLevelIndicator water={water} />
      </View>
      <View style={styles.divider} />
      <ModeSelector label="Режим аэрации" value={mode} onChange={onChange} disabled={disabled} />
    </GlassSurface>
  );
}

function SensorCards({ humidity, temperature, range }: { humidity: number | null; temperature: number | null; range: { lowest: number; highest: number } | null }) {
  return (
    <View style={styles.sensorRow}>
      <GlassSurface style={styles.sensorCard} radius={19}>
        <CardHeading icon="soil" title="Влажность" subtitle="почвы" />
        <SoilReading value={humidity} />
      </GlassSurface>
      <GlassSurface style={styles.sensorCard} radius={19}>
        <CardHeading icon="temperature" title="Температура" subtitle="среды" />
        <TemperatureReading value={temperature} range={range} />
      </GlassSurface>
    </View>
  );
}

function DashboardHeader({ onNotification, onDevice, deviceId, status, lastSeen, onRefresh }: {
  onNotification: () => void; onDevice: () => void; deviceId: string | null; status: string; lastSeen: string | null; onRefresh: () => void;
}) {
  return (
    <>
      <View style={styles.brandRow}>
        <View><Text style={styles.brand}>FISH &amp; GREENS</Text><Text style={styles.tagline}>аквапоника</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Уведомления" onPress={onNotification}
          style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}>
          <HomeIcon name="bell" />
        </Pressable>
      </View>
      <View style={styles.titleGroup}>
        <Text style={styles.title} accessibilityRole="header">Моя аквапоника</Text>
        <View style={styles.metadata}>
          <Pressable onPress={onDevice} accessibilityRole="button" accessibilityLabel="Выбрать установку">
            <Text numberOfLines={1} style={[styles.metadataText, { color: '#C1D9AC', maxWidth: 155 }]}>{deviceId ?? 'Добавить установку'} ▾</Text>
          </Pressable>
          <View style={styles.metadataDot} />
          <Pressable onPress={onRefresh} accessibilityRole="button" accessibilityLabel="Обновить показания">
            <Text numberOfLines={2} style={[styles.metadataText, { maxWidth: 165 }]}>{status} ↻</Text>
          </Pressable>
        </View>
      </View>
      {lastSeen && <Text style={[styles.metadataText, { marginBottom: 4 }]}>Последняя связь: {new Date(lastSeen).toLocaleString('ru-RU')}</Text>}
    </>
  );
}

export default function HomeScreen() {
  const connection = useAquaponics();
  const [availableHeight, setAvailableHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const scale = availableHeight > 0 && contentHeight > 0 ? Math.min(1, availableHeight / contentHeight) : 1;
  const [panel, setPanel] = useState<Panel | null>(null);
  const [message, setMessage] = useState<{ title: string; body: string } | null>(null);
  const changeMode = async (device: 'aeration' | 'light', mode: DeviceMode) => {
    try { await connection.setMode(device, modeValues[mode]); }
    catch (error) { setMessage({ title: 'Не удалось изменить режим', body: errorMessage(error) }); }
  };
  const { sensors, modes } = connection;
  const disabled = !connection.connected || !sensors?.online || !!connection.error || !!connection.pending || !modes;
  const aerationMode = modes ? modeLabels[modes.aeration] : null;
  const lightMode = modes ? modeLabels[modes.light] : null;
  const hasReadings = !!sensors?.lastSeen;
  const status = connection.deviceError ? 'Ошибка загрузки устройств' : connection.error ? 'Нет связи с сервером'
    : connection.devicesLoading ? 'Загрузка установок' : !connection.deviceId ? 'Нет установки'
    : !sensors ? 'Получение данных' : sensors.online ? 'В сети' : 'Не в сети';
  const waterCard = <WaterCard mode={aerationMode} onChange={mode => void changeMode('aeration', mode)} water={hasReadings ? sensors!.water : null} disabled={disabled} />;
  const lightCard = <LightCard mode={lightMode} onChange={mode => void changeMode('light', mode)} value={hasReadings ? sensors!.light : null} count={sensors?.lightSwitches ?? null} disabled={disabled} />;

  return (
      <HomeBackground>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.page}>
            <View style={styles.contentViewport}
              onLayout={({ nativeEvent: { layout } }) => setAvailableHeight(layout.height)}>
            <View style={[styles.content, { transform: [{ scale }] }]}
              onLayout={({ nativeEvent: { layout } }) => setContentHeight(layout.height)}>
              <DashboardHeader onNotification={() => setPanel('notifications')} onDevice={() => setPanel('devices')}
                deviceId={connection.deviceId} status={status} lastSeen={sensors?.lastSeen ?? null}
                onRefresh={() => { connection.refresh(); if (connection.deviceError) void connection.refreshDevices(); }} />
              {(connection.error || connection.deviceError) && <View style={{ gap: 8 }}>
                <Text accessibilityRole="alert" style={styles.metadataText}>{connection.deviceError ?? connection.error}</Text>
                <Button secondary title="Повторить загрузку" onPress={() => {
                  if (connection.deviceError) void connection.refreshDevices();
                  else connection.refresh();
                }} />
              </View>}
              {waterCard}
              <SensorCards humidity={hasReadings ? sensors!.humidity : null} temperature={hasReadings ? sensors!.temperature : null} range={connection.range} />
              {lightCard}
            </View>
            </View>
            <GlassSurface style={styles.navigation} radius={30} navigation>
              {navigation.map((item, i) => (
                <Pressable key={item.label} accessibilityRole="tab" accessibilityLabel={item.label}
                  accessibilityState={{ selected: i === 0 }}
                  onPress={() => {
                    if (i === 1) setPanel('history');
                    if (i === 2) setPanel('control');
                    if (i === 3) setPanel('profile');
                  }}
                  style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}>
                  <View style={[styles.navItemContent, i === 0 && styles.activeNavItem]}>
                    <HomeIcon name={item.icon} dimmed={i !== 0} />
                    <Text numberOfLines={1} style={[styles.navLabel, i === 0 && styles.activeNavLabel]}>{item.label}</Text>
                  </View>
                </Pressable>
              ))}
            </GlassSurface>
          </View>
          <Modal visible={panel !== null} transparent animationType="slide" onRequestClose={() => setPanel(null)}>
            <View style={styles.modalBackdrop}>
              <SafeAreaView style={[styles.modalCard, { height: '92%', maxWidth: 480, padding: 0 }]} accessibilityViewIsModal>
                <Pressable accessibilityRole="button" onPress={() => setPanel(null)} style={{ padding: 16, alignItems: 'flex-end' }}>
                  <Text style={styles.closeLabel}>Закрыть</Text>
                </Pressable>
                <FormScroll>
                  {panel === 'devices' && <DevicePanel devices={connection.devices} selected={connection.deviceId} loading={connection.devicesLoading}
                    error={connection.deviceError} onReload={connection.refreshDevices} onSelect={id => { connection.selectDevice(id); setPanel(null); }} />}
                  {panel === 'profile' && <ProfilePanel />}
                  {panel === 'history' && <HistoryPanel key={connection.deviceId} deviceId={connection.deviceId} />}
                  {panel === 'notifications' && <NotificationsPanel key={connection.deviceId} deviceId={connection.deviceId} />}
                  {panel === 'control' && <>
                    <Text style={formStyles.heading}>Управление</Text><Text style={formStyles.text}>{connection.deviceId ?? 'Выберите установку'} · {status}</Text>
                    <Text style={formStyles.text}>Режим «Авто» передаёт управление контроллеру установки.</Text>
                    <ModeSelector label="Режим света" value={lightMode} disabled={disabled} onChange={mode => void changeMode('light', mode)} />
                    <ModeSelector label="Режим аэрации" value={aerationMode} disabled={disabled} onChange={mode => void changeMode('aeration', mode)} />
                    {connection.pending && <Text style={formStyles.text}>Отправка команды…</Text>}
                    <Button secondary title="Выбрать или добавить установку" onPress={() => setPanel('devices')} />
                  </>}
                  {message && <Feedback error={`${message.title}: ${message.body}`} />}
                </FormScroll>
              </SafeAreaView>
            </View>
          </Modal>
          <Modal visible={message !== null && panel === null} transparent animationType="fade" onRequestClose={() => setMessage(null)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard} accessibilityViewIsModal>
                  <Text style={styles.modalTitle} accessibilityRole="header">{message?.title}</Text>
                  <Text style={styles.modalBody}>{message?.body}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Понятно, закрыть сообщение"
                  onPress={() => setMessage(null)} style={styles.closeButton}>
                  <Text style={styles.closeLabel}>Понятно</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </HomeBackground>
  );
}


const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  page: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  contentViewport: { flex: 1, minHeight: 0, overflow: 'hidden' },
  content: { flexShrink: 0, transformOrigin: 'top center', paddingHorizontal: 18, paddingTop: 38, gap: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  brand: { color: colors.accent, fontSize: 18, lineHeight: 23, fontWeight: '700', letterSpacing: 0.9 },
  tagline: { color: '#718E60', fontSize: 10, lineHeight: 15, letterSpacing: 1.2, marginTop: 3 },
  bellButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: '#2B4027', backgroundColor: '#172917', alignItems: 'center', justifyContent: 'center' },
  titleGroup: { gap: 8, marginBottom: 8 },
  title: { color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: '600', letterSpacing: -0.4 },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metadataText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  metadataDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#536B4B' },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headingText: { flexShrink: 1 },
  cardTitle: { color: colors.label, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  smallTitle: { fontSize: 11, lineHeight: 15, fontWeight: '500', color: '#BAD0AE' },
  cardSubtitle: { color: colors.quiet, fontSize: 10, lineHeight: 14 },
  waterCard: { paddingHorizontal: 17, paddingTop: 14, paddingBottom: 5 },
  waterBody: { minHeight: 138 },
  track: { height: 4, backgroundColor: colors.track, borderRadius: 3 },
  trackFill: { height: 4, borderRadius: 3 },
  divider: { height: 1, backgroundColor: colors.divider, marginBottom: 7 },
  sensorRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  sensorCard: { flex: 1, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 10, minHeight: 153 },
  smallReading: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 11 },
  sensorNumber: { color: colors.text, fontSize: 29, lineHeight: 35, fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  sensorUnit: { color: '#A7BD9B', fontSize: 16, lineHeight: 22 },
  soilBars: { flexDirection: 'row', justifyContent: 'space-between', gap: 2, height: 14, marginTop: 12 },
  soilBar: { flex: 1, maxWidth: 4, height: 14, borderRadius: 2, backgroundColor: '#2A4127' },
  soilBarFill: { borderRadius: 2, backgroundColor: '#78AE55' },
  sensorFootnote: { color: '#839D78', fontSize: 9, lineHeight: 13, marginTop: 10 },
  gauge: { marginTop: 5, paddingLeft: 7 },
  ticks: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingLeft: 4, height: 7, marginBottom: 4 },
  tick: { width: 1, backgroundColor: '#77946A' },
  thermometer: { height: 7, borderRadius: 4, borderWidth: 1, borderColor: '#49643C', backgroundColor: '#23391E', justifyContent: 'center' },
  mercury: { height: 3, borderRadius: 2, backgroundColor: '#87BC62' },
  mercuryEnd: { position: 'absolute', right: -2, top: -1, width: 5, height: 5, borderRadius: 3, backgroundColor: '#C5E4A8' },
  bulb: { position: 'absolute', left: -7, top: -4, width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#587849', backgroundColor: '#162815', justifyContent: 'center', alignItems: 'center' },
  bulbCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.bright },
  temperatureLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingLeft: 4 },
  scaleLabel: { color: colors.quiet, fontSize: 8, lineHeight: 11 },
  temperatureFootnote: { color: '#839D78', fontSize: 9, lineHeight: 13, marginTop: 4 },
  lightCard: { paddingHorizontal: 17, paddingTop: 14, paddingBottom: 7 },
  lightTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 6 },
  lightMain: { flex: 1 },
  lightReading: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 10 },
  lightNumber: { color: colors.text, fontSize: 32, lineHeight: 39, fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  dailyCount: { minWidth: 78, alignItems: 'center' },
  dailyLabel: { color: colors.muted, fontSize: 10, lineHeight: 24, fontWeight: '500' },
  dailyNumber: { color: colors.text, fontSize: 25, lineHeight: 39, fontWeight: '600', marginTop: 10 },
  lightDivider: { height: 1, backgroundColor: '#2A4027', marginTop: 12, marginBottom: 8 },
  navigation: { flexShrink: 0, flexDirection: 'row', marginHorizontal: 18, marginTop: 24, marginBottom: 8, height: 60, paddingVertical: 5, paddingHorizontal: 4 },
  navItem: { flex: 1, justifyContent: 'center', alignItems: 'stretch' },
  navItemContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, marginHorizontal: 3, borderRadius: 25, borderWidth: 1, borderColor: 'transparent' },
  activeNavItem: { backgroundColor: 'rgba(130, 181, 88, 0.22)', borderColor: 'rgba(85, 115, 68, 0.6)' },
  navLabel: { color: '#91A787', fontSize: 9, lineHeight: 12, textAlign: 'center' },
  activeNavLabel: { color: '#CEE8BA', fontWeight: '600' },
  pressed: { opacity: 0.65 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0, 0, 0, 0.65)' },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: 22, borderWidth: 1, borderColor: '#42633A', backgroundColor: '#172917', padding: 24 },
  modalTitle: { color: colors.text, fontSize: 20, lineHeight: 26, fontWeight: '600' },
  modalBody: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 12 },
  closeButton: { minHeight: 44, borderRadius: 12, backgroundColor: '#35572A', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  closeLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
