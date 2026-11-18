const fs = require('node:fs');
const path = require('node:path');
const { publicFrames } = require('../lib/frames');
const { HttpError } = require('../lib/errors');
const { extractImage } = require('../lib/image');
const { json, parseInput } = require('../lib/http');
const store = require('../lib/store');

async function handle(req, res, pathname) {
  if (pathname === '/api/photobooth/frames' && req.method === 'GET') {
    json(res, 200, { frames: publicFrames() }); return true;
  }
  if (pathname === '/api/photobooth/sessions' && req.method === 'POST') {
    const { body } = await parseInput(req);
    const s = await store.createSession(body.frameId || 'classic');
    json(res, 201, store.sessionView(s)); return true;
  }
  const match = /^\/api\/photobooth\/sessions\/([^/]+)(?:\/(shots|preview))?$/.exec(pathname);
  if (!match) return false;
  const id = match[1], action = match[2] || '';
  if (!action && req.method === 'GET') {
    json(res, 200, store.sessionView(await store.readSession(id))); return true;
  }
  if (!action && req.method === 'DELETE') {
    await store.deleteSession(id); res.writeHead(204); res.end(); return true;
  }
  if (action === 'shots' && req.method === 'POST') {
    const { body, file } = await parseInput(req);
    const jpeg = await extractImage(body, file);
    const s = await store.addShot(id, jpeg);
    json(res, s.complete ? 200 : 201, store.sessionView(s)); return true;
  }
  if (action === 'preview' && req.method === 'GET') {
    const s = await store.readSession(id);
    if (!s.shots) throw new HttpError(404, 'PREVIEW_NOT_READY', 'No photo has been uploaded yet.');
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(path.join(store.dir(id), 'preview.jpg')).on('error', err => res.destroy(err)).pipe(res);
    return true;
  }
  return false;
}
module.exports = { handle };
