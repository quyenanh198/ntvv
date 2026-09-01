import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';

// v2 (đặc tả gameplay 1.0): file DB mới farm2.sqlite3 — thế giới cũ trong
// farm.sqlite3 được giữ nguyên tại chỗ, không đụng tới.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS farmers (
  user_id INTEGER PRIMARY KEY,          -- id user bên Chat
  name TEXT NOT NULL,
  gold INTEGER NOT NULL,
  gems INTEGER NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  stars INTEGER NOT NULL DEFAULT 0,
  plots_count INTEGER NOT NULL,
  next_order_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plots (
  owner_id INTEGER NOT NULL,
  idx INTEGER NOT NULL,
  crop TEXT NOT NULL,
  planted_at INTEGER NOT NULL,
  ready_at INTEGER NOT NULL,
  watered INTEGER NOT NULL DEFAULT 0,   -- "Tươi tốt" khi thu
  PRIMARY KEY (owner_id, idx)
);

CREATE TABLE IF NOT EXISTS inventory (
  owner_id INTEGER NOT NULL,
  item TEXT NOT NULL,
  qty INTEGER NOT NULL,
  PRIMARY KEY (owner_id, item)
);

CREATE TABLE IF NOT EXISTS animals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  kind TEXT NOT NULL,                   -- 'ga'
  ready_at INTEGER                      -- NULL = đói, chưa cho ăn
);
CREATE INDEX IF NOT EXISTS idx_animals_owner ON animals(owner_id);

CREATE TABLE IF NOT EXISTS machines (
  owner_id INTEGER NOT NULL,
  kind TEXT NOT NULL,                   -- 'coixay'
  recipe TEXT,
  ready_at INTEGER,
  PRIMARY KEY (owner_id, kind)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  slot INTEGER NOT NULL,
  items_json TEXT NOT NULL,
  gold INTEGER NOT NULL,
  exp INTEGER NOT NULL,
  stars INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_owner ON orders(owner_id);

-- Nhiệm vụ ngày: bộ đếm hành động trong ngày (giờ VN) + cờ đã nhận rương.
CREATE TABLE IF NOT EXISTS daily (
  owner_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  counters_json TEXT NOT NULL DEFAULT '{}',
  chest_claimed INTEGER NOT NULL DEFAULT 0,
  poached INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (owner_id, day)
);

-- Dấu vết tưới/hái ké theo TỪNG VỤ — mỗi người 1 lần/ô/vụ.
CREATE TABLE IF NOT EXISTS plot_actions (
  owner_id INTEGER NOT NULL,
  idx INTEGER NOT NULL,
  planted_at INTEGER NOT NULL,
  helper_id INTEGER NOT NULL,
  action TEXT NOT NULL,                 -- 'water' | 'poach'
  at INTEGER NOT NULL,
  PRIMARY KEY (owner_id, idx, planted_at, helper_id, action)
);

CREATE TABLE IF NOT EXISTS star_claims (
  owner_id INTEGER NOT NULL,
  milestone INTEGER NOT NULL,
  PRIMARY KEY (owner_id, milestone)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  text TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_at ON events(at DESC);
`;

export function openDb(dataDir) {
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(join(dataDir, 'farm2.sqlite3'));
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  return db;
}
