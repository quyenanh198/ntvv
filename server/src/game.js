// Luật chơi Nông trại vui vẻ — thuần logic/cấu hình, không I/O.
// Kinh tế: cây càng lâu lãi càng dày; trộm bị chặn ở 40% sản lượng nên
// chủ ruộng lười thu hoạch vẫn giữ được đa số công sức.

const MIN = 60_000;

export const CROPS = {
  lua:    { id: 'lua',    name: 'Lúa',     emoji: '🌾', cost: 10,  growMs: 3 * MIN,   yield: 3, sell: 5,   xp: 2,  level: 1 },
  carot:  { id: 'carot',  name: 'Cà rốt',  emoji: '🥕', cost: 25,  growMs: 15 * MIN,  yield: 3, sell: 13,  xp: 5,  level: 2 },
  cachua: { id: 'cachua', name: 'Cà chua', emoji: '🍅', cost: 60,  growMs: 45 * MIN,  yield: 4, sell: 25,  xp: 10, level: 3 },
  dau:    { id: 'dau',    name: 'Dâu tây', emoji: '🍓', cost: 120, growMs: 120 * MIN, yield: 5, sell: 40,  xp: 18, level: 5 },
  ngo:    { id: 'ngo',    name: 'Ngô',     emoji: '🌽', cost: 250, growMs: 300 * MIN, yield: 5, sell: 90,  xp: 35, level: 7 },
  bingo:  { id: 'bingo',  name: 'Bí ngô',  emoji: '🎃', cost: 500, growMs: 600 * MIN, yield: 4, sell: 240, xp: 70, level: 9 },
};

// Ô đất 7..12: giá + level yêu cầu (ô 1..6 có sẵn).
export const PLOT_SLOTS = [
  { price: 300,   level: 3 },
  { price: 800,   level: 4 },
  { price: 2000,  level: 6 },
  { price: 5000,  level: 8 },
  { price: 12000, level: 10 },
  { price: 30000, level: 12 },
];

export const START_PLOTS = 6;
export const MAX_PLOTS = 12;
export const START_COINS = 200;
export const DAILY_COINS = 50;
export const DAILY_XP = 10;
export const WATER_CUT = 0.1; // tưới giúp: giảm 10% thời gian còn lại
export const WATER_COINS = 2;
export const WATER_XP = 1;
export const STEAL_XP = 1;

// Mỗi ô bị trộm tối đa 40% sản lượng (làm tròn xuống), mỗi kẻ trộm 1 lần/vụ.
export function stealCap(crop) {
  return Math.floor(crop.yield * 0.4);
}

// XP tích lũy cần để ĐẠT level l (level 1 = 0).
export function xpForLevel(l) {
  return 20 * (l - 1) * l;
}

export function levelFor(xp) {
  let l = 1;
  while (xp >= xpForLevel(l + 1)) l += 1;
  return l;
}

// FARM_FAST (test): thời gian trồng chia 60, sàn 3 giây.
export function growMsFor(crop, fast) {
  return fast ? Math.max(3000, Math.round(crop.growMs / 60)) : crop.growMs;
}

// Ngày hiện tại theo giờ VN — mốc cho thưởng điểm danh.
export function todayVN(now = Date.now()) {
  return new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}
