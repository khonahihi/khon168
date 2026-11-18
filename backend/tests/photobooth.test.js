const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
// Must assign before requiring server: config loads once.
process.env.DATA_DIR = path.join(os.tmpdir(), `khon168-pb-tests-${process.pid}`);
process.env.PUBLIC_BASE_URL = 'http://127.0.0.1:4000';
const { createApp } = require('../src/server');

test('complete 4 shots, validate preview and reject a 5th', async () => {
  const app = createApp();
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    let response = await fetch(`${base}/api/photobooth/frames`);
    assert.equal(response.status, 200);
    let frames = await response.json();
    assert.equal(frames.frames.length, 4);

    response = await fetch(`${base}/api/photobooth/sessions`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ frameId: 'school' })
    });
    assert.equal(response.status, 201);
    const session = await response.json();
    assert.match(session.sessionId, /^[\da-f-]{36}$/);

    const sample = await sharp({ create: { width: 300, height: 300, channels: 3, background: 'orange' } }).jpeg().toBuffer();
    for (let n = 1; n <= 4; n++) {
      const form = new FormData();
      form.set('image', new Blob([sample], { type: 'image/jpeg' }), 'photo.jpg');
      response = await fetch(`${base}/api/photobooth/sessions/${session.sessionId}/shots`, { method: 'POST', body: form });
      assert.equal(response.status, n === 4 ? 200 : 201);
      const state = await response.json();
      assert.equal(state.shots, n);
      assert.equal(state.complete, n === 4);
      response = await fetch(`${base}/api/photobooth/sessions/${session.sessionId}/preview`);
      assert.equal(response.status, 200);
      const previewData = Buffer.from(await response.arrayBuffer());
      assert.ok(previewData.length > 1000);
      const meta = await sharp(previewData).metadata();
      assert.equal(meta.width, 1000);
      assert.equal(meta.height, 1210);
    }
    const form = new FormData();
    form.set('image', new Blob([sample], { type: 'image/jpeg' }), 'photo.jpg');
    response = await fetch(`${base}/api/photobooth/sessions/${session.sessionId}/shots`, { method: 'POST', body: form });
    assert.equal(response.status, 409);
    await fetch(`${base}/api/photobooth/sessions/${session.sessionId}`, { method: 'DELETE' });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(process.env.DATA_DIR, { recursive: true, force: true });
  }
});
