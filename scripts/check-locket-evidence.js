import { readFile } from 'node:fs/promises';

const template = new URL('../test/fixtures/locket-evidence.template.json', import.meta.url);
const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const isMimeType = (value) => typeof value === 'string' && /^[\w.+-]+\/[\w.+-]+$/.test(value);
const isPath = (value) => typeof value === 'string' && /^\/(?!\/)[\w./{}:-]+$/.test(value);
const methods = ['GET', 'POST', 'PUT', 'PATCH'];
const purposes = ['catalog', 'compose', 'result'];
const credentials = /authorization|cookie|api[-_]?key|auth[-_]?token|session[-_]?id/i;
const headerNames = (values) => Array.isArray(values) &&
  values.every((name) => typeof name === 'string' && /^[a-z0-9-]+$/i.test(name) && !credentials.test(name));

function checksForEndpoint(endpoint, index) {
  const label = `Endpoint ${index + 1}`;
  const request = endpoint?.request;
  const response = endpoint?.response;
  const checks = [
    [purposes.includes(endpoint?.purpose) && endpoint.photoboothOnly === true, `${label} · Phạm vi chỉ dành cho Photobooth`],
    [methods.includes(request?.method) && isPath(request?.path), `${label} · HTTP method và đường dẫn chính xác`],
    [headerNames(request?.headers), `${label} · Tên các header bắt buộc, không gồm thông tin xác thực`],
    [Number.isInteger(response?.status) && response.status >= 200 && response.status < 300 &&
      isMimeType(response.contentType) && hasText(response.schema), `${label} · Mã thành công, MIME và schema phản hồi`],
  ];
  if (endpoint?.purpose === 'compose') {
    checks.push(
      [isMimeType(request?.contentType) && hasText(request?.schema), `${label} · MIME và schema của body`],
      [hasText(request?.imageEncoding) && hasText(request?.imageOrder) &&
        ['frameKey', 'photoCount'].every((field) => hasText(request?.[field])),
      `${label} · Cách biểu diễn ảnh, số lượng, thứ tự và định danh khung`],
      [hasText(response?.imageFormat) && hasText(response?.imageDelivery) && hasText(response?.errorSchema),
        `${label} · Định dạng và cách nhận ảnh, schema lỗi có thể tái hiện`],
    );
  }
  return checks;
}

function evidenceChecks(data) {
  const device = data.device;
  const extension = data.extension;
  const endpoints = Array.isArray(data.endpoints) ? data.endpoints : [];
  const supportedProcessing = ['on-device', 'remote'].includes(extension?.processing);
  const captureCounts = device?.captureCounts;
  const checks = [
    [hasText(device?.iosVersion) && hasText(device?.locketVersion), 'iPhone · Phiên bản iOS và Locket'],
    [device?.photoboothVisible === true && hasText(device?.entryPoint), 'iPhone · Mục Photobooth và thao tác mở'],
    [device?.frameSelected === true && Array.isArray(captureCounts) && captureCounts.length > 0 &&
      captureCounts.every((count) => Number.isSafeInteger(count) && count > 0),
    'iPhone · Chọn khung và số ảnh đã chụp trong Camera → Filter'],
    [device?.nativeResultVisible === true && hasText(device?.resultBehavior), 'iPhone · Hành vi nhận và hiển thị ảnh trong ứng dụng'],
    [device?.nativePostSucceeded === true, 'iPhone · Đăng thành công và thấy bài Photobooth trong Locket'],
    [['official-doc', 'authorized-fixture'].includes(extension?.sourceType) && hasText(extension.source),
      'Tích hợp · Tài liệu của Locket hoặc mẫu giao thức được phép dùng'],
    [hasText(extension?.filterConfigSchema), 'Tích hợp · Schema cấu hình Filter mà client đã nạp'],
    [supportedProcessing && hasText(extension?.processingEvidence),
      'Tích hợp · Bằng chứng ghép ảnh trên thiết bị hoặc qua API'],
  ];
  if (extension?.processing !== 'remote') return checks;
  return [
    ...checks,
    [extension?.allowsCustomHttpsOrigin === true && extension?.forwardsLocketCredentials === false,
      'Tích hợp · Có cơ chế được phép đổi sang HTTPS riêng và không chuyển tiếp thông tin xác thực Locket'],
    [endpoints.some((endpoint) => endpoint?.purpose === 'compose' &&
      methods.includes(endpoint.request?.method) && isPath(endpoint.request?.path)),
    'Giao thức · Method và đường dẫn của thao tác ghép ảnh'],
    ...endpoints.flatMap(checksForEndpoint),
  ];
}

try {
  const data = JSON.parse(await readFile(process.argv[2] ?? template, 'utf8'));
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Evidence must use an object at the root');
  }
  const checks = evidenceChecks(data);
  for (const [present, label] of checks) {
    console.log(`${present ? 'Có ghi nhận' : 'Thiếu hoặc chưa đạt'} · ${label}`);
  }
  const missing = checks.filter(([present]) => !present).length;
  if (missing) {
    console.log(`Còn ${missing}/${checks.length} tiêu chí cần bổ sung. Chưa đủ căn cứ xác nhận luồng Photobooth trong Locket.`);
    process.exitCode = 2;
  } else {
    console.log('Biểu mẫu đã đủ trường. Cần đối chiếu nguồn và chạy luồng thật trên iPhone để xác minh tương thích.');
  }
} catch {
  console.error('Không đọc được tệp bằng chứng. Dùng JSON theo mẫu trong test/fixtures.');
  process.exitCode = 1;
}
