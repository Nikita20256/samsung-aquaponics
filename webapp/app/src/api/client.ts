import { devAccessKey } from './devAccess';

export class ApiError extends Error {
  constructor(message: string, public readonly status = 0) {
    super(message);
    this.name = 'ApiError';
  }
}

export function normalizeApiUrl(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new ApiError('Укажите полный адрес сервера, например http://192.168.1.10:3000/api'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new ApiError('Адрес должен начинаться с http:// или https://, без пароля, параметров и #.');
  }
  const path = url.pathname.replace(/\/+$/, '');
  url.pathname = path.endsWith('/api') ? path : `${path}/api`;
  return url.toString().replace(/\/$/, '');
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown;
  query?: Record<string, string | number | undefined>; signal?: AbortSignal; public?: boolean;
};

/** One client belongs to one server/session. Old responses cannot sign out a new session. */
export class ApiClient {
  readonly baseUrl: string;
  constructor(baseUrl: string, private readonly token: string | null = null,
    private readonly onExpired?: () => void, private readonly timeoutMs = 12000) {
    this.baseUrl = normalizeApiUrl(baseUrl);
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    options.signal?.addEventListener('abort', abort);
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, this.timeoutMs);
    const headers: Record<string, string> = { Accept: 'application/json' };
    const pairingKey = devAccessKey(this.baseUrl);
    if (pairingKey) {
      headers['X-Aquaponics-Dev-Key'] = pairingKey;
      headers['ngrok-skip-browser-warning'] = 'true';
    }
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.token && !options.public) headers.Authorization = `Bearer ${this.token}`;
    try {
      const response = await fetch(url.toString(), {
        method: options.method ?? 'GET', headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body), signal: controller.signal,
      });
      const text = await response.text();
      let data: unknown;
      try { data = text ? JSON.parse(text) : null; } catch {
        throw new ApiError('Сервер вернул неожиданный ответ. Проверьте адрес API.', response.status);
      }
      const error = data && typeof data === 'object' && 'error' in data ? String(data.error) : null;
      if (!response.ok) {
        // A wrong device secret / password also returns 401; it must not destroy the session.
        if (this.token && !options.public && response.status === 403 && error === 'Недействительный или истекший токен') {
          this.onExpired?.();
        }
        throw new ApiError(error || `Ошибка сервера (${response.status})`, response.status);
      }
      return data as T;
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (error instanceof ApiError) throw error;
      throw new ApiError(timedOut ? 'Сервер не ответил вовремя. Попробуйте ещё раз.'
        : 'Не удалось подключиться к серверу. Проверьте адрес и сеть.');
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abort);
    }
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Не удалось выполнить действие.';
}
