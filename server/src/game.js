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
  mia:      { id: 'mia',      name: 'Mía',      emoji: '🎋', level: 12, growMs: 90 * MIN, seed: 46,  sell: 135, expSow: 5, expHarvest: 78 },
  dautay:   { id: 'dautay',   name: 'Dâu tây',  emoji: '🍓', level: 13, growMs: 45 * MIN,  seed: 24,  sell: 70,  expSow: 3, expHarvest: 33 },
  catim:    { id: 'catim',    name: 'Cà tím',   emoji: '🍆', level: 14, growMs: 150 * MIN, seed: 72,  sell: 215, expSow: 7, expHarvest: 145 },
  gao:      { id: 'gao',      name: 'Gạo',      emoji: '🍚', level: 16, growMs: 75 * MIN,  seed: 38,  sell: 110, expSow: 4, expHarvest: 60 },
  bingo:    { id: 'bingo',    name: 'Bí ngô',   emoji: '🎃', level: 18, growMs: 120 * MIN, seed: 60,  sell: 180, expSow: 6, expHarvest: 110 },
  duahau:   { id: 'duahau',   name: 'Dưa hấu',  emoji: '🍉', level: 21, growMs: 180 * MIN, seed: 90,  sell: 275, expSow: 8, expHarvest: 185 },
  nho:      { id: 'nho',      name: 'Nho',      emoji: '🍇', level: 22, growMs: 210 * MIN, seed: 110, sell: 340, expSow: 9, expHarvest: 230 },
  caphe:    { id: 'caphe',    name: 'Cà phê',   emoji: '☕', level: 23, growMs: 240 * MIN, seed: 145, sell: 450, expSow: 12, expHarvest: 300 },
  cacao:    { id: 'cacao',    name: 'Ca cao',   emoji: '🍫', level: 28, growMs: 300 * MIN, seed: 190, sell: 585, expSow: 15, expHarvest: 380 },
};

