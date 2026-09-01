// Luật chơi Nông trại vui vẻ v2 — bám tài liệu đặc tả gameplay 1.0
// (docs/gameplay: cây trồng, EXP, vàng, đơn hàng, nhiệm vụ ngày, chuồng gà,
// cối xay). Thuần cấu hình/logic, không I/O.

const MIN = 60_000;

// ---- Cây trồng (bảng mục 6, MVP tới Bí ngô) --------------------------------
// Mỗi ô cho 1 sản phẩm. expSow khi gieo, expHarvest khi thu.
export const CROPS = {
  luami:    { id: 'luami',    name: 'Lúa mì',   emoji: '🌾', level: 1,  growMs: 1 * MIN,   seed: 2,   sell: 6,   expSow: 1, expHarvest: 2 },
  carot:    { id: 'carot',    name: 'Cà rốt',   emoji: '🥕', level: 1,  growMs: 3 * MIN,   seed: 4,   sell: 11,  expSow: 1, expHarvest: 4 },
  ngo:      { id: 'ngo',      name: 'Ngô',      emoji: '🌽', level: 4,  growMs: 6 * MIN,   seed: 7,   sell: 18,  expSow: 2, expHarvest: 7 },
  khoaitay: { id: 'khoaitay', name: 'Khoai tây', emoji: '🥔', level: 5,  growMs: 10 * MIN,  seed: 11,  sell: 28,  expSow: 2, expHarvest: 10 },
  bapcai:   { id: 'bapcai',   name: 'Bắp cải',  emoji: '🥬', level: 7,  growMs: 15 * MIN,  seed: 14,  sell: 36,  expSow: 2, expHarvest: 14 },
  cachua:   { id: 'cachua',   name: 'Cà chua',  emoji: '🍅', level: 8,  growMs: 25 * MIN,  seed: 18,  sell: 48,  expSow: 3, expHarvest: 21 },
  hanhtay:  { id: 'hanhtay',  name: 'Hành tây', emoji: '🧅', level: 10, growMs: 60 * MIN,  seed: 30,  sell: 84,  expSow: 4, expHarvest: 43 },
  mia:      { id: 'mia',      name: 'Mía',      emoji: '🎋', level: 12, growMs: 120 * MIN, seed: 46,  sell: 135, expSow: 5, expHarvest: 78 },
  dautay:   { id: 'dautay',   name: 'Dâu tây',  emoji: '🍓', level: 13, growMs: 45 * MIN,  seed: 24,  sell: 70,  expSow: 3, expHarvest: 33 },
  catim:    { id: 'catim',    name: 'Cà tím',   emoji: '🍆', level: 14, growMs: 240 * MIN, seed: 72,  sell: 215, expSow: 7, expHarvest: 145 },
  gao:      { id: 'gao',      name: 'Gạo',      emoji: '🍚', level: 16, growMs: 90 * MIN,  seed: 38,  sell: 110, expSow: 4, expHarvest: 60 },
  bingo:    { id: 'bingo',    name: 'Bí ngô',   emoji: '🎃', level: 18, growMs: 180 * MIN, seed: 60,  sell: 180, expSow: 6, expHarvest: 110 },
  duahau:   { id: 'duahau',   name: 'Dưa hấu',  emoji: '🍉', level: 21, growMs: 300 * MIN, seed: 90,  sell: 275, expSow: 8, expHarvest: 185 },
  nho:      { id: 'nho',      name: 'Nho',      emoji: '🍇', level: 22, growMs: 360 * MIN, seed: 110, sell: 340, expSow: 9, expHarvest: 230 },
  caphe:    { id: 'caphe',    name: 'Cà phê',   emoji: '☕', level: 23, growMs: 480 * MIN, seed: 145, sell: 450, expSow: 12, expHarvest: 300 },
  cacao:    { id: 'cacao',    name: 'Ca cao',   emoji: '🍫', level: 28, growMs: 600 * MIN, seed: 190, sell: 585, expSow: 15, expHarvest: 380 },
};

