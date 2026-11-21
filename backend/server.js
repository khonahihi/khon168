import { createServer } from 'node:http';
import { createApp } from './app.js';
import { readConfig } from './config.js';

const config = readConfig();
const { app, close } = await createApp({ config });
const server = createServer({
  requestTimeout: config.requestTimeoutMs + 5000,
  headersTimeout: Math.min(config.requestTimeoutMs + 5000, 15_000),
  keepAliveTimeout: 5000,
  connectionsCheckingInterval: 1000,
}, app);

server.listen(config.port, '0.0.0.0', () => {
  console.log(`KHON168 Photobooth listening on 0.0.0.0:${config.port}`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    server.close(() => close());
    setTimeout(() => server.closeAllConnections(), 24_000).unref();
  });
}
