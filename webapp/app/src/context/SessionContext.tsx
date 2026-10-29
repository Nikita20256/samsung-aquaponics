import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Linking } from 'react-native';
import { ApiClient, errorMessage, normalizeApiUrl } from '../api/client';
import { createAquaponicsApi, type AquaponicsApi } from '../api/aquaponics';
import { defaultApiUrl } from '../config/api';
import { sessionStorage, type SavedSession } from '../services/sessionStorage';
import { devAccessKey, parseDevPairing, rememberDevAccess } from '../api/devAccess';

type SessionContextValue = {
  ready: boolean; baseUrl: string; authenticated: boolean; notice: string | null;
  api: AquaponicsApi; signIn: (baseUrl: string, login: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [baseUrl, setBaseUrl] = useState(defaultApiUrl);
  const [session, setSession] = useState<SavedSession | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const activeSession = useRef<SavedSession | null>(null);
  // Serialize persistence so a delayed save cannot restore an already signed-out session.
  const storageQueue = useRef(Promise.resolve());
  const persist = useCallback((action: () => Promise<void>) => {
    const next = storageQueue.current.catch(() => {}).then(action);
    storageQueue.current = next;
    return next;
  }, []);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [saved, server, initialUrl] = await Promise.all([sessionStorage.load(), sessionStorage.server(), Linking.getInitialURL()]);
        if (!mounted) return;
        const pairing = __DEV__ ? parseDevPairing(initialUrl ?? null) : null;
        if (pairing) {
          rememberDevAccess(pairing.baseUrl, pairing.key);
          setBaseUrl(pairing.baseUrl);
          if (saved?.baseUrl === pairing.baseUrl && saved.devKey === pairing.key) {
            activeSession.current = saved; setSession(saved);
          }
          return;
        }
        if (server) setBaseUrl(normalizeApiUrl(server));
        if (saved) {
          normalizeApiUrl(saved.baseUrl);
          if (saved.devKey) rememberDevAccess(saved.baseUrl, saved.devKey);
          activeSession.current = saved;
          setSession(saved); setBaseUrl(saved.baseUrl);
        }
      } catch { if (mounted) setNotice('Не удалось восстановить сохранённый вход. Войдите снова.'); }
      finally { if (mounted) setReady(true); }
    })();
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (!__DEV__) return;
    const listener = Linking.addEventListener('url', ({ url }) => {
      const pairing = parseDevPairing(url);
      if (!pairing) return;
      rememberDevAccess(pairing.baseUrl, pairing.key);
      if (activeSession.current?.baseUrl !== pairing.baseUrl || activeSession.current?.devKey !== pairing.key) {
        activeSession.current = null; setSession(null); setBaseUrl(pairing.baseUrl); setNotice(null);
      }
    });
    return () => listener.remove();
  }, []);

  const signOut = useCallback(async () => {
    activeSession.current = null;
    setSession(null);
    try { await persist(() => sessionStorage.clear()); }
    catch { setNotice('Сессия завершена. Не удалось очистить сохранённый вход на устройстве.'); }
  }, [persist]);
  const api = useMemo(() => createAquaponicsApi(new ApiClient(session?.baseUrl ?? baseUrl, session?.token, () => {
    if (session && activeSession.current === session) {
      setNotice('Срок входа истёк. Войдите снова.');
      void signOut();
    }
  })), [baseUrl, session, signOut]);
  const signIn = useCallback(async (server: string, login: string, password: string) => {
    const normalized = normalizeApiUrl(server);
    const guestApi = createAquaponicsApi(new ApiClient(normalized));
    const result = await guestApi.login(login.trim(), password, Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (!result.token) throw new Error('Сервер не вернул токен входа.');
    const next = { baseUrl: normalized, token: result.token, devKey: devAccessKey(normalized) };
    try {
      await persist(async () => { await sessionStorage.saveServer(normalized); await sessionStorage.save(next); });
    } catch (error) { throw new Error(`Не удалось сохранить вход: ${errorMessage(error)}`); }
    activeSession.current = next;
    setBaseUrl(normalized); setNotice(null); setSession(next);
  }, [persist]);

  return <SessionContext.Provider value={{ ready, baseUrl, authenticated: !!session, notice, api, signIn, signOut }}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider is missing');
  return value;
}
