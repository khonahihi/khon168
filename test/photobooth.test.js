import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { createServer, request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { after, before, test } from 'node:test';
import sharp from 'sharp';
import { createApp } from '../backend/app.js';
import { loadCatalog } from '../backend/catalog.js';
import { readConfig } from '../backend/config.js';

const api = '/api/photobooth';
const sampleColors = ['#F02231', '#239C45', '#304AC5', '#FAC416'];
const fixtureId = 'transparent';
let catalog;
let remote;
let fixtures;

async function solid(color, format = 'png', width = 112, height = 89) {
  return sharp({ create: { width, height, channels: 4, background: color } }).toFormat(format).toBuffer();
}

async function start(env = {}) {
  const config = readConfig({ COMPOSE_REQUESTS_PER_WINDOW: '120', MAX_ACTIVE_COMPOSITIONS: '2', ...env });
  const { app, close } = await createApp({ config, catalog });
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  return {
    origin,
    get: (path, options) => fetch(origin + path, options),
    async stop() {
      server.close();
      server.closeAllConnections();
      await once(server, 'close');
      close();
    },
  };
}

before(async () => {
  catalog = await loadCatalog();
  const directory = await mkdtemp(join(tmpdir(), 'khon168-test-'));
  const framesDir = join(directory, 'frames');
  const layoutsDir = join(directory, 'layouts');
  try {
    await mkdir(framesDir);
    await mkdir(layoutsDir);
    const fixture = {
      id: fixtureId, name: 'Alpha', description: 'Test PNG', canvas: { width: 104, height: 104 },
      background: 'transparent', slotColor: '#F8E8D8', gap: 0, photoCount: 1, overlay: 'test.png',
      slots: [{ left: 22, top: 22, width: 60, height: 60, radius: 9, fit: 'cover', x: 0.5, y: 0.5 }],
    };
    const marker = await solid('#D210FF', 'png', 5, 5);
    const overlay = await sharp({ create: { width: 104, height: 104, channels: 4, background: 'transparent' } })
      .composite([{ input: marker, left: 30, top: 30 }]).png().toBuffer();
    await writeFile(join(framesDir, fixture.overlay), overlay);
    await writeFile(join(layoutsDir, fixtureId + '.json'), JSON.stringify(fixture));
    const frame = (await loadCatalog({ framesDir, layoutsDir })).get(fixtureId);
    catalog.set(fixtureId, frame);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  fixtures = await Promise.all(sampleColors.map((color) => solid(color)));
  remote = await start();
});

after(async () => remote?.stop());

function compose(frameId, photos, fields = {}, service = remote) {
  const form = new FormData();
  if (frameId !== undefined) form.append('frameId', frameId);
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  for (const [index, photo] of photos.entries()) {
    const { bytes, type = 'image/png', name = `photo-${index}.png` } = Buffer.isBuffer(photo) ? { bytes: photo } : photo;
    form.append('photos', new Blob([bytes], { type }), name);
  }
  return service.get(api + '/compose', { method: 'POST', body: form });
}

async function expectError(response, status, code) {
  assert.equal(response.status, status);
  assert.equal((await response.json()).error.code, code);
}

async function readPhoto(response, mime = 'image/png') {
  if (!response.ok) assert.fail(`HTTP ${response.status}: ${await response.text()}`);
  assert.equal(response.headers.get('content-type'), mime);
  const image = sharp(Buffer.from(await response.arrayBuffer()));
  const meta = await image.metadata();
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixel = (x, y) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)];
  return { meta, pixel };
}

function rgba(hex) {
  return [...Buffer.from(hex.slice(1), 'hex'), 255];
}

test('serves the web app, health, config, six initial frames and their local previews', async () => {
  assert.match(await (await remote.get('/')).text(), /KHON168 Photobooth/);
  assert.deepEqual(await (await remote.get('/health')).json(), { status: 'ok' });
  assert.deepEqual((await (await remote.get(api + '/config')).json()).photoCounts, [1, 2, 4]);
  const { frames } = await (await remote.get(api + '/frames')).json();
  for (const count of [1, 2, 4]) assert(frames.filter((frame) => frame.photoCount === count).length >= 2);
  for (const summary of frames) {
    const { slots, overlayUrl } = await (await remote.get(api + '/frames/' + summary.id)).json();
    assert.equal(slots.length, summary.photoCount);
    for (const asset of [summary.previewUrl, overlayUrl]) {
      assert.equal((await remote.get(asset)).headers.get('content-type'), 'image/png');
    }
  }
  await expectError(await remote.get(api + '/frames/missing'), 404, 'FRAME_NOT_FOUND');
  await expectError(await remote.get(api + '/frames/peach-sticker/file.txt'), 404, 'ASSET_NOT_FOUND');
});