// ---- Sản phẩm ngoài cây (kho dùng chung một catalogue) ---------------------
export const GOODS = {
  trung:   { id: 'trung',   name: 'Trứng',       emoji: '🥚', sell: 48,  source: 'ga' },
  botmi:   { id: 'botmi',   name: 'Bột mì',      emoji: '🥡', sell: 56,  source: 'coixay' },
  thucan:  { id: 'thucan',  name: 'Thức ăn gia súc', emoji: '🌰', sell: 0, source: 'shop', buy: 12 },
  sua:     { id: 'sua',     name: 'Sữa',         emoji: '🥛', sell: 140,  source: 'bo' },
  len:     { id: 'len',     name: 'Len',         emoji: '🧶', sell: 250, source: 'cuu' },
  nuoccarot:  { id: 'nuoccarot',  name: 'Nước ép cà rốt',  emoji: '🥤', sell: 60,   source: 'mayep' },
  nuocduahau: { id: 'nuocduahau', name: 'Nước ép dưa hấu', emoji: '🍹', sell: 900,  source: 'mayep' },
  mutdau:     { id: 'mutdau',     name: 'Mứt dâu',         emoji: '🫙', sell: 280,  source: 'noimut' },
  sotcachua:  { id: 'sotcachua',  name: 'Sốt cà chua',     emoji: '🥫', sell: 220,  source: 'noimut' },
  phomai:     { id: 'phomai',     name: 'Phô mai',         emoji: '🧀', sell: 420,  source: 'nhamaysua' },
  banhmi:     { id: 'banhmi',     name: 'Bánh mì trứng',   emoji: '🥖', sell: 180,  source: 'lobanh' },
  banhbi:     { id: 'banhbi',     name: 'Bánh bí ngô',     emoji: '🥧', sell: 420,  source: 'lobanh' },
  capherang:  { id: 'capherang',  name: 'Cà phê rang',     emoji: '🫘', sell: 1400, source: 'mayrang' },
  cuonlen:    { id: 'cuonlen',    name: 'Cuộn len',        emoji: '🧵', sell: 750,  source: 'xuongdet' },
  // Bếp gia đình
  khoaichien: { id: 'khoaichien', name: 'Khoai tây chiên', emoji: '🍟', sell: 150,  source: 'bepan' },
  salad:      { id: 'salad',      name: 'Salad rau',       emoji: '🥗', sell: 180,  source: 'bepan' },
  comchien:   { id: 'comchien',   name: 'Cơm chiên trứng', emoji: '🍳', sell: 300,  source: 'bepan' },
  supbi:      { id: 'supbi',      name: 'Súp bí đỏ',       emoji: '🥣', sell: 620,  source: 'bepan' },
  // Máy ép / nồi mứt
  nuoccam:    { id: 'nuoccam',    name: 'Nước cam',        emoji: '🍊', sell: 260,  source: 'mayep' },
  sinhtoxoai: { id: 'sinhtoxoai', name: 'Sinh tố xoài',    emoji: '🥭', sell: 520,  source: 'mayep' },
  mutcam:     { id: 'mutcam',     name: 'Mứt cam',         emoji: '🍯', sell: 400,  source: 'noimut' },
  siro:       { id: 'siro',       name: 'Siro thanh long', emoji: '🧴', sell: 700,  source: 'noimut' },
  // Nhà máy sữa
  bo:         { id: 'bo',         name: 'Bơ',              emoji: '🧈', sell: 650,  source: 'nhamaysua' },
  suachua:    { id: 'suachua',    name: 'Sữa chua dâu',    emoji: '🍶', sell: 850,  source: 'nhamaysua' },
  kem:        { id: 'kem',        name: 'Kem dưa hấu',     emoji: '🍨', sell: 1700, source: 'nhamaysua' },
  // Lò bánh
  banhcarot:  { id: 'banhcarot',  name: 'Bánh cà rốt',     emoji: '🧁', sell: 260,  source: 'lobanh' },
  banhtao:    { id: 'banhtao',    name: 'Bánh táo',        emoji: '🥮', sell: 560,  source: 'lobanh' },
  pizza:      { id: 'pizza',      name: 'Pizza',           emoji: '🍕', sell: 1150, source: 'lobanh' },
  banhkem:    { id: 'banhkem',    name: 'Bánh kem dâu',    emoji: '🍰', sell: 1650, source: 'lobanh' },
  // Máy rang / xưởng dệt
  caphesua:   { id: 'caphesua',   name: 'Cà phê sữa',      emoji: '☕', sell: 2200, source: 'mayrang' },
  socola:     { id: 'socola',     name: 'Sô-cô-la',        emoji: '🍫', sell: 2100, source: 'mayrang' },
  khanlen:    { id: 'khanlen',    name: 'Khăn len',        emoji: '🧣', sell: 1100, source: 'xuongdet' },
  aolen:      { id: 'aolen',      name: 'Áo len',          emoji: '🧥', sell: 2600, source: 'xuongdet' },
  canho:   { id: 'canho',   name: 'Cá nhỏ',      emoji: '🐟', sell: 35,  source: 'ho', expCatch: 12 },
  caro:    { id: 'caro',    name: 'Cá rô',       emoji: '🐠', sell: 95,  source: 'ho', expCatch: 18 },
  cachep:  { id: 'cachep',  name: 'Cá chép',     emoji: '🐡', sell: 180, source: 'ho', expCatch: 40 },
  cakoi:   { id: 'cakoi',   name: 'Cá koi',      emoji: '🎏', sell: 450, source: 'ho', expCatch: 70 },
};

