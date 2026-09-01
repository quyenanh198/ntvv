// Chạy dev local: stub Chat auth (:8082) + farm server (:8090), đồng hồ nhanh ×60.
// Cách dùng: node dev/dev-farm.mjs  → mở http://localhost:8090/farm/
// (đặt cookie bất kỳ, ví dụ document.cookie='lb_session=dev', stub nhận tất cả)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
require('./chat-stub.cjs');
const dataDir = fileURLToPath(new URL('../.devdata', import.meta.url));
mkdirSync(dataDir, { recursive: true });
process.env.PORT ??= '8090';
process.env.CHAT_API_URL ??= 'http://localhost:8082';
process.env.DATA_DIR ??= dataDir;
process.env.FARM_FAST ??= '1';
await import('../server/src/server.js');
