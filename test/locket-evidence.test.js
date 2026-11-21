import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/check-locket-evidence.js', import.meta.url));

function check(...args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
}

test('the Locket template reports missing evidence without claiming compatibility', () => {
  const result = check();
  assert.equal(result.status, 2);
  assert.match(result.stdout, /chưa đạt.*Schema cấu hình Filter/);
  assert.match(result.stdout, /Còn 8\/8 tiêu chí cần bổ sung\. Chưa đủ căn cứ xác nhận/);
});

test('the evidence checker distinguishes a complete synthetic form from unsafe or invalid input', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'khon168-evidence-test-'));
  const file = join(directory, 'sample.json');
  try {
    const example = {
      device: {
        iosVersion: '99.1', locketVersion: '99.2', photoboothVisible: true,
        entryPoint: 'Synthetic menu', frameSelected: true, captureCounts: [1, 4],
        nativeResultVisible: true, resultBehavior: 'Displays a test image', nativePostSucceeded: true,
      },
      extension: {
        sourceType: 'authorized-fixture', source: 'Synthetic test data',
        filterConfigSchema: 'Synthetic catalog schema', processing: 'remote',
        processingEvidence: 'Synthetic remote compositor',
        allowsCustomHttpsOrigin: true, forwardsLocketCredentials: false,
      },
      endpoints: [{
        purpose: 'compose', photoboothOnly: true,
        request: {
          method: 'POST', path: '/synthetic/compose', headers: [], contentType: 'multipart/form-data',
          schema: 'demoImages[] and demoFrame', imageEncoding: 'multipart PNG', frameKey: 'demoFrame',
          photoCount: '1 or 4', imageOrder: 'file order',
        },
        response: {
          status: 200, contentType: 'image/png', schema: 'PNG bytes', imageFormat: 'PNG',
          imageDelivery: 'binary response', errorSchema: 'JSON error code',
        },
      }],
    };
    await writeFile(file, JSON.stringify(example));
    const complete = check(file);
    assert.equal(complete.status, 0);
    assert.match(complete.stdout, /Cần đối chiếu nguồn/);

    example.endpoints[0].request.headers = ['Authorization'];
    await writeFile(file, JSON.stringify(example));
    const missing = check(file);
    assert.equal(missing.status, 2);
    assert.match(missing.stdout, /chưa đạt.*header bắt buộc/);
    assert.doesNotMatch(missing.stdout, /Authorization/);

    example.extension.processing = 'on-device';
    example.extension.processingEvidence = 'Synthetic local compositor';
    delete example.extension.allowsCustomHttpsOrigin;
    delete example.endpoints;
    await writeFile(file, JSON.stringify(example));
    const local = check(file);
    assert.equal(local.status, 0);
    assert.doesNotMatch(local.stdout, /riêng|Endpoint/);

    example.device.nativePostSucceeded = false;
    await writeFile(file, JSON.stringify(example));
    assert.match(check(file).stdout, /chưa đạt.*Đăng thành công/);

    await writeFile(file, 'not JSON');
    assert.equal(check(file).status, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