// ---- Sản phẩm ngoài cây (kho dùng chung một catalogue) ---------------------
export const GOODS = {
  trung:   { id: 'trung',   name: 'Trứng',       emoji: '🥚', sell: 28,  source: 'ga' },
  botmi:   { id: 'botmi',   name: 'Bột mì',      emoji: '🥡', sell: 32,  source: 'coixay' },
  thucan:  { id: 'thucan',  name: 'Thức ăn gia súc', emoji: '🌰', sell: 0, source: 'shop', buy: 12 },
  sua:     { id: 'sua',     name: 'Sữa',         emoji: '🥛', sell: 82,  source: 'bo' },
  len:     { id: 'len',     name: 'Len',         emoji: '🧶', sell: 145, source: 'cuu' },
  canho:   { id: 'canho',   name: 'Cá nhỏ',      emoji: '🐟', sell: 35,  source: 'ho', expCatch: 12 },
  caro:    { id: 'caro',    name: 'Cá rô',       emoji: '🐠', sell: 95,  source: 'ho', expCatch: 18 },
  cachep:  { id: 'cachep',  name: 'Cá chép',     emoji: '🐡', sell: 180, source: 'ho', expCatch: 40 },
  cakoi:   { id: 'cakoi',   name: 'Cá koi',      emoji: '🎏', sell: 450, source: 'ho', expCatch: 70 },
};

export function itemInfo(id) {
  return CROPS[id] || GOODS[id] || null;
}

// ---- Vật nuôi (mục 7.1) — gà/bò/cừu, chuồng riêng từng loại (mục 9.4) ------
// capacities: sức chứa chuồng cấp 1..5. Tất cả ăn chung 'thucan'.
export const ANIMALS = {
  ga:  { id: 'ga',  name: 'Gà',  emoji: '🐔', level: 3,  price: 250,  produceMs: 15 * MIN, feedQty: 1, product: 'trung', expCollect: 8,  capacities: [3, 4, 6, 8, 10] },
  bo:  { id: 'bo',  name: 'Bò',  emoji: '🐄', level: 8,  price: 850,  produceMs: 45 * MIN, feedQty: 2, product: 'sua',   expCollect: 16, capacities: [2, 3, 4, 6, 8] },
  cuu: { id: 'cuu', name: 'Cừu', emoji: '🐑', level: 14, price: 1400, produceMs: 60 * MIN, feedQty: 3, product: 'len',   expCollect: 22, capacities: [2, 3, 4, 6, 8] },
};
export const FEED_ITEM = 'thucan';
export const BARN_UPGRADE_GOLD = [1000, 3000, 8000, 20000]; // lên cấp 2..5, mọi chuồng
// Tương thích ngược cho các chỗ cũ còn tham chiếu gà.
export const CHICKEN = { ...ANIMALS.ga, capacity: ANIMALS.ga.capacities[0], feedItem: FEED_ITEM };

// ---- Cối xay (mục 8 — MVP) -------------------------------------------------
export const MILL = {
  level: 10,
  recipes: {
    botmi:  { id: 'botmi',  name: 'Bột mì',     emoji: '🥡', in: { luami: 2 }, out: { botmi: 1 },  ms: 10 * MIN, exp: 10 },
    thucan: { id: 'thucan', name: 'Thức ăn gà', emoji: '🌰', in: { ngo: 2 },   out: { thucan: 3 }, ms: 8 * MIN,  exp: 8 },
  },
};

// ---- Đất ------------------------------------------------------------------
export const START_PLOTS = 12;
// Mở rộng theo bảng mục 9.2 (MVP: 5 lần đầu, mỗi lần +4 ô → tối đa 32).
export const EXPANSIONS = [
  { level: 2,  gold: 500 },
  { level: 4,  gold: 1200 },
  { level: 6,  gold: 2500 },
  { level: 8,  gold: 5000 },
  { level: 10, gold: 9000 },
];
export const MAX_PLOTS = START_PLOTS + EXPANSIONS.length * 4;

// Hệ số vàng: mọi nguồn THU vàng nhân 4 (yêu cầu nhà mình — chi phí giữ nguyên).
export const GOLD_MULT = 4;

