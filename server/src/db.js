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
CREATE TABLE IF NOT EXISTS machine_jobs (
  owner_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  recipe TEXT NOT NULL,
  ready_at INTEGER NOT NULL,
  queue_count INTEGER NOT NULL DEFAULT 1,
  poached INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (owner_id, kind, recipe)
);
CREATE TABLE IF NOT EXISTS fish_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  species TEXT NOT NULL,
  qty INTEGER NOT NULL,
  planted_at INTEGER NOT NULL,
  ready_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS wants (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  item TEXT NOT NULL,
  qty INTEGER NOT NULL,
  filled INTEGER NOT NULL DEFAULT 0,
  price INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS theft_days (
  owner_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (owner_id, day)
);
CREATE TABLE IF NOT EXISTS thief_awards (
  day TEXT PRIMARY KEY,
  winners_json TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS poach_guard (
  owner_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (owner_id, kind)
);
CREATE TABLE IF NOT EXISTS thefts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  thief_id INTEGER NOT NULL,
  item TEXT NOT NULL,
  qty INTEGER NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS thefts_owner_at ON thefts (owner_id, at);
CREATE TABLE IF NOT EXISTS luxury (
  owner_id INTEGER NOT NULL,
  item TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (owner_id, item)
);
CREATE TABLE IF NOT EXISTS lottery_tickets (
  day TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, owner_id)
);
CREATE TABLE IF NOT EXISTS lottery_draws (
  day TEXT PRIMARY KEY,
  pot INTEGER NOT NULL,
  winner_id INTEGER NOT NULL,
  winner_name TEXT NOT NULL,
  tickets INTEGER NOT NULL,
  at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS market_sat (
  item TEXT PRIMARY KEY,
  sat REAL NOT NULL DEFAULT 0,
  at INTEGER NOT NULL
);
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
  // Cột thêm sau khi farm2 đã chạy thật — ALTER có guard, idempotent.
  const cols = db.prepare('PRAGMA table_info(farmers)').all().map((c) => c.name);
  if (!cols.includes('energy')) db.exec('ALTER TABLE farmers ADD COLUMN energy INTEGER NOT NULL DEFAULT 100');
  if (!cols.includes('energy_at')) db.exec('ALTER TABLE farmers ADD COLUMN energy_at INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('coop_level')) db.exec('ALTER TABLE farmers ADD COLUMN coop_level INTEGER NOT NULL DEFAULT 1');
  if (!cols.includes('pond_level')) db.exec('ALTER TABLE farmers ADD COLUMN pond_level INTEGER NOT NULL DEFAULT 1');
  if (!cols.includes('cow_level')) db.exec('ALTER TABLE farmers ADD COLUMN cow_level INTEGER NOT NULL DEFAULT 1');
  if (!cols.includes('sheep_level')) db.exec('ALTER TABLE farmers ADD COLUMN sheep_level INTEGER NOT NULL DEFAULT 1');
  for (const c of ['duck_level', 'bee_level', 'goat_level', 'pig_level']) {
    if (!cols.includes(c)) db.exec(`ALTER TABLE farmers ADD COLUMN ${c} INTEGER NOT NULL DEFAULT 1`);
  }
  // Vật nuôi đợt sau: cấp chuồng gom vào JSON thay vì mỗi loại một cột.
  if (!cols.includes('barn_levels_json')) db.exec("ALTER TABLE farmers ADD COLUMN barn_levels_json TEXT NOT NULL DEFAULT '{}'");
  if (!cols.includes('orders_refresh_at')) db.exec('ALTER TABLE farmers ADD COLUMN orders_refresh_at INTEGER NOT NULL DEFAULT 0');
  // Vàng được tặng (admin cấp) — không tính vào "kinh tế làng" của bảng trộm.
  if (!cols.includes('gift_gold')) db.exec('ALTER TABLE farmers ADD COLUMN gift_gold INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('dog_until')) db.exec('ALTER TABLE farmers ADD COLUMN dog_until INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('last_caught_at')) db.exec('ALTER TABLE farmers ADD COLUMN last_caught_at INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('caught_streak')) db.exec('ALTER TABLE farmers ADD COLUMN caught_streak INTEGER NOT NULL DEFAULT 0');
  // Tổng vàng thu được nhờ BÁN HÀNG (hệ thống, đơn hàng, bạn bè) — thước đo kinh tế làng.
  if (!cols.includes('sold_gold')) db.exec('ALTER TABLE farmers ADD COLUMN sold_gold INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('critter_next_at')) db.exec('ALTER TABLE farmers ADD COLUMN critter_next_at INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('skills_json')) db.exec("ALTER TABLE farmers ADD COLUMN skills_json TEXT NOT NULL DEFAULT '[]'");
  if (!cols.includes('last_respec_at')) db.exec('ALTER TABLE farmers ADD COLUMN last_respec_at INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('tax_day')) db.exec("ALTER TABLE farmers ADD COLUMN tax_day TEXT NOT NULL DEFAULT ''");
  if (!cols.includes('tax_owed')) db.exec('ALTER TABLE farmers ADD COLUMN tax_owed INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('sunk_gold')) db.exec('ALTER TABLE farmers ADD COLUMN sunk_gold INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('title_id')) db.exec("ALTER TABLE farmers ADD COLUMN title_id TEXT NOT NULL DEFAULT ''");
  if (!cols.includes('frame_id')) db.exec("ALTER TABLE farmers ADD COLUMN frame_id TEXT NOT NULL DEFAULT ''");
  if (!cols.includes('machine_levels_json')) db.exec("ALTER TABLE farmers ADD COLUMN machine_levels_json TEXT NOT NULL DEFAULT '{}'");
  if (!cols.includes('support_paid')) db.exec('ALTER TABLE farmers ADD COLUMN support_paid INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('last_seen_at')) db.exec('ALTER TABLE farmers ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('away_report_json')) db.exec('ALTER TABLE farmers ADD COLUMN away_report_json TEXT');
  // Hỗ trợ theo trần làng: coi vàng tặng trước đây là đã hỗ trợ (tránh trả trùng).
  db.exec('UPDATE farmers SET support_paid = gift_gold WHERE support_paid = 0 AND gift_gold > 0');
  const mcols = db.prepare('PRAGMA table_info(machines)').all().map((c) => c.name);
  // Mỗi máy chạy nhiều món song song: chuyển mẻ đang chạy từ machines (1 món/máy)
  // sang machine_jobs (1 dòng/món). Idempotent — machines được dọn sau khi chuyển.
  if (mcols.includes('recipe')) {
    db.exec(`INSERT OR IGNORE INTO machine_jobs (owner_id, kind, recipe, ready_at, queue_count, poached)
      SELECT owner_id, kind, recipe, ready_at, COALESCE(queue_count, 1), COALESCE(poached, 0) FROM machines WHERE recipe IS NOT NULL AND ready_at IS NOT NULL`);
    db.exec('UPDATE machines SET recipe = NULL, ready_at = NULL WHERE recipe IS NOT NULL');
  }
  if (!mcols.includes('poached')) db.exec('ALTER TABLE machines ADD COLUMN poached INTEGER NOT NULL DEFAULT 0');
  if (!mcols.includes('queue_count')) db.exec('ALTER TABLE machines ADD COLUMN queue_count INTEGER NOT NULL DEFAULT 1');
  const pcols = db.prepare('PRAGMA table_info(plots)').all().map((c) => c.name);
  if (!pcols.includes('poached')) db.exec('ALTER TABLE plots ADD COLUMN poached INTEGER NOT NULL DEFAULT 0');
  if (!pcols.includes('tree')) db.exec('ALTER TABLE plots ADD COLUMN tree INTEGER NOT NULL DEFAULT 0');
  if (!pcols.includes('tree_at')) db.exec('ALTER TABLE plots ADD COLUMN tree_at INTEGER');
  if (!pcols.includes('fruit_stock')) db.exec('ALTER TABLE plots ADD COLUMN fruit_stock INTEGER NOT NULL DEFAULT 0');
  // Cây trồng trước khi có tuổi thọ: tính tuổi từ lúc nâng cấp.
  db.prepare('UPDATE plots SET tree_at = ? WHERE tree = 1 AND tree_at IS NULL').run(Date.now());
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
