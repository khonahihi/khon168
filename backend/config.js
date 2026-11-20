function integer(env, key, fallback, min, max) {
  const raw = env[key];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${key} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function publicOrigin(value) {
  if (!value) return '';
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PUBLIC_BASE_URL must be an HTTP(S) origin without a path');
  }
  return url.origin;
}

export function readConfig(env = process.env) {
  return Object.freeze({
    port: integer(env, 'PORT', 3000, 1, 65535),
    publicBaseUrl: publicOrigin(env.PUBLIC_BASE_URL || env.RENDER_EXTERNAL_URL),
    onRender: env.RENDER === 'true',
    trustProxyHops: integer(env, 'TRUST_PROXY_HOPS', 0, 0, 5),
    maxImageBytes: integer(env, 'MAX_IMAGE_BYTES', 8 * 1024 ** 2, 1024, 12 * 1024 ** 2),
    maxInputPixels: integer(env, 'MAX_INPUT_PIXELS', 25_000_000, 1000, 40_000_000),
    maxActive: integer(env, 'MAX_ACTIVE_COMPOSITIONS', 1, 1, 4),
    requestTimeoutMs: integer(env, 'REQUEST_TIMEOUT_MS', 45_000, 100, 90_000),
    sharpTimeoutSeconds: integer(env, 'SHARP_TIMEOUT_SECONDS', 12, 1, 30),
    rateLimitWindowMs: integer(env, 'RATE_LIMIT_WINDOW_MS', 60_000, 1000, 60 * 60_000),
    composeRequests: integer(env, 'COMPOSE_REQUESTS_PER_WINDOW', 12, 1, 120),
    resultTtlSeconds: integer(env, 'RESULT_TTL_SECONDS', 300, 1, 900),
    maxResultBytes: integer(env, 'MAX_RESULT_BYTES', 24 * 1024 ** 2, 1024, 32 * 1024 ** 2),
    maxStoredResults: integer(env, 'MAX_STORED_RESULTS', 12, 1, 32),
  });
}
