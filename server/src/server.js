import { buildApp } from './app.js';
import { openDb } from './db.js';

const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 8090,
  dataDir: process.env.DATA_DIR || '/data',
  // Chat vừa là auth oracle (/api/me) vừa là ngõ push (/internal/farm/notify).
  chatApiUrl: (process.env.CHAT_API_URL || 'http://chat:8082').replace(/\/$/, ''),
  internalSecret: process.env.FARM_INTERNAL_SECRET || null,
  fast: process.env.FARM_FAST === '1', // test: cây lớn nhanh gấp 60 lần
};

const db = openDb(config.dataDir);
const app = buildApp({ config, db });

app.listen({ port: config.port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