for (const [id, count] of [
  ['peach-sticker', 1], ['midnight-postcard', 1], ['rose-duet', 2], ['coastline', 2], ['afterglow-grid', 4], ['mint-strip', 4],
]) {
  test(`composes ${count} photo(s) in order and in the expected position for ${id}`, async () => {
    const { layout } = catalog.get(id);
    const { meta, pixel } = await readPhoto(await compose(id, fixtures.slice(0, count)));
    assert.deepEqual({ width: meta.width, height: meta.height }, layout.canvas);
    for (const [index, slot] of layout.slots.entries()) {
      assert.deepEqual(pixel(slot.left + Math.floor(slot.width / 2), slot.top + Math.floor(slot.height / 2)),
        rgba(sampleColors[index]));
    }
    assert.notDeepEqual(pixel(3, 73), rgba(sampleColors[0]));
  });
}

test('PNG overlays compose above photos and preserve their own alpha and rounded corners', async () => {
  const { meta, pixel } = await readPhoto(await compose(fixtureId, [fixtures[0]]));
  assert.equal(meta.hasAlpha, true);
  assert.deepEqual(pixel(20, 20), [0, 0, 0, 0]);
  assert.deepEqual(pixel(22, 22), [0, 0, 0, 0]);
  assert.deepEqual(pixel(32, 32), [210, 16, 255, 255]);
  assert.deepEqual(pixel(55, 52), rgba(sampleColors[0]));
  const translucent = await solid('#28B4DC80');
  assert.equal((await readPhoto(await compose(fixtureId, [translucent]))).pixel(55, 52)[3], 128);
});

test('respects EXIF orientation before applying the focal crop and strips image metadata', async () => {
  const left = await solid('#F50000', 'png', 52, 48);
  const rotated = await sharp({ create: { width: 104, height: 48, channels: 3, background: '#0000FF' } })
    .composite([{ input: left, left: 0, top: 0 }]).jpeg({ quality: 100 }).withMetadata({ orientation: 6 }).toBuffer();
  const input = { bytes: rotated, type: 'image/jpeg', name: 'rotate.jpg' };
  const top = await readPhoto(await compose(fixtureId, [input], { edits: '[{"y":0}]' }));
  const bottom = await readPhoto(await compose(fixtureId, [input], { edits: '[{"y":1}]' }));
  assert(top.pixel(55, 52)[0] > 220);
  assert(bottom.pixel(55, 52)[2] > 220);
  assert.equal(top.meta.exif, undefined);
});

test('accepts WebP, retains transparency in WebP and places contain images without stretching', async () => {
  const bytes = await solid('#22C163', 'webp', 110, 22);
  const { meta, pixel } = await readPhoto(await compose(fixtureId, [{ bytes, type: 'image/webp' }],
    { format: 'webp', edits: '[{"fit":"contain"}]' }), 'image/webp');
  assert.equal(meta.format, 'webp');
  assert.equal(pixel(52, 43)[3], 0);
  assert(pixel(52, 52)[1] > 160);
  assert.equal(pixel(52, 58)[3], 0);
});

test('flattens JPEG transparency to white after applying frame and photos', async () => {
  const { meta, pixel } = await readPhoto(await compose(fixtureId, [fixtures[0]], { format: 'jpeg' }), 'image/jpeg');
  assert.equal(meta.hasAlpha, false);
  assert(pixel(5, 5).slice(0, 3).every((channel) => channel > 248));
  assert(pixel(52, 52)[0] > 225);
});

test('rejects missing, extra and unknown frames and invalid options', async () => {
  await expectError(await compose(undefined, [fixtures[0]]), 400, 'FRAME_REQUIRED');
  await expectError(await compose('missing', [fixtures[0]]), 404, 'FRAME_NOT_FOUND');
  await expectError(await compose('rose-duet', [fixtures[0]]), 400, 'WRONG_PHOTO_COUNT');
  await expectError(await compose('peach-sticker', fixtures.slice(0, 2)), 400, 'WRONG_PHOTO_COUNT');
  await expectError(await compose('mint-strip', [...fixtures, fixtures[0]]), 400, 'WRONG_PHOTO_COUNT');
  await expectError(await compose(fixtureId, [fixtures[0]], { format: 'gif' }), 400, 'INVALID_FORMAT');
  await expectError(await compose(fixtureId, [fixtures[0]], { mode: 'remote' }), 400, 'INVALID_MODE');
  await expectError(await compose(fixtureId, [fixtures[0]], { edits: '[{"x":2}]' }), 400, 'INVALID_EDITS');
  await expectError(await compose(fixtureId, [fixtures[0]], { filePath: 'anything.png' }), 400, 'INVALID_FIELDS');
  await expectError(await remote.get(api + '/compose', { method: 'POST', body: '{}' }), 415, 'MULTIPART_REQUIRED');
});