// ---- Cây ăn quả (mục 6.4): trồng một lần, tự ra quả theo chu kỳ ------------
export const TREES = {
  cam:       { id: 'cam',       name: 'Cam',        emoji: '🍊', level: 12, price: 250, growMs: 150 * MIN, yield: 3, sell: 55,  exp: 48 },
  tao:       { id: 'tao',       name: 'Táo',        emoji: '🍎', level: 14, price: 360, growMs: 210 * MIN, yield: 3, sell: 80,  exp: 75 },
  xoai:      { id: 'xoai',      name: 'Xoài',       emoji: '🥭', level: 16, price: 500, growMs: 270 * MIN, yield: 4, sell: 95,  exp: 110 },
  thanhlong: { id: 'thanhlong', name: 'Thanh long', emoji: '🌵', level: 18, price: 700, growMs: 360 * MIN, yield: 4, sell: 150, exp: 180 },
};

export function itemInfo(id) {
  return CROPS[id] || GOODS[id] || TREES[id] || null;
}

// ---- Vật nuôi (mục 7.1) — gà/bò/cừu, chuồng riêng từng loại (mục 9.4) ------
// capacities: sức chứa chuồng cấp 1..5. Tất cả ăn chung 'thucan'.
export const ANIMALS = {
  ga:  { id: 'ga',  name: 'Gà',  emoji: '🐔', level: 3,  price: 250,  produceMs: 15 * MIN, feedQty: 1, product: 'trung', expCollect: 8,  capacities: [3, 4, 6, 8, 10] },
  bo:  { id: 'bo',  name: 'Bò',  emoji: '🐄', level: 8,  price: 850,  produceMs: 30 * MIN, feedQty: 2, product: 'sua',   expCollect: 16, capacities: [2, 3, 4, 6, 8] },
  cuu: { id: 'cuu', name: 'Cừu', emoji: '🐑', level: 14, price: 1400, produceMs: 40 * MIN, feedQty: 3, product: 'len',   expCollect: 22, capacities: [2, 3, 4, 6, 8] },
};
export const FEED_ITEM = 'thucan';
export const BARN_UPGRADE_GOLD = [1000, 3000, 8000, 20000]; // lên cấp 2..5, mọi chuồng
// Tương thích ngược cho các chỗ cũ còn tham chiếu gà.
export const CHICKEN = { ...ANIMALS.ga, capacity: ANIMALS.ga.capacities[0], feedItem: FEED_ITEM };

