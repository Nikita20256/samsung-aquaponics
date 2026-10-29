export type ControlMode = 'off' | 'auto' | 'on';
export type ControlModes = { light: ControlMode; aeration: ControlMode };
export type Device = { device_id: string; notifications_enabled: boolean };
export type Profile = {
  login: string; email: string | null; email_verified: boolean;
  timezone: string | null; timezoneManual: boolean;
};
export type Sensors = {
  humidity: number | null; light: number | null; temperature: number | null;
  water: number; lightSwitches: number; online: boolean; lastSeen: string | null;
};
export type SensorType = 'humidity' | 'temperature' | 'light';
export type HistoryPoint = { value: string | number; timestamp: string };
export type SensorHistory = Record<SensorType, HistoryPoint[]>;
export type Threshold = {
  sensor_type: SensorType; min_value: string | number; max_value: string | number; is_active: boolean;
};
export type NotificationSettings = {
  settings: { email_enabled: boolean; notification_interval: number };
  device_id: string | null; device: Device | null; devices: Device[]; thresholds: Threshold[];
};
export type Message = { message: string; resendAfter?: number };
export type Registration = Message & { emailVerification: { required: boolean; sent?: boolean; resendAfter?: number } };
