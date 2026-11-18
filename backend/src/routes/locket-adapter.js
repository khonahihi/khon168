const { HttpError } = require('../lib/errors');
const { extractImage } = require('../lib/image');
const { findFrame } = require('../lib/frames');
const { json, parseInput } = require('../lib/http');
const store = require('../lib/store');
function detectFilter(body, header) {
  const b = body && typeof body === 'object' ? body : {};
  const f = [header, b.filterId, b.filter_id, b.filter, b.effectId, b.effect_id,
    b.data?.filterId, b.data?.filter_id, b.options?.filterId, b.options?.filter_id]
    .find(v => typeof v === 'string' && v.trim());
  return f || '';
}
async function handle(req, res, pathname) {
  if (pathname !== '/generateFilteredImage' || req.method !== 'POST') return false;
  // EXPERIMENTAL: live Locket request and response schemas are not known.
  if (!(req.headers['content-type'] || '').includes('application/json')) {
    throw new HttpError(415, 'JSON_REQUIRED', 'Experimental adapter requires application/json.');
  }
  const { body } = await parseInput(req);
  const frame = findFrame(detectFilter(body, req.headers['x-khon168-frame']));
  const sid = req.headers['x-khon168-session'];
  if (!sid) throw new HttpError(422, 'SESSION_HEADER_MISSING', 'Missing X-KHON168-Session UUID.');
  const jpeg = await extractImage(body);
  const session = await store.createSession(frame.id, sid);
  const updated = await store.addShot(session.id, jpeg);
  json(res, 200, store.locketResponse(updated));
  return true;
}
module.exports = { handle };