// ---- Cối xay (mục 8 — MVP) -------------------------------------------------
export const MACHINES = {
  bepan: { id: 'bepan', name: 'Bếp gia đình', emoji: '🍳', level: 9, recipes: {
    khoaichien: { id: 'khoaichien', name: 'Khoai tây chiên', emoji: '🍟', in: { khoaitay: 3 }, out: { khoaichien: 1 }, ms: 15 * MIN, exp: 15 },
    salad:      { id: 'salad',      name: 'Salad rau',       emoji: '🥗', in: { bapcai: 1, cachua: 1, carot: 2 }, out: { salad: 1 }, ms: 20 * MIN, exp: 20 },
    comchien:   { id: 'comchien',   name: 'Cơm chiên trứng', emoji: '🍳', in: { gao: 1, trung: 1, ngo: 1 }, out: { comchien: 1 }, ms: 30 * MIN, exp: 35 },
    supbi:      { id: 'supbi',      name: 'Súp bí đỏ',       emoji: '🥣', in: { bingo: 1, sua: 1, hanhtay: 1 }, out: { supbi: 1 }, ms: 45 * MIN, exp: 65 },
  } },
  coixay: { id: 'coixay', name: 'Cối xay bột', emoji: '⚙️', level: 10, recipes: {
    botmi:  { id: 'botmi',  name: 'Bột mì', emoji: '🥡', in: { luami: 2 }, out: { botmi: 1 },  ms: 10 * MIN, exp: 10 },
    thucan: { id: 'thucan', name: 'Thức ăn gia súc', emoji: '🌰', in: { ngo: 2 }, out: { thucan: 3 }, ms: 8 * MIN, exp: 8 },
  } },
  mayep: { id: 'mayep', name: 'Máy ép nước', emoji: '🧃', level: 12, recipes: {
    nuoccarot:  { id: 'nuoccarot',  name: 'Nước ép cà rốt',  emoji: '🥤', in: { carot: 2 },  out: { nuoccarot: 1 },  ms: 20 * MIN, exp: 18 },
    nuocduahau: { id: 'nuocduahau', name: 'Nước ép dưa hấu', emoji: '🍹', in: { duahau: 2 }, out: { nuocduahau: 1 }, ms: 70 * MIN, exp: 105 },
    nuoccam:    { id: 'nuoccam',    name: 'Nước cam',        emoji: '🍊', in: { cam: 3 }, out: { nuoccam: 1 }, ms: 25 * MIN, exp: 30 },
    sinhtoxoai: { id: 'sinhtoxoai', name: 'Sinh tố xoài',    emoji: '🥭', in: { xoai: 2, sua: 1 }, out: { sinhtoxoai: 1 }, ms: 40 * MIN, exp: 55 },
  } },
  noimut: { id: 'noimut', name: 'Nồi mứt', emoji: '🍯', level: 13, recipes: {
    mutdau:    { id: 'mutdau',    name: 'Mứt dâu',     emoji: '🫙', in: { dautay: 2 }, out: { mutdau: 1 },    ms: 35 * MIN, exp: 32 },
    sotcachua: { id: 'sotcachua', name: 'Sốt cà chua', emoji: '🥫', in: { cachua: 2 }, out: { sotcachua: 1 }, ms: 30 * MIN, exp: 28 },
    mutcam:    { id: 'mutcam',    name: 'Mứt cam',     emoji: '🍯', in: { cam: 2, mia: 1 }, out: { mutcam: 1 }, ms: 40 * MIN, exp: 40 },
    siro:      { id: 'siro',      name: 'Siro thanh long', emoji: '🧴', in: { thanhlong: 2, mia: 1 }, out: { siro: 1 }, ms: 60 * MIN, exp: 70 },
  } },
  nhamaysua: { id: 'nhamaysua', name: 'Nhà máy sữa', emoji: '🧀', level: 15, recipes: {
    phomai:  { id: 'phomai',  name: 'Phô mai',      emoji: '🧀', in: { sua: 2 }, out: { phomai: 1 }, ms: 50 * MIN, exp: 52 },
    bo:      { id: 'bo',      name: 'Bơ',           emoji: '🧈', in: { sua: 3 }, out: { bo: 1 }, ms: 60 * MIN, exp: 65 },
    suachua: { id: 'suachua', name: 'Sữa chua dâu', emoji: '🍶', in: { sua: 2, mutdau: 1 }, out: { suachua: 1 }, ms: 55 * MIN, exp: 80 },
    kem:     { id: 'kem',     name: 'Kem dưa hấu',  emoji: '🍨', in: { sua: 2, nuocduahau: 1 }, out: { kem: 1 }, ms: 80 * MIN, exp: 150 },
  } },
  lobanh: { id: 'lobanh', name: 'Lò bánh', emoji: '🥖', level: 17, recipes: {
    banhmi: { id: 'banhmi', name: 'Bánh mì trứng', emoji: '🥖', in: { botmi: 1, trung: 1 }, out: { banhmi: 1 }, ms: 45 * MIN, exp: 45 },
    banhbi: { id: 'banhbi', name: 'Bánh bí ngô',   emoji: '🥧', in: { bingo: 1, botmi: 1 }, out: { banhbi: 1 }, ms: 90 * MIN, exp: 88 },
    banhcarot: { id: 'banhcarot', name: 'Bánh cà rốt',  emoji: '🧁', in: { carot: 4, botmi: 1, trung: 1 }, out: { banhcarot: 1 }, ms: 40 * MIN, exp: 30 },
    banhtao:   { id: 'banhtao',   name: 'Bánh táo',     emoji: '🥮', in: { tao: 3, botmi: 1, trung: 1 }, out: { banhtao: 1 }, ms: 60 * MIN, exp: 60 },
    pizza:     { id: 'pizza',     name: 'Pizza',        emoji: '🍕', in: { botmi: 2, sotcachua: 1, phomai: 1 }, out: { pizza: 1 }, ms: 70 * MIN, exp: 110 },
    banhkem:   { id: 'banhkem',   name: 'Bánh kem dâu', emoji: '🍰', in: { botmi: 1, trung: 2, bo: 1, mutdau: 1 }, out: { banhkem: 1 }, ms: 90 * MIN, exp: 160 },
  } },
  mayrang: { id: 'mayrang', name: 'Máy rang cà phê', emoji: '🫘', level: 23, recipes: {
    capherang: { id: 'capherang', name: 'Cà phê rang', emoji: '🫘', in: { caphe: 2 }, out: { capherang: 1 }, ms: 120 * MIN, exp: 180 },
    caphesua:  { id: 'caphesua',  name: 'Cà phê sữa',  emoji: '☕', in: { capherang: 1, sua: 1 }, out: { caphesua: 1 }, ms: 60 * MIN, exp: 200 },
    socola:    { id: 'socola',    name: 'Sô-cô-la',    emoji: '🍫', in: { cacao: 2, sua: 1, mia: 1 }, out: { socola: 1 }, ms: 100 * MIN, exp: 220 },
  } },
  xuongdet: { id: 'xuongdet', name: 'Xưởng dệt', emoji: '🧵', level: 25, recipes: {
    cuonlen: { id: 'cuonlen', name: 'Cuộn len', emoji: '🧵', in: { len: 2 }, out: { cuonlen: 1 }, ms: 150 * MIN, exp: 150 },
    khanlen: { id: 'khanlen', name: 'Khăn len', emoji: '🧣', in: { cuonlen: 1 }, out: { khanlen: 1 }, ms: 90 * MIN, exp: 120 },
    aolen:   { id: 'aolen',   name: 'Áo len',   emoji: '🧥', in: { cuonlen: 2, len: 1 }, out: { aolen: 1 }, ms: 180 * MIN, exp: 300 },
  } },
};
// Tương thích ngược: cối xay là máy đầu tiên.
export const MILL = MACHINES.coixay;

