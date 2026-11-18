/* Run `npm run demo` while `npm start` is listening on localhost:4000.
 * Generates four original color-card sample photos in memory, not your private Locket photos.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const BASE = process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:4000';
async function request(endpoint, opts) {
  const r = await fetch(BASE + endpoint, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}
async function main() {
  const frameId = process.argv[2] || 'school';
  const session = await request('/api/photobooth/sessions', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ frameId })
  });
  for (let i = 0; i < 4; i++) {
    const rgb = ['#9bd5e8', '#f7afc0', '#c4df97', '#ffc88c'][i];
    const jpeg = await sharp({ create: { width: 800, height: 800, channels: 3, background: rgb } })
      .jpeg().toBuffer();
    const form = new FormData();
    form.set('image', new Blob([jpeg], { type: 'image/jpeg' }), `photo-${i + 1}.jpg`);
    const next = await request(`/api/photobooth/sessions/${session.sessionId}/shots`, { method: 'POST', body: form });
    console.log(`Shot ${next.shots}/4 -> ${next.previewUrl}`);
  }
  const final = await fetch(`${BASE}/api/photobooth/sessions/${session.sessionId}/preview`);
  if (!final.ok) throw new Error('Preview download failed');
  const output = path.join(__dirname, '..', 'samples', 'khon168-demo-result.jpg');
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, Buffer.from(await final.arrayBuffer()));
  console.log(`Saved ${output}`);
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });
