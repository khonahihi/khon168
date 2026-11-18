const http = require('node:http');
const { port, host, apiAccessKey, publicBaseUrl } = require('./config');
const { HttpError } = require('./lib/errors');
const { json } = require('./lib/http');
const store = require('./lib/store');
const photobooth = require('./routes/photobooth');
const adapter = require('./routes/locket-adapter');

function createApp() {
  return http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname === '/health' && req.method === 'GET') {
        return json(res, 200, { ok: true, service: 'KHON168 Photobooth', mode: 'prototype', time: new Date().toISOString() });
      }
      if (req.method !== 'GET' && apiAccessKey && req.headers['x-khon168-api-key'] !== apiAccessKey) {
        return json(res, 401, { error: 'UNAUTHORIZED', message: 'Missing or incorrect API key.' });
      }
      if (await photobooth.handle(req, res, pathname)) return;
      if (await adapter.handle(req, res, pathname)) return;
      return json(res, 404, { error: 'NOT_FOUND' });
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error('[KHON168]', err);
      if (!res.headersSent) json(res, status, { error: err.code || 'SERVER_ERROR', message: status === 500 ? 'Internal server error.' : err.message });
      else res.destroy(err);
    }
  });
}
if (require.main === module) {
  createApp().listen(port, host, () => {
    console.log(`KHON168 Photobooth listening at http://${host}:${port}`);
    console.log(`Public preview URL base: ${publicBaseUrl}`);
    if (!apiAccessKey) console.warn('WARNING: API_ACCESS_KEY is empty. Do not expose directly to the public internet.');
    store.cleanupExpired().then(n => n && console.log(`Removed ${n} expired sessions`)).catch(console.error);
  });
}
module.exports = { createApp };
