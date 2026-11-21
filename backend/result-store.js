import { randomBytes } from 'node:crypto';
import { ApiError } from './errors.js';

export function createResultStore(config) {
  const entries = new Map();
  let usedBytes = 0;
  function prune(now) {
    for (const [id, entry] of entries) {
      if (entry.expiresAt > now) continue;
      usedBytes -= entry.buffer.length;
      entries.delete(id);
    }
  }
  const cleanup = setInterval(() => prune(Date.now()), Math.min(1000, config.resultTtlSeconds * 1000));
  cleanup.unref();

  return {
    save(buffer, format, frameId) {
      const now = Date.now();
      prune(now);
      if (entries.size >= config.maxStoredResults || usedBytes + buffer.length > config.maxResultBytes) {
        throw new ApiError(503, 'RESULT_STORE_FULL', 'Bộ nhớ liên kết tạm đã đầy. Hãy xuất ảnh trực tiếp hoặc thử lại sau.');
      }
      const id = randomBytes(24).toString('hex');
      const expiresAt = now + config.resultTtlSeconds * 1000;
      entries.set(id, { buffer, format, frameId, expiresAt });
      usedBytes += buffer.length;
      return { id, expiresAt };
    },
    get(id) {
      prune(Date.now());
      return entries.get(id);
    },
    close() {
      clearInterval(cleanup);
      entries.clear();
      usedBytes = 0;
    },
  };
}
