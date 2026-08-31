import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS farmers (
  user_id INTEGER PRIMARY KEY,          -- id user bên Chat (nguồn định danh duy nhất)
  name TEXT NOT NULL,                   -- display name đồng bộ từ Chat mỗi lần ghé
  coins INTEGER NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  plots_count INTEGER NOT NULL,
  last_daily TEXT,                      -- 'YYYY-MM-DD' giờ VN
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plots (
  owner_id INTEGER NOT NULL,
  idx INTEGER NOT NULL,                 -- 0-based, < farmers.plots_count
  crop TEXT NOT NULL,
  planted_at INTEGER NOT NULL,
  ready_at INTEGER NOT NULL,
  stolen INTEGER NOT NULL DEFAULT 0,    -- số đơn vị đã bị trộm vụ này
  PRIMARY KEY (owner_id, idx)
);

-- Dấu vết tưới/trộm theo TỪNG VỤ (planted_at) — mỗi người 1 lần/ô/vụ.
CREATE TABLE IF NOT EXISTS plot_actions (
  owner_id INTEGER NOT NULL,
  idx INTEGER NOT NULL,
  planted_at INTEGER NOT NULL,
  helper_id INTEGER NOT NULL,
  action TEXT NOT NULL,                 -- 'water' | 'steal'
  at INTEGER NOT NULL,
  PRIMARY KEY (owner_id, idx, planted_at, helper_id, action)
);

-- Bản tin làng: câu chữ dựng sẵn tiếng Việt, chỉ để hiển thị.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  text TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_at ON events(at DESC);
`;

export function openDb(dataDir) {
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(join(dataDir, 'farm.sqlite3'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
