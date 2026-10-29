import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type SavedSession = { baseUrl: string; token: string; devKey?: string };
const sessionKey = 'fish-greens-session';
const serverKey = 'fish-greens-server';

// On web the token lives only until the tab closes; native uses Keychain / Keystore.
async function read(key: string) {
  return Platform.OS === 'web' ? globalThis.sessionStorage.getItem(key) : SecureStore.getItemAsync(key);
}
async function write(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    if (value === null) globalThis.sessionStorage.removeItem(key);
    else globalThis.sessionStorage.setItem(key, value);
  } else if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}
export const sessionStorage = {
  server: () => read(serverKey),
  saveServer: (url: string) => write(serverKey, url),
  async load(): Promise<SavedSession | null> {
    const value = await read(sessionKey);
    if (!value) return null;
    try {
      const data = JSON.parse(value);
      return typeof data.baseUrl === 'string' && typeof data.token === 'string' ? data : null;
    } catch { return null; }
  },
  save: (session: SavedSession) => write(sessionKey, JSON.stringify(session)),
  clear: () => write(sessionKey, null),
};
