// The private pairing key comes from the user's QR, never from the public JS bundle.
const keys = new Map<string, string>();
export function rememberDevAccess(baseUrl: string, key: string) {
  if (/^[A-Za-z0-9_-]{32,128}$/.test(key)) keys.set(new URL(baseUrl).origin, key);
}
export function devAccessKey(baseUrl: string) { return keys.get(new URL(baseUrl).origin); }
export function parseDevPairing(value: string | null | undefined): { baseUrl: string; key: string } | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const key = url.searchParams.get('dev_key');
    if (!['exp:', 'exps:'].includes(url.protocol) || !key || !/^[A-Za-z0-9_-]{32,128}$/.test(key)) return null;
    const local = /^(localhost|127\.0\.0\.1|\d{1,3}(\.\d{1,3}){3})$/.test(url.hostname);
    return { baseUrl: `${local && url.protocol === 'exp:' ? 'http' : 'https'}://${url.host}/api`, key };
  } catch { return null; }
}
