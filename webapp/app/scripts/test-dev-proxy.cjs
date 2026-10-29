const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { createDevApiProxy } = require('./metro-api-proxy.cjs');

test('development proxy requires pairing and preserves backend authentication and bodies', async () => {
  const calls = [];
  const upstream = http.createServer(async (req, res) => {
    let body = ''; for await (const part of req) body += part;
    calls.push({ path: req.url, headers: req.headers, body });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  }).listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const key = 'b'.repeat(64);
  const proxy = createDevApiProxy(key, upstream.address().port);
  const gateway = http.createServer((req, res) => proxy(req, res, () => { res.writeHead(404); res.end(); })).listen(0, '127.0.0.1');
  await once(gateway, 'listening');
  const url = `http://127.0.0.1:${gateway.address().port}`;
  try {
    assert.equal((await fetch(url + '/api/health')).status, 403);
    assert.equal((await fetch(url + '/api/health', { headers: { 'X-Aquaponics-Dev-Key': 'wrong' } })).status, 403);
    assert.equal(calls.length, 0);
    const result = await fetch(url + '/api/control/light?device_id=d1', {
      method: 'POST', headers: { 'X-Aquaponics-Dev-Key': key, Authorization: 'Bearer example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'auto' }),
    });
    assert.equal(result.status, 200);
    assert.equal(calls[0].path, '/api/control/light?device_id=d1');
    assert.equal(calls[0].headers.authorization, 'Bearer example');
    assert.equal(calls[0].headers['x-aquaponics-dev-key'], undefined);
    assert.deepEqual(JSON.parse(calls[0].body), { mode: 'auto' });
    assert.equal((await fetch(url + '/other', { headers: { 'X-Aquaponics-Dev-Key': key } })).status, 404);
  } finally {
    gateway.closeAllConnections(); upstream.closeAllConnections();
    await Promise.all([new Promise(resolve => gateway.close(resolve)), new Promise(resolve => upstream.close(resolve))]);
  }
});