// ---- Khởi điểm & tiền tệ (mục 19) -----------------------------------------
export const START_GOLD = 500;
export const START_GEMS = 50;

// Kim cương tăng tốc: 1 KC / 5 phút còn lại, làm tròn lên, tối thiểu 1.
export function speedupCost(remainingMs) {
  return Math.max(1, Math.ceil(remainingMs / (5 * MIN)));
}

// ---- EXP & cấp (mục 4: 100 + 12L + 3,36L², làm tròn 10) --------------------
export function xpNeedFor(level) {
  return Math.round((100 + 12 * level + 3.36 * level * level) / 10) * 10;
}

export function levelInfo(xp) {
  let level = 1;
  let rest = xp;
  while (level < 60 && rest >= xpNeedFor(level)) {
    rest -= xpNeedFor(level);
    level += 1;
  }
  return { level, into: rest, need: xpNeedFor(level) };
}

export function levelFor(xp) {
  return levelInfo(xp).level;
}

// ---- Đơn hàng (mục 10.2 + 16.2/16.3) --------------------------------------
export const ORDER_SLOTS = 4;
export const ORDER_UNLOCK_LEVEL = 5;
export const ORDER_REFRESH_MS = 20 * MIN; // đơn mới sau khi bỏ/giao

// Sinh một đơn từ các sản phẩm đã mở khóa. rng: () => [0,1).
export function generateOrder(level, rng) {
  const pool = Object.values(CROPS).filter((c) => c.level <= level).map((c) => c.id);
  if (level >= ANIMALS.ga.level) pool.push('trung');
  if (level >= ANIMALS.bo.level) pool.push('sua');
  if (level >= ANIMALS.cuu.level) pool.push('len');
  if (level >= FISHING.level) pool.push('canho', 'caro');
  if (level >= MILL.level) pool.push('botmi');
  const kinds = 1 + Math.floor(rng() * Math.min(3, Math.max(1, Math.floor(level / 4) + 1)));
  const chosen = new Set();
  while (chosen.size < kinds) chosen.add(pool[Math.floor(rng() * pool.length)]);
  const items = {};
  let base = 0;
  for (const id of chosen) {
    const qty = 1 + Math.floor(rng() * 4);
    items[id] = qty;
    base += itemInfo(id).sell * qty;
  }
  const bonus = 1.1 + rng() * 0.15; // 1,10x – 1,25x
  const goldBase = Math.ceil(base * bonus);
  const gold = goldBase * GOLD_MULT;
  const exp = Math.min(500, Math.round(30 + 10 * chosen.size + 0.05 * goldBase));
  return { items, gold, exp, stars: chosen.size };
}

// ---- Nhiệm vụ ngày (mục 10.3) ---------------------------------------------
export const DAILY_QUESTS = [
  { id: 'harvest', name: 'Thu hoạch cây',    emoji: '🧺', target: 15, gold: 120, exp: 50 },
  { id: 'sow',     name: 'Gieo hạt',         emoji: '🌱', target: 10, gold: 100, exp: 40 },
  { id: 'deliver', name: 'Giao đơn hàng',    emoji: '🚚', target: 2,  gold: 300, exp: 80, stars: 3 },
  { id: 'process', name: 'Chế biến sản phẩm', emoji: '⚙️', target: 3,  gold: 250, exp: 70 },
  { id: 'feed',    name: 'Cho gà ăn',        emoji: '🐔', target: 5,  gold: 150, exp: 50 },
  { id: 'sell',    name: 'Bán nông sản',     emoji: '💰', target: 10, gold: 180, exp: 50 },
  { id: 'fish',    name: 'Câu cá',           emoji: '🎣', target: 4,  gold: 180, exp: 60 },
];
export const DAILY_CHEST = { gold: 500, exp: 100, gemChance: 0.1, questsRequired: 3 };

// ---- Sao Nông Trại (mục 13.2, các mốc đầu) --------------------------------
export const STAR_MILESTONES = [
  { stars: 50,   gold: 500 },
  { stars: 100,  gems: 5 },
  { stars: 250,  gold: 2000 },
  { stars: 500,  gems: 10 },
  { stars: 1000, gems: 10, gold: 5000 },
];

