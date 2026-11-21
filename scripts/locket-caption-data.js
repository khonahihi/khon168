import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

export async function readLegacyCaptions() {
  const source = await readFile(new URL('../js/forceGold.js', import.meta.url), 'utf8');
  const assignment = /function setKhon168Captions\(entries\) \{[\s\S]*?^\}/m.exec(source)?.[0];
  if (!assignment) {
    throw new Error('Could not find the legacy caption assignment');
  }
  const entries = {};
  runInNewContext(assignment + '\nsetKhon168Captions(entries);', { entries }, {
    timeout: 1000,
    contextCodeGeneration: { strings: false, wasm: false },
  });
  return {
    groups: JSON.parse(entries.overlay_items),
    dynamicTypes: JSON.parse(entries.overlay_dynamic_captions),
  };
}
