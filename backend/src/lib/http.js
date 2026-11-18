const { HttpError } = require('./errors');
const { maxImageBytes } = require('../config');
const MAX_BODY = Math.ceil(maxImageBytes * 4 / 3) + 64_000;
function json(res, status, data) {
  const str = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(str),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(str);
}
async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY) throw new HttpError(413, 'BODY_TOO_LARGE', 'Request body exceeds configured image limit.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
function parseMultipartImage(input, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const boundary = (match && (match[1] || match[2] || '').trim()) || '';
  if (!boundary || boundary.length > 200) throw new HttpError(415, 'MULTIPART_BOUNDARY_REQUIRED', 'Missing multipart boundary.');
  const sep = Buffer.from('--' + boundary, 'utf8');
  let at = input.indexOf(sep);
  while (at !== -1) {
    const start = at + sep.length;
    const end = input.indexOf(sep, start);
    if (end === -1) break;
    let part = input.subarray(start, end);
    if (part.subarray(0, 2).toString() === '\r\n') part = part.subarray(2);
    if (part.subarray(part.length - 2).toString() === '\r\n') part = part.subarray(0, part.length - 2);
    const divider = part.indexOf(Buffer.from('\r\n\r\n'));
    if (divider !== -1) {
      const headers = part.subarray(0, divider).toString('latin1');
      if (/content-disposition:[^\r\n]*\bname="image"/i.test(headers)) return part.subarray(divider + 4);
    }
    at = end;
  }
  throw new HttpError(422, 'IMAGE_REQUIRED', 'Multipart field "image" is required.');
}
async function parseInput(req) {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  const raw = await readBody(req);
  if (contentType.includes('application/json')) {
    try { return { body: JSON.parse(raw.toString('utf8')), file: null }; }
    catch { throw new HttpError(400, 'INVALID_JSON', 'Malformed JSON request.'); }
  }
  if (contentType.startsWith('multipart/form-data')) return { body: {}, file: { buffer: parseMultipartImage(raw, contentType) } };
  if (/^image\/(jpeg|jpg|png|webp|heic|heif|avif)/.test(contentType)) return { body: {}, file: { buffer: raw } };
  throw new HttpError(415, 'UNSUPPORTED_CONTENT_TYPE', 'Use application/json, image/* or multipart/form-data.');
}
module.exports = { json, parseInput };
