import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { readLegacyCaptions } from '../scripts/locket-caption-data.js';

const manifest = await readFile(new URL('../locket-photobooth-test.module', import.meta.url), 'utf8');
const hook = await readFile(new URL('../js/forceGold.js', import.meta.url), 'utf8');
const ruleName = /^([\w-]+) = type=http-response,/m.exec(manifest)[1];
const fetchUrl = 'https://firebaseremoteconfig.googleapis.com/v1/projects/locket-4252a/namespaces/firebase:fetch';
const upstreamCaption = { overlay_id: 'caption:standard', source: 'local', caption: { type: 'upstream' } };
const originalGroup = { section: 'Original', items: [upstreamCaption] };

const legacyRequest = { method: 'POST', url: fetchUrl, headers: { 'User-Agent': 'Locket/fixture' } };
const cameraConfig = JSON.parse(run({
  rule: 'locket_rc', request: legacyRequest, response: { status: 200, body: '{"state":"UPDATE","entries":{}}' },
}).body).entries.camera_filter_config;

const original = {
  state: 'UPDATE',
  templateVersion: 'upstream-version',
  unknownField: { keep: true },
  entries: {
    overlay_items: JSON.stringify([originalGroup]),
    overlay_dynamic_captions: JSON.stringify(['upstream_type']),
    camera_filter_config: cameraConfig,
    camera_roll_video_enabled: 'existing-value',
    entitlement: 'upstream-value',
  },
};

function run({ request = { method: 'POST', url: fetchUrl }, response = { status: 200, body: JSON.stringify(original) },
  rule = ruleName, logs = [] } = {}) {
  const results = [];
  runInNewContext(hook, {
    ...(rule && { $script: { name: rule } }),
    console: { log: (line) => logs.push(line) },
    $request: request,
    $response: response,
    $done: (result) => results.push(JSON.parse(JSON.stringify(result))),
  }, { timeout: 1000 });
  assert.equal(results.length, 1);
  return results[0];
}

test('test module pins all its scripts to the feature branch and only matches the Firebase config fetch', () => {
  assert.deepEqual([...manifest.matchAll(/^\[([^\]]+)\]/gm)].map((match) => match[1]), ['Script', 'MITM']);
  assert.deepEqual([...manifest.matchAll(/script-path=([^,\s]+)/g)].map((match) => match[1]), [
    'https://raw.githubusercontent.com/khonahihi/khon168/refs/heads/feature/khon168-photobooth/js/forceGold.js',
  ]);
  assert.equal(ruleName, 'khon168_photobooth');
  assert.match(manifest, /^hostname = %APPEND%, firebaseremoteconfig\.googleapis\.com\s*$/m);
  assert.doesNotMatch(manifest, /http-request|cloudfunctions|revenuecat|verify\s*=|generateFilteredImage/i);
  const pattern = new RegExp(/pattern=([^,]+),/.exec(manifest)[1]);
  assert(pattern.test(fetchUrl));
  assert(pattern.test(fetchUrl + '?test=fixture'));
  assert(!pattern.test(fetchUrl + '/extra'));
  assert(!pattern.test(fetchUrl.replace('locket-4252a', 'another-project')));
  assert(!pattern.test(fetchUrl.replace('https:', 'http:')));
});

