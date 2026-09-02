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
  // Đợt mở rộng: lấp các cấp trống
  dualeo:     { id: 'dualeo',     name: 'Dưa leo',    emoji: '🥒', level: 6,  growMs: 12 * MIN,  seed: 12,  sell: 30,  expSow: 2, expHarvest: 11 },
  ot:         { id: 'ot',         name: 'Ớt',         emoji: '🌶️', level: 9,  growMs: 40 * MIN,  seed: 22,  sell: 60,  expSow: 3, expHarvest: 28 },
  dauxanh:    { id: 'dauxanh',    name: 'Đậu xanh',   emoji: '🫛', level: 11, growMs: 50 * MIN,  seed: 26,  sell: 72,  expSow: 4, expHarvest: 36 },
  huongduong: { id: 'huongduong', name: 'Hướng dương', emoji: '🌻', level: 15, growMs: 120 * MIN, seed: 42,  sell: 120, expSow: 5, expHarvest: 70 },
  bongcai:    { id: 'bongcai',    name: 'Bông cải',   emoji: '🥦', level: 17, growMs: 100 * MIN, seed: 36,  sell: 100, expSow: 4, expHarvest: 55 },
  tra:        { id: 'tra',        name: 'Trà',        emoji: '🍵', level: 19, growMs: 150 * MIN, seed: 50,  sell: 150, expSow: 5, expHarvest: 85 },
  hoahong:    { id: 'hoahong',    name: 'Hoa hồng',   emoji: '🌹', level: 25, growMs: 200 * MIN, seed: 80,  sell: 240, expSow: 8, expHarvest: 140 },
  nam:        { id: 'nam',        name: 'Nấm',        emoji: '🍄', level: 27, growMs: 90 * MIN,  seed: 60,  sell: 170, expSow: 7, expHarvest: 95 },
  khoailang:  { id: 'khoailang',  name: 'Khoai lang', emoji: '🍠', level: 8,  growMs: 30 * MIN,  seed: 16,  sell: 45,  expSow: 2, expHarvest: 18 },
  gung:       { id: 'gung',       name: 'Gừng',       emoji: '🫚', level: 13, growMs: 70 * MIN,  seed: 34,  sell: 95,  expSow: 4, expHarvest: 50 },
  thom:       { id: 'thom',       name: 'Dứa',        emoji: '🍍', level: 20, growMs: 160 * MIN, seed: 58,  sell: 175, expSow: 6, expHarvest: 100 },
  bongvai:    { id: 'bongvai',    name: 'Bông vải',   emoji: '🌼', level: 21, growMs: 140 * MIN, seed: 55,  sell: 160, expSow: 6, expHarvest: 95 },
  oliu:       { id: 'oliu',       name: 'Ô liu',      emoji: '🫒', level: 26, growMs: 220 * MIN, seed: 90,  sell: 260, expSow: 9, expHarvest: 150 },
  vani:       { id: 'vani',       name: 'Vani',       emoji: '🌿', level: 29, growMs: 360 * MIN, seed: 170, sell: 520, expSow: 14, expHarvest: 320 },
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
  // Vật nuôi mới
  trungvit:   { id: 'trungvit',   name: 'Trứng vịt',       emoji: '🥚', sell: 70,   source: 'vit' },
  matong:     { id: 'matong',     name: 'Mật ong',         emoji: '🍯', sell: 180,  source: 'ong' },
  suade:      { id: 'suade',      name: 'Sữa dê',          emoji: '🍼', sell: 300,  source: 'de' },
  thit:       { id: 'thit',       name: 'Thịt heo',        emoji: '🥩', sell: 480,  source: 'heo' },
  // Lò nướng cá
  canuong:    { id: 'canuong',    name: 'Cá nướng',        emoji: '🍢', sell: 130,  source: 'lonuong' },
  chaca:      { id: 'chaca',      name: 'Chả cá',          emoji: '🍥', sell: 380,  source: 'lonuong' },
  cakho:      { id: 'cakho',      name: 'Cá kho tiêu',     emoji: '🥘', sell: 500,  source: 'lonuong' },
  sushi:      { id: 'sushi',      name: 'Sushi',           emoji: '🍣', sell: 650,  source: 'lonuong' },
  lauca:      { id: 'lauca',      name: 'Lẩu cá koi',      emoji: '🍲', sell: 1200, source: 'lonuong' },
  // Món mới từ nguyên liệu mới
  nuocchanh:  { id: 'nuocchanh',  name: 'Nước chanh',      emoji: '🍋', sell: 520,  source: 'mayep' },
  phomaide:   { id: 'phomaide',   name: 'Phô mai dê',      emoji: '🧀', sell: 950,  source: 'nhamaysua' },
  banhmatong: { id: 'banhmatong', name: 'Bánh mật ong',    emoji: '🥞', sell: 520,  source: 'lobanh' },
  xucxich:    { id: 'xucxich',    name: 'Xúc xích',        emoji: '🌭', sell: 850,  source: 'bepan' },
  trasua:     { id: 'trasua',     name: 'Trà sữa',         emoji: '🧋', sell: 900,  source: 'bepan' },
  // Vật nuôi đợt 2
  trungcut:   { id: 'trungcut',   name: 'Trứng cút',       emoji: '🥚', sell: 30,   source: 'cut' },
  trungngong: { id: 'trungngong', name: 'Trứng ngỗng',     emoji: '🥚', sell: 120,  source: 'ngong' },
  longtho:    { id: 'longtho',    name: 'Lông thỏ',        emoji: '🧶', sell: 130,  source: 'tho' },
  trunggatay: { id: 'trunggatay', name: 'Trứng gà tây',    emoji: '🥚', sell: 220,  source: 'gatay' },
  totam:      { id: 'totam',      name: 'Tơ tằm',          emoji: '🧵', sell: 350,  source: 'tam' },
  suatrau:    { id: 'suatrau',    name: 'Sữa trâu',        emoji: '🥛', sell: 560,  source: 'trau' },
  longalpaca: { id: 'longalpaca', name: 'Lông alpaca',     emoji: '🧶', sell: 700,  source: 'alpaca' },
  nhunghuou:  { id: 'nhunghuou',  name: 'Nhung hươu',      emoji: '🦌', sell: 900,  source: 'huou' },
  // Tinh chế (bậc 2) từ nguyên liệu mới
  khoailangnuong: { id: 'khoailangnuong', name: 'Khoai lang nướng', emoji: '🍠', sell: 150,  source: 'bepan' },
  trungmuoi:  { id: 'trungmuoi',  name: 'Trứng muối',      emoji: '🥚', sell: 300,  source: 'bepan' },
  mutgung:    { id: 'mutgung',    name: 'Mứt gừng',        emoji: '🫙', sell: 380,  source: 'noimut' },
  nuocthom:   { id: 'nuocthom',   name: 'Nước dứa',        emoji: '🍍', sell: 560,  source: 'mayep' },
  dauoliu:    { id: 'dauoliu',    name: 'Dầu ô liu',       emoji: '🫒', sell: 800,  source: 'mayep' },
  kemvani:    { id: 'kemvani',    name: 'Kem vani',        emoji: '🍦', sell: 1400, source: 'nhamaysua' },
  phomaitrau: { id: 'phomaitrau', name: 'Phô mai trâu',    emoji: '🧀', sell: 1700, source: 'nhamaysua' },
  vai:        { id: 'vai',        name: 'Vải bông',        emoji: '🧵', sell: 720,  source: 'xuongdet' },
  mulen:      { id: 'mulen',      name: 'Mũ len thỏ',      emoji: '🧢', sell: 620,  source: 'xuongdet' },
  lua:        { id: 'lua',        name: 'Lụa',             emoji: '🎀', sell: 1600, source: 'xuongdet' },
  khanalpaca: { id: 'khanalpaca', name: 'Khăn alpaca',     emoji: '🧣', sell: 3000, source: 'xuongdet' },
  // Cao cấp (bậc 3) — Xưởng cao cấp
  ruouvang:   { id: 'ruouvang',   name: 'Rượu nho ủ',      emoji: '🍷', sell: 2800, source: 'xuongcaocap' },
  caonhung:   { id: 'caonhung',   name: 'Cao nhung hươu',  emoji: '🧴', sell: 3500, source: 'xuongcaocap' },
  nuochoa:    { id: 'nuochoa',    name: 'Nước hoa hoa hồng', emoji: '🌸', sell: 3600, source: 'xuongcaocap' },
  hopphomai:  { id: 'hopphomai',  name: 'Hộp phô mai thượng hạng', emoji: '🧀', sell: 4700, source: 'xuongcaocap' },
  aodai:      { id: 'aodai',      name: 'Áo dài lụa',      emoji: '👘', sell: 5800, source: 'xuongcaocap' },
  buatiec:    { id: 'buatiec',    name: 'Tiệc gia đình',   emoji: '🍽️', sell: 6600, source: 'xuongcaocap' },
  hopqua:     { id: 'hopqua',     name: 'Hộp quà nông trại', emoji: '🎁', sell: 7500, source: 'xuongcaocap' },
  caphehaohang: { id: 'caphehaohang', name: 'Cà phê hảo hạng', emoji: '☕', sell: 8000, source: 'xuongcaocap' },
  // Đợt bổ sung
  botbap:     { id: 'botbap',     name: 'Bột bắp',         emoji: '🌽', sell: 90,   source: 'coixay' },
  botgao:     { id: 'botgao',     name: 'Bột gạo',         emoji: '🍚', sell: 300,  source: 'coixay' },
  duongmia:   { id: 'duongmia',   name: 'Đường mía',       emoji: '🍬', sell: 380,  source: 'coixay' },
  tratui:     { id: 'tratui',     name: 'Trà túi lọc',     emoji: '🍵', sell: 650,  source: 'mayrang' },
  botcacao:   { id: 'botcacao',   name: 'Bột ca cao',      emoji: '🍫', sell: 1550, source: 'mayrang' },
  goicuon:    { id: 'goicuon',    name: 'Gỏi cuốn cá',     emoji: '🥗', sell: 280,  source: 'lonuong' },
  banhgung:   { id: 'banhgung',   name: 'Bánh gừng',       emoji: '🍪', sell: 750,  source: 'lobanh' },
  banhdua:    { id: 'banhdua',    name: 'Bánh dứa',        emoji: '🍍', sell: 1900, source: 'lobanh' },
  banhxeo:    { id: 'banhxeo',    name: 'Bánh xèo',        emoji: '🥞', sell: 1250, source: 'bepan' },
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
  chanh:     { id: 'chanh',     name: 'Chanh',      emoji: '🍋', level: 20, price: 900,  growMs: 300 * MIN, yield: 4, sell: 90,  exp: 200 },
  dua:       { id: 'dua',       name: 'Dừa',        emoji: '🥥', level: 24, price: 1200, growMs: 420 * MIN, yield: 3, sell: 210, exp: 280 },
  saurieng:  { id: 'saurieng',  name: 'Sầu riêng',  emoji: '🍈', level: 30, price: 2000, growMs: 600 * MIN, yield: 2, sell: 650, exp: 420 },
  quabo:     { id: 'quabo',     name: 'Bơ trái',    emoji: '🥑', level: 22, price: 1000, growMs: 300 * MIN, yield: 3, sell: 160, exp: 240 },
  dao:       { id: 'dao',       name: 'Đào',        emoji: '🍑', level: 26, price: 1500, growMs: 360 * MIN, yield: 3, sell: 260, exp: 320 },
  anhdao:    { id: 'anhdao',    name: 'Anh đào',    emoji: '🍒', level: 32, price: 2400, growMs: 420 * MIN, yield: 4, sell: 380, exp: 460 },
};

