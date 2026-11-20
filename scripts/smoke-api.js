import assert from 'node:assert/strict';
import sharp from 'sharp';

const base = new URL(process.argv[2] ?? 'http://localhost:3000');
const api = '/api/photobooth';
const request = (path, options) => fetch(new URL(path, base), {
  signal: AbortSignal.timeout(90_000), ...options,
});

assert.deepEqual(await (await request('/health')).json(), { status: 'ok' });
const { photoCounts, outputFormats } = await (await request(api + '/config')).json();
assert.deepEqual(photoCounts, [1, 2, 4]);
assert.deepEqual(outputFormats, ['png', 'jpeg', 'webp']);
const { frames } = await (await request(api + '/frames')).json();

for (const count of photoCounts) {
  const frame = frames.find((item) => item.photoCount === count);
  assert(frame, `Missing ${count}-photo frame`);
  const frameResponse = await request(`${api}/frames/${frame.id}`);
  assert.equal(frameResponse.status, 200);
  assert.equal((await frameResponse.json()).slots.length, count);
  const preview = await request(frame.previewUrl);
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get('content-type'), 'image/png');
  await preview.arrayBuffer();

  const form = new FormData();
  form.set('frameId', frame.id);
  for (let index = 0; index < count; index++) {
    const color = ['#ED696A', '#50ACAA', '#7465B3', '#D6A348'][index];
    const png = await sharp({ create: { width: 128, height: 96, channels: 3, background: color } }).png().toBuffer();
    form.append('photos', new Blob([png], { type: 'image/png' }), `sample-${index + 1}.png`);
  }

  const response = await request(api + '/compose', { method: 'POST', body: form });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  const { width, height } = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
  assert.deepEqual({ width, height }, frame.canvas);
  console.log(`OK ${count} photo(s) · ${frame.id} · ${width}×${height}`);
}
