const http = require('node:http');
const { timingSafeEqual } = require('node:crypto');

function createDevApiProxy(key, port = 3000) {
  return (req, res, next) => {
    const pathname = (req.url || '').split('?')[0];
    if (pathname !== '/api' && !pathname.startsWith('/api/')) return next();
    const received = req.headers['x-aquaponics-dev-key'];
    const valid = key && typeof received === 'string' && Buffer.byteLength(received) === Buffer.byteLength(key)
      && timingSafeEqual(Buffer.from(received), Buffer.from(key));
    if (!valid) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: 'Для подключения к API откройте приложение по выданному QR-коду.' }));
      return;
    }
    // Fixed destination: this endpoint cannot proxy to other machines/services.
    const headers = { ...req.headers, host: `127.0.0.1:${port}` };
    delete headers['x-aquaponics-dev-key'];
    const upstream = http.request({ host: '127.0.0.1', port, path: req.url, method: req.method, headers }, response => {
      res.writeHead(response.statusCode || 502, response.headers); response.pipe(res);
      response.on('error', () => res.destroy());
    });
    upstream.setTimeout(15000, () => upstream.destroy(new Error('timeout')));
    upstream.on('error', () => {
      if (res.destroyed) return;
      if (res.headersSent) { res.destroy(); return; }
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Локальный сервер API недоступен.' }));
    });
    req.on('aborted', () => upstream.destroy());
    res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
    req.pipe(upstream);
  };
}
module.exports = { createDevApiProxy };
