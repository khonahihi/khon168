import { fileURLToPath } from 'node:url';
import { isIP } from 'node:net';
import express from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import { loadCatalog, PHOTO_COUNTS } from './catalog.js';
import { composeImages, FORMATS, readEdits } from './compose.js';
import { readConfig } from './config.js';
import { ApiError } from './errors.js';
import { createResultStore } from './result-store.js';

const api = '/api/photobooth';
const webDir = new URL('../web/', import.meta.url);
const fields = ['frameId', 'format', 'mode', 'edits'];

function frameSummary(frame, origin) {
  const { id, name, description, photoCount, canvas } = frame.layout;
  return { id, name, description, photoCount, canvas, previewUrl: `${origin}${api}/frames/${id}/preview.png` };
}

function frameDetail(frame, origin) {
  const { background, slotColor, gap, slots } = frame.layout;
  return {
    ...frameSummary(frame, origin),
    background, slotColor, gap, slots,
    overlayUrl: frame.overlay ? `${origin}${api}/frames/${frame.layout.id}/overlay.png` : null,
  };
}

function readOptions(body, files, catalog) {
  if (Object.keys(body).some((key) => !fields.includes(key) || typeof body[key] !== 'string')) {
    throw new ApiError(400, 'INVALID_FIELDS', 'Mỗi trường multipart chỉ được gửi một lần và phải có tên hợp lệ.');
  }
  const { frameId, format = 'png', mode = 'binary', edits: rawEdits } = body;
  if (!frameId) throw new ApiError(400, 'FRAME_REQUIRED', 'Hãy chọn một khung ảnh.');
  const frame = catalog.get(frameId);
  if (!frame) throw new ApiError(404, 'FRAME_NOT_FOUND', 'Không tìm thấy khung ảnh.');
  if (!Object.hasOwn(FORMATS, format)) throw new ApiError(400, 'INVALID_FORMAT', 'format phải là png, jpeg hoặc webp.');
  if (!['binary', 'url'].includes(mode)) throw new ApiError(400, 'INVALID_MODE', 'mode phải là binary hoặc url.');
  if (files.length !== frame.layout.photoCount) {
    throw new ApiError(400, 'WRONG_PHOTO_COUNT', `Khung này cần đúng ${frame.layout.photoCount} ảnh.`);
  }
  return { frame, format, mode, edits: readEdits(rawEdits, frame.layout.slots) };
}

function sendImage(res, buffer, frameId, format) {
  res.attachment(`khon168-${frameId}.${format === 'jpeg' ? 'jpg' : format}`);
  res.type(FORMATS[format]).set('Cache-Control', 'no-store, private').send(buffer);
}

function uploadError(error) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return new ApiError(413, 'FILE_TOO_LARGE', 'Tệp vượt giới hạn dung lượng.');
    if (error.code === 'LIMIT_FILE_COUNT') return new ApiError(400, 'WRONG_PHOTO_COUNT', 'Chỉ có thể gửi tối đa 4 ảnh.');
    return new ApiError(400, 'INVALID_MULTIPART', 'Kiểm tra tên trường photos và giới hạn của form.');
  }
  return new ApiError(400, 'INVALID_MULTIPART', 'Không đọc được dữ liệu multipart/form-data.');
}