export function itemInfo(id) {
  return CROPS[id] || GOODS[id] || TREES[id] || null;
}

// ---- Vật nuôi (mục 7.1) — gà/bò/cừu, chuồng riêng từng loại (mục 9.4) ------
// capacities: sức chứa chuồng cấp 1..5. Tất cả ăn chung 'thucan'.
export const ANIMALS = {
  ga:  { id: 'ga',  name: 'Gà',  emoji: '🐔', level: 3,  price: 250,  produceMs: 15 * MIN, feedQty: 1, product: 'trung', expCollect: 8,  capacities: [3, 4, 6, 8, 10, 12, 14, 16, 18, 20] },
  bo:  { id: 'bo',  name: 'Bò',  emoji: '🐄', level: 8,  price: 850,  produceMs: 30 * MIN, feedQty: 2, product: 'sua',   expCollect: 16, capacities: [2, 3, 4, 6, 8, 10, 12, 14, 16, 18] },
  cuu: { id: 'cuu', name: 'Cừu', emoji: '🐑', level: 14, price: 1400, produceMs: 40 * MIN, feedQty: 3, product: 'len',   expCollect: 22, capacities: [2, 3, 4, 6, 8, 10, 12, 14, 16, 18] },
  vit: { id: 'vit', name: 'Vịt', emoji: '🦆', level: 6,  price: 500,  produceMs: 25 * MIN, feedQty: 1, product: 'trungvit', expCollect: 12, capacities: [3, 4, 6, 8, 10, 12, 14, 16, 18, 20] },
  ong: { id: 'ong', name: 'Ong', emoji: '🐝', level: 12, price: 1100, produceMs: 40 * MIN, feedQty: 1, product: 'matong',   expCollect: 20, capacities: [2, 3, 4, 6, 8, 10, 12, 14, 16, 18] },
  de:  { id: 'de',  name: 'Dê',  emoji: '🐐', level: 17, price: 1800, produceMs: 50 * MIN, feedQty: 2, product: 'suade',    expCollect: 26, capacities: [2, 3, 4, 6, 8, 10, 12, 14, 16, 18] },
  heo: { id: 'heo', name: 'Lợn', emoji: '🐷', level: 20, price: 2500, produceMs: 70 * MIN, feedQty: 3, product: 'thit',     expCollect: 34, capacities: [2, 3, 4, 6, 8, 10, 12, 14, 16, 18] },
  cut:    { id: 'cut',    name: 'Chim cút', emoji: '🐦', level: 4,  price: 350,  produceMs: 15 * MIN,  feedQty: 1, product: 'trungcut',   expCollect: 8,  capacities: [3, 4, 6, 8, 10, 12, 14, 16, 18, 20] },
  ngong:  { id: 'ngong',  name: 'Ngỗng',    emoji: '🪿', level: 9,  price: 700,  produceMs: 35 * MIN,  feedQty: 2, product: 'trungngong', expCollect: 16, capacities: [2, 3, 4, 6, 8, 10, 12, 14, 16, 18] },
  tho:    { id: 'tho',    name: 'Thỏ',      emoji: '🐇', level: 10, price: 800,  produceMs: 30 * MIN,  feedQty: 1, product: 'longtho',    expCollect: 15, capacities: [3, 4, 6, 8, 10, 12, 14, 16, 18, 20] },
  gatay:  { id: 'gatay',  name: 'Gà tây',   emoji: '🦃', level: 15, price: 1500, produceMs: 55 * MIN,  feedQty: 2, product: 'trunggatay', expCollect: 24, capacities: [2, 3, 4, 6, 8, 10, 12, 14, 16, 18] },
  tam:    { id: 'tam',    name: 'Tằm',      emoji: '🐛', level: 18, price: 2000, produceMs: 60 * MIN,  feedQty: 1, product: 'totam',      expCollect: 30, capacities: [3, 4, 6, 8, 10, 12, 14, 16, 18, 20] },
  trau:   { id: 'trau',   name: 'Trâu',     emoji: '🐃', level: 22, price: 3000, produceMs: 80 * MIN,  feedQty: 3, product: 'suatrau',    expCollect: 40, capacities: [2, 3, 4, 6, 8, 10, 12, 14, 16, 18] },
  alpaca: { id: 'alpaca', name: 'Alpaca',   emoji: '🦙', level: 25, price: 3800, produceMs: 90 * MIN,  feedQty: 3, product: 'longalpaca', expCollect: 46, capacities: [2, 3, 4, 6, 8, 10, 12, 14, 16, 18] },
  huou:   { id: 'huou',   name: 'Hươu',     emoji: '🦌', level: 28, price: 5000, produceMs: 120 * MIN, feedQty: 3, product: 'nhunghuou',  expCollect: 60, capacities: [2, 3, 4, 6, 8, 10, 12, 14, 16, 18] },
};
export const FEED_ITEM = 'thucan';
export const BARN_UPGRADE_GOLD = [1000, 3000, 8000, 20000, 40000, 70000, 110000, 160000, 220000]; // lên cấp 2..10, mọi chuồng
// Tương thích ngược cho các chỗ cũ còn tham chiếu gà.
export const CHICKEN = { ...ANIMALS.ga, capacity: ANIMALS.ga.capacities[0], feedItem: FEED_ITEM };

