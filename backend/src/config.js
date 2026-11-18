const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '127.0.0.1';
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${port}`).replace(/\/$/, '');
module.exports = {
  root, port, host, publicBaseUrl,
  dataDir: path.resolve(process.env.DATA_DIR || path.join(root, 'data')),
  framesDir: path.join(root, 'frames'),
  ttlMs: Math.max(5, Number(process.env.SESSION_TTL_MINUTES || 120)) * 60_000,
  maxImageBytes: Number(process.env.MAX_IMAGE_BYTES || 8 * 1024 * 1024),
  apiAccessKey: process.env.API_ACCESS_KEY || '',
  allowedImageHosts: (process.env.ALLOWED_IMAGE_HOSTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
};