test('rejects unsupported, damaged, oversized and too-high-resolution inputs by content', async () => {
  await expectError(await compose(fixtureId, [Buffer.from('<svg/>')]), 415, 'UNSUPPORTED_IMAGE');
  await expectError(await compose(fixtureId, [fixtures[0].subarray(0, 16)]), 422, 'INVALID_IMAGE');
  const limits = await start({ MAX_IMAGE_BYTES: '1024', MAX_INPUT_PIXELS: '10000' });
  try {
    await expectError(await compose(fixtureId, [Buffer.alloc(2048)], {}, limits), 413, 'FILE_TOO_LARGE');
    await expectError(await compose(fixtureId, [await solid('#E38D5D', 'png', 130, 120)], {}, limits), 413, 'TOO_MANY_PIXELS');
  } finally {
    await limits.stop();
  }
});

test('serves one random temporary URL, limits stored results and expires them', async () => {
  const service = await start({
    RESULT_TTL_SECONDS: '1', MAX_STORED_RESULTS: '1', PUBLIC_BASE_URL: 'https://photobooth.example',
  });
  try {
    const result = await compose(fixtureId, [fixtures[0]], { mode: 'url' }, service);
    assert.equal(result.status, 201);
    const { url, expiresAt } = await result.json();
    assert.match(url, /^https:\/\/photobooth\.example\/api\/photobooth\/results\/[a-f0-9]{48}$/);
    assert(Date.parse(expiresAt) > Date.now());
    const pathname = new URL(url).pathname;
    const photo = await service.get(pathname);
    assert.equal(photo.status, 200);
    assert.match(photo.headers.get('cache-control'), /no-store/);
    await photo.arrayBuffer();
    await expectError(await compose(fixtureId, [fixtures[0]], { mode: 'url' }, service), 503, 'RESULT_STORE_FULL');
    await delay(Math.max(0, Date.parse(expiresAt) - Date.now() + 30));
    await expectError(await service.get(pathname), 404, 'RESULT_NOT_FOUND');
  } finally {
    await service.stop();
  }
});

test('handles concurrent compositions without mixing output', async () => {
  const [first, second] = await Promise.all([
    compose(fixtureId, [fixtures[0]]), compose(fixtureId, [fixtures[2]]),
  ].map(async (response) => readPhoto(await response)));
  assert.deepEqual(first.pixel(55, 52), rgba(sampleColors[0]));
  assert.deepEqual(second.pixel(55, 52), rgba(sampleColors[2]));
});

test('returns 429 after configured request limit', async () => {
  const service = await start({ COMPOSE_REQUESTS_PER_WINDOW: '1' });
  try {
    await expectError(await compose(fixtureId, [], {}, service), 400, 'WRONG_PHOTO_COUNT');
    await expectError(await compose(fixtureId, [fixtures[0]], {}, service), 429, 'RATE_LIMITED');
  } finally {
    await service.stop();
  }
});

test('caps simultaneous multipart uploads, times out stalled uploads and then accepts another', async () => {
  const service = await start({ MAX_ACTIVE_COMPOSITIONS: '1', REQUEST_TIMEOUT_MS: '600' });
  const stalled = request(service.origin + api + '/compose', {
    method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=slow' },
  });
  try {
    const timedOut = once(stalled, 'response');
    stalled.write('--slow\r\nContent-Disposition: form-data; name="frameId"\r\n\r\ntransparent');
    await once(stalled, 'socket');
    await delay(70);
    await expectError(await compose(fixtureId, [fixtures[2]], {}, service), 503, 'BUSY');
    const [response] = await timedOut;
    assert.equal(response.statusCode, 408);
    for await (const chunk of response) {
      assert.match(chunk.toString(), /UPLOAD_TIMEOUT/);
    }
    const { pixel } = await readPhoto(await compose(fixtureId, [fixtures[1]], {}, service));
    assert.deepEqual(pixel(55, 52), rgba(sampleColors[1]));
  } finally {
    stalled.destroy();
    await service.stop();
  }
});
