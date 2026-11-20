import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const backend = fileURLToPath(new URL('.', import.meta.url));
const colorPattern = /^(?:transparent|#[0-9a-f]{6}(?:[0-9a-f]{2})?)$/i;
const assetPattern = /^[a-z0-9][a-z0-9-]*\.(?:svg|png)$/;
export const FITS = ['cover', 'contain'];
export const PHOTO_COUNTS = [1, 2, 4];

function inRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function unitInterval(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function validateLayout(layout, filename) {
  const check = (condition, field) => {
    if (!condition) throw new Error(`Invalid layout ${filename}: ${field}`);
  };
  check(layout && layout.id + '.json' === filename && /^[a-z0-9][a-z0-9-]{0,49}$/.test(layout.id), 'id');
  for (const field of ['name', 'description']) {
    check(typeof layout[field] === 'string' && layout[field].trim() && layout[field].length <= 100, field);
  }
  const { width, height } = layout.canvas ?? {};
  check(inRange(width, 1, 3000) && inRange(height, 1, 3000) && width * height <= 4_000_000, 'canvas');
  check(colorPattern.test(layout.background) && colorPattern.test(layout.slotColor), 'colors');
  check(inRange(layout.gap, 0, Math.min(width, height)), 'gap');
  check(PHOTO_COUNTS.includes(layout.photoCount) && Array.isArray(layout.slots) &&
    layout.slots.length === layout.photoCount, 'photoCount/slots');
  check(!Object.hasOwn(layout, 'overlay') || assetPattern.test(layout.overlay), 'overlay');
  check(!Object.hasOwn(layout, 'order') || inRange(layout.order, 0, 10000), 'order');

  for (const [index, slot] of layout.slots.entries()) {
    const label = `slots[${index}]`;
    check(slot && inRange(slot.left, 0, width - 1) && inRange(slot.top, 0, height - 1), label);
    check(inRange(slot.width, 1, width - slot.left) && inRange(slot.height, 1, height - slot.top), label);
    check(inRange(slot.radius, 0, Math.floor(Math.min(slot.width, slot.height) / 2)), label + '.radius');
    check(FITS.includes(slot.fit) && unitInterval(slot.x) && unitInterval(slot.y), label + '.crop');
    for (const previous of layout.slots.slice(0, index)) {
      const horizontalGap = Math.max(previous.left - slot.left - slot.width, slot.left - previous.left - previous.width);
      const verticalGap = Math.max(previous.top - slot.top - slot.height, slot.top - previous.top - previous.height);
      check(horizontalGap >= layout.gap || verticalGap >= layout.gap, label + '.gap');
    }
  }
}

function placeholderLayer(layout) {
  const { width, height } = layout.canvas;
  const slots = layout.slots.map((slot) => {
    const size = Math.min(slot.width, slot.height) * 0.18;
    const x = slot.left + (slot.width - size) / 2;
    const y = slot.top + (slot.height - size) / 2;
    return `<rect x="${slot.left}" y="${slot.top}" width="${slot.width}" height="${slot.height}" rx="${slot.radius}" fill="${layout.slotColor}"/>
      <g transform="translate(${x},${y}) scale(${size / 32})" fill="none" stroke="#302d38" stroke-opacity=".48" stroke-width="1.4" stroke-linejoin="round">
        <rect x="1" y="3" width="30" height="26" rx="5"/><circle cx="22" cy="11" r="2.5"/>
        <path d="m3 24 8-9 6 6 4-3 8 7"/>
      </g>`;
  }).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${slots}</svg>`);
}

export async function loadCatalog({
  layoutsDir = join(backend, 'layouts'),
  framesDir = join(backend, 'frames'),
} = {}) {
  const filenames = (await readdir(layoutsDir)).filter((name) => name.endsWith('.json')).sort();
  if (!filenames.length) throw new Error('No Photobooth layouts found');
  const frames = [];

  for (const filename of filenames) {
    const layout = JSON.parse(await readFile(join(layoutsDir, filename), 'utf8'));
    validateLayout(layout, filename);
    const { width, height } = layout.canvas;
    const layers = [{ input: placeholderLayer(layout) }];
    let overlay;
    if (layout.overlay) {
      const asset = sharp(await readFile(join(framesDir, layout.overlay)), { limitInputPixels: 4_000_000 });
      const meta = await asset.metadata();
      if (meta.format !== layout.overlay.split('.').at(-1) || meta.width !== width || meta.height !== height ||
          (meta.pages ?? 1) !== 1 || !meta.hasAlpha) {
        throw new Error(`Overlay ${layout.overlay} must be a single ${width}×${height} SVG/PNG with alpha`);
      }
      overlay = await asset.png().toBuffer();
      layers.push({ input: overlay });
    }

    const canvas = { width, height, channels: 4, background: layout.background };
    const fullPreview = await sharp({ create: canvas }).composite(layers).png().toBuffer();
    frames.push({ layout, overlay, preview: await sharp(fullPreview)
      .resize(320, 320, { fit: 'inside', withoutEnlargement: true }).png().toBuffer() });
  }

  frames.sort((a, b) => a.layout.photoCount - b.layout.photoCount ||
    (a.layout.order ?? 0) - (b.layout.order ?? 0) || a.layout.id.localeCompare(b.layout.id));
  return new Map(frames.map((frame) => [frame.layout.id, frame]));
}
