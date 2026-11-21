import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadCatalog, PHOTO_COUNTS } from '../backend/catalog.js';

const root = new URL('../', import.meta.url);
for (const directory of ['backend/', 'js/', 'web/', 'scripts/']) {
  const location = new URL(directory, root);
  for (const name of await readdir(location)) {
    if (name.endsWith('.js')) {
      execFileSync(process.execPath, ['--check', fileURLToPath(new URL(name, location))], { stdio: 'inherit' });
    }
  }
}

const html = await readFile(new URL('web/index.html', root), 'utf8');
for (const asset of html.matchAll(/(?:href|src)="\/([\w-]+\.[a-z]+)"/g)) {
  await readFile(new URL('web/' + asset[1], root));
}

const catalog = await loadCatalog();
for (const count of PHOTO_COUNTS) {
  const frames = [...catalog.values()].filter(({ layout }) => layout.photoCount === count);
  if (frames.length < 2) throw new Error(`Need at least two ${count}-photo frames`);
}
console.log(`Photobooth build verified (${catalog.size} frames).`);
