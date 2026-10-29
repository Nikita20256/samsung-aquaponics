const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Test the actual TypeScript source without adding a test framework to Expo.
function loadSource(relative, imports = {}) {
  const filename = path.join(__dirname, '..', relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  const originalRequire = mod.require.bind(mod);
  mod.require = name => name in imports ? imports[name] : originalRequire(name);
  mod._compile(compiled, filename);
  return mod.exports;
}
const devAccess = loadSource('src/api/devAccess.ts');
const clientModule = loadSource('src/api/client.ts', { './devAccess': devAccess });
const { ApiClient, ApiError, normalizeApiUrl } = clientModule;
const { createAquaponicsApi } = loadSource('src/api/aquaponics.ts', { './client': clientModule });
const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('QR pairing keeps the development key scoped to the tunnel origin', async () => {
  assert.equal(devAccess.parseDevPairing(undefined), null);
  assert.equal(devAccess.parseDevPairing(null), null);
  const key = 'a'.repeat(64);
  const pairing = devAccess.parseDevPairing(`exps://test.exp.direct/--/?dev_key=${key}`);
  assert.deepEqual(pairing, { baseUrl: 'https://test.exp.direct/api', key });
  assert.equal(devAccess.parseDevPairing('https://test.exp.direct/?dev_key=' + key), null);
  assert.equal(devAccess.parseDevPairing('exps://test.exp.direct/?dev_key=short'), null);
  devAccess.rememberDevAccess(pairing.baseUrl, pairing.key);
  const calls = [];
  global.fetch = async (url, init) => { calls.push(init); return json({}); };
  await new ApiClient(pairing.baseUrl).request('/health');
  await new ApiClient('https://another.example/api').request('/health');
  assert.equal(calls[0].headers['X-Aquaponics-Dev-Key'], key);
  assert.equal(calls[1].headers['X-Aquaponics-Dev-Key'], undefined);
});

test('normalizes server addresses and rejects unsafe/ambiguous URLs', () => {
  assert.equal(normalizeApiUrl(' http://192.168.1.2:3000/ '), 'http://192.168.1.2:3000/api');
  assert.equal(normalizeApiUrl('https://example.com/api///'), 'https://example.com/api');
  for (const value of ['localhost:3000', 'file:///tmp', 'https://u:p@example.com', 'https://example.com?token=a', 'https://example.com#x']) {
    assert.throws(() => normalizeApiUrl(value), ApiError);
  }
});
test('encodes device IDs and sends the JWT only to authenticated endpoints', async () => {
  const calls = [];
  global.fetch = async (url, init) => { calls.push({ url, init }); return json({}); };
  const api = createAquaponicsApi(new ApiClient('http://localhost:3000', 'test-token'));
  await api.sensors('device +/&?');
  assert.equal(new URL(calls[0].url).searchParams.get('device_id'), 'device +/&?');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-token');
  await api.login('admin', 'password', 'Asia/Novosibirsk');
  assert.equal(calls[1].init.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(calls[1].init.body), { login: 'admin', password: 'password', timezone: 'Asia/Novosibirsk' });
});
test('control requests use the server protocol and include the selected device', async () => {
  let call;
  global.fetch = async (url, init) => { call = { url, init }; return json({ ok: true, modes: { light: 'off', aeration: 'auto' } }); };
  const api = createAquaponicsApi(new ApiClient('http://localhost:3000', 'token'));
  const result = await api.setMode('dev-two', 'light', 'off');
  assert.equal(new URL(call.url).pathname, '/api/control/light');
  assert.equal(new URL(call.url).searchParams.get('device_id'), 'dev-two');
  assert.equal(call.init.method, 'POST');
  assert.deepEqual(JSON.parse(call.init.body), { mode: 'off' });
  assert.equal(result.modes.light, 'off');
});
test('an expired JWT signs out; wrong device secrets and forbidden devices do not', async () => {
  let expired = 0;
  const client = new ApiClient('http://localhost', 'token', () => expired++);
  global.fetch = async () => json({ error: 'Неверный секретный код устройства' }, 401);
  await assert.rejects(client.request('/user/devices', { method: 'POST' }), /секретный/);
  assert.equal(expired, 0);
  global.fetch = async () => json({ error: 'Несанкционированный доступ к устройству' }, 403);
  await assert.rejects(client.request('/sensors/all'), /доступ/);
  assert.equal(expired, 0);
  global.fetch = async () => json({ error: 'Недействительный или истекший токен' }, 403);
  await assert.rejects(client.request('/user/profile'), /токен/);
  assert.equal(expired, 1);
});
test('history and account requests match backend field names', async () => {
  const calls = [];
  global.fetch = async (url, init) => { calls.push({ url, init }); return json({}); };
  const api = createAquaponicsApi(new ApiClient('http://localhost:3000', 'token'));
  await api.history('d1', '2026-10-21T00:00:00Z', '2026-10-22T00:00:00Z');
  assert.equal(new URL(calls[0].url).searchParams.get('limit'), '500');
  await api.addDevice('d1', 'code');
  assert.deepEqual(JSON.parse(calls[1].init.body), { device_id: 'd1', device_secret: 'code' });
  await api.requestEmailChange('test@example.com');
  assert.deepEqual(JSON.parse(calls[2].init.body), { newEmail: 'test@example.com' });
  await api.resetPassword('login', '123456', 'new');
  assert.deepEqual(JSON.parse(calls[3].init.body), { identifier: 'login', code: '123456', newPassword: 'new' });
});
test('reports network failures and invalid server responses clearly', async () => {
  const client = new ApiClient('http://localhost');
  global.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(client.request('/health'), /подключиться/);
  global.fetch = async () => new Response('<html>wrong server</html>');
  await assert.rejects(client.request('/health'), /Проверьте адрес API/);
});
test('times out stalled requests and preserves caller cancellation', async () => {
  global.fetch = (url, init) => new Promise((resolve, reject) => {
    const fail = () => reject(new DOMException('Aborted', 'AbortError'));
    if (init.signal.aborted) fail();
    else init.signal.addEventListener('abort', fail, { once: true });
  });
  await assert.rejects(new ApiClient('http://localhost', null, undefined, 10).request('/health'), /вовремя/);
  const controller = new AbortController();
  const request = new ApiClient('http://localhost').request('/sensors/all', { signal: controller.signal });
  controller.abort();
  await assert.rejects(request, { name: 'AbortError' });
});

if (process.env.TEST_API_URL) test('live server: mobile client login, profile, devices and data contracts', async () => {
  const baseUrl = process.env.TEST_API_URL;
  const guest = createAquaponicsApi(new ApiClient(baseUrl));
  assert.equal((await guest.health()).status, 'ok');
  const { token } = await guest.login(process.env.TEST_LOGIN || 'admin', process.env.TEST_PASSWORD || 'admin123');
  assert.ok(token);
  const api = createAquaponicsApi(new ApiClient(baseUrl, token));
  assert.equal(typeof (await api.profile()).login, 'string');
  const { devices } = await api.devices();
  assert.ok(Array.isArray(devices));
  if (process.env.TEST_DEVICE_ID) assert.ok(devices.some(d => d.device_id === process.env.TEST_DEVICE_ID));
  for (const { device_id } of devices) {
    const [sensors, modes, history, settings] = await Promise.all([
      api.sensors(device_id), api.modes(device_id),
      api.history(device_id, new Date(Date.now() - 86400000).toISOString(), new Date().toISOString()),
      api.notifications(device_id),
    ]);
    assert.equal(typeof sensors.online, 'boolean');
    assert.ok(['on', 'auto', 'off'].includes(modes.light));
    assert.ok(Array.isArray(history.humidity));
    assert.ok(Array.isArray(settings.thresholds));
    if (device_id === process.env.TEST_DEVICE_ID) {
      assert.equal(sensors.online, false);
      assert.equal(sensors.lastSeen, null);
      assert.equal(sensors.humidity, null);
      assert.equal(history.humidity.length, 1);
      assert.equal(Number(history.humidity[0].value), 55);
      assert.equal(settings.thresholds.length, 3);
    }
  }
  // No device commands or mail are sent by the live check.
});