test('caption hook preserves upstream entries and merges only missing KHON168 captions and dynamic types', async () => {
  const originalCaptions = await readLegacyCaptions();
  const result = run();
  assert.deepEqual(Object.keys(result), ['body']);
  const payload = JSON.parse(result.body);
  const { overlay_items, overlay_dynamic_captions, ...otherEntries } = payload.entries;
  assert.deepEqual(otherEntries, {
    camera_filter_config: cameraConfig,
    camera_roll_video_enabled: 'existing-value',
    entitlement: 'upstream-value',
  });
  const camera = JSON.parse(otherEntries.camera_filter_config);
  assert(camera.picker_filters.includes('okay_wig'));
  assert(camera.sheet_filters.some((group) => group.filter_ids.includes('okay_wig')));
  assert.deepEqual({ ...payload, entries: original.entries }, original);

  const groups = JSON.parse(overlay_items);
  assert.deepEqual(groups[0], originalGroup);
  const expected = new Map([[upstreamCaption.overlay_id, upstreamCaption]]);
  for (const item of originalCaptions.groups.flatMap((group) => group.items)) {
    if (!expected.has(item.overlay_id)) expected.set(item.overlay_id, item);
  }
  assert.deepEqual(groups.flatMap((group) => group.items), [...expected.values()]);
  assert.deepEqual(JSON.parse(overlay_dynamic_captions), ['upstream_type', ...originalCaptions.dynamicTypes]);
  assert.deepEqual(run({ response: { status: 200, body: result.body } }), {});
});

test('caption hook appends in the matching section and leaves malformed or absent keys alone', async () => {
  const { groups: [first] } = await readLegacyCaptions();
  const existing = { ...originalGroup, section: first.section, metadata: 'keep' };
  const payload = { ...original, entries: {
    ...original.entries, overlay_items: JSON.stringify([existing]), overlay_dynamic_captions: 'invalid',
  } };
  const changed = JSON.parse(run({ response: { status: 200, body: JSON.stringify(payload) } }).body);
  const groups = JSON.parse(changed.entries.overlay_items);
  assert.equal(groups[0].metadata, 'keep');
  assert.deepEqual(groups[0].items[0], upstreamCaption);
  assert.equal(groups.filter((group) => group.section === first.section).length, 1);
  assert.equal(changed.entries.overlay_dynamic_captions, 'invalid');

  for (const entries of [{}, { overlay_items: 'invalid' }, { overlay_items: '[{"section":"bad","items":[null]}]' }]) {
    assert.deepEqual(run({ response: { status: 200, body: JSON.stringify({ state: 'UPDATE', entries }) } }), {});
  }
});

test('caption hook leaves other routes and methods, errors, no-change replies and malformed bodies untouched', () => {
  for (const request of [
    null,
    { method: 'GET', url: fetchUrl },
    { method: 'POST', url: fetchUrl.replace('locket-4252a', 'another-project') },
    { method: 'POST', url: 'https://example.test/generateFilteredImage' },
  ]) {
    assert.deepEqual(run({ request }), {});
  }
  for (const response of [
    { status: 403, body: JSON.stringify(original) },
    { status: 304, body: JSON.stringify(original) },
    { status: 200, body: '{broken' },
    { status: 200, body: JSON.stringify({ ...original, state: 'NO_CHANGE' }) },
  ]) {
    assert.deepEqual(run({ response }), {});
  }
});

// Local examples use the metadata shape in the ZIP. The screenshots match
// names and a visible layout, but do not supply a Firebase response.
const egg = 'pb_trung_bac_thao';
const frog = 'pb_ech_xanh';
const booth = (id) => ({ id, category: 'Photobooth 📸', type: 'normal', overlay: true });
function pickerFixture() {
  return {
    sheet_enabled: true,
    sheet_filters: [{ title: { en: 'Looks' }, filter_ids: ['original'], custom: 'keep' }],
    picker_filters: [frog, 'original', egg, frog, 'metadata-missing'],
    filters: [booth(egg), booth('not-in-picker'), booth(frog),
      { ...booth('original'), category: 'Khung Viền' }],
    other: { nested: ['keep'] },
  };
}

function nativeFetch(camera, options = {}) {
  const entries = { camera_filter_config: JSON.stringify(camera), overlay_items: 'bad-caption-json',
    feature_gates: 'unchanged', unrelated: 'private-fixture-value' };
  return run({ response: { status: 200, body: JSON.stringify({ state: 'UPDATE', entries }) }, ...options });
}

