import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { errorMessage } from '../api/client';
import type { ControlMode, ControlModes, Device, Sensors } from '../api/types';
import { useSession } from '../context/SessionContext';

export default function useAquaponics() {
  const { api } = useSession();
  const [initializedApi, setInitializedApi] = useState<typeof api | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [sensors, setSensors] = useState<Sensors | null>(null);
  const [modes, setModes] = useState<ControlModes | null>(null);
  const [range, setRange] = useState<{ lowest: number; highest: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [active, setActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [pending, setPending] = useState<'light' | 'aeration' | null>(null);
  const [connected, setConnected] = useState(false);
  const commandLock = useRef(false);
  const modeRevision = useRef(0);
  const currentDevice = useRef(deviceId);
  currentDevice.current = deviceId;
  const listVersion = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => { mounted.current = false; listVersion.current++; listener.remove(); };
  }, []);
  const refreshDevices = useCallback(async () => {
    const version = ++listVersion.current;
    setDevicesLoading(true); setDeviceError(null);
    try {
      const result = await api.devices();
      if (!mounted.current || version !== listVersion.current) return;
      setDevices(result.devices);
      setDeviceId(previous => result.devices.some(device => device.device_id === previous)
        ? previous : result.current ?? result.devices[0]?.device_id ?? null);
      // An empty account is ready too: there is no controller data to wait for.
      if (result.devices.length === 0) setInitializedApi(api);
    } catch (err) {
      if (mounted.current && version === listVersion.current) {
        setDeviceError(errorMessage(err));
        setInitializedApi(api);
      }
    } finally {
      if (mounted.current && version === listVersion.current) setDevicesLoading(false);
    }
  }, [api]);
  useEffect(() => { void refreshDevices(); }, [refreshDevices]);
  useEffect(() => { setRange(null); setSensors(null); setModes(null); }, [deviceId, api]);

  useEffect(() => {
    setConnected(false);
    if (!deviceId || !active) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      const revision = modeRevision.current;
      try {
        const [readings, control] = await Promise.all([
          api.sensors(deviceId, controller.signal), api.modes(deviceId, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setSensors(readings); setError(null); setConnected(true);
        if (!commandLock.current && revision === modeRevision.current) setModes(control);
        const temperature = readings.temperature;
        if (temperature !== null && readings.lastSeen) {
          setRange(previous => ({ lowest: Math.min(previous?.lowest ?? temperature, temperature),
            highest: Math.max(previous?.highest ?? temperature, temperature) }));
        }
      } catch (err) { if (!controller.signal.aborted) { setConnected(false); setError(errorMessage(err)); } }
      finally {
        if (!controller.signal.aborted) {
          // Finish startup on the first response or error; later polls stay in the dashboard.
          setInitializedApi(api);
          timer = setTimeout(poll, 10000);
        }
      }
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [api, deviceId, active, refreshKey]);

  const selectDevice = useCallback((id: string) => {
    // Never display the previous device's readings during a switch.
    setConnected(false); setSensors(null); setModes(null); setError(null); setRange(null); setDeviceId(id);
  }, []);
  const setMode = useCallback(async (target: 'light' | 'aeration', mode: ControlMode) => {
    if (!deviceId || commandLock.current) return;
    if (!connected || !sensors?.online || error) throw new Error('Установка не в сети. Управление будет доступно после подключения.');
    const commandDevice = deviceId;
    commandLock.current = true; modeRevision.current++; setPending(target);
    try {
      const result = await api.setMode(commandDevice, target, mode);
      if (mounted.current && currentDevice.current === commandDevice) setModes(result.modes);
    } finally {
      commandLock.current = false; modeRevision.current++;
      if (mounted.current) setPending(null);
    }
  }, [api, deviceId, connected, sensors?.online, error]);
  return { initialLoading: initializedApi !== api, devices, deviceId, selectDevice, refreshDevices, devicesLoading, deviceError,
    sensors, modes, range, error, pending, connected, setMode, refresh: () => setRefreshKey(key => key + 1) };
}
