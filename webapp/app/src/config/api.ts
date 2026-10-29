import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { normalizeApiUrl } from '../api/client';

export function defaultApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname || 'localhost'}:3000/api`;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  // Expo's tunnel forwards Metro only. Do not mistake it for the backend host.
  if (host && /^(localhost|\d{1,3}(\.\d{1,3}){3})$/.test(host)) return `http://${host}:3000/api`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
}
