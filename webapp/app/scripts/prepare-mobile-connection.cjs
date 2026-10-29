const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { deflateSync } = require('node:zlib');

function qrPng(matrix, size) {
  const scale = 8, border = 4, width = (size + border * 2) * scale;
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * width);
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const mx = Math.floor(x / scale) - border, my = Math.floor(y / scale) - border;
    const black = mx >= 0 && my >= 0 && mx < size && my < size && matrix[my * size + mx];
    const offset = y * stride + 1 + x * 3;
    raw.fill(black ? 0 : 255, offset, offset + 3);
  }
  function chunk(type, data) {
    const content = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of content) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const head = Buffer.alloc(4), tail = Buffer.alloc(4);
    head.writeUInt32BE(data.length); tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([head, content, tail]);
  }
  const info = Buffer.alloc(13);
  info.writeUInt32BE(width, 0); info.writeUInt32BE(width, 4); info[8] = 8; info[9] = 2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', info), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

(async () => {
  const directory = path.resolve(__dirname, '../../mobile-access');
  const { key } = JSON.parse(fs.readFileSync(path.join(directory, 'dev-access.json'), 'utf8'));
  const manifestHeaders = { Accept: 'application/expo+json', 'Expo-Platform': 'android', 'Expo-Protocol-Version': '1', 'ngrok-skip-browser-warning': 'true' };
  const local = await fetch('http://localhost:8081/', { headers: manifestHeaders });
  const localManifest = await local.json();
  const expectedSdk = require('expo/package.json').version.split('.')[0];
  const sdkVersion = localManifest.extra?.expoClient?.sdkVersion;
  if (typeof sdkVersion !== 'string' || sdkVersion.split('.')[0] !== expectedSdk) {
    throw new Error('Metro is serving a different Expo SDK. Restart the mobile tunnel.');
  }
  console.log('Expo Go manifest SDK:', sdkVersion);
  const host = localManifest.extra.expoClient.hostUri;
  if (!/^[a-z0-9-]+\.exp\.direct$/.test(host)) throw new Error('Expected a running Expo tunnel');
  const baseUrl = `https://${host}`;
  const link = `exps://${host}/--/?dev_key=${key}`;
  const headers = { 'X-Aquaponics-Dev-Key': key, 'ngrok-skip-browser-warning': 'true' };
  const anonymous = await fetch(baseUrl + '/api/health', { headers: { 'ngrok-skip-browser-warning': 'true' }, signal: AbortSignal.timeout(30000) });
  if (anonymous.status !== 403) throw new Error('Anonymous API access was not blocked');
  console.log('Anonymous API access: blocked');
  const health = await fetch(baseUrl + '/api/health', { headers, signal: AbortSignal.timeout(30000) });
  if ((await health.json()).status !== 'ok') throw new Error('Tunnel API health failed');
  console.log('HTTPS tunnel API health: OK');
  const profile = await fetch(baseUrl + '/api/user/profile', { headers, signal: AbortSignal.timeout(30000) });
  if (profile.status !== 401) throw new Error('Backend authentication is not enforced');
  console.log('Backend JWT authentication: enforced (no credentials transmitted)');
  const publicManifest = await fetch(baseUrl + '/', { headers: manifestHeaders, signal: AbortSignal.timeout(30000) });
  const manifest = await publicManifest.json();
  if (manifest.extra?.expoClient?.sdkVersion !== sdkVersion) throw new Error('Public tunnel serves a different SDK');
  if (!manifest.launchAsset?.url) throw new Error('Android manifest is missing its launch asset');
  const bundleUrl = new URL(manifest.launchAsset.url);
  bundleUrl.protocol = 'https:';
  console.log('Android bundle download started');
  const bundle = await fetch(bundleUrl, { headers: { 'ngrok-skip-browser-warning': 'true' }, signal: AbortSignal.timeout(120000) });
  const bundleBody = await bundle.arrayBuffer();
  if (!bundle.ok) throw new Error('Android bundle request failed: ' + bundle.status);
  if (Buffer.from(bundleBody).includes(Buffer.from(key))) throw new Error('Pairing key appeared in the public bundle');
  console.log('Android bundle: OK (' + bundleBody.byteLength + ' bytes)');
  const expoRequire = createRequire(require.resolve('expo/package.json'));
  const cliRequire = createRequire(expoRequire.resolve('@expo/cli/package.json'));
  const matrix = cliRequire('toqr').toQR(link);
  const size = Math.sqrt(matrix.length);
  if (!Number.isInteger(size)) throw new Error('Invalid QR matrix');
  fs.writeFileSync(path.join(directory, 'qr-matrix.json'), JSON.stringify({ size, pixels: Array.from(matrix) }));
  fs.writeFileSync(path.join(directory, 'android-qr.png'), qrPng(matrix, size));
  fs.writeFileSync(path.join(directory, 'android-url.txt'), link);
  fs.writeFileSync(path.join(directory, 'connection.json'), JSON.stringify({ url: link, baseUrl: baseUrl + '/api', tested: new Date().toISOString() }, null, 2));
  console.log('QR data prepared outside the Expo project.');
  console.log('Tunnel:', baseUrl);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