test('groups only cataloged, selectable Photobooth records and preserves all other Firebase data', () => {
  const camera = pickerFixture();
  camera.sheetFilters = structuredClone(camera.sheet_filters);
  camera.pickerFilters = [...camera.picker_filters];
  camera.remote_filters = structuredClone(camera.filters);
  const logs = [];
  const request = { method: 'POST', url: fetchUrl,
    get headers() { throw Error('Photobooth must not read headers'); },
    get body() { throw Error('Photobooth must not read request body'); } };
  const output = nativeFetch(camera, { request, logs });
  const { entries } = JSON.parse(output.body);
  const target = [...camera.sheet_filters, { title: { en: 'Photobooth 📸', vi: 'Photobooth 📸' }, filter_ids: [frog, egg] }];
  assert.deepEqual(JSON.parse(entries.camera_filter_config), { ...camera, sheet_filters: target, sheetFilters: target });
  assert.deepEqual(entries, { camera_filter_config: entries.camera_filter_config, overlay_items: 'bad-caption-json',
    feature_gates: 'unchanged', unrelated: 'private-fixture-value' });
  assert.deepEqual(logs, ['KHON168 Filter | checked | picker=5 | inSheet=0 | eligible=2 | added=2']);
  assert.deepEqual(run({ request, response: { status: 200, body: output.body } }), {});
  assert.deepEqual(nativeFetch(camera, { request, rule: null }), output);
});

test('preserves an existing localized Photobooth group, appending only missing picker IDs in picker order', () => {
  const camera = pickerFixture();
  const group = { title: { en: 'Photo Booth', vi: 'Photobooth 📸' }, filter_ids: ['old', egg], color: 'keep' };
  camera.sheet_filters.unshift(group);
  camera.remoteFilters = camera.filters;
  delete camera.filters;
  const result = JSON.parse(JSON.parse(nativeFetch(camera).body).entries.camera_filter_config);
  assert.deepEqual(result.sheet_filters, [{ ...group, filter_ids: ['old', egg, frog] }, camera.sheet_filters[1]]);
  assert.deepEqual(result.picker_filters, camera.picker_filters);
});

test('leaves hidden, unresolved, conflicting and unknown filter schemas intact', () => {
  const c = pickerFixture();
  for (const camera of [
    null, {}, [], { ...c, sheet_enabled: false }, { ...c, show_filter_button: false },
    { ...c, sheetFilters: [] }, { ...c, pickerFilters: [] }, { ...c, sheet_filters: [] },
    { ...c, sheet_filters: [null] }, { ...c, picker_filters: [{}] }, { ...c, filters: null },
    { ...c, filters: [booth('not-in-picker')] }, { ...c, remote_filters: [] },
    { ...c, filters: [booth(egg), { ...booth(egg), category: 'Other' }] },
    { ...c, filters: [{ ...booth(egg), type: 'ai' }, { ...booth(frog), overlay: false }] },
  ]) assert.deepEqual(nativeFetch(camera), {});
  const logs = [];
  assert.deepEqual(run({ response: { status: 200, body: '{"state":"NO_CHANGE"}' }, logs }), {});
  assert.deepEqual(logs, ['KHON168 Filter | no-change']);
});

test('the legacy Firebase rule keeps the incoming camera configuration and uses its original fallback only for an absent key', () => {
  for (const value of ['bad-json', null, JSON.stringify({ version: 99, sheet_filters: [] }), cameraConfig]) {
    const result = run({ rule: 'locket_rc', request: legacyRequest,
      response: { status: 200, body: JSON.stringify({ entries: { camera_filter_config: value } }) } });
    assert.equal(JSON.parse(result.body).entries.camera_filter_config, value);
  }
  const camera = pickerFixture();
  const result = nativeFetch(camera, { rule: 'locket_rc', request: legacyRequest });
  assert.deepEqual(JSON.parse(JSON.parse(result.body).entries.camera_filter_config),
    JSON.parse(JSON.parse(nativeFetch(camera).body).entries.camera_filter_config));
  const legacyDefaults = JSON.parse(cameraConfig);
  assert(legacyDefaults.picker_filters.includes('okay_wig'));
  assert.equal(legacyDefaults.sheet_filters.length, 6);
});
