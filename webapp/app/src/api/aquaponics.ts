import { ApiClient } from './client';
import type { ControlMode, ControlModes, Device, Message, NotificationSettings, Profile, Registration, SensorHistory, Sensors, Threshold } from './types';

export function createAquaponicsApi(client: ApiClient) {
  const post = <T>(path: string, body: unknown, isPublic = false) => client.request<T>(path, { method: 'POST', body, public: isPublic });
  return {
    health: () => client.request<{ status: string }>('/health', { public: true }),
    login: (login: string, password: string, timezone?: string) => post<{ token: string }>('/auth/login', { login, password, timezone }, true),
    register: (login: string, password: string, email?: string, timezone?: string) => post<Registration>('/auth/register', { login, password, email, timezone }, true),
    confirmEmail: (email: string, code: string) => post<Message>('/auth/confirm-email', { email, code }, true),
    resendCode: (email: string) => post<Message>('/auth/resend-confirm-code', { email }, true),
    forgotPassword: (identifier: string) => post<Message>('/auth/forgot-password', { identifier }, true),
    resetPassword: (identifier: string, code: string, newPassword: string) => post<Message>('/auth/reset-password', { identifier, code, newPassword }, true),
    profile: () => client.request<Profile>('/user/profile'),
    devices: () => client.request<{ devices: Device[]; current: string | null }>('/user/devices'),
    addDevice: (device_id: string, device_secret: string) => post<Message>('/user/devices', { device_id, device_secret }),
    sensors: (device_id: string, signal?: AbortSignal) => client.request<Sensors>('/sensors/all', { query: { device_id }, signal }),
    modes: (device_id: string, signal?: AbortSignal) => client.request<ControlModes>('/control/modes', { query: { device_id }, signal }),
    setMode: (device_id: string, target: 'light' | 'aeration', mode: ControlMode) =>
      client.request<{ ok: boolean; modes: ControlModes }>(`/control/${target}`, { method: 'POST', query: { device_id }, body: { mode } }),
    history: (device_id: string, start: string, end: string, signal?: AbortSignal) =>
      client.request<SensorHistory>('/data/all', { query: { device_id, start, end, limit: 500 }, signal }),
    changePassword: (currentPassword: string, newPassword: string) => client.request<Message>('/user/password', { method: 'PUT', body: { currentPassword, newPassword } }),
    requestEmailChange: (newEmail: string) => post<Message>('/user/email/request', { newEmail }),
    confirmEmailChange: (newEmail: string, code: string) => post<Message>('/user/email/confirm', { newEmail, code }),
    updateTimezone: (timezone: string, auto = false) => client.request<Pick<Profile, 'timezone' | 'timezoneManual'>>('/user/profile/timezone', { method: 'PUT', body: { timezone, auto } }),
    notifications: (device_id?: string) => client.request<NotificationSettings>('/notifications/settings', { query: { device_id } }),
    saveNotifications: (email_enabled: boolean, notification_interval: number) => post<Message>('/notifications/settings', { email_enabled, notification_interval }),
    saveThresholds: (device_id: string, notifications_enabled: boolean, thresholds: Threshold[]) =>
      post<Message>('/notifications/device', { device_id, notifications_enabled, thresholds }),
  };
}
export type AquaponicsApi = ReturnType<typeof createAquaponicsApi>;