// ---- Cối xay (mục 8 — MVP) -------------------------------------------------
export const MACHINES = {
  bepan: { id: 'bepan', name: 'Bếp gia đình', emoji: '🍳', level: 9, recipes: {
    khoaichien: { id: 'khoaichien', name: 'Khoai tây chiên', emoji: '🍟', in: { khoaitay: 3 }, out: { khoaichien: 1 }, ms: 15 * MIN, exp: 15 },
    salad:      { id: 'salad',      name: 'Salad rau',       emoji: '🥗', in: { bapcai: 1, cachua: 1, carot: 2 }, out: { salad: 1 }, ms: 20 * MIN, exp: 20 },
    comchien:   { id: 'comchien',   name: 'Cơm chiên trứng', emoji: '🍳', in: { gao: 1, trung: 1, ngo: 1 }, out: { comchien: 1 }, ms: 30 * MIN, exp: 35 },
    supbi:      { id: 'supbi',      name: 'Súp bí đỏ',       emoji: '🥣', in: { bingo: 1, sua: 1, hanhtay: 1 }, out: { supbi: 1 }, ms: 45 * MIN, exp: 65 },
    xucxich:    { id: 'xucxich',    name: 'Xúc xích',        emoji: '🌭', in: { thit: 1, botmi: 1 }, out: { xucxich: 1 }, ms: 60 * MIN, exp: 110 },
    trasua:     { id: 'trasua',     name: 'Trà sữa',         emoji: '🧋', in: { tra: 2, sua: 1, mia: 1 }, out: { trasua: 1 }, ms: 40 * MIN, exp: 120 },
    khoailangnuong: { id: 'khoailangnuong', name: 'Khoai lang nướng', emoji: '🍠', in: { khoailang: 2 }, out: { khoailangnuong: 1 }, ms: 20 * MIN, exp: 22 },
    trungmuoi:  { id: 'trungmuoi',  name: 'Trứng muối',      emoji: '🥚', in: { trungngong: 1, trungcut: 2 }, out: { trungmuoi: 1 }, ms: 40 * MIN, exp: 40 },
    banhxeo:    { id: 'banhxeo',    name: 'Bánh xèo',        emoji: '🥞', in: { botgao: 1, trung: 1, thit: 1 }, out: { banhxeo: 1 }, ms: 50 * MIN, exp: 130 },
  } },
  lonuong: { id: 'lonuong', name: 'Lò nướng cá', emoji: '🔥', level: 8, recipes: {
    canuong: { id: 'canuong', name: 'Cá nướng',    emoji: '🍢', in: { canho: 2 }, out: { canuong: 1 }, ms: 20 * MIN, exp: 20 },
    chaca:   { id: 'chaca',   name: 'Chả cá',      emoji: '🍥', in: { caro: 2, trung: 1 }, out: { chaca: 1 }, ms: 40 * MIN, exp: 45 },
    cakho:   { id: 'cakho',   name: 'Cá kho tiêu', emoji: '🥘', in: { caro: 1, mia: 1, hanhtay: 1 }, out: { cakho: 1 }, ms: 45 * MIN, exp: 55 },
    sushi:   { id: 'sushi',   name: 'Sushi',       emoji: '🍣', in: { cachep: 1, gao: 2 }, out: { sushi: 1 }, ms: 60 * MIN, exp: 80 },
    lauca:   { id: 'lauca',   name: 'Lẩu cá koi',  emoji: '🍲', in: { cakoi: 1, cachua: 2, nam: 1 }, out: { lauca: 1 }, ms: 90 * MIN, exp: 160 },
    goicuon: { id: 'goicuon', name: 'Gỏi cuốn cá', emoji: '🥗', in: { canho: 1, bapcai: 1, gao: 1 }, out: { goicuon: 1 }, ms: 25 * MIN, exp: 30 },
  } },
  xuongcaocap: { id: 'xuongcaocap', name: 'Xưởng cao cấp', emoji: '🏭', level: 26, recipes: {
    ruouvang:     { id: 'ruouvang',     name: 'Rượu nho ủ',         emoji: '🍷', in: { nho: 4, mia: 2 }, out: { ruouvang: 1 }, ms: 180 * MIN, exp: 400 },
    caonhung:     { id: 'caonhung',     name: 'Cao nhung hươu',     emoji: '🧴', in: { nhunghuou: 2, matong: 2 }, out: { caonhung: 1 }, ms: 100 * MIN, exp: 320 },
    nuochoa:      { id: 'nuochoa',      name: 'Nước hoa hoa hồng',  emoji: '🌸', in: { hoahong: 4, vani: 1, dauoliu: 1 }, out: { nuochoa: 1 }, ms: 90 * MIN, exp: 300 },
    hopphomai:    { id: 'hopphomai',    name: 'Hộp phô mai thượng hạng', emoji: '🧀', in: { phomai: 1, phomaide: 1, phomaitrau: 1 }, out: { hopphomai: 1 }, ms: 120 * MIN, exp: 380 },
    aodai:        { id: 'aodai',        name: 'Áo dài lụa',         emoji: '👘', in: { lua: 2, vai: 1 }, out: { aodai: 1 }, ms: 150 * MIN, exp: 480 },
    buatiec:      { id: 'buatiec',      name: 'Tiệc gia đình',      emoji: '🍽️', in: { pizza: 1, lauca: 1, kem: 1 }, out: { buatiec: 1 }, ms: 120 * MIN, exp: 450 },
    hopqua:       { id: 'hopqua',       name: 'Hộp quà nông trại',  emoji: '🎁', in: { banhkem: 1, socola: 1, trasua: 1 }, out: { hopqua: 1 }, ms: 120 * MIN, exp: 500 },
    caphehaohang: { id: 'caphehaohang', name: 'Cà phê hảo hạng',    emoji: '☕', in: { capherang: 2, caphesua: 1 }, out: { caphehaohang: 1 }, ms: 150 * MIN, exp: 600 },
  } },
  coixay: { id: 'coixay', name: 'Cối xay bột', emoji: '⚙️', level: 10, recipes: {
    botmi:  { id: 'botmi',  name: 'Bột mì', emoji: '🥡', in: { luami: 2 }, out: { botmi: 1 },  ms: 10 * MIN, exp: 10 },
    thucan: { id: 'thucan', name: 'Thức ăn gia súc', emoji: '🌰', in: { ngo: 2 }, out: { thucan: 3 }, ms: 8 * MIN, exp: 8 },
    botbap:   { id: 'botbap',   name: 'Bột bắp',   emoji: '🌽', in: { ngo: 3 }, out: { botbap: 1 }, ms: 12 * MIN, exp: 12 },
    botgao:   { id: 'botgao',   name: 'Bột gạo',   emoji: '🍚', in: { gao: 2 }, out: { botgao: 1 }, ms: 25 * MIN, exp: 30 },
    duongmia: { id: 'duongmia', name: 'Đường mía', emoji: '🍬', in: { mia: 2 }, out: { duongmia: 1 }, ms: 30 * MIN, exp: 35 },
  } },
  mayep: { id: 'mayep', name: 'Máy ép nước', emoji: '🧃', level: 12, recipes: {
    nuoccarot:  { id: 'nuoccarot',  name: 'Nước ép cà rốt',  emoji: '🥤', in: { carot: 2 },  out: { nuoccarot: 1 },  ms: 20 * MIN, exp: 18 },
    nuocduahau: { id: 'nuocduahau', name: 'Nước ép dưa hấu', emoji: '🍹', in: { duahau: 2 }, out: { nuocduahau: 1 }, ms: 70 * MIN, exp: 105 },
    nuoccam:    { id: 'nuoccam',    name: 'Nước cam',        emoji: '🍊', in: { cam: 3 }, out: { nuoccam: 1 }, ms: 25 * MIN, exp: 30 },
    sinhtoxoai: { id: 'sinhtoxoai', name: 'Sinh tố xoài',    emoji: '🥭', in: { xoai: 2, sua: 1 }, out: { sinhtoxoai: 1 }, ms: 40 * MIN, exp: 55 },
    nuocchanh:  { id: 'nuocchanh',  name: 'Nước chanh',      emoji: '🍋', in: { chanh: 2, mia: 1 }, out: { nuocchanh: 1 }, ms: 30 * MIN, exp: 60 },
    nuocthom:   { id: 'nuocthom',   name: 'Nước dứa',        emoji: '🍍', in: { thom: 2 }, out: { nuocthom: 1 }, ms: 35 * MIN, exp: 70 },
    dauoliu:    { id: 'dauoliu',    name: 'Dầu ô liu',       emoji: '🫒', in: { oliu: 2 }, out: { dauoliu: 1 }, ms: 60 * MIN, exp: 110 },
  } },
  noimut: { id: 'noimut', name: 'Nồi mứt', emoji: '🍯', level: 13, recipes: {
    mutdau:    { id: 'mutdau',    name: 'Mứt dâu',     emoji: '🫙', in: { dautay: 2 }, out: { mutdau: 1 },    ms: 35 * MIN, exp: 32 },
    sotcachua: { id: 'sotcachua', name: 'Sốt cà chua', emoji: '🥫', in: { cachua: 2 }, out: { sotcachua: 1 }, ms: 30 * MIN, exp: 28 },
    mutcam:    { id: 'mutcam',    name: 'Mứt cam',     emoji: '🍯', in: { cam: 2, mia: 1 }, out: { mutcam: 1 }, ms: 40 * MIN, exp: 40 },
    siro:      { id: 'siro',      name: 'Siro thanh long', emoji: '🧴', in: { thanhlong: 2, mia: 1 }, out: { siro: 1 }, ms: 60 * MIN, exp: 70 },
    mutgung:   { id: 'mutgung',   name: 'Mứt gừng',    emoji: '🫙', in: { gung: 1, mia: 1 }, out: { mutgung: 1 }, ms: 45 * MIN, exp: 50 },
  } },
  nhamaysua: { id: 'nhamaysua', name: 'Nhà máy sữa', emoji: '🧀', level: 15, recipes: {
    phomai:  { id: 'phomai',  name: 'Phô mai',      emoji: '🧀', in: { sua: 2 }, out: { phomai: 1 }, ms: 50 * MIN, exp: 52 },
    bo:      { id: 'bo',      name: 'Bơ',           emoji: '🧈', in: { sua: 3 }, out: { bo: 1 }, ms: 60 * MIN, exp: 65 },
    suachua: { id: 'suachua', name: 'Sữa chua dâu', emoji: '🍶', in: { sua: 2, mutdau: 1 }, out: { suachua: 1 }, ms: 55 * MIN, exp: 80 },
    kem:     { id: 'kem',     name: 'Kem dưa hấu',  emoji: '🍨', in: { sua: 2, nuocduahau: 1 }, out: { kem: 1 }, ms: 80 * MIN, exp: 150 },
    phomaide: { id: 'phomaide', name: 'Phô mai dê', emoji: '🧀', in: { suade: 2 }, out: { phomaide: 1 }, ms: 60 * MIN, exp: 110 },
    kemvani:  { id: 'kemvani',  name: 'Kem vani',   emoji: '🍦', in: { sua: 2, vani: 1 }, out: { kemvani: 1 }, ms: 70 * MIN, exp: 170 },
    phomaitrau: { id: 'phomaitrau', name: 'Phô mai trâu', emoji: '🧀', in: { suatrau: 2 }, out: { phomaitrau: 1 }, ms: 80 * MIN, exp: 200 },
  } },
  lobanh: { id: 'lobanh', name: 'Lò bánh', emoji: '🥖', level: 17, recipes: {
    banhmi: { id: 'banhmi', name: 'Bánh mì trứng', emoji: '🥖', in: { botmi: 1, trung: 1 }, out: { banhmi: 1 }, ms: 45 * MIN, exp: 45 },
    banhbi: { id: 'banhbi', name: 'Bánh bí ngô',   emoji: '🥧', in: { bingo: 1, botmi: 1 }, out: { banhbi: 1 }, ms: 90 * MIN, exp: 88 },
    banhcarot: { id: 'banhcarot', name: 'Bánh cà rốt',  emoji: '🧁', in: { carot: 4, botmi: 1, trung: 1 }, out: { banhcarot: 1 }, ms: 40 * MIN, exp: 30 },
    banhtao:   { id: 'banhtao',   name: 'Bánh táo',     emoji: '🥮', in: { tao: 3, botmi: 1, trung: 1 }, out: { banhtao: 1 }, ms: 60 * MIN, exp: 60 },
    pizza:     { id: 'pizza',     name: 'Pizza',        emoji: '🍕', in: { botmi: 2, sotcachua: 1, phomai: 1 }, out: { pizza: 1 }, ms: 70 * MIN, exp: 110 },
    banhkem:   { id: 'banhkem',   name: 'Bánh kem dâu', emoji: '🍰', in: { botmi: 1, trung: 2, bo: 1, mutdau: 1 }, out: { banhkem: 1 }, ms: 90 * MIN, exp: 160 },
    banhmatong: { id: 'banhmatong', name: 'Bánh mật ong', emoji: '🥞', in: { botmi: 1, matong: 1, trungvit: 1 }, out: { banhmatong: 1 }, ms: 50 * MIN, exp: 70 },
    banhgung:  { id: 'banhgung',  name: 'Bánh gừng',    emoji: '🍪', in: { botmi: 1, mutgung: 1, trung: 1 }, out: { banhgung: 1 }, ms: 60 * MIN, exp: 90 },
    banhdua:   { id: 'banhdua',   name: 'Bánh dứa',     emoji: '🍍', in: { botmi: 1, nuocthom: 1, bo: 1 }, out: { banhdua: 1 }, ms: 80 * MIN, exp: 200 },
  } },
  mayrang: { id: 'mayrang', name: 'Máy rang cà phê', emoji: '🫘', level: 23, recipes: {
    capherang: { id: 'capherang', name: 'Cà phê rang', emoji: '🫘', in: { caphe: 2 }, out: { capherang: 1 }, ms: 120 * MIN, exp: 180 },
    caphesua:  { id: 'caphesua',  name: 'Cà phê sữa',  emoji: '☕', in: { capherang: 1, sua: 1 }, out: { caphesua: 1 }, ms: 60 * MIN, exp: 200 },
    socola:    { id: 'socola',    name: 'Sô-cô-la',    emoji: '🍫', in: { cacao: 2, sua: 1, mia: 1 }, out: { socola: 1 }, ms: 100 * MIN, exp: 220 },
    tratui:    { id: 'tratui',    name: 'Trà túi lọc', emoji: '🍵', in: { tra: 3 }, out: { tratui: 1 }, ms: 60 * MIN, exp: 90 },
    botcacao:  { id: 'botcacao',  name: 'Bột ca cao',  emoji: '🍫', in: { cacao: 2 }, out: { botcacao: 1 }, ms: 90 * MIN, exp: 190 },
  } },
  xuongdet: { id: 'xuongdet', name: 'Xưởng dệt', emoji: '🧵', level: 25, recipes: {
    cuonlen: { id: 'cuonlen', name: 'Cuộn len', emoji: '🧵', in: { len: 2 }, out: { cuonlen: 1 }, ms: 150 * MIN, exp: 150 },
    khanlen: { id: 'khanlen', name: 'Khăn len', emoji: '🧣', in: { cuonlen: 1 }, out: { khanlen: 1 }, ms: 90 * MIN, exp: 120 },
    aolen:   { id: 'aolen',   name: 'Áo len',   emoji: '🧥', in: { cuonlen: 2, len: 1 }, out: { aolen: 1 }, ms: 180 * MIN, exp: 300 },
    vai:     { id: 'vai',     name: 'Vải bông', emoji: '🧵', in: { bongvai: 3 }, out: { vai: 1 }, ms: 60 * MIN, exp: 90 },
    mulen:   { id: 'mulen',   name: 'Mũ len thỏ', emoji: '🧢', in: { longtho: 3 }, out: { mulen: 1 }, ms: 60 * MIN, exp: 80 },
    lua:     { id: 'lua',     name: 'Lụa',      emoji: '🎀', in: { totam: 3 }, out: { lua: 1 }, ms: 120 * MIN, exp: 200 },
    khanalpaca: { id: 'khanalpaca', name: 'Khăn alpaca', emoji: '🧣', in: { longalpaca: 2, cuonlen: 1 }, out: { khanalpaca: 1 }, ms: 120 * MIN, exp: 250 },
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
  { level: 24, gold: 125000 },
  { level: 26, gold: 160000 },
  { level: 28, gold: 200000 },
  { level: 30, gold: 250000 },
  { level: 32, gold: 310000 },
  { level: 34, gold: 380000 },
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
export const ORDER_BOARD_REFRESH_MS = 120 * MIN; // cả bảng đơn thay mới mỗi 2 giờ
export const MACHINE_QUEUE_MAX = 50; // mẻ tối đa xếp trong một máy
// Thu mua từ bạn bè: giá trả = 130% giá bán cho hệ thống, tối đa 5 tin mở/người.
export const WANT_MARKUP = 1.3;
export const WANT_MAX_QTY = 999;
export const WANT_MAX_OPEN = 5;

// Sinh một đơn từ các sản phẩm đã mở khóa. rng: () => [0,1).
export function generateOrder(level, rng) {
  const pool = Object.values(CROPS).filter((c) => c.level <= level).map((c) => c.id);
  for (const a of Object.values(ANIMALS)) if (level >= a.level) pool.push(a.product);
  for (const t of Object.values(TREES)) if (level >= t.level) pool.push(t.id);
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
// Tưới giúp nhà bạn: mỗi ô, mỗi người giúp được 15 phút một lần, mỗi lần cây chín sớm 10 phút.
export const WATER_HELP_COOLDOWN_MS = 15 * MIN;
export const WATER_HELP_BOOST_MS = 10 * MIN;
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
export const COOP_LEVELS = [3, 4, 6, 8, 10, 12, 14, 16, 18, 20];
export const COOP_UPGRADE_GOLD = [1000, 3000, 8000, 20000, 40000, 70000, 110000, 160000, 220000];

// Nâng cấp ao cá: số cá mỗi lượt quăng theo cấp, giá lên cấp 2..5.
export const POND_LEVELS = [1, 1, 2, 2, 3, 3, 4, 4, 5, 6];
export const POND_UPGRADE_GOLD = [1500, 4000, 10000, 25000, 45000, 70000, 100000, 140000, 190000];

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
export const SKILL_MAX_RANK = 10;
// Chi phí nâng lên bậc r = cost × r (bậc 1..5), hiệu ứng cộng dồn theo bậc.
export const skillCost = (node, rank) => node.cost * rank;
export const SKILLS = {
  unlockLevel: 10,
  maxRank: SKILL_MAX_RANK,
  respecGems: 20,
  respecCooldownMs: 7 * 24 * 3600 * 1000,
  branches: [
    { id: 'trong', name: 'Trồng Trọt', emoji: '🌱', nodes: [
      { id: 'bantayxanh',   name: 'Bàn tay xanh',        cost: 1, desc: 'Mỗi bậc giảm 5% thời gian cây trồng (tối đa 50%)' },
      { id: 'datmaumo',     name: 'Đất màu mỡ',          cost: 2, desc: 'Mỗi bậc +5% cơ hội cây tự Tươi tốt khi gieo' },
      { id: 'hatgiongtk',   name: 'Hạt giống tiết kiệm', cost: 3, desc: 'Mỗi bậc +5% cơ hội hoàn tiền hạt khi thu' },
      { id: 'muaboithu',    name: 'Mùa bội thu',         cost: 4, desc: '+1 quả mỗi lần thu cây ăn quả ở bậc lẻ (1, 3, 5, 7, 9)' },
    ] },
    { id: 'nuoi', name: 'Chăn Nuôi', emoji: '🐄', nodes: [
      { id: 'nguoibannho',  name: 'Người bạn nhỏ',    cost: 1, desc: 'Mỗi bậc giảm 5% thời gian vật nuôi (tối đa 50%)' },
      { id: 'mangantot',    name: 'Máng ăn tốt',      cost: 2, desc: 'Mỗi bậc +5% cơ hội không tốn thức ăn' },
      { id: 'chamsoc',      name: 'Chăm sóc tận tâm', cost: 3, desc: 'Mỗi bậc +10% EXP từ sản phẩm vật nuôi' },
      { id: 'spcaocap',     name: 'Sản phẩm cao cấp', cost: 4, desc: 'Mỗi bậc +8% giá bán sản phẩm vật nuôi' },
    ] },
    { id: 'che', name: 'Chế Biến & Bán Hàng', emoji: '🏭', nodes: [
      { id: 'lamnhanh',     name: 'Làm nhanh',      cost: 1, desc: 'Mỗi bậc giảm 5% thời gian máy chế biến (tối đa 50%)' },
      { id: 'donggoidep',   name: 'Đóng gói đẹp',   cost: 2, desc: 'Mỗi bậc +5% giá bán sản phẩm chế biến' },
      { id: 'nguoibankheo', name: 'Người bán khéo', cost: 3, desc: 'Mỗi bậc đơn hàng thưởng thêm 5% vàng' },
      { id: 'khachquen',    name: 'Khách quen',     cost: 4, desc: 'Mở thêm 1 ô đơn hàng ở bậc lẻ (1, 3, 5, 7, 9)' },
    ] },
  ],
};
export const SKILL_NODES = Object.fromEntries(SKILLS.branches.flatMap((b) => b.nodes.map((n) => [n.id, n])));
// Sản phẩm vật nuôi / chế biến (để áp kỹ năng giá bán).
export const ANIMAL_PRODUCTS = new Set(Object.values(ANIMALS).map((a) => a.product));
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
// Ngày tính bảng trộm: chốt sổ 9h sáng giờ Los Angeles. Khóa có tiền tố 'la-'
// để không đụng các bản ghi thief_awards cũ chốt theo ngày Việt Nam.
export const THIEF_SETTLE_HOUR_LA = 9;
export function thiefDayKey(now = Date.now()) {
  return `la-${new Date(now - THIEF_SETTLE_HOUR_LA * 60 * MIN).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })}`;
}

// ---- Bảng vàng trộm: top 3 số món cuỗm/hái ké trong ngày (giờ VN) ----------
// gold là giá gốc, phát thưởng nhân GOLD_MULT như mọi nguồn thu khác.
export const THIEF_REWARDS = [
  { gems: 50, gold: 250000 }, // ×GOLD_MULT = 1.000.000 vàng/ngày cho hạng nhất
  { gems: 25, gold: 125000 },
  { gems: 10, gold: 50000 },
];
// Kinh tế làng phình to thì thưởng phình theo: mỗi 5 triệu vàng tổng của cả
// làng (giá hiển thị) cộng thêm ×1, tối đa ×10.
export const THIEF_ECON_STEP_GOLD = 5_000_000;
export const thiefEconomyMult = (villageGold) => Math.min(10, 1 + Math.floor(villageGold / THIEF_ECON_STEP_GOLD));
