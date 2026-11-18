const sharp = require('sharp');
const fs = require('node:fs/promises');
const { findFrame } = require('./frames');

async function composePreview(frameId, photoFiles, outputFile) {
  const frame = findFrame(frameId);
  const layers = [];
  for (let i = 0; i < photoFiles.length; i++) {
    const slot = frame.slots[i];
    const data = await fs.readFile(photoFiles[i]);
    const fitted = await sharp(data).resize(slot.width, slot.height, { fit: 'cover', position: 'attention' }).jpeg({ quality: 92 }).toBuffer();
    layers.push({ input: fitted, left: slot.left, top: slot.top });
  }
  layers.push({ input: frame.overlayPath, top: 0, left: 0 });
  const tmp = outputFile + '.tmp';
  await sharp({ create: { width: frame.width, height: frame.height, channels: 3, background: '#f7f7f7' } })
    .composite(layers)
    .jpeg({ quality: 91, mozjpeg: true })
    .toFile(tmp);
  await fs.rename(tmp, outputFile);
}
module.exports = { composePreview };
