import sharp from 'sharp';
import { ApiError } from './errors.js';
import { FITS, unitInterval } from './catalog.js';

export const FORMATS = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };

export function readEdits(raw, slots) {
  if (raw === undefined) return slots;
  let edits;
  try {
    edits = JSON.parse(raw);
  } catch {
    throw new ApiError(400, 'INVALID_EDITS', 'edits phải là một mảng JSON.');
  }
  if (!Array.isArray(edits) || edits.length !== slots.length) {
    throw new ApiError(400, 'INVALID_EDITS', 'edits phải có một phần tử cho mỗi ảnh.');
  }
  return edits.map((edit, index) => {
    const slot = slots[index];
    if (edit === null) return slot;
    if (!edit || typeof edit !== 'object' || Array.isArray(edit) ||
        Object.keys(edit).some((key) => !['fit', 'x', 'y'].includes(key))) {
      throw new ApiError(400, 'INVALID_EDITS', 'Mỗi tùy chỉnh chỉ gồm fit, x và y.');
    }
    const merged = { ...slot, ...edit };
    if (!FITS.includes(merged.fit) || !unitInterval(merged.x) || !unitInterval(merged.y)) {
      throw new ApiError(400, 'INVALID_EDITS', 'fit phải là cover hoặc contain. x và y phải nằm trong khoảng 0–1.');
    }
    return merged;
  });
}

function supportedSignature(input) {
  return (input.length >= 8 && input.readBigUInt64BE(0) === 0x89504e470d0a1a0an) ||
    (input.length >= 3 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff) ||
    (input.length >= 12 && input.toString('ascii', 0, 4) === 'RIFF' && input.toString('ascii', 8, 12) === 'WEBP');
}

function cropRegion(width, height, slot) {
  const ratio = slot.width / slot.height;
  const cropWidth = Math.min(width, Math.max(1, Math.round(height * ratio)));
  const cropHeight = Math.min(height, Math.max(1, Math.round(width / ratio)));
  return { left: Math.round((width - cropWidth) * slot.x),
    top: Math.round((height - cropHeight) * slot.y), width: cropWidth, height: cropHeight };
}

function roundedMask({ width, height, radius }) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="white"/></svg>`);
}

async function renderSlot(input, slot, config, deadline, signal) {
  if (!supportedSignature(input)) {
    throw new ApiError(415, 'UNSUPPORTED_IMAGE', 'Chỉ hỗ trợ ảnh PNG, JPEG và WebP.');
  }

  try {
    const image = sharp(input, { limitInputPixels: config.maxInputPixels, failOn: 'error' });
    const meta = await image.metadata();
    if (!Object.hasOwn(FORMATS, meta.format) || (meta.pages ?? 1) !== 1) {
      throw new ApiError(415, 'UNSUPPORTED_IMAGE', 'Chỉ hỗ trợ ảnh PNG, JPEG và WebP một khung hình.');
    }
    signal.throwIfAborted();
    image.autoOrient().timeout({ seconds: deadline() });
    if (slot.fit === 'cover') {
      image.extract(cropRegion(meta.autoOrient.width, meta.autoOrient.height, slot));
    }
    image.resize(slot.width, slot.height, { fit: slot.fit, background: 'transparent' }).ensureAlpha();
    if (slot.radius) image.composite([{ input: roundedMask(slot), blend: 'dest-in' }]);

    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    return {
      input: data,
      raw: { width: info.width, height: info.height, channels: info.channels },
      left: slot.left,
      top: slot.top,
    };
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof ApiError) throw error;
    if (/pixel limit/i.test(error.message)) {
      throw new ApiError(413, 'TOO_MANY_PIXELS', 'Ảnh vượt giới hạn số pixel.');
    }
    if (/time(?:d?\s*out|out)/i.test(error.message)) {
      throw new ApiError(504, 'COMPOSE_TIMEOUT', 'Xử lý ảnh quá thời gian cho phép.');
    }
    throw new ApiError(422, 'INVALID_IMAGE', 'Không đọc được ảnh. Hãy chọn một tệp ảnh khác.');
  }
}

export async function composeImages({ frame, inputs, edits, format, config, expiresAt, signal }) {
  const deadline = () => {
    signal.throwIfAborted();
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) throw new ApiError(504, 'COMPOSE_TIMEOUT', 'Xử lý ảnh quá thời gian cho phép.');
    return Math.min(config.sharpTimeoutSeconds, Math.max(1, Math.ceil(remaining / 1000)));
  };

  const layers = [];
  // Decode one source photo at a time to keep memory bounded on the free instance.
  for (const [index, input] of inputs.entries()) {
    layers.push(await renderSlot(input, edits[index], config, deadline, signal));
  }
  if (frame.overlay) layers.push({ input: frame.overlay, left: 0, top: 0 });

  const canvas = { ...frame.layout.canvas, channels: 4, background: frame.layout.background };
  try {
    const composite = sharp({ create: canvas }).composite(layers).timeout({ seconds: deadline() });
    if (format === 'png') return await composite.png().toBuffer();
    if (format === 'webp') return await composite.webp({ quality: 92, alphaQuality: 100 }).toBuffer();

    // Flatten after compositing so JPEG replaces every transparent pixel with white.
    const { data, info } = await composite.raw().toBuffer({ resolveWithObject: true });
    return await sharp(data, { raw: { ...frame.layout.canvas, channels: info.channels } })
      .flatten({ background: '#ffffff' }).timeout({ seconds: deadline() })
      .jpeg({ quality: 94, chromaSubsampling: '4:4:4' }).toBuffer();
  } catch (error) {
    signal.throwIfAborted();
    if (/time(?:d?\s*out|out)/i.test(error.message)) {
      throw new ApiError(504, 'COMPOSE_TIMEOUT', 'Xử lý ảnh quá thời gian cho phép.');
    }
    throw error;
  }
}