export async function createApp({ config = readConfig(), catalog, logger = console } = {}) {
  sharp.cache(false);
  sharp.concurrency(1);
  catalog ??= await loadCatalog();

  const results = createResultStore(config);
  const app = express();
  app.disable('x-powered-by');
  app.disable('etag');
  app.set('trust proxy', config.trustProxyHops || false);

  const receivePhotos = multer({
    storage: multer.memoryStorage(),
    limits: { files: 4, fields: 4, parts: 9, fileSize: config.maxImageBytes + 1, fieldSize: 2048 },
  }).array('photos', 4);
  const limitCompositions = rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.composeRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...(config.onRender && {
      keyGenerator: (req) => {
        const edgeIp = req.get('CF-Connecting-IP');
        return ipKeyGenerator(edgeIp && isIP(edgeIp) ? edgeIp : req.ip);
      },
    }),
    handler: (req, res, next) => {
      res.set('Connection', 'close');
      next(new ApiError(429, 'RATE_LIMITED', 'Bạn gửi yêu cầu quá nhanh. Hãy thử lại sau.'));
    },
  });
  let active = 0;

  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' blob:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    next();
  });
  app.get('/health', (req, res) => res.set('Cache-Control', 'no-store').json({ status: 'ok' }));
  app.get(api + '/config', (req, res) => res.json({
    photoCounts: PHOTO_COUNTS,
    inputFormats: Object.values(FORMATS),
    outputFormats: Object.keys(FORMATS),
    responseModes: ['binary', 'url'],
    maxImageBytes: config.maxImageBytes,
    maxInputPixels: config.maxInputPixels,
    requestTimeoutMs: config.requestTimeoutMs,
    resultTtlSeconds: config.resultTtlSeconds,
  }));
  app.get(api + '/frames', (req, res) => {
    res.json({ frames: [...catalog.values()].map((frame) => frameSummary(frame, config.publicBaseUrl)) });
  });
  app.param('frameId', (req, res, next, id) => {
    req.frame = catalog.get(id);
    next(req.frame ? undefined : new ApiError(404, 'FRAME_NOT_FOUND', 'Không tìm thấy khung ảnh.'));
  });
  app.get(api + '/frames/:frameId', (req, res) => res.json(frameDetail(req.frame, config.publicBaseUrl)));
  app.get(api + '/frames/:frameId/:asset', (req, res, next) => {
    const asset = req.params.asset === 'preview.png' ? req.frame.preview :
      req.params.asset === 'overlay.png' ? req.frame.overlay : null;
    if (!asset) return next(new ApiError(404, 'ASSET_NOT_FOUND', 'Không tìm thấy tài nguyên khung.'));
    res.type('png').set('Cache-Control', 'public, max-age=300').send(asset);
  });
  app.get(api + '/results/:id', (req, res, next) => {
    const entry = results.get(req.params.id);
    if (!entry) return next(new ApiError(404, 'RESULT_NOT_FOUND', 'Liên kết ảnh đã hết hạn hoặc không tồn tại.'));
    sendImage(res, entry.buffer, entry.frameId, entry.format);
  });

  app.post(api + '/compose', limitCompositions, async (req, res, next) => {
    if (req.get('Sec-Fetch-Site') === 'cross-site') {
      res.set('Connection', 'close');
      throw new ApiError(403, 'CROSS_SITE_UPLOAD', 'Hãy mở Photobooth để tải ảnh.');
    }
    if (!req.is('multipart/form-data')) {
      res.set('Connection', 'close');
      throw new ApiError(415, 'MULTIPART_REQUIRED', 'Gửi ảnh bằng multipart/form-data.');
    }
    if (active >= config.maxActive) {
      res.set({ 'Retry-After': '2', Connection: 'close' });
      throw new ApiError(503, 'BUSY', 'Máy chủ đang xử lý ảnh. Hãy thử lại sau vài giây.');
    }

    active++;
    const abort = new AbortController();
    const expiresAt = Date.now() + config.requestTimeoutMs;
    let uploading = true;
    function onDisconnect() {
      if (!res.writableEnded) abort.abort(new Error('Client disconnected'));
    }
    const timer = setTimeout(() => {
      const error = uploading ?
        new ApiError(408, 'UPLOAD_TIMEOUT', 'Tải ảnh lên quá thời gian cho phép.') :
        new ApiError(504, 'COMPOSE_TIMEOUT', 'Xử lý ảnh quá thời gian cho phép.');
      abort.abort(error);
      if (res.destroyed || res.headersSent) return;
      if (uploading) {
        res.set('Connection', 'close');
        res.once('finish', () => req.destroy());
      }
      sendError(res, error);
    }, config.requestTimeoutMs);
    res.once('close', onDisconnect);
    try {
      await new Promise((resolve, reject) => {
        receivePhotos(req, res, (error) => error ? reject(uploadError(error)) : resolve());
      });
      uploading = false;
      abort.signal.throwIfAborted();
      const { frame, format, mode, edits } = readOptions(req.body, req.files, catalog);
      const buffer = await composeImages({
        frame, format, edits, config, expiresAt, signal: abort.signal,
        inputs: req.files.map((file) => file.buffer),
      });
      abort.signal.throwIfAborted();

      if (mode === 'binary') return sendImage(res, buffer, frame.layout.id, format);
      const result = results.save(buffer, format, frame.layout.id);
      res.set('Cache-Control', 'no-store, private').status(201).json({
        url: `${config.publicBaseUrl}${api}/results/${result.id}`,
        expiresAt: new Date(result.expiresAt).toISOString(),
        format, canvas: frame.layout.canvas,
      });
    } catch (error) {
      if (!res.headersSent && !res.destroyed) next(error);
    } finally {
      clearTimeout(timer);
      res.off('close', onDisconnect);
      active--;
    }
  });

  app.use(express.static(fileURLToPath(webDir), { maxAge: '5m' }));
  app.use((req, res, next) => next(new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đường dẫn.')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ApiError) return sendError(res, error);
    if (error instanceof URIError) {
      return sendError(res, new ApiError(400, 'INVALID_PATH', 'Đường dẫn không hợp lệ.'));
    }
    logger.error('Photobooth request failed', { name: error.name, code: error.code });
    sendError(res, new ApiError(500, 'INTERNAL_ERROR', 'Máy chủ không thể hoàn tất yêu cầu.'));
  });

  return { app, close: () => results.close() };
}

function sendError(res, error) {
  res.set('Cache-Control', 'no-store').status(error.status).json({
    error: { code: error.code, message: error.message },
  });
}
