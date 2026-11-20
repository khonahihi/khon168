import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

test('legacy Custom Captions serialize Vietnamese, emoji, ordered colors and dynamic types', async () => {
  const script = await readFile(new URL('../js/forceGold.js', import.meta.url), 'utf8');
  const captionSection = script.slice(script.indexOf('// 8. OVERLAY & CUSTOM CAPTIONS'));
  const assignment = captionSection.slice(captionSection.indexOf('Object.assign'), captionSection.indexOf('\n}'));
  const obj = { entries: {} };
  // Only evaluate the caption assignment, with a local placeholder instead of a network response.
  runInNewContext(assignment, { obj }, { timeout: 1000 });
  const sections = JSON.parse(obj.entries.overlay_items);
  const captions = sections.flatMap(({ items }) => items);
  assert.equal(captions[0].overlay_id, 'caption:standard');
  assert.equal(captions[0].source, 'local');
  assert.deepEqual(captions.find(({ overlay_id }) => overlay_id === 'caption:thai_tu_o_tro').caption, {
    background: { colors: ['#4B0082', '#8A2BE2', '#D4AF37'] },
    icon: { data: '👑', type: 'emoji' },
    max_lines: 1,
    text: 'Thái tử ở trọ',
    localized_text: { en: 'Thái tử ở trọ', vn: 'Thái tử ở trọ' },
    text_color: '#FFFFFF',
    type: 'static_content',
  });
  assert(captions.some(({ caption }) => caption.background?.colors?.length === 2));
  assert(JSON.parse(obj.entries.overlay_dynamic_captions).includes('poll'));
});