// ---- Hái ké (bản gia đình của "trộm": chủ ruộng không mất gì) --------------
export const POACH_DAILY_LIMIT = 10; // (không còn dùng để chặn)
export const POACH_EXP = 1;   // mỗi vật phẩm
export const POACH_YIELD = 2; // số vật phẩm mỗi lần hái ké

// ---- Tưới: không đổi thời gian (mục 6.1) — đánh dấu "Tươi tốt", chủ +1 EXP
// khi thu; khách tưới giúp nhận công nhỏ.
export const WATER_HELPER_GOLD = 2;
export const WATER_HELPER_EXP = 1;
export const WATER_FRESH_EXP = 1;

// ---- Năng lượng (mục 3.2) & Hồ câu cá (mục 7.1/11: mở cấp 7) ---------------
export const ENERGY = {
  max: 100,
  buyCap: 120,        // thưởng/mua được vượt trần tối đa 20%
  regenMs: 1 * MIN,   // hồi 1 năng lượng mỗi phút
  buyGems: 10,        // gói nhỏ: 10 kim cương = 30 năng lượng
  buyAmount: 30,
};

// Nâng cấp chuồng gà (mục 9.4): sức chứa theo cấp, giá lên cấp 2..5.
export const COOP_LEVELS = [3, 4, 6, 8, 10];
export const COOP_UPGRADE_GOLD = [1000, 3000, 8000, 20000];

// Nâng cấp ao cá: số cá mỗi lượt quăng theo cấp, giá lên cấp 2..5.
export const POND_LEVELS = [1, 1, 2, 2, 3];
export const POND_UPGRADE_GOLD = [1500, 4000, 10000, 25000];

export const FISHING = {
  level: 7,
  energyCost: 4,      // câu cá một lượt: 4 năng lượng
  loot: [
    { id: 'canho',  weight: 60 },
    { id: 'caro',   weight: 30 },
    { id: 'cachep', weight: 8 },
    { id: 'cakoi',  weight: 2 },
  ],
};

// Quay loot câu cá theo trọng số. rng: () => [0,1).
export function rollFish(rng) {
  const total = FISHING.loot.reduce((a, l) => a + l.weight, 0);
  let r = rng() * total;
  for (const l of FISHING.loot) {
    r -= l.weight;
    if (r < 0) return l.id;
  }
  return FISHING.loot[0].id;
}

// ---- Sự kiện cá nhân: Lễ Hội Thu Hoạch (mục 12.2, chu kỳ 7 ngày) ----------
export const FESTIVAL = {
  name: 'Lễ Hội Thu Hoạch',
  emoji: '🎪',
  cycleDays: 7,
  milestones: [
    { id: 1, type: 'harvest', label: 'Thu hoạch 50 cây',       target: 50,  gold: 1000 },
    { id: 2, type: 'harvest', label: 'Thu hoạch 150 cây',      target: 150, gems: 5 },
    { id: 3, type: 'deliver', label: 'Giao 15 đơn hàng',       target: 15,  gold: 2000 },
    { id: 4, type: 'process', label: 'Chế biến 20 sản phẩm',   target: 20,  gems: 10 },
    { id: 5, type: 'harvest', label: 'Thu hoạch 300 cây',      target: 300, gold: 3000, gems: 15 },
  ],
};

// Chu kỳ hiện tại + số ngày còn lại (ngày tính theo giờ VN, UTC+7).
export function festivalCycle(now = Date.now()) {
  const dayNumber = Math.floor((now + 7 * 3600 * 1000) / 86400000);
  return { cycle: Math.floor(dayNumber / FESTIVAL.cycleDays), daysLeft: FESTIVAL.cycleDays - (dayNumber % FESTIVAL.cycleDays) };
}

// ---- FARM_FAST (test): mọi đồng hồ chia 60, sàn 3 giây ---------------------
export function scaleMs(ms, fast) {
  return fast ? Math.max(3000, Math.round(ms / 60)) : ms;
}

// Ngày hiện tại theo giờ VN (mốc nhiệm vụ ngày / hái ké).
export function todayVN(now = Date.now()) {
  return new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}
