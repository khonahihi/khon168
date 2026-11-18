const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { dataDir, ttlMs, publicBaseUrl } = require('../config');
const { HttpError } = require('./errors');
const { findFrame } = require('./frames');
const { composePreview } = require('./compose');
const locks = new Map();
const VALID_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertId(id) {
  if (!VALID_ID.test(id || '')) throw new HttpError(400, 'INVALID_SESSION', 'Invalid session UUID.');
  return id.toLowerCase();
}
function dir(id) { return path.join(dataDir, 'sessions', assertId(id)); }
function manifestPath(id) { return path.join(dir(id), 'session.json'); }
async function writeManifest(session) {
  const p = manifestPath(session.id);
  await fs.writeFile(p + '.tmp', JSON.stringify(session, null, 2));
  await fs.rename(p + '.tmp', p);
}
async function readSession(id) {
  let session;
  try { session = JSON.parse(await fs.readFile(manifestPath(id), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') throw new HttpError(404, 'SESSION_NOT_FOUND', 'Session not found.'); throw e; }
  if (Date.now() - new Date(session.updatedAt).getTime() > ttlMs) {
    throw new HttpError(410, 'SESSION_EXPIRED', 'Session expired. Start a new session.');
  }
  return session;
}
async function createSession(frameId, clientId) {
  const frame = findFrame(frameId);
  const id = clientId ? assertId(clientId) : crypto.randomUUID();
  const folder = dir(id);
  try {
    await fs.mkdir(folder, { recursive: false });
  } catch (e) {
    if (e.code === 'ENOENT') {
      await fs.mkdir(path.join(dataDir, 'sessions'), { recursive: true });
      return createSession(frameId, id);
    }
    if (e.code !== 'EEXIST') throw e;
    const existing = await readSession(id);
    if (existing.frameId !== frame.id) throw new HttpError(409, 'FRAME_CHANGED', 'Finish or discard the current frame session before switching frame.');
    return existing;
  }
  const now = new Date().toISOString();
  const session = { id, frameId: frame.id, shots: 0, complete: false, createdAt: now, updatedAt: now };
  await writeManifest(session);
  return session;
}
function serial(key, work) {
  const before = locks.get(key) || Promise.resolve();
  const current = before.catch(() => {}).then(work);
  locks.set(key, current);
  current.finally(() => { if (locks.get(key) === current) locks.delete(key); }).catch(() => {});
  return current;
}
async function addShot(id, jpegData) {
  return serial(assertId(id), async () => {
    const session = await readSession(id);
    if (session.complete || session.shots >= 4) throw new HttpError(409, 'SESSION_COMPLETE', 'Four photos are already captured. Start a new session.');
    const n = session.shots + 1;
    const folder = dir(id);
    const shotPath = path.join(folder, `shot-${n}.jpg`);
    await fs.writeFile(shotPath, jpegData);
    try {
      const paths = Array.from({ length: n }, (_, i) => path.join(folder, `shot-${i + 1}.jpg`));
      await composePreview(session.frameId, paths, path.join(folder, 'preview.jpg'));
      session.shots = n;
      session.complete = n === 4;
      session.updatedAt = new Date().toISOString();
      await writeManifest(session);
      return session;
    } catch (e) {
      await fs.unlink(shotPath).catch(() => {});
      throw e;
    }
  });
}
async function deleteSession(id) {
  await readSession(id);
  await fs.rm(dir(id), { recursive: true, force: true });
}
function sessionView(session) {
  const previewUrl = session.shots ? `${publicBaseUrl}/api/photobooth/sessions/${session.id}/preview?t=${session.shots}` : null;
  return {
    sessionId: session.id,
    frameId: session.frameId,
    shots: session.shots,
    totalShots: 4,
    complete: session.complete,
    canCaptureMore: !session.complete,
    previewUrl,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}
function locketResponse(session) {
  const view = sessionView(session);
  const u = view.previewUrl;
  return {
    success: true,
    sessionId: session.id,
    frameId: session.frameId,
    shot: session.shots,
    totalShots: 4,
    complete: session.complete,
    result: {
      outputUrl: u, output_url: u, imageUrl: u, image_url: u, url: u,
      status: 200,
      data: { outputUrl: u, output_url: u, imageUrl: u, image_url: u, url: u }
    }
  };
}
async function cleanupExpired() {
  const base = path.join(dataDir, 'sessions');
  const entries = await fs.readdir(base, { withFileTypes: true }).catch(() => []);
  let cleared = 0;
  for (const ent of entries) {
    if (!ent.isDirectory() || !VALID_ID.test(ent.name)) continue;
    const folder = path.join(base, ent.name);
    try {
      const state = JSON.parse(await fs.readFile(path.join(folder, 'session.json'), 'utf8'));
      if (Date.now() - new Date(state.updatedAt).getTime() > ttlMs) {
        await fs.rm(folder, { recursive: true, force: true });
        cleared++;
      }
    } catch { /* keep unknown folders untouched */ }
  }
  return cleared;
}
module.exports = { assertId, dir, createSession, readSession, addShot, deleteSession, sessionView, locketResponse, cleanupExpired };
