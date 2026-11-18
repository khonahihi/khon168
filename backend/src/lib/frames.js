const fs = require('node:fs');
const path = require('node:path');
const { framesDir } = require('../config');
const { HttpError } = require('./errors');
const catalog = JSON.parse(fs.readFileSync(path.join(framesDir, 'frames.json'), 'utf8'));
const aliasMap = new Map();
for (const [name, frame] of Object.entries(catalog)) {
  if (!Array.isArray(frame.slots) || frame.slots.length !== 4) throw new Error(`Invalid frame: ${name}`);
  for (const alias of [name, ...frame.aliases]) aliasMap.set(alias.toLowerCase(), name);
}
function findFrame(id) {
  const name = aliasMap.get(String(id || '').trim().toLowerCase());
  if (!name) throw new HttpError(422, 'UNKNOWN_FRAME', 'Frame ID is not configured.');
  return { id: name, ...catalog[name], overlayPath: path.join(framesDir, catalog[name].overlay) };
}
function publicFrames() {
  return Object.entries(catalog).map(([id, f]) => ({ id, title: f.title, width: f.width, height: f.height, shots: f.slots.length, aliases: f.aliases }));
}
module.exports = { findFrame, publicFrames };
