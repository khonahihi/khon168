import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Phong inventory describes the supplied catalog and only the observed Cloud Functions hook', async () => {
  const data = await readFile(new URL('../PHONG_REFERENCE.json', import.meta.url), 'utf8');
  const report = JSON.parse(data);
  assert.equal(report.captionGroups.length, 5);
  assert.equal(report.captionGroups.flatMap((group) => group.items).length, 75);
  assert.equal(report.filters.length, 42);
  assert.equal(report.photoboothIds.length, 22);
  const photobooth = report.filters.filter((entry) => report.photoboothIds.includes(entry.id));
  assert.equal(photobooth.length, 22);
  assert(photobooth.every((entry) => entry.type === 'normal' && entry.usesOverlay && !entry.hasLayout &&
    !entry.hasPhotoCount && !entry.hasOutputUrl));
  assert.equal(report.widgetOverlay.asset, 'frame_ba_khi.png');
  assert.deepEqual(report.profileObservation, {
    cloudFunctionHookCount: 1,
    cloudFunctionHookTypes: ['http-request'],
    cloudFunctionHookReadsBody: false,
    hasCloudFunctionUrlRewrite: true,
  });
  assert.equal(report.endpointMentions.generateFilteredImage.length, 2);
  assert.doesNotMatch(data, /https?:\/\/|requires_gold|skip-server-cert-verify|Bearer /i);
});
