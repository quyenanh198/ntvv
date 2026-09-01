import { existsSync, mkdirSync } from 'node:fs';
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

CREATE TABLE IF NOT EXISTS festival (
  owner_id INTEGER NOT NULL,
  cycle INTEGER NOT NULL,
  counters_json TEXT NOT NULL DEFAULT '{}',
  claims_json TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (owner_id, cycle)
);

-- Level chuyển từ thế giới v1 (farm.sqlite3): xp v2 tối thiểu theo level cũ.
CREATE TABLE IF NOT EXISTS legacy_levels (
  user_id INTEGER PRIMARY KEY,
  xp INTEGER NOT NULL
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

// Đọc farmers từ thế giới v1 (nếu còn file) và quy đổi LEVEL cũ thành mốc XP
// v2 tương đương (công thức spec). Chỉ nâng, không bao giờ hạ; chạy một lần
// mỗi lần boot (idempotent).
export function importLegacyLevels(db, dataDir, xpNeedFor) {
  const oldPath = join(dataDir, 'farm.sqlite3');
  if (!existsSync(oldPath)) return 0;
  let rows;
  try {
    const v1 = new Database(oldPath, { readonly: true, fileMustExist: true });
    rows = v1.prepare('SELECT user_id, xp FROM farmers').all();
    v1.close();
  } catch {
    return 0;
  }
  // v1: level = l lớn nhất sao cho xp >= 20·(l−1)·l
  const v1LevelFor = (xp) => {
    let l = 1;
    while (xp >= 20 * l * (l + 1)) l += 1;
    return l;
  };
  const v2XpForLevel = (L) => {
    let sum = 0;
    for (let i = 1; i < L; i += 1) sum += xpNeedFor(i);
    return sum;
  };
  const put = db.prepare('INSERT INTO legacy_levels (user_id, xp) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET xp = excluded.xp');
  const lift = db.prepare('UPDATE farmers SET xp = ? WHERE user_id = ? AND xp < ?');
  let n = 0;
  for (const r of rows) {
    const target = v2XpForLevel(v1LevelFor(r.xp));
    if (target <= 0) continue;
    put.run(r.user_id, target);
    lift.run(target, r.user_id, target);
    n += 1;
  }
  return n;
}
