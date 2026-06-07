import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`[dash-creatives-api] listening on http://localhost:${env.PORT}`);
});

const shutdown = (signal: string) => () => {
  console.log(`[dash-creatives-api] ${signal} — shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
};

process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));
