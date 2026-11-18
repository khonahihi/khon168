/* Synthetic adapter exercise: does not contact Locket or read Locket tokens.
 * npm start (terminal 1), node scripts/simulate_locket.js (terminal 2)
 */
const crypto = require('node:crypto');
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const BASE = process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:4000';
async function main() {
  const sid = crypto.randomUUID();
  for (let i = 0; i < 4; i++) {
    const jpeg = await sharp({create:{width:400,height:400,channels:3,background:['#bad9e8','#edb5c4','#cce8b1','#e8ce9d'][i]}}).jpeg().toBuffer();
    const res = await fetch(BASE + '/generateFilteredImage', {
      method: 'POST', headers: {'Content-Type':'application/json','X-KHON168-Session':sid,'X-KHON168-Frame':'photobooth_cute'},
      body: JSON.stringify({filter_id:'photobooth_cute',imageBase64:jpeg.toString('base64')})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data)}`);
    console.log(`Mock Locket shot ${data.shot}/4, complete=${data.complete}`);
  }
  const resp = await fetch(BASE + `/api/photobooth/sessions/${sid}/preview`);
  const dest = path.join(__dirname, '..', 'samples', 'khon168-adapter-result.jpg');

  await fs.mkdir(path.dirname(dest), { recursive: true });

  await fs.writeFile(dest, Buffer.from(await resp.arrayBuffer()));
  console.log('Saved:', dest);
}
main().catch(err => {console.error(err); process.exitCode = 1;});
