const sharp = require('sharp');
const { HttpError } = require('./errors');
const { maxImageBytes, allowedImageHosts } = require('../config');

function fromBase64(input) {
  if (typeof input !== 'string') throw new HttpError(422, 'IMAGE_REQUIRED', 'Image base64 or multipart image is required.');
  const val = input.startsWith('data:image/') ? input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '') : input;
  if (!/^[A-Za-z0-9+/\s]+={0,2}$/.test(val) || !val.trim()) {
    throw new HttpError(422, 'INVALID_BASE64', 'Image data must be standard base64 or image data URI.');
  }
  if (val.length > Math.ceil(maxImageBytes * 4 / 3) + 256) throw new HttpError(413, 'IMAGE_TOO_LARGE', 'Image exceeds size limit.');
  return Buffer.from(val.replace(/\s/g, ''), 'base64');
}
async function fromRemoteUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { throw new HttpError(422, 'INVALID_IMAGE_URL', 'Invalid remote image URL.'); }
  if (url.protocol !== 'https:' || url.port || !allowedImageHosts.includes(url.hostname.toLowerCase())) {
    throw new HttpError(422, 'IMAGE_HOST_NOT_ALLOWED', 'Remote image host is not allowlisted; see ALLOWED_IMAGE_HOSTS.');
  }
  let resp;
  try { resp = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000), headers: { Accept: 'image/*' } }); }
  catch { throw new HttpError(502, 'REMOTE_FETCH_FAILED', 'Could not fetch remote image.'); }
  if (!resp.ok) throw new HttpError(502, 'REMOTE_FETCH_FAILED', 'Image host rejected request.');
  const ct = resp.headers.get('content-type') || '';
  if (!ct.toLowerCase().startsWith('image/')) throw new HttpError(422, 'NOT_AN_IMAGE', 'Remote URL did not return an image.');
  const cl = Number(resp.headers.get('content-length') || 0);
  if (cl > maxImageBytes) throw new HttpError(413, 'IMAGE_TOO_LARGE', 'Remote image exceeds size limit.');
  const chunks = [];
  let bytes = 0;
  try {
    for await (const chunk of resp.body) {
      bytes += chunk.length;
      if (bytes > maxImageBytes) throw new HttpError(413, 'IMAGE_TOO_LARGE', 'Remote image exceeds size limit.');
      chunks.push(chunk);
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, 'REMOTE_READ_FAILED', 'Failed to read remote image.');
  }
  return Buffer.concat(chunks);
}
async function normalizeImage(input) {
  if (!Buffer.isBuffer(input) || !input.length) throw new HttpError(422, 'IMAGE_REQUIRED', 'Missing image data.');
  if (input.length > maxImageBytes) throw new HttpError(413, 'IMAGE_TOO_LARGE', 'Image exceeds size limit.');
  let meta;
  try { meta = await sharp(input, { limitInputPixels: 24_000_000 }).metadata(); }
  catch { throw new HttpError(422, 'INVALID_IMAGE', 'Cannot decode image.'); }
  if (!['jpeg', 'png', 'webp', 'heif', 'avif'].includes(meta.format)) throw new HttpError(415, 'UNSUPPORTED_IMAGE', 'Use JPEG, PNG, WebP, HEIF or AVIF.');
  try { return await sharp(input, { limitInputPixels: 24_000_000 }).rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer(); }
  catch { throw new HttpError(422, 'IMAGE_CONVERSION_FAILED', 'Unable to convert image.'); }
}
function pickImageField(body) {
  const source = body && typeof body === 'object' ? body : {};
  const nested = (source.data && typeof source.data === 'object') ? source.data : {};
  const values = [source.imageBase64, source.image_base64, source.base64, source.image, nested.imageBase64, nested.image_base64, nested.image];
  const field = values.find(v => typeof v === 'string' && v.length > 0);
  if (field) return { kind: /^https?:\/\//i.test(field) ? 'url' : 'base64', value: field };
  const url = [source.inputUrl, source.input_url, source.imageUrl, source.image_url, nested.inputUrl, nested.imageUrl].find(v => typeof v === 'string' && v);
  if (url) return { kind: 'url', value: url };
  throw new HttpError(422, 'UNKNOWN_IMAGE_FIELD', 'Could not find image data in this payload. Capture a redacted real request before changing the adapter.');
}
async function extractImage(body, file) {
  if (file?.buffer) return normalizeImage(file.buffer);
  const input = pickImageField(body);
  return normalizeImage(input.kind === 'url' ? await fromRemoteUrl(input.value) : fromBase64(input.value));
}
module.exports = { extractImage, normalizeImage, pickImageField };
