import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readLegacyCaptions } from '../scripts/locket-caption-data.js';

test('legacy Custom Captions serialize Vietnamese, emoji, ordered colors and dynamic types', async () => {
  const { groups, dynamicTypes } = await readLegacyCaptions();
  // Baseline from cf85d6b. Covers all items, accents, gradients and their order.
  assert.equal(createHash('sha256').update(JSON.stringify([groups, dynamicTypes])).digest('hex'),
    '039a48e71582566e46d7a3764008fac46393eac1744e86e4f556412c93afb062');
  const captions = groups.flatMap(({ items }) => items);
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
  assert(dynamicTypes.includes('poll'));
});