// ---- Đất ------------------------------------------------------------------
export const START_PLOTS = 12;
// Mở rộng theo bảng mục 9.2 (MVP: 5 lần đầu, mỗi lần +4 ô → tối đa 32).
export const EXPANSIONS = [
  { level: 2,  gold: 500 },
  { level: 4,  gold: 1200 },
  { level: 6,  gold: 2500 },
  { level: 8,  gold: 5000 },
  { level: 10, gold: 9000 },
  { level: 12, gold: 15000 },
  { level: 14, gold: 24000 },
  { level: 16, gold: 36000 },
  { level: 18, gold: 52000 },
  { level: 20, gold: 72000 },
  { level: 22, gold: 96000 },
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
  if (level >= TREES.cam.level) pool.push('cam');
  if (level >= TREES.tao.level) pool.push('tao');
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
export const HARVEST_YIELD = 4; // mỗi ô thu 4 sản phẩm (+3 bù trộm); ô bị hái ké trừ 1
export const POACH_AGAIN_MS = 60 * MIN; // chủ chậm thu 1 giờ = thêm 1 lượt hái ké/ô
export const POACH_LOOT_COOLDOWN_MS = 60 * MIN; // mỗi nhà mỗi giờ chỉ mất tối đa 1 sản phẩm chuồng + 1 mẻ máy
export const PLANT_HELP_EXP = 1; // EXP mỗi ô trồng giúp

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

// ---- Kỹ năng chuyên môn hóa nông dân (mục 9.5) -----------------------------
// Mở ở cấp 10; mỗi cấp sau đó +1 điểm. Hoàn trả 20 kim cương, 1 lần/7 ngày.
export const SKILLS = {
  unlockLevel: 10,
  respecGems: 20,
  respecCooldownMs: 7 * 24 * 3600 * 1000,
  branches: [
    { id: 'trong', name: 'Trồng Trọt', emoji: '🌱', nodes: [
      { id: 'bantayxanh',   name: 'Bàn tay xanh',        cost: 1, desc: 'Giảm 5% thời gian cây trồng' },
      { id: 'datmaumo',     name: 'Đất màu mỡ',          cost: 2, desc: '5% cơ hội cây tự Tươi tốt khi gieo' },
      { id: 'hatgiongtk',   name: 'Hạt giống tiết kiệm', cost: 3, desc: '5% cơ hội hoàn tiền hạt khi thu' },
      { id: 'muaboithu',    name: 'Mùa bội thu',         cost: 4, desc: '+1 quả mỗi lần thu cây ăn quả' },
    ] },
    { id: 'nuoi', name: 'Chăn Nuôi', emoji: '🐄', nodes: [
      { id: 'nguoibannho',  name: 'Người bạn nhỏ',    cost: 1, desc: 'Giảm 5% thời gian tạo sản phẩm vật nuôi' },
      { id: 'mangantot',    name: 'Máng ăn tốt',      cost: 2, desc: '5% cơ hội không tốn thức ăn' },
      { id: 'chamsoc',      name: 'Chăm sóc tận tâm', cost: 3, desc: '+10% EXP từ sản phẩm vật nuôi' },
      { id: 'spcaocap',     name: 'Sản phẩm cao cấp', cost: 4, desc: '+8% giá bán sản phẩm vật nuôi' },
    ] },
    { id: 'che', name: 'Chế Biến & Bán Hàng', emoji: '🏭', nodes: [
      { id: 'lamnhanh',     name: 'Làm nhanh',      cost: 1, desc: 'Giảm 5% thời gian máy chế biến' },
      { id: 'donggoidep',   name: 'Đóng gói đẹp',   cost: 2, desc: '+5% giá bán sản phẩm chế biến' },
      { id: 'nguoibankheo', name: 'Người bán khéo', cost: 3, desc: 'Đơn hàng thưởng thêm 5% vàng' },
      { id: 'khachquen',    name: 'Khách quen',     cost: 4, desc: 'Mở thêm 1 ô đơn hàng' },
    ] },
  ],
};
export const SKILL_NODES = Object.fromEntries(SKILLS.branches.flatMap((b) => b.nodes.map((n) => [n.id, n])));
// Sản phẩm vật nuôi / chế biến (để áp kỹ năng giá bán).
export const ANIMAL_PRODUCTS = new Set(['trung', 'sua', 'len']);
export const MACHINE_PRODUCTS = new Set(
  Object.values(MACHINES).flatMap((m) => Object.values(m.recipes).flatMap((r) => Object.keys(r.out))).filter((id) => id !== FEED_ITEM),
);

// ---- Con vật may mắn: chạy ngang vườn ~mỗi tiếng, bấm trúng ăn kim cương ---
export const CRITTER = {
  kinds: ['🐇', '🐿️', '🦆', '🐈'],
  minGapMs: 35 * MIN,
  maxGapMs: 75 * MIN,
  windowMs: 10_000,
  graceMs: 3_000,
  gemMin: 1,
  gemMax: 3,
};
export function critterKindFor(at) {
  return CRITTER.kinds[Math.abs(at) % CRITTER.kinds.length];
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
export function yesterdayVN(now = Date.now()) {
  return todayVN(now - 24 * 60 * MIN);
}

// ---- Bảng vàng trộm: top 3 số món cuỗm/hái ké trong ngày (giờ VN) ----------
// gold là giá gốc, phát thưởng nhân GOLD_MULT như mọi nguồn thu khác.
export const THIEF_REWARDS = [
  { gems: 20, gold: 500 },
  { gems: 10, gold: 250 },
  { gems: 5,  gold: 100 },
];
