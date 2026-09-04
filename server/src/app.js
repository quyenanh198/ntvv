import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import staticPlugin from '@fastify/static';

import {
  CROPS,
  CANSA,
  LUXURY,
  MACHINE_UPGRADE_GOLD,
  LOTTERY,
  TAX_PER_PLOT,
  MARKET_SAT,
  GOODS,
  itemInfo,
  CHICKEN,
  ANIMALS,
  MACHINES,
  TREES,
  SKILLS,
  SKILL_NODES,
  SKILL_MAX_RANK,
  skillCost,
  ANIMAL_PRODUCTS,
  MACHINE_PRODUCTS,
  CRITTER,
  critterKindFor,
  FEED_ITEM,
  BARN_UPGRADE_GOLD,
  MILL,
  START_PLOTS,
  EXPANSIONS,
  MAX_PLOTS,
  START_GOLD,
  welcomeGift,
  START_GEMS,
  speedupCost,
  levelInfo,
  levelFor,
  ORDER_SLOTS,
  ORDER_UNLOCK_LEVEL,
  ORDER_REFRESH_MS,
  ORDER_BOARD_REFRESH_MS,
  MACHINE_QUEUE_MAX,
  WANT_MARKUP,
  WANT_MAX_QTY,
  WANT_MAX_OPEN,
  DOG,
  generateOrder,
  DAILY_QUESTS,
  DAILY_CHEST,
  STAR_MILESTONES,
  POACH_DAILY_LIMIT,
  POACH_EXP,
  POACH_YIELD,
  POACH_AGAIN_MS,
  POACH_LOOT_COOLDOWN_MS,
  PLANT_HELP_EXP,
  HARVEST_YIELD,
  WATER_HELPER_GOLD,
  WATER_HELP_COOLDOWN_MS,
  WATER_HELP_BOOST_MS,
  WATER_HELPER_EXP,
  WATER_FRESH_EXP,
  FESTIVAL,
  festivalCycle,
  GOLD_MULT,
  ENERGY,
  FISHING,
  FISH_FARM,
  FISH_STOCK_BY_LEVEL,
  rollFish,
  COOP_LEVELS,
  COOP_UPGRADE_GOLD,
  POND_LEVELS,
  POND_UPGRADE_GOLD,
  scaleMs,
  todayVN,
  yesterdayVN,
  thiefDayKey,
  THIEF_REWARDS,
  thiefEconomyMult,
} from './game.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '../../public');

const ME_CACHE_TTL_MS = 30_000;
const ME_CACHE_MAX = 300;

export function buildApp({ config, db, logger = true }) {
  const app = Fastify({ logger, trustProxy: true });
  const meCache = new Map();

  // ---- Xác thực: Chat là auth oracle --------------------------------------
  async function chatUserFor(request) {
    const cookie = request.headers.cookie;
    if (!cookie) return null;
    const hit = meCache.get(cookie);
    if (hit && hit.until > Date.now()) return hit.user;
    let res;
    try {
      res = await fetch(`${config.chatApiUrl}/api/me`, { headers: { cookie } });
    } catch (err) {
      request.log.warn({ err }, 'chat /api/me unreachable');
      return null;
    }
    if (!res.ok) return null;
    const user = await res.json();
    if (meCache.size >= ME_CACHE_MAX) meCache.clear();
    meCache.set(cookie, { user, until: Date.now() + ME_CACHE_TTL_MS });
    return user;
  }

  const upsertFarmer = db.prepare(`
    INSERT INTO farmers (user_id, name, gold, gems, plots_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET name = excluded.name
  `);
  const getFarmer = db.prepare('SELECT * FROM farmers WHERE user_id = ?');
  // ---- Thuế đất: mỗi ngày (mốc 9h sáng LA) nợ TAX_PER_PLOT × số ô. Có vàng là
  // tự trả; còn nợ thì chưa gieo trồng được. Vàng thuế bị đốt (sunk_gold).
  function collectTax(userId) {
    const f = getFarmer.get(userId);
    if (!f) return;
    const day = thiefDayKey();
    let owed = f.tax_owed || 0;
    if (f.tax_day !== day) {
      owed += (f.plots_count || 0) * TAX_PER_PLOT;
      db.prepare('UPDATE farmers SET tax_day = ?, tax_owed = ? WHERE user_id = ?').run(day, owed, userId);
    }
    if (owed > 0 && f.gold >= owed) {
      db.prepare('UPDATE farmers SET gold = gold - ?, sunk_gold = sunk_gold + ?, tax_owed = 0 WHERE user_id = ?').run(owed, owed, userId);
    }
  }

  async function requireFarmer(request, reply) {
    const user = await chatUserFor(request);
    if (!user) return reply.code(401).send({ error: 'not_logged_in' });
    const existed = !!getFarmer.get(user.id);
    upsertFarmer.run(user.id, user.display_name || user.username, START_GOLD, START_GEMS, START_PLOTS, Date.now());
    const legacy = db.prepare('SELECT xp FROM legacy_levels WHERE user_id = ?').get(user.id);
    if (legacy) db.prepare('UPDATE farmers SET xp = ? WHERE user_id = ? AND xp < ?').run(legacy.xp, user.id, legacy.xp);
    {
      // Hỗ trợ theo trần làng (cấp cao nhất − 20): mức được hưởng tính lại mỗi lần
      // vào, trần lên thì trả thêm phần chênh; đã nhận rồi không thu lại.
      const f0 = getFarmer.get(user.id);
      const maxLevel = levelFor(db.prepare('SELECT COALESCE(MAX(xp), 0) x FROM farmers').get().x);
      const entitled = welcomeGift(levelFor(f0.xp), maxLevel);
      const diff = entitled - (f0.support_paid || 0);
      if (diff > 0) {
        db.prepare('UPDATE farmers SET gold = gold + ?, gift_gold = gift_gold + ?, support_paid = ? WHERE user_id = ?').run(diff, diff, entitled, user.id);
        logEvent(existed
          ? `🎁 ${f0.name} nhận thêm ${diff.toLocaleString('vi')} vàng hỗ trợ (trần làng lên Lv ${Math.max(0, maxLevel - 20)})`
          : `🎁 ${f0.name} gia nhập làng, nhận ${diff.toLocaleString('vi')} vàng hỗ trợ tân binh`);
      }
    }
    collectTax(user.id);
    settleDebts(user.id);
    touchSeen(user.id);
    request.farmer = getFarmer.get(user.id);
    request.chatUser = user;
  }

  // ---- Push qua Chat ------------------------------------------------------
  function pushTo(userIds, title, body) {
    if (!config.internalSecret) return;
    fetch(`${config.chatApiUrl}/internal/farm/notify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-farm-secret': config.internalSecret },
      body: JSON.stringify({ userIds, title, body, url: '/farm/' }),
    }).catch((err) => app.log.warn({ err }, 'farm push notify failed'));
  }

  // ---- Bản tin làng -------------------------------------------------------
  const insertEvent = db.prepare('INSERT INTO events (at, text) VALUES (?, ?)');
  function logEvent(text) {
    const { lastInsertRowid } = insertEvent.run(Date.now(), text);
    if (Number(lastInsertRowid) % 50 === 0) {
      db.prepare('DELETE FROM events WHERE id <= ?').run(Number(lastInsertRowid) - 500);
    }
  }

  // ---- Kho ----------------------------------------------------------------
  const invRow = db.prepare('SELECT qty FROM inventory WHERE owner_id = ? AND item = ?');
  const invUpsert = db.prepare(`
    INSERT INTO inventory (owner_id, item, qty) VALUES (?, ?, ?)
    ON CONFLICT(owner_id, item) DO UPDATE SET qty = qty + excluded.qty
  `);
  function invAdd(userId, item, qty) {
    invUpsert.run(userId, item, qty);
  }
  function invQty(userId, item) {
    return invRow.get(userId, item)?.qty ?? 0;
  }
  function invTake(userId, item, qty) {
    if (invQty(userId, item) < qty) return false;
    db.prepare('UPDATE inventory SET qty = qty - ? WHERE owner_id = ? AND item = ?').run(qty, userId, item);
    db.prepare('DELETE FROM inventory WHERE owner_id = ? AND item = ? AND qty <= 0').run(userId, item);
    return true;
  }
  function invAll(userId) {
    const out = {};
    for (const r of db.prepare('SELECT item, qty FROM inventory WHERE owner_id = ? AND qty > 0').all(userId)) {
      out[r.item] = r.qty;
    }
    return out;
  }

  // ---- EXP / vàng / sao ---------------------------------------------------
  function grant(userId, { gold = 0, gems = 0, xp = 0, stars = 0 }) {
    db.prepare('UPDATE farmers SET gold = gold + ?, gems = gems + ?, xp = xp + ?, stars = stars + ? WHERE user_id = ?')
      .run(gold, gems, xp, stars, userId);
  }

  // Thuỷ sản từng là vật nuôi (bản trước): chuyển sang hệ ao nuôi tiêu hao —
  // hoàn tiền giống cho ai đã mua rồi xoá. Idempotent (không còn dòng thì thôi).
  for (const [kind, price] of Object.entries({ tom: 600, catra: 1000, ech: 1300, caloc: 2000 })) {
    const rows = db.prepare('SELECT owner_id, COUNT(*) c FROM animals WHERE kind = ? GROUP BY owner_id').all(kind);
    if (!rows.length) continue;
    db.transaction(() => {
      for (const r of rows) grant(r.owner_id, { gold: price * r.c });
      db.prepare('DELETE FROM animals WHERE kind = ?').run(kind);
    })();
  }

  // ---- Nhiệm vụ ngày ------------------------------------------------------
  const dailyRow = db.prepare('SELECT * FROM daily WHERE owner_id = ? AND day = ?');
  function getDaily(userId) {
    const day = todayVN();
    let row = dailyRow.get(userId, day);
    if (!row) {
      db.prepare('INSERT OR IGNORE INTO daily (owner_id, day) VALUES (?, ?)').run(userId, day);
      row = dailyRow.get(userId, day);
    }
    return { ...row, counters: JSON.parse(row.counters_json || '{}') };
  }
  // Nợ tiền phạt: bị chó tóm mà không đủ vàng thì phần thiếu (+100 phạt) thành nợ
  // chủ vườn, mỗi 10 phút +5% lãi kép; hễ con nợ có vàng là tự trừ trả (theo nợ cũ trước).
  // Lãi đơn: mỗi 10 phút cộng 5% của gốc (gốc chốt lại sau mỗi lần trả một phần).
  const debtNow = (row, now = Date.now()) => Math.round(row.amount * (1 + DOG.debtInterest * Math.floor((now - row.at) / scaleMs(DOG.debtStepMs, config.fast))));
  function settleDebts(userId, now = Date.now()) {
    const rows = db.prepare('SELECT * FROM debts WHERE debtor_id = ? ORDER BY at, id').all(userId);
    if (!rows.length) return;
    const debtor = getFarmer.get(userId);
    let gold = Math.max(0, debtor?.gold || 0);
    for (const row of rows) {
      if (gold <= 0) break;
      const due = debtNow(row, now);
      const pay = Math.min(gold, due);
      if (pay <= 0) continue;
      db.transaction(() => {
        grant(userId, { gold: -pay });
        grant(row.creditor_id, { gold: pay });
        if (pay >= due) db.prepare('DELETE FROM debts WHERE id = ?').run(row.id);
        else db.prepare('UPDATE debts SET amount = ?, at = ? WHERE id = ?').run(due - pay, now, row.id);
      })();
      gold -= pay;
      const creditor = getFarmer.get(row.creditor_id);
      if (pay >= due || pay >= 100) logEvent(`💸 ${debtor.name} trả ${pay.toLocaleString('vi')} vàng nợ tiền phạt cho ${creditor?.name || '?'}${pay >= due ? ' (hết nợ)' : ` (còn nợ ${(due - pay).toLocaleString('vi')})`}`);
    }
  }
  const debtView = (userId, now = Date.now()) => ({
    owe: db.prepare('SELECT * FROM debts WHERE debtor_id = ?').all(userId).reduce((a, r) => a + debtNow(r, now), 0),
    owedToMe: db.prepare('SELECT * FROM debts WHERE creditor_id = ?').all(userId).reduce((a, r) => a + debtNow(r, now), 0),
    interest: DOG.debtInterest,
  });

  // Sổ mất trộm: ghi từng lần bị chôm (ruộng/chuồng/máy) để tổng kết lúc chủ quay lại.
  const recordTheft = (ownerId, thiefId, item, qty) => db.prepare('INSERT INTO thefts (owner_id, thief_id, item, qty, at) VALUES (?, ?, ?, ?, ?)').run(ownerId, thiefId, item, qty, Date.now());
  const AWAY_GAP_MS = 10 * 60 * 1000; // vắng quá 10 phút = phiên mới
  function buildAwayReport(userId, since, until) {
    const items = db.prepare('SELECT item, SUM(qty) q FROM thefts WHERE owner_id = ? AND at > ? AND at <= ? GROUP BY item ORDER BY q DESC').all(userId, since, until);
    if (!items.length) return null;
    const thieves = db.prepare('SELECT t.thief_id id, f.name, SUM(t.qty) q, COUNT(*) n FROM thefts t JOIN farmers f ON f.user_id = t.thief_id WHERE t.owner_id = ? AND t.at > ? AND t.at <= ? GROUP BY t.thief_id ORDER BY q DESC').all(userId, since, until);
    return { since, until, total: items.reduce((a, r) => a + r.q, 0), items: items.map((r) => ({ id: r.item, qty: r.q })), thieves: thieves.map((r) => ({ id: r.id, name: r.name, qty: r.q, times: r.n })) };
  }
  // Mỗi request cập nhật last_seen_at; nếu vắng lâu thì chốt "sổ mất trộm" của
  // khoảng vắng để client hiện một lần (xoá khi bấm Đã biết).
  function touchSeen(userId, now = Date.now()) {
    const f = db.prepare('SELECT last_seen_at FROM farmers WHERE user_id = ?').get(userId);
    if (f && f.last_seen_at && now - f.last_seen_at > AWAY_GAP_MS) {
      const report = buildAwayReport(userId, f.last_seen_at, now);
      if (report) db.prepare('UPDATE farmers SET away_report_json = ? WHERE user_id = ?').run(JSON.stringify(report), userId);
    }
    db.prepare('UPDATE farmers SET last_seen_at = ? WHERE user_id = ?').run(now, userId);
  }

  function bumpPoached(userId, by) {
    const d = getDaily(userId);
    db.prepare('UPDATE daily SET poached = poached + ? WHERE owner_id = ? AND day = ?').run(by, userId, d.day);
    // Bảng trộm tính theo ngày Los Angeles (chốt 9h sáng), tách khỏi ngày nhiệm vụ.
    db.prepare(`INSERT INTO theft_days (owner_id, day, count) VALUES (?, ?, ?)
      ON CONFLICT(owner_id, day) DO UPDATE SET count = count + excluded.count`).run(userId, thiefDayKey(), by);
  }

  // ---- Bảng vàng trộm: chốt sổ hôm qua (lười, lần đầu có người ghé mỗi ngày)
  const MEDALS = ['🥇', '🥈', '🥉'];
  let thiefSettledDay = null;
  function thiefRows(day, limit) {
    return db.prepare(`SELECT t.owner_id AS id, f.name, t.count AS count FROM theft_days t
      JOIN farmers f ON f.user_id = t.owner_id WHERE t.day = ? AND t.count > 0
      ORDER BY t.count DESC, f.xp DESC LIMIT ?`).all(day, limit).map((r, i) => ({ ...r, rank: i + 1 }));
  }
  // Xổ số làng: quay cùng lúc chốt bảng trộm. Hũ = 1 triệu + 500k mỗi vé bán ra,
  // 1 người trúng (tỉ lệ theo số vé); không ai mua thì không quay.
  function settleLottery(day) {
    if (db.prepare('SELECT 1 FROM lottery_draws WHERE day = ?').get(day)) return;
    const rows = db.prepare('SELECT t.owner_id, t.qty, f.name FROM lottery_tickets t JOIN farmers f ON f.user_id = t.owner_id WHERE t.day = ?').all(day);
    const total = rows.reduce((a, r) => a + r.qty, 0);
    if (!total) return;
    const pot = LOTTERY.base + LOTTERY.perTicket * total;
    // 3 người may mắn (không trùng), tỉ lệ theo số vé; phần giải không có người thì dồn về giải 1.
    const pool = rows.map((r) => ({ ...r }));
    const winners = [];
    for (let rank = 0; rank < LOTTERY.shares.length && pool.length; rank += 1) {
      const sum = pool.reduce((a, r) => a + r.qty, 0);
      let pick = Math.floor(Math.random() * sum);
      let i = 0;
      for (; i < pool.length; i += 1) { if (pick < pool[i].qty) break; pick -= pool[i].qty; }
      const w = pool.splice(Math.min(i, pool.length - 1), 1)[0];
      winners.push({ id: w.owner_id, name: w.name, qty: w.qty, rank: rank + 1, share: LOTTERY.shares[rank] });
    }
    const unassigned = LOTTERY.shares.slice(winners.length).reduce((a, x) => a + x, 0);
    winners[0].share += unassigned;
    for (const w of winners) w.gold = Math.round(pot * w.share);
    db.transaction(() => {
      for (const w of winners) grant(w.id, { gold: w.gold });
      db.prepare('INSERT INTO lottery_draws (day, pot, winner_id, winner_name, tickets, at, winners_json) VALUES (?, ?, ?, ?, ?, ?, ?)').run(day, pot, winners[0].id, winners[0].name, total, Date.now(), JSON.stringify(winners));
    })();
    const medals = ['🥇', '🥈', '🥉'];
    logEvent(`🎟️ Xổ số làng ${day.replace(/^la-/, '')} (hũ ${pot.toLocaleString('vi')} vàng, ${total} vé): ${winners.map((w) => `${medals[w.rank - 1]} ${w.name} +${w.gold.toLocaleString('vi')}`).join(' · ')}`);
    for (const w of winners) pushTo([w.id], 'Ăn trộm dzui dzẻ 😋', `🎟️ ${medals[w.rank - 1]} Bạn trúng giải ${w.rank} xổ số làng: +${w.gold.toLocaleString('vi')} vàng (${w.qty}/${total} vé)!`);
  }

  function settleThiefBoard() {
    const day = thiefDayKey(Date.now() - 24 * 60 * 60 * 1000);
    settleLottery(day);
    if (thiefSettledDay === day) return;
    if (db.prepare('SELECT 1 FROM thief_awards WHERE day = ?').get(day)) { thiefSettledDay = day; return; }
    const econ = thiefEconomyMult(villageGold());
    const winners = thiefRows(day, 3).map((w) => ({ ...w, gems: THIEF_REWARDS[w.rank - 1].gems, gold: THIEF_REWARDS[w.rank - 1].gold * GOLD_MULT * econ, econ }));
    db.transaction(() => {
      for (const w of winners) grant(w.id, { gems: w.gems, gold: w.gold });
      db.prepare('INSERT INTO thief_awards (day, winners_json, at) VALUES (?, ?, ?)').run(day, JSON.stringify(winners), Date.now());
    })();
    thiefSettledDay = day;
    if (!winners.length) return;
    logEvent(`🥷 Bảng vàng trộm ${day.replace(/^la-/, '')}${econ > 1 ? ` (thưởng ×${econ})` : ''}: ${winners.map((w) => `${MEDALS[w.rank - 1]} ${w.name} (${w.count} món · ${w.gold.toLocaleString('vi')} vàng)`).join(' · ')}`);
    for (const w of winners) {
      pushTo([w.id], 'Ăn trộm dzui dzẻ 😋', `${MEDALS[w.rank - 1]} Hạng ${w.rank} bảng trộm hôm qua (${w.count} món) — nhận ${w.gems} kim cương + ${w.gold.toLocaleString('vi')} vàng!`);
    }
  }

  function bumpQuest(userId, questId, by = 1) {
    const d = getDaily(userId);
    d.counters[questId] = (d.counters[questId] || 0) + by;
    db.prepare('UPDATE daily SET counters_json = ? WHERE owner_id = ? AND day = ?')
      .run(JSON.stringify(d.counters), userId, d.day);
  }

  // ---- Chuồng trại: cột cấp theo loại ------------------------------------
  const BARN_COL = { ga: 'coop_level', bo: 'cow_level', cuu: 'sheep_level', vit: 'duck_level', ong: 'bee_level', de: 'goat_level', heo: 'pig_level' };
  // 7 loại đầu có cột riêng; loại thêm sau nằm trong barn_levels_json.
  function barnLevel(f, kind) {
    if (BARN_COL[kind]) return f[BARN_COL[kind]] || 1;
    return JSON.parse(f.barn_levels_json || '{}')[kind] || 1;
  }
  function bumpBarnLevel(f, kind) {
    if (BARN_COL[kind]) {
      db.prepare(`UPDATE farmers SET ${BARN_COL[kind]} = ${BARN_COL[kind]} + 1 WHERE user_id = ?`).run(f.user_id);
      return;
    }
    const levels = JSON.parse(f.barn_levels_json || '{}');
    levels[kind] = (levels[kind] || 1) + 1;
    db.prepare('UPDATE farmers SET barn_levels_json = ? WHERE user_id = ?').run(JSON.stringify(levels), f.user_id);
  }
  function barnView(f, kind) {
    const a = ANIMALS[kind];
    const lv = barnLevel(f, kind);
    const count = db.prepare('SELECT COUNT(*) c FROM animals WHERE owner_id = ? AND kind = ?').get(f.user_id, kind).c;
    return {
      kind,
      level: lv,
      capacity: a.capacities[lv - 1],
      count,
      next: lv < a.capacities.length
        ? { level: lv + 1, capacity: a.capacities[lv], gold: BARN_UPGRADE_GOLD[lv - 1] }
        : null,
    };
  }

  // ---- Kỹ năng (mục 9.5) --------------------------------------------------
  // skills_json: { id: bậc }. Bản cũ lưu mảng id (= bậc 1), đọc được cả hai.
  const skillsOf = (f) => {
    const raw = JSON.parse(f.skills_json || '{}');
    return Array.isArray(raw) ? Object.fromEntries(raw.map((id) => [id, 1])) : raw;
  };
  const skillRank = (f, id) => skillsOf(f)[id] || 0;
  const hasSkill = (f, id) => skillRank(f, id) > 0;
  function skillPointsLeft(f) {
    const spent = Object.entries(skillsOf(f)).reduce((acc, [id, r]) => {
      const node = SKILL_NODES[id];
      if (!node) return acc;
      let sum = 0;
      for (let k = 1; k <= r; k += 1) sum += skillCost(node, k);
      return acc + sum;
    }, 0);
    return Math.max(0, levelFor(f.xp) - SKILLS.unlockLevel) - spent;
  }
  const cropTime = (f, ms) => Math.round(ms * (1 - 0.05 * skillRank(f, 'bantayxanh')));
  const animalTime = (f, ms) => Math.round(ms * (1 - 0.05 * skillRank(f, 'nguoibannho')));
  const machineTime = (f, ms, machineId) => Math.round(ms * (1 - 0.05 * skillRank(f, 'lamnhanh')) * (1 - 0.1 * (machineId ? machineLevel(f, machineId) : 0)));

  // ---- Năng lượng (hồi lười: tính khi đọc/tiêu) ---------------------------
  function energyStep() {
    return scaleMs(ENERGY.regenMs, config.fast);
  }
  function currentEnergy(f, now = Date.now()) {
    const regen = Math.max(0, Math.floor((now - f.energy_at) / energyStep()));
    // Ai đang vượt trần (mua gói) giữ nguyên mức đó; hồi tự nhiên chỉ đầy tới max.
    const cap = Math.max(ENERGY.max, f.energy);
    return Math.min(cap, f.energy + regen);
  }
  // Ghi lại mức năng lượng mới, giữ phần hồi lẻ đang tích.
  function setEnergy(userId, f, value, now = Date.now()) {
    const rem = value >= ENERGY.max ? 0 : (now - f.energy_at) % energyStep();
    db.prepare('UPDATE farmers SET energy = ?, energy_at = ? WHERE user_id = ?').run(value, now - rem, userId);
  }
  function energyView(f, now = Date.now()) {
    const cur = currentEnergy(f, now);
    return {
      current: cur,
      max: ENERGY.max,
      nextRegenMs: cur >= ENERGY.max ? null : energyStep() - ((now - f.energy_at) % energyStep()),
      buyGems: ENERGY.buyGems,
      buyAmount: ENERGY.buyAmount,
    };
  }

  // ---- Lễ Hội Thu Hoạch ---------------------------------------------------
  const festRow = db.prepare('SELECT * FROM festival WHERE owner_id = ? AND cycle = ?');
  function getFest(userId) {
    const { cycle, daysLeft } = festivalCycle();
    let row = festRow.get(userId, cycle);
    if (!row) {
      db.prepare('INSERT OR IGNORE INTO festival (owner_id, cycle) VALUES (?, ?)').run(userId, cycle);
      row = festRow.get(userId, cycle);
    }
    return { ...row, daysLeft, counters: JSON.parse(row.counters_json || '{}'), claims: JSON.parse(row.claims_json || '[]') };
  }
  function bumpFest(userId, type, by = 1) {
    const f = getFest(userId);
    f.counters[type] = (f.counters[type] || 0) + by;
    db.prepare('UPDATE festival SET counters_json = ? WHERE owner_id = ? AND cycle = ?')
      .run(JSON.stringify(f.counters), userId, f.cycle);
  }

  // ---- Đơn hàng -----------------------------------------------------------
  function ensureOrders(farmer) {
    if (levelFor(farmer.xp) < ORDER_UNLOCK_LEVEL) return;
    const now = Date.now();
    const slots = ORDER_SLOTS + Math.ceil(skillRank(farmer, 'khachquen') / 2);
    // Cả bảng đơn thay mới mỗi ORDER_BOARD_REFRESH_MS: xoá đơn cũ, đặt hạn kế.
    const row = db.prepare('SELECT orders_refresh_at FROM farmers WHERE user_id = ?').get(farmer.user_id);
    if (now >= (row?.orders_refresh_at || 0)) {
      db.prepare('DELETE FROM orders WHERE owner_id = ?').run(farmer.user_id);
      db.prepare('UPDATE farmers SET orders_refresh_at = ?, next_order_at = 0 WHERE user_id = ?')
        .run(now + scaleMs(ORDER_BOARD_REFRESH_MS, config.fast), farmer.user_id);
      farmer.next_order_at = 0;
    }
    const have = db.prepare('SELECT slot FROM orders WHERE owner_id = ?').all(farmer.user_id).map((r) => r.slot);
    if (have.length >= slots) return;
    if (now < farmer.next_order_at && have.length > 0) return;
    const rng = Math.random;
    const level = levelFor(farmer.xp);
    for (let slot = 0; slot < slots; slot += 1) {
      if (have.includes(slot)) continue;
      const o = generateOrder(level, rng);
      db.prepare('INSERT INTO orders (owner_id, slot, items_json, gold, exp, stars) VALUES (?, ?, ?, ?, ?, ?)')
        .run(farmer.user_id, slot, JSON.stringify(o.items), o.gold, o.exp, o.stars);
    }
    db.prepare('UPDATE farmers SET next_order_at = ? WHERE user_id = ?').run(now, farmer.user_id);
  }

  // ---- View ---------------------------------------------------------------
  // Cây ăn quả: quả cộng dồn theo vụ — mỗi vụ qua đi cộng `yield` quả lên cây
  // (tới lúc tàn thì thôi). Ghi lại DB khi có vụ mới. Trả trạng thái hiện tại.
  function treeSettle(owner, plot, now = Date.now()) {
    const tree = TREES[plot.crop];
    if (!plot.tree || !tree) return null;
    const cycle = Math.max(1000, cropTime(owner, scaleMs(tree.cycleMs, config.fast)));
    const endsAt = (plot.tree_at || plot.planted_at) + scaleMs(tree.lifeMs, config.fast);
    let stock = plot.fruit_stock || 0;
    let readyAt = plot.ready_at;
    let cycles = 0;
    while (readyAt <= now && readyAt <= endsAt && cycles < 2000) { stock += tree.yield; readyAt += cycle; cycles += 1; }
    if (cycles) {
      db.prepare('UPDATE plots SET fruit_stock = ?, ready_at = ? WHERE owner_id = ? AND idx = ?').run(stock, readyAt, owner.user_id, plot.idx);
      plot.fruit_stock = stock;
      plot.ready_at = readyAt;
    }
    const dead = now >= endsAt;
    if (dead && stock <= 0) {
      // Cây tàn mà không còn quả: dọn luôn, khỏi treo "Hái quả ×0" mãi.
      db.prepare('DELETE FROM plots WHERE owner_id = ? AND idx = ?').run(owner.user_id, plot.idx);
      logEvent(`🍂 Cây ${tree.name} nhà ${owner.name} đã tàn`);
      return { stock: 0, readyAt, endsAt, dead, gone: true };
    }
    return { stock, readyAt, endsAt, dead };
  }

  function plotViews(ownerId, plotsCount) {
    const rows = db.prepare('SELECT * FROM plots WHERE owner_id = ?').all(ownerId);
    const byIdx = new Map(rows.map((r) => [r.idx, r]));
    const owner = getFarmer.get(ownerId);
    const now = Date.now();
    const out = [];
    for (let i = 0; i < plotsCount; i += 1) {
      const r = byIdx.get(i);
      if (!r) {
        out.push({ idx: i, crop: null });
        continue;
      }
      const st = r.tree ? treeSettle(owner, r, now) : null;
      if (st && st.gone) {
        out.push({ idx: i, crop: null });
        continue;
      }
      out.push({
        idx: i,
        crop: r.crop,
        plantedAt: r.planted_at,
        // Cây tàn còn quả: không có vụ kế, chỉ còn hái nốt.
        readyAt: st && st.dead ? null : r.ready_at,
        ready: st ? st.stock > 0 : now >= r.ready_at,
        watered: !!r.watered,
        poached: !!r.poached,
        poachedN: r.poached || 0,
        tree: !!r.tree,
        fruits: st ? st.stock : undefined,
        treeEndsAt: st ? st.endsAt : null,
      });
    }
    return out;
  }

  function farmerView(f) {
    const f0 = f;
    const li = levelInfo(f.xp);
    const expandNext = f.plots_count < MAX_PLOTS
      ? { ...EXPANSIONS[(f.plots_count - START_PLOTS) / 4], plots: 4 }
      : null;
    const d = getDaily(f.user_id);
    const questsDone = DAILY_QUESTS.filter((q) => (d.counters[q.id] || 0) >= q.target).length;
    const mill = db.prepare('SELECT * FROM machine_jobs WHERE owner_id = ? AND kind = ? ORDER BY ready_at LIMIT 1').get(f.user_id, 'coixay');
    return {
      id: f.user_id,
      name: f.name,
      gold: f.gold,
      gems: f.gems,
      xp: f.xp,
      level: li.level,
      levelInto: li.into,
      levelNeed: li.need,
      stars: f.stars,
      plotsCount: f.plots_count,
      expandNext,
      plots: plotViews(f.user_id, f.plots_count),
      inventory: invAll(f.user_id),
      animals: db.prepare('SELECT id, kind, ready_at FROM animals WHERE owner_id = ?').all(f.user_id)
        .map((a) => ({ ...a, ready: a.ready_at != null && Date.now() >= a.ready_at })),
      mill: mill && mill.recipe
        ? { recipe: mill.recipe, readyAt: mill.ready_at, ready: Date.now() >= mill.ready_at }
        : null,
      // machines: { kind: { recipe: job } } — mỗi món trong máy chạy độc lập.
      machines: (() => {
        const out = {};
        for (const row of db.prepare('SELECT * FROM machine_jobs WHERE owner_id = ?').all(f.user_id)) {
          if (!out[row.kind]) out[row.kind] = {};
          out[row.kind][row.recipe] = { recipe: row.recipe, readyAt: row.ready_at, ready: Date.now() >= row.ready_at, queue: row.queue_count || 1, poached: !!row.poached };
        }
        return out;
      })(),
      skills: {
        unlocked: li.level >= SKILLS.unlockLevel,
        points: skillPointsLeft(f0),
        learned: skillsOf(f0),
        maxRank: SKILL_MAX_RANK,
        nextRespecAt: (f0.last_respec_at || 0) + SKILLS.respecCooldownMs,
      },
      critter: (() => {
        const now = Date.now();
        const gapMin = scaleMs(CRITTER.minGapMs, config.fast);
        const gapMax = scaleMs(CRITTER.maxGapMs, config.fast);
        let at = f.critter_next_at;
        if (!at || now > at + CRITTER.windowMs + CRITTER.graceMs) {
          at = now + gapMin + Math.floor(Math.random() * (gapMax - gapMin));
          db.prepare('UPDATE farmers SET critter_next_at = ? WHERE user_id = ?').run(at, f.user_id);
        }
        return { at, windowMs: CRITTER.windowMs, kind: critterKindFor(at) };
      })(),
      ordersRefreshAt: f.orders_refresh_at || 0,
      orders: db.prepare('SELECT id, slot, items_json, gold, exp, stars FROM orders WHERE owner_id = ? ORDER BY slot').all(f.user_id)
        .map((o) => ({ id: o.id, slot: o.slot, items: JSON.parse(o.items_json), gold: o.gold, exp: o.exp, stars: o.stars })),
      daily: {
        quests: DAILY_QUESTS.map((q) => ({ ...q, gold: q.gold * GOLD_MULT, progress: Math.min(q.target, d.counters[q.id] || 0) })),
        done: questsDone,
        required: DAILY_CHEST.questsRequired,
        chestClaimed: !!d.chest_claimed,
      },
      energy: energyView(f0),
      coop: barnView(f0, 'ga'),
      barns: Object.fromEntries(Object.keys(ANIMALS).map((k) => [k, barnView(f0, k)])),
      dog: { until: f.dog_until || 0, active: (f.dog_until || 0) > Date.now() },
      fishFarm: (() => {
        const now = Date.now();
        const batches = db.prepare('SELECT * FROM fish_batches WHERE owner_id = ? ORDER BY ready_at').all(f.user_id)
          .map((b) => ({ id: b.id, species: b.species, qty: b.qty, plantedAt: b.planted_at, readyAt: b.ready_at, ready: now >= b.ready_at }));
        const capacity = FISH_STOCK_BY_LEVEL[Math.min(f.pond_level, FISH_STOCK_BY_LEVEL.length) - 1];
        return { capacity, used: batches.reduce((x, b) => x + b.qty, 0), batches };
      })(),
      pond: {
        level: f.pond_level,
        fishPerCast: POND_LEVELS[f.pond_level - 1],
        next: f.pond_level < POND_LEVELS.length
          ? { level: f.pond_level + 1, fishPerCast: POND_LEVELS[f.pond_level], gold: POND_UPGRADE_GOLD[f.pond_level - 1] }
          : null,
      },
      festival: (() => {
        const f = getFest(f0.user_id);
        return {
          name: FESTIVAL.name,
          emoji: FESTIVAL.emoji,
          daysLeft: f.daysLeft,
          milestones: FESTIVAL.milestones.map((ms) => ({
            ...ms,
            gold: (ms.gold || 0) * GOLD_MULT,
            progress: Math.min(ms.target, f.counters[ms.type] || 0),
            claimed: f.claims.includes(ms.id),
          })),
        };
      })(),
      starNext: STAR_MILESTONES.find(
        (m) => !db.prepare('SELECT 1 FROM star_claims WHERE owner_id = ? AND milestone = ?').get(f.user_id, m.stars),
      ) || null,
    };
  }

  const getPlot = db.prepare('SELECT * FROM plots WHERE owner_id = ? AND idx = ?');
  const hasAction = db.prepare(
    'SELECT 1 FROM plot_actions WHERE owner_id = ? AND idx = ? AND planted_at = ? AND helper_id = ? AND action = ?',
  );
  // OR IGNORE: hàng lịch sử từ vụ/bản cũ có thể đã tồn tại (poach giờ chặn
  // bằng plots.poached, không bằng khóa này) — trùng thì bỏ qua, đừng 500.
  const markAction = db.prepare(
    'INSERT OR IGNORE INTO plot_actions (owner_id, idx, planted_at, helper_id, action, at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const lastAction = db.prepare(
    'SELECT at FROM plot_actions WHERE owner_id = ? AND idx = ? AND planted_at = ? AND helper_id = ? AND action = ?',
  );
  const touchAction = db.prepare(`INSERT INTO plot_actions (owner_id, idx, planted_at, helper_id, action, at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(owner_id, idx, planted_at, helper_id, action) DO UPDATE SET at = excluded.at`);
  // Kinh tế làng = tổng vàng cả làng đã thu từ bán hàng (không tính vàng tặng, trộm, thưởng).
  const villageGold = () => db.prepare('SELECT COALESCE(SUM(sold_gold), 0) g FROM farmers').get().g;
  const addSold = db.prepare('UPDATE farmers SET sold_gold = sold_gold + ? WHERE user_id = ?');

  // ---- Bể hút vàng: thuế, xa xỉ phẩm, nâng cấp nhà máy, giá bão hoà -------
  const taxView = (f) => ({ perPlot: TAX_PER_PLOT, today: (f.plots_count || 0) * TAX_PER_PLOT, owed: f.tax_owed || 0 });
  function luxuryView(f) {
    if (!f) return { owned: [], title: null, frame: null, decor: [] };
    const owned = db.prepare('SELECT item FROM luxury WHERE owner_id = ?').all(f.user_id).map((r) => r.item).filter((id) => LUXURY[id]);
    return {
      owned,
      title: f.title_id && LUXURY[f.title_id] ? f.title_id : null,
      frame: f.frame_id && LUXURY[f.frame_id] ? f.frame_id : null,
      decor: owned.filter((id) => LUXURY[id].kind === 'decor'),
      pets: owned.filter((id) => LUXURY[id].kind === 'pet'),
    };
  }
  const machineLevels = (f) => { try { return JSON.parse(f.machine_levels_json || '{}'); } catch { return {}; } };
  const machineLevel = (f, id) => machineLevels(f)[id] || 0;
  // Giá bão hoà: mỗi mặt hàng có "độ ngấy" = giá trị đã bán gần đây (giảm nửa mỗi
  // MARKET_SAT.halfMs). Giá hệ thống = giá gốc × max(floor, 1 − ngấy / cap).
  // Đơn hàng và thu mua bạn bè không bị ảnh hưởng.
  function saturation(item, now = Date.now()) {
    const r = db.prepare('SELECT sat, at FROM market_sat WHERE item = ?').get(item);
    if (!r) return 0;
    return r.sat * Math.pow(0.5, (now - r.at) / MARKET_SAT.halfMs);
  }
  const priceMult = (item, now = Date.now()) => Math.max(MARKET_SAT.floor, 1 - saturation(item, now) / MARKET_SAT.cap);
  function bumpSaturation(item, value, now = Date.now()) {
    db.prepare('INSERT INTO market_sat (item, sat, at) VALUES (?, ?, ?) ON CONFLICT(item) DO UPDATE SET sat = excluded.sat, at = excluded.at')
      .run(item, saturation(item, now) + value, now);
  }
  function saturationView() {
    const now = Date.now();
    const out = {};
    const half = scaleMs(MARKET_SAT.halfMs, config.fast);
    for (const r of db.prepare('SELECT item FROM market_sat').all()) {
      const m = priceMult(r.item, now);
      if (m < 0.995) {
        // Số giờ để giá hồi về ≥ 95% (ngấy giảm nửa mỗi halfMs).
        const sat = saturation(r.item, now);
        const hours = Math.max(0.1, (half * Math.log2(Math.max(1, sat / (0.05 * MARKET_SAT.cap)))) / 3600000);
        out[r.item] = { mult: Math.round(m * 100) / 100, hours: Math.round(hours * 10) / 10 };
      }
    }
    return out;
  }

  // Chuồng tự vận hành (yêu cầu nhà mình): tới giờ là sản phẩm TỰ vào kho,
  // con vật tự ăn tiếp (chu kỳ nối từ mốc cũ nên offline lâu vẫn tích đủ);
  // chỉ dừng khi hết thức ăn. Chạy mỗi lần chính chủ hành động/đọc state.
  function autoTend(userId) {
    const rows = db.prepare('SELECT * FROM animals WHERE owner_id = ?').all(userId);
    if (rows.length === 0) return;
    const f = getFarmer.get(userId);
    const now = Date.now();
    const eatFeed = (a) => {
      if (Math.random() < 0.05 * skillRank(f, 'mangantot')) return true; // không tốn
      if (invQty(userId, FEED_ITEM) < a.feedQty) return false;
      invTake(userId, FEED_ITEM, a.feedQty);
      return true;
    };
    const expMult = 1 + 0.1 * skillRank(f, 'chamsoc');
    db.transaction(() => {
      for (const row of rows) {
        const a = ANIMALS[row.kind];
        if (!a) continue;
        const cycle = animalTime(f, scaleMs(a.produceMs, config.fast));
        let readyAt = row.ready_at;
        let guard = 0;
        while (readyAt != null && readyAt <= now && guard < 24) {
          invAdd(userId, a.product, 1);
          grant(userId, { xp: Math.round(a.expCollect * expMult) });
          if (eatFeed(a)) {
            bumpQuest(userId, 'feed');
            readyAt += cycle;
          } else {
            readyAt = null;
          }
          guard += 1;
        }
        if (readyAt == null && eatFeed(a)) {
          bumpQuest(userId, 'feed');
          readyAt = now + cycle;
        }
        if (readyAt !== row.ready_at) {
          db.prepare('UPDATE animals SET ready_at = ? WHERE id = ?').run(readyAt, row.id);
        }
      }
    })();
  }

  function fresh(userId) {
    autoTend(userId);
    const f = getFarmer.get(userId);
    let awayReport = null;
    try { awayReport = f.away_report_json ? JSON.parse(f.away_report_json) : null; } catch { awayReport = null; }
    const goldRequests = { incoming: db.prepare("SELECT COUNT(*) n FROM gold_requests WHERE to_id = ? AND status = 'open'").get(userId).n };
    return { ...farmerView(f), tax: taxView(f), luxury: luxuryView(f), machineLevels: machineLevels(f), market: saturationView(), awayReport, debts: debtView(userId), goldRequests };
  }

  // ---- API ----------------------------------------------------------------
  app.register(
    async (api) => {
      api.addHook('preHandler', requireFarmer);

      api.get('/state', async (request) => {
        ensureOrders(request.farmer);
        settleThiefBoard();
        let others = [];
        try {
          const res = await fetch(`${config.chatApiUrl}/api/users`, { headers: { cookie: request.headers.cookie } });
          if (res.ok) others = await res.json();
        } catch (err) {
          request.log.warn({ err }, 'chat /api/users unreachable');
        }
        const family = [
          { id: request.chatUser.id, name: request.farmer.name, avatar_at: request.chatUser.avatar_at, me: true },
          ...others.map((u) => ({ id: u.id, name: u.display_name || u.username, avatar_at: u.avatar_at, me: false })),
        ].map((u) => {
          const f = getFarmer.get(u.id);
          return { ...u, level: f ? levelFor(f.xp) : null, title: (f && LUXURY[f.title_id]?.name) || null, frame: (f && LUXURY[f.frame_id] && f.frame_id) || null };
        });
        return {
          me: fresh(request.farmer.user_id),
          family,
          config: {
            crops: Object.fromEntries(Object.entries(CROPS).map(([k, c]) => [k, { ...c, sell: c.sell * GOLD_MULT, growMs: scaleMs(c.growMs, config.fast) }])),
            goods: Object.fromEntries(Object.entries(GOODS).map(([k, x]) => [k, { ...x, sell: x.sell * GOLD_MULT }])),
            chicken: { ...CHICKEN, produceMs: scaleMs(CHICKEN.produceMs, config.fast) },
            animals: Object.fromEntries(Object.entries(ANIMALS).map(([k, a]) => [k, { ...a, produceMs: scaleMs(a.produceMs, config.fast) }])),
            barnUpgradeGold: BARN_UPGRADE_GOLD,
            mill: {
              ...MILL,
              recipes: Object.fromEntries(
                Object.entries(MILL.recipes).map(([k, r]) => [k, { ...r, ms: scaleMs(r.ms, config.fast) }]),
              ),
            },
            machines: Object.fromEntries(Object.entries(MACHINES).map(([mk, m2]) => [mk, {
              ...m2,
              recipes: Object.fromEntries(Object.entries(m2.recipes).map(([rk, r]) => [rk, { ...r, ms: scaleMs(r.ms, config.fast) }])),
            }])),
            orderUnlockLevel: ORDER_UNLOCK_LEVEL,
            fishFarm: Object.fromEntries(Object.entries(FISH_FARM).map(([k, sp]) => [k, { ...sp, growMs: scaleMs(sp.growMs, config.fast) }])),
            fishStockByLevel: FISH_STOCK_BY_LEVEL,
            fishing: {
              ...FISHING,
              loot: FISHING.loot.map((l) => ({ ...l, pct: Math.round((l.weight / FISHING.loot.reduce((a, x) => a + x.weight, 0)) * 100) })),
            },
            energy: ENERGY,
            machineQueueMax: MACHINE_QUEUE_MAX,
            dog: DOG,
            skillTree: SKILLS,
            trees: Object.fromEntries(Object.entries(TREES).map(([k, t]) => [k, { ...t, sell: t.sell * GOLD_MULT, growMs: scaleMs(t.growMs, config.fast), cycleMs: scaleMs(t.cycleMs, config.fast), lifeMs: scaleMs(t.lifeMs, config.fast) }])),
            starMilestones: STAR_MILESTONES.map((m2) => ({ ...m2, gold: (m2.gold || 0) * GOLD_MULT })),
            poachDailyLimit: POACH_DAILY_LIMIT,
            luxury: LUXURY,
            machineUpgradeGold: MACHINE_UPGRADE_GOLD,
            lottery: LOTTERY,
            taxPerPlot: TAX_PER_PLOT,
            cansa: CANSA,
            marketSat: MARKET_SAT,
            fast: config.fast,
          },
          events: db.prepare('SELECT at, text FROM events ORDER BY id DESC LIMIT 80').all(),
          // Phiên bản server lúc boot: client so với ?v= của app.js đang chạy,
          // lệch là tự tải lại (tránh tab mở sẵn chạy client cũ với server mới).
          boot: BOOT_VERSION,
          // Tin thu mua của người khác mà mình có hàng để bán → chấm đỏ nút Thu mua.
          wants: (() => {
            const rows = db.prepare('SELECT item, qty, filled FROM wants WHERE owner_id != ?').all(request.farmer.user_id);
            return { open: rows.length, canFill: rows.filter((w) => invQty(request.farmer.user_id, w.item) > 0).length };
          })(),
        };
      });

      api.get('/thief-board', async (request) => {
        settleThiefBoard();
        const yday = thiefDayKey(Date.now() - 24 * 60 * 60 * 1000);
        const row = db.prepare('SELECT winners_json FROM thief_awards WHERE day = ?').get(yday);
        const mine = db.prepare('SELECT count FROM theft_days WHERE owner_id = ? AND day = ?').get(request.farmer.user_id, thiefDayKey());
        return {
          today: thiefRows(thiefDayKey(), 10),
          myCount: mine ? mine.count : 0,
          yesterday: { day: yday.replace(/^la-/, ''), winners: row ? JSON.parse(row.winners_json) : [] },
          rewards: THIEF_REWARDS.map((r) => ({ gems: r.gems, gold: r.gold * GOLD_MULT * thiefEconomyMult(villageGold()) })),
          economy: { villageGold: villageGold(), mult: thiefEconomyMult(villageGold()) },
        };
      });

      api.get('/leaderboard', async () => {
        return db.prepare('SELECT user_id AS id, name, gold, xp, stars, title_id, frame_id FROM farmers ORDER BY xp DESC, stars DESC LIMIT 20')
          .all()
          .map((f, i) => ({ ...f, level: levelFor(f.xp), rank: i + 1, title: LUXURY[f.title_id]?.name || null, frame: (LUXURY[f.frame_id] && f.frame_id) || null }));
      });

      // ---- Trồng trọt ----
      api.post('/plant', async (request, reply) => {
        if (request.farmer.tax_owed > 0) return reply.code(400).send({ error: 'tax_due' });
        const { idx, crop: cropId } = request.body ?? {};
        const crop = CROPS[cropId];
        const me = request.farmer;
        if (!crop || !Number.isInteger(idx) || idx < 0 || idx >= me.plots_count) {
          return reply.code(400).send({ error: 'bad_request' });
        }
        if (levelFor(me.xp) < crop.level) return reply.code(400).send({ error: 'level_too_low' });
        if (me.gold < crop.seed) return reply.code(400).send({ error: 'not_enough_gold' });
        if (getPlot.get(me.user_id, idx)) return reply.code(400).send({ error: 'plot_busy' });
        const now = Date.now();
        db.transaction(() => {
          grant(me.user_id, { gold: -crop.seed, xp: crop.expSow });
          const fresh0 = Math.random() < 0.05 * skillRank(me, 'datmaumo') ? 1 : 0;
          db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at, watered) VALUES (?, ?, ?, ?, ?, ?)')
            .run(me.user_id, idx, crop.id, now, now + cropTime(me, scaleMs(crop.growMs, config.fast)), fresh0);
          bumpQuest(me.user_id, 'sow');
        })();
        return { me: fresh(me.user_id) };
      });

      api.post('/plant-all', async (request, reply) => {
        if (request.farmer.tax_owed > 0) return reply.code(400).send({ error: 'tax_due' });
        const { crop: cropId } = request.body ?? {};
        const crop = CROPS[cropId];
        const tree = TREES[cropId];
        const me = request.farmer;
        if (!crop && !tree) return reply.code(400).send({ error: 'bad_request' });
        if (levelFor(me.xp) < (crop || tree).level) return reply.code(400).send({ error: 'level_too_low' });
        const occupied = new Set(db.prepare('SELECT idx FROM plots WHERE owner_id = ?').all(me.user_id).map((r) => r.idx));
        const empty = [];
        for (let i = 0; i < me.plots_count; i += 1) if (!occupied.has(i)) empty.push(i);
        if (tree) {
          // Cây ăn quả trồng kín ô trống: mỗi cây giá price, chiếm ô lâu dài.
          const n = Math.min(empty.length, Math.floor(me.gold / tree.price));
          if (n === 0) return reply.code(400).send({ error: empty.length === 0 ? 'no_empty_plot' : 'not_enough_gold' });
          const now = Date.now();
          const readyAt = now + cropTime(me, scaleMs(tree.growMs, config.fast));
          db.transaction(() => {
            grant(me.user_id, { gold: -tree.price * n });
            const ins = db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at, tree, tree_at) VALUES (?, ?, ?, ?, ?, 1, ?)');
            for (const i of empty.slice(0, n)) ins.run(me.user_id, i, tree.id, now, readyAt, now);
          })();
          logEvent(`${tree.emoji} ${me.name} trồng ${n} cây ${tree.name}`);
          return { me: fresh(me.user_id), planted: n };
        }
        const count = Math.min(empty.length, Math.floor(me.gold / crop.seed));
        if (count === 0) return reply.code(400).send({ error: empty.length === 0 ? 'no_empty_plot' : 'not_enough_gold' });
        const now = Date.now();
        const readyAt = now + cropTime(me, scaleMs(crop.growMs, config.fast));
        db.transaction(() => {
          grant(me.user_id, { gold: -crop.seed * count, xp: crop.expSow * count });
          const ins = db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at, watered) VALUES (?, ?, ?, ?, ?, ?)');
          for (const i of empty.slice(0, count)) ins.run(me.user_id, i, crop.id, now, readyAt, Math.random() < 0.05 * skillRank(me, 'datmaumo') ? 1 : 0);
          bumpQuest(me.user_id, 'sow', count);
        })();
        logEvent(`${crop.emoji} ${me.name} gieo ${crop.name} kín ${count} ô`);
        return { me: fresh(me.user_id), planted: count };
      });

      function harvestPlot(me, plot) {
        if (plot.tree) {
          const tree = TREES[plot.crop];
          const now = Date.now();
          const st = treeSettle(me, plot, now);
          // Quả cộng dồn; hái ké 3 lần mới trừ 1 quả.
          const loss = Math.floor((plot.poached || 0) / 3);
          const got = Math.max(st.stock > 0 ? 1 : 0, st.stock + Math.ceil(skillRank(me, 'muaboithu') / 2) - loss);
          grant(me.user_id, { xp: tree.exp + (plot.watered ? WATER_FRESH_EXP : 0) });
          if (got > 0) invAdd(me.user_id, tree.id, got);
          if (st.dead) {
            // Hết tuổi thọ: vụ cuối xong là cây tàn, trả lại ô trống.
            db.prepare('DELETE FROM plots WHERE owner_id = ? AND idx = ?').run(me.user_id, plot.idx);
            logEvent(`🍂 Cây ${tree.name} nhà ${me.name} đã tàn sau vụ cuối`);
          } else {
            db.prepare('UPDATE plots SET fruit_stock = 0, poached = 0, watered = 0, planted_at = ? WHERE owner_id = ? AND idx = ?').run(now, me.user_id, plot.idx);
          }
          bumpQuest(me.user_id, 'harvest');
          bumpFest(me.user_id, 'harvest');
          return tree;
        }
        const crop = CROPS[plot.crop];
        const xp = crop.expHarvest + (plot.watered ? WATER_FRESH_EXP : 0);
        const refund = Math.random() < 0.05 * skillRank(me, 'hatgiongtk') ? crop.seed : 0;
        grant(me.user_id, { xp, gold: refund });
        if (crop.risky) grant(me.user_id, { gold: CANSA.reward }); // cần sa: thu vàng thẳng, không ra hàng
        else invAdd(me.user_id, crop.id, Math.max(1, HARVEST_YIELD - (plot.poached || 0)));
        db.prepare('DELETE FROM plots WHERE owner_id = ? AND idx = ?').run(me.user_id, plot.idx);
        bumpQuest(me.user_id, 'harvest');
        bumpFest(me.user_id, 'harvest');
        return crop;
      }

      api.post('/harvest', async (request, reply) => {
        const { idx } = request.body ?? {};
        const me = request.farmer;
        const plot = getPlot.get(me.user_id, idx);
        if (!plot) return reply.code(400).send({ error: 'no_plot' });
        const ripe = plot.tree ? treeSettle(me, plot).stock > 0 : Date.now() >= plot.ready_at;
        if (!ripe) return reply.code(400).send({ error: 'not_ready' });
        let crop;
        db.transaction(() => {
          crop = harvestPlot(me, plot);
        })();
        return { me: fresh(me.user_id), item: crop.id };
      });

      api.post('/harvest-all', async (request, reply) => {
        const me = request.farmer;
        const now = Date.now();
        for (const p of db.prepare('SELECT * FROM plots WHERE owner_id = ? AND tree = 1').all(me.user_id)) treeSettle(me, p, now);
        const ready = db.prepare('SELECT * FROM plots WHERE owner_id = ? AND ((tree = 0 AND ready_at <= ?) OR (tree = 1 AND fruit_stock > 0))').all(me.user_id, now);
        if (ready.length === 0) return reply.code(400).send({ error: 'nothing_ready' });
        db.transaction(() => {
          for (const p of ready) harvestPlot(me, p);
        })();
        logEvent(`🧺 ${me.name} thu hoạch ${ready.length} ô một lượt`);
        return { me: fresh(me.user_id), harvested: ready.length };
      });

      // Tưới: ruộng mình hoặc ruộng người khác (mỗi vụ 1 lần/ô/người).
      api.post('/water', async (request, reply) => {
        const { ownerId: rawOwner, idx } = request.body ?? {};
        const me = request.farmer;
        const ownerId = Number.isInteger(rawOwner) ? rawOwner : me.user_id;
        const owner = getFarmer.get(ownerId);
        const plot = owner && getPlot.get(ownerId, idx);
        if (!plot) return reply.code(400).send({ error: 'no_plot' });
        const now = Date.now();
        if (now >= plot.ready_at) return reply.code(400).send({ error: 'already_ready' });
        if (ownerId === me.user_id) {
          // Ruộng mình: tưới 1 lần/vụ cho bonus Tươi tốt.
          if (plot.watered) return reply.code(400).send({ error: 'already_watered' });
          db.transaction(() => {
            db.prepare('UPDATE plots SET watered = 1 WHERE owner_id = ? AND idx = ?').run(ownerId, idx);
            markAction.run(ownerId, idx, plot.planted_at, me.user_id, 'water', now);
          })();
          return { me: fresh(me.user_id) };
        }
        // Tưới giúp nhà bạn: mỗi 15 phút một lần/ô, mỗi lần cây chín sớm 10 phút.
        const last = lastAction.get(ownerId, idx, plot.planted_at, me.user_id, 'water');
        if (last && now - last.at < scaleMs(WATER_HELP_COOLDOWN_MS, config.fast)) {
          return reply.code(400).send({ error: 'water_cooldown' });
        }
        const boost = scaleMs(WATER_HELP_BOOST_MS, config.fast);
        db.transaction(() => {
          db.prepare('UPDATE plots SET watered = 1, ready_at = MAX(?, ready_at - ?) WHERE owner_id = ? AND idx = ?').run(now, boost, ownerId, idx);
          touchAction.run(ownerId, idx, plot.planted_at, me.user_id, 'water', now);
          grant(me.user_id, { gold: WATER_HELPER_GOLD * GOLD_MULT, xp: WATER_HELPER_EXP });
        })();
        logEvent(`💧 ${me.name} tưới giúp ruộng của ${owner.name} — cây chín sớm 10 phút`);
        return visitPayload(request, ownerId);
      });

      // Hái ké: ô chín nhà người khác, chủ KHÔNG mất gì, khách +1 sản phẩm.
      api.post('/poach', async (request, reply) => {
        const { ownerId, idx } = request.body ?? {};
        const me = request.farmer;
        if (ownerId === me.user_id) return reply.code(400).send({ error: 'own_farm' });
        const owner = getFarmer.get(ownerId);
        const plot = owner && getPlot.get(ownerId, idx);
        if (!plot) return reply.code(400).send({ error: 'no_plot' });
        let allowed;
        if (plot.tree) {
          // Cây ăn quả: mỗi quả trên cây mở 1 lượt hái ké (chủ chỉ mất 1 quả sau mỗi 3 lượt).
          const st = treeSettle(owner, plot);
          if (st.stock <= 0) return reply.code(400).send({ error: 'not_ready' });
          allowed = st.stock;
        } else {
          if (Date.now() < plot.ready_at) return reply.code(400).send({ error: 'not_ready' });
          // Chủ chậm thu: mỗi POACH_AGAIN_MS quá hạn mở thêm 1 lượt hái ké trên ô.
          allowed = 1 + Math.floor((Date.now() - plot.ready_at) / scaleMs(POACH_AGAIN_MS, config.fast));
        }
        if ((plot.poached || 0) >= allowed) return reply.code(400).send({ error: 'already_poached' });
        if (dogCheck(reply, owner, me)) return reply;
        const crop = poachPlot(me, owner, plot);
        logEvent(`😋 ${me.name} hái ké ${POACH_YIELD} ${crop.name} ${crop.emoji} nhà ${owner.name}`);
        pushTo([ownerId], 'Ăn trộm dzui dzẻ 😋', `😋 ${me.name} vừa hái ké ${POACH_YIELD} ${crop.name} ${crop.emoji} nhà bạn!`);
        return visitPayload(request, ownerId);
      });

      // Trộm hết: mọi ô chín còn lượt; MỖI Ô là một lần trộm riêng — chó xét
      // 20% từng ô, bị tóm ô nào nộp phạt ô đó (chuỗi phạt tăng/reset theo từng ô).
      api.post('/poach-all', async (request, reply) => {
        const { ownerId } = request.body ?? {};
        const me = request.farmer;
        if (ownerId === me.user_id) return reply.code(400).send({ error: 'own_farm' });
        const owner = getFarmer.get(ownerId);
        if (!owner) return reply.code(400).send({ error: 'no_farm' });
        const now = Date.now();
        const again = scaleMs(POACH_AGAIN_MS, config.fast);
        for (const p of db.prepare('SELECT * FROM plots WHERE owner_id = ? AND tree = 1').all(ownerId)) treeSettle(owner, p, now);
        const targets = db.prepare('SELECT * FROM plots WHERE owner_id = ? AND ((tree = 0 AND ready_at <= ?) OR (tree = 1 AND fruit_stock > 0)) ORDER BY idx').all(ownerId, now)
          .filter((p) => (p.poached || 0) < (p.tree ? (p.fruit_stock || 0) : 1 + Math.floor((now - p.ready_at) / again)));
        if (!targets.length) return reply.code(400).send({ error: 'nothing_to_poach' });
        const got = {};
        let times = 0;
        let fines = 0;
        for (const plot of targets) {
          const thief = getFarmer.get(me.user_id); // vàng + chuỗi phạt mới nhất
          const c = dogCatch(owner, thief, { quiet: true });
          if (c) { times += 1; fines += c.paid; continue; }
          const crop = poachPlot(me, owner, plot);
          got[crop.id] = (got[crop.id] || 0) + POACH_YIELD;
        }
        const n = Object.values(got).reduce((x, y) => x + y, 0);
        const desc = Object.entries(got).map(([id, q]) => `${q} ${itemInfo(id).name} ${itemInfo(id).emoji}`).join(', ');
        const dogNote = times ? ` — chó tóm ${times} lần, nộp phạt ${fines.toLocaleString('vi')} vàng` : '';
        if (n || times) {
          logEvent(`😋 ${me.name} hái ké một lượt ${targets.length} ô nhà ${owner.name}: ${desc || 'trắng tay'}${dogNote}`);
          pushTo([ownerId], 'Ăn trộm dzui dzẻ 😋', `😋 ${me.name} vừa hái ké ${desc || 'hụt'} nhà bạn${times ? ` — chó nhà bạn tóm được ${times} lần, thu ${fines.toLocaleString('vi')} vàng` : ''}!`);
        }
        return {
          ...visitPayload(request, ownerId),
          poached: n,
          items: got,
          caught: times ? { times, fine: fines, message: `🐕 Chó nhà ${owner.name} tóm được bạn ${times}/${targets.length} lần — nộp phạt ${fines.toLocaleString('vi')} vàng` } : null,
        };
      });

      // Thu hoạch giúp: nông sản vào kho CHỦ vườn (như chủ tự thu), khách nhận công.
      function ripePlotsOf(owner, now) {
        for (const p of db.prepare('SELECT * FROM plots WHERE owner_id = ? AND tree = 1').all(owner.user_id)) treeSettle(owner, p, now);
        return db.prepare('SELECT * FROM plots WHERE owner_id = ? AND ((tree = 0 AND ready_at <= ?) OR (tree = 1 AND fruit_stock > 0)) ORDER BY idx').all(owner.user_id, now)
          .filter((p) => !CROPS[p.crop]?.risky); // cần sa: chủ tự thu
      }

      // Cần sa nguỵ trang thành một cây khác, chọn ngẫu nhiên nhưng cố định theo ô + lứa
      // (không đổi mỗi lần xem) trong số cây chủ vườn đã mở khoá.
      function disguiseFor(owner, idx, plantedAt) {
        const lv = levelFor(owner.xp);
        const pool = Object.values(CROPS).filter((c) => !c.risky && c.level <= lv).map((c) => c.id);
        let h = (owner.user_id * 2654435761 + idx * 40503 + Math.floor((plantedAt || 0) / 1000)) >>> 0;
        h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
        return pool[h % pool.length] || 'rauthom';
      }
      // Khám xét ruộng người khác: miễn phí, 5 lượt/nhà/ngày; trúng cần sa thì nhổ sạch ô đó, người khám lĩnh thưởng.
      api.post('/inspect', async (request, reply) => {
        const { ownerId, idx } = request.body ?? {};
        const me = request.farmer;
        if (ownerId === me.user_id) return reply.code(400).send({ error: 'own_farm' });
        const owner = getFarmer.get(ownerId);
        if (!owner) return reply.code(400).send({ error: 'no_farm' });
        const plot = getPlot.get(ownerId, Number(idx));
        if (!plot || !plot.crop || plot.tree) return reply.code(400).send({ error: 'no_plot' });
        const now = Date.now();
        if (lastAction.get(ownerId, plot.idx, plot.planted_at, me.user_id, 'inspect')) return reply.code(400).send({ error: 'already_inspected' });
        const used = db.prepare("SELECT COUNT(*) n FROM plot_actions WHERE owner_id = ? AND helper_id = ? AND action = 'inspect' AND at > ?").get(ownerId, me.user_id, now - 24 * 60 * 60 * 1000).n;
        if (used >= CANSA.inspectPerDay) return reply.code(400).send({ error: 'inspect_limit' });
        if (CANSA.inspectFee > 0 && me.gold < CANSA.inspectFee) return reply.code(400).send({ error: 'not_enough_gold' });
        const found = !!CROPS[plot.crop]?.risky;
        db.transaction(() => {
          if (CANSA.inspectFee > 0) {
            grant(me.user_id, { gold: -CANSA.inspectFee });
            db.prepare('UPDATE farmers SET sunk_gold = sunk_gold + ? WHERE user_id = ?').run(CANSA.inspectFee, me.user_id);
          }
          markAction.run(ownerId, plot.idx, plot.planted_at, me.user_id, 'inspect', now);
          if (found) {
            db.prepare('DELETE FROM plots WHERE owner_id = ? AND idx = ?').run(ownerId, plot.idx);
            grant(me.user_id, { gold: CANSA.bounty });
          }
        })();
        if (found) {
          logEvent(`🚨 ${me.name} phát hiện cần sa ở ruộng nhà ${owner.name} — nhổ sạch, lĩnh thưởng ${CANSA.bounty.toLocaleString('vi')} vàng`);
          pushTo([ownerId], 'Ăn trộm dzui dzẻ 😋', `🚨 ${me.name} phát hiện cần sa ô ${plot.idx + 1} nhà bạn — mất trắng!`);
        }
        return { ...visitPayload(request, ownerId), found, bounty: found ? CANSA.bounty : 0, fee: CANSA.inspectFee, left: CANSA.inspectPerDay - used - 1 };
      });
      api.post('/harvest-help', async (request, reply) => {
        const { ownerId, idx, all } = request.body ?? {};
        const me = request.farmer;
        if (ownerId === me.user_id) return reply.code(400).send({ error: 'own_farm' });
        const owner = getFarmer.get(ownerId);
        if (!owner) return reply.code(400).send({ error: 'no_farm' });
        const now = Date.now();
        let plots = ripePlotsOf(owner, now);
        if (!all) plots = plots.filter((p) => p.idx === Number(idx));
        if (!plots.length) return reply.code(400).send({ error: 'nothing_ready' });
        const got = {};
        db.transaction(() => {
          for (const p of plots) {
            const before = invQty(owner.user_id, p.crop);
            harvestPlot(owner, p);
            got[p.crop] = (got[p.crop] || 0) + (invQty(owner.user_id, p.crop) - before);
          }
          grant(me.user_id, { gold: WATER_HELPER_GOLD * GOLD_MULT * plots.length, xp: WATER_HELPER_EXP * plots.length });
        })();
        const desc = Object.entries(got).map(([id, q]) => `${q} ${itemInfo(id)?.name || id}`).join(', ');
        logEvent(`🧺 ${me.name} thu hoạch giúp ${plots.length} ô nhà ${owner.name}: ${desc}`);
        pushTo([ownerId], 'Ăn trộm dzui dzẻ 😋', `🧺 ${me.name} vừa thu hoạch giúp ${plots.length} ô — ${desc} đã vào kho bạn!`);
        return { ...visitPayload(request, ownerId), harvested: plots.length, items: got, gained: WATER_HELPER_GOLD * GOLD_MULT * plots.length };
      });

      // Tưới giúp hết: mọi ô đang lớn mà lượt 15 phút đã mở.
      api.post('/water-help-all', async (request, reply) => {
        const { ownerId } = request.body ?? {};
        const me = request.farmer;
        if (ownerId === me.user_id) return reply.code(400).send({ error: 'own_farm' });
        const owner = getFarmer.get(ownerId);
        if (!owner) return reply.code(400).send({ error: 'no_farm' });
        const now = Date.now();
        const cooldown = scaleMs(WATER_HELP_COOLDOWN_MS, config.fast);
        const boost = scaleMs(WATER_HELP_BOOST_MS, config.fast);
        const plots = db.prepare('SELECT * FROM plots WHERE owner_id = ? AND ready_at > ? ORDER BY idx').all(ownerId, now)
          .filter((p) => { const last = lastAction.get(ownerId, p.idx, p.planted_at, me.user_id, 'water'); return !last || now - last.at >= cooldown; });
        if (!plots.length) return reply.code(400).send({ error: 'water_cooldown' });
        db.transaction(() => {
          const upd = db.prepare('UPDATE plots SET watered = 1, ready_at = MAX(?, ready_at - ?) WHERE owner_id = ? AND idx = ?');
          for (const p of plots) {
            upd.run(now, boost, ownerId, p.idx);
            touchAction.run(ownerId, p.idx, p.planted_at, me.user_id, 'water', now);
          }
          grant(me.user_id, { gold: WATER_HELPER_GOLD * GOLD_MULT * plots.length, xp: WATER_HELPER_EXP * plots.length });
        })();
        logEvent(`💧 ${me.name} tưới giúp ${plots.length} ô nhà ${owner.name} — cây chín sớm 10 phút`);
        return { ...visitPayload(request, ownerId), watered: plots.length, gained: WATER_HELPER_GOLD * GOLD_MULT * plots.length };
      });

      // ---- Kho & cửa hàng ----
      api.post('/sell', async (request, reply) => {
        const { item, qty } = request.body ?? {};
        const info = itemInfo(item);
        const me = request.farmer;
        const n = Math.max(1, Math.min(999, Number(qty) || 1));
        if (!info || !info.sell) return reply.code(400).send({ error: 'bad_request' });
        if (!invTake(me.user_id, item, n)) return reply.code(400).send({ error: 'not_enough_items' });
        let mult = 1;
        if (ANIMAL_PRODUCTS.has(item)) mult = 1 + 0.08 * skillRank(me, 'spcaocap');
        if (MACHINE_PRODUCTS.has(item)) mult = 1 + 0.05 * skillRank(me, 'donggoidep');
        const pm = priceMult(item);
        const gained = Math.round(info.sell * n * GOLD_MULT * mult * pm);
        grant(me.user_id, { gold: gained });
        addSold.run(gained, me.user_id);
        bumpSaturation(item, info.sell * n * GOLD_MULT);
        bumpQuest(me.user_id, 'sell', n);
        return { me: fresh(me.user_id), gained, priceMult: Math.round(pm * 100) / 100 };
      });

      // ---- Thu mua từ bạn bè: đăng tin cần hàng, vàng ký quỹ lúc đăng ----
      const wantPrice = (item) => Math.round(itemInfo(item).sell * GOLD_MULT * WANT_MARKUP);
      function wantsView(meId) {
        const rows = db.prepare('SELECT w.*, f.name AS owner_name FROM wants w JOIN farmers f ON f.user_id = w.owner_id ORDER BY w.created_at DESC').all();
        const view = (w) => ({ id: w.id, ownerId: w.owner_id, ownerName: w.owner_name, item: w.item, qty: w.qty, filled: w.filled, price: w.price, createdAt: w.created_at });
        return { mine: rows.filter((w) => w.owner_id === meId).map(view), others: rows.filter((w) => w.owner_id !== meId).map(view) };
      }
      api.get('/wants', async (request) => wantsView(request.farmer.user_id));

      api.post('/want-create', async (request, reply) => {
        const { item, qty } = request.body ?? {};
        const me = request.farmer;
        const info = itemInfo(item);
        const n = Math.floor(Number(qty) || 0);
        if (!info || !info.sell || n < 1 || n > WANT_MAX_QTY) return reply.code(400).send({ error: 'bad_request' });
        const open = db.prepare('SELECT COUNT(*) c FROM wants WHERE owner_id = ?').get(me.user_id).c;
        if (open >= WANT_MAX_OPEN) return reply.code(400).send({ error: 'too_many_wants' });
        const price = wantPrice(item);
        if (me.gold < price * n) return reply.code(400).send({ error: 'not_enough_gold' });
        db.transaction(() => {
          grant(me.user_id, { gold: -price * n });
          db.prepare('INSERT INTO wants (owner_id, item, qty, filled, price, created_at) VALUES (?, ?, ?, 0, ?, ?)').run(me.user_id, item, n, price, Date.now());
        })();
        logEvent(`🤝 ${me.name} cần mua ${n} ${info.name} ${info.emoji} — trả ${price.toLocaleString('vi')} vàng/cái`);
        const others = db.prepare('SELECT user_id FROM farmers WHERE user_id != ?').all(me.user_id).map((r) => r.user_id);
        pushTo(others, 'Ăn trộm dzui dzẻ 😋', `🤝 ${me.name} cần mua ${n} ${info.name} ${info.emoji} — trả ${price.toLocaleString('vi')} vàng/cái (130% giá chợ). Có hàng thì vào Thu mua bán ngay!`);
        return { me: fresh(me.user_id), wants: wantsView(me.user_id) };
      });

      api.post('/want-cancel', async (request, reply) => {
        const me = request.farmer;
        const w = db.prepare('SELECT * FROM wants WHERE id = ? AND owner_id = ?').get(Number(request.body?.id), me.user_id);
        if (!w) return reply.code(400).send({ error: 'no_want' });
        const refund = (w.qty - w.filled) * w.price;
        db.transaction(() => {
          grant(me.user_id, { gold: refund });
          db.prepare('DELETE FROM wants WHERE id = ?').run(w.id);
        })();
        return { me: fresh(me.user_id), wants: wantsView(me.user_id), refund };
      });

      api.post('/want-fill', async (request, reply) => {
        const { id, qty } = request.body ?? {};
        const me = request.farmer;
        const w = db.prepare('SELECT * FROM wants WHERE id = ?').get(Number(id));
        if (!w) return reply.code(400).send({ error: 'no_want' });
        if (w.owner_id === me.user_id) return reply.code(400).send({ error: 'own_want' });
        const remaining = w.qty - w.filled;
        const n = Math.max(1, Math.min(remaining, Math.floor(Number(qty) || 1)));
        if (invQty(me.user_id, w.item) < n) return reply.code(400).send({ error: 'not_enough_items' });
        const info = itemInfo(w.item);
        const owner = getFarmer.get(w.owner_id);
        db.transaction(() => {
          invTake(me.user_id, w.item, n);
          invAdd(w.owner_id, w.item, n);
          grant(me.user_id, { gold: w.price * n });
          addSold.run(w.price * n, me.user_id);
          if (w.filled + n >= w.qty) db.prepare('DELETE FROM wants WHERE id = ?').run(w.id);
          else db.prepare('UPDATE wants SET filled = filled + ? WHERE id = ?').run(n, w.id);
          bumpQuest(me.user_id, 'sell', n);
        })();
        logEvent(`🤝 ${me.name} bán ${n} ${info.name} ${info.emoji} cho ${owner?.name || '?'} — ${(w.price * n).toLocaleString('vi')} vàng`);
        pushTo([w.owner_id], 'Ăn trộm dzui dzẻ 😋', `🤝 ${me.name} vừa bán cho bạn ${n} ${info.name} ${info.emoji}${w.filled + n >= w.qty ? ' — đủ hàng rồi!' : ''}`);
        return { me: fresh(me.user_id), wants: wantsView(me.user_id), gained: w.price * n, sold: n };
      });

      api.post('/buy', async (request, reply) => {
        const { item, qty } = request.body ?? {};
        const info = GOODS[item];
        const me = request.farmer;
        const n = Math.max(1, Math.min(999, Number(qty) || 1));
        if (!info || !info.buy) return reply.code(400).send({ error: 'bad_request' });
        if (me.gold < info.buy * n) return reply.code(400).send({ error: 'not_enough_gold' });
        db.transaction(() => {
          grant(me.user_id, { gold: -info.buy * n });
          invAdd(me.user_id, item, n);
        })();
        return { me: fresh(me.user_id) };
      });

      // ---- Chuồng gà ----
      // want: số con muốn mua, hoặc 'max' = mua đầy chuồng (tới hết vàng).
      async function buyAnimal(request, reply, kind, want = 1) {
        const a = ANIMALS[kind];
        const me = request.farmer;
        if (!a) return reply.code(400).send({ error: 'bad_request' });
        if (levelFor(me.xp) < a.level) return reply.code(400).send({ error: 'level_too_low' });
        const count = db.prepare('SELECT COUNT(*) c FROM animals WHERE owner_id = ? AND kind = ?').get(me.user_id, kind).c;
        const space = a.capacities[barnLevel(me, kind) - 1] - count;
        if (space <= 0) return reply.code(400).send({ error: 'coop_full' });
        if (me.gold < a.price) return reply.code(400).send({ error: 'not_enough_gold' });
        const asked = want === 'max' ? space : Math.max(1, Math.floor(Number(want) || 1));
        const n = Math.min(asked, space, Math.floor(me.gold / a.price));
        db.transaction(() => {
          grant(me.user_id, { gold: -a.price * n });
          const ins = db.prepare('INSERT INTO animals (owner_id, kind) VALUES (?, ?)');
          for (let i = 0; i < n; i += 1) ins.run(me.user_id, kind);
        })();
        logEvent(n > 1 ? `${a.emoji} ${me.name} đón ${n} chú ${a.name} mới về chuồng` : `${a.emoji} ${me.name} đón một chú ${a.name} mới về chuồng`);
        return { me: fresh(me.user_id), bought: n };
      }
      api.post('/buy-animal', async (request, reply) => buyAnimal(request, reply, request.body?.kind, request.body?.count ?? 1));
      api.post('/buy-chicken', async (request, reply) => buyAnimal(request, reply, 'ga'));

      api.post('/feed', async (request, reply) => {
        const me = request.farmer;
        const kind = ANIMALS[request.body?.kind] ? request.body.kind : 'ga';
        const a = ANIMALS[kind];
        const hungry = db.prepare('SELECT * FROM animals WHERE owner_id = ? AND kind = ? AND ready_at IS NULL').all(me.user_id, kind);
        if (hungry.length === 0) return reply.code(400).send({ error: 'no_hungry_animal' });
        const canFeed = Math.min(hungry.length, Math.floor(invQty(me.user_id, FEED_ITEM) / a.feedQty));
        if (canFeed === 0) return reply.code(400).send({ error: 'not_enough_feed' });
        const readyAt = Date.now() + scaleMs(a.produceMs, config.fast);
        db.transaction(() => {
          invTake(me.user_id, FEED_ITEM, canFeed * a.feedQty);
          const upd = db.prepare('UPDATE animals SET ready_at = ? WHERE id = ?');
          for (const row of hungry.slice(0, canFeed)) upd.run(readyAt, row.id);
          bumpQuest(me.user_id, 'feed', canFeed);
        })();
        return { me: fresh(me.user_id), fed: canFeed };
      });

      api.post('/collect', async (request, reply) => {
        const me = request.farmer;
        const kind = ANIMALS[request.body?.kind] ? request.body.kind : 'ga';
        const a = ANIMALS[kind];
        const now = Date.now();
        const ready = db.prepare('SELECT * FROM animals WHERE owner_id = ? AND kind = ? AND ready_at IS NOT NULL AND ready_at <= ?')
          .all(me.user_id, kind, now);
        if (ready.length === 0) return reply.code(400).send({ error: 'nothing_ready' });
        db.transaction(() => {
          for (const row of ready) {
            invAdd(me.user_id, a.product, 1);
            grant(me.user_id, { xp: a.expCollect });
            db.prepare('UPDATE animals SET ready_at = NULL WHERE id = ?').run(row.id);
          }
        })();
        return { me: fresh(me.user_id), collected: ready.length, product: a.product };
      });

      // ---- Cối xay ----
      // Xếp `count` mẻ công thức vào máy (mỗi món một job riêng, chạy song song).
      // Trả { n, total } hoặc { error }. Không tự trả lời HTTP.
      function queueRecipe(me, machineId, recipeId, count = 1) {
        const machine = MACHINES[machineId];
        const recipe = machine?.recipes[recipeId];
        if (!machine || !recipe) return { error: 'bad_request' };
        if (levelFor(me.xp) < machine.level) return { error: 'level_too_low' };
        const cur = db.prepare('SELECT * FROM machine_jobs WHERE owner_id = ? AND kind = ? AND recipe = ?').get(me.user_id, machineId, recipeId);
        const queued = cur ? (cur.queue_count || 1) : 0;
        // Số mẻ xếp được: theo yêu cầu, chỗ trống trong hàng đợi và nguyên liệu trong kho.
        let n = Math.max(0, Math.min(MACHINE_QUEUE_MAX - queued, Math.floor(Number(count) || 1)));
        for (const [item, qty] of Object.entries(recipe.in)) {
          n = Math.min(n, Math.floor(invQty(me.user_id, item) / qty));
        }
        if (n < 1) return { error: queued >= MACHINE_QUEUE_MAX ? 'queue_full' : 'not_enough_items' };
        db.transaction(() => {
          for (const [item, qty] of Object.entries(recipe.in)) invTake(me.user_id, item, qty * n);
          if (queued) {
            db.prepare('UPDATE machine_jobs SET queue_count = queue_count + ? WHERE owner_id = ? AND kind = ? AND recipe = ?').run(n, me.user_id, machineId, recipeId);
          } else {
            db.prepare('INSERT INTO machine_jobs (owner_id, kind, recipe, ready_at, queue_count, poached) VALUES (?, ?, ?, ?, ?, 0)')
              .run(me.user_id, machineId, recipeId, Date.now() + machineTime(me, scaleMs(recipe.ms, config.fast), machineId), n);
          }
        })();
        return { n, total: queued + n };
      }
      async function machineRun(request, reply, machineId, recipeId, count = 1) {
        const r = queueRecipe(request.farmer, machineId, recipeId, count);
        if (r.error) return reply.code(400).send({ error: r.error });
        return { me: fresh(request.farmer.user_id), queued: r.n, total: r.total };
      }

      // Chế biến hết: duyệt mọi máy đã mở, mọi công thức, xếp tối đa theo kho
      // (kho dùng chung nên công thức đứng trước được ưu tiên nguyên liệu).
      api.post('/machine-run-all', async (request, reply) => {
        const me = request.farmer;
        const jobs = [];
        let total = 0;
        for (const machine of Object.values(MACHINES)) {
          if (levelFor(me.xp) < machine.level) continue;
          for (const recipe of Object.values(machine.recipes)) {
            if (recipe.id === FEED_ITEM) continue; // thức ăn gia súc: tự chọn tay
            const r = queueRecipe(me, machine.id, recipe.id, MACHINE_QUEUE_MAX);
            if (!r.error) { jobs.push({ machine: machine.id, recipe: recipe.id, n: r.n }); total += r.n; }
          }
        }
        if (!total) return reply.code(400).send({ error: 'not_enough_items' });
        logEvent(`🏭 ${me.name} xếp một lượt ${total} mẻ vào ${new Set(jobs.map((j) => j.machine)).size} máy`);
        return { me: fresh(me.user_id), queued: total, jobs };
      });

      // Lấy một món (recipeId) hoặc mọi món đã chín của máy (recipeId bỏ trống).
      // Thu các job đã chín (danh sách dòng machine_jobs) — cộng dồn vào got/collected.
      function collectJobs(me, jobs, now, got, counter) {
        db.transaction(() => {
          for (const cur of jobs) {
            const machine = MACHINES[cur.kind];
            const machineId = cur.kind;
            const recipe = machine?.recipes[cur.recipe];
            if (!recipe) { db.prepare('DELETE FROM machine_jobs WHERE owner_id = ? AND kind = ? AND recipe = ?').run(me.user_id, machineId, cur.recipe); continue; }
            const cycle = machineTime(me, scaleMs(recipe.ms, config.fast));
            const total = cur.queue_count || 1;
            const done = Math.min(total, 1 + Math.floor((now - cur.ready_at) / cycle));
            for (const [item, qty] of Object.entries(recipe.out)) {
              const q = Math.max(0, qty * done - (cur.poached ? 1 : 0));
              invAdd(me.user_id, item, q);
              got[item] = (got[item] || 0) + q;
            }
            grant(me.user_id, { xp: recipe.exp * done });
            if (done >= total) {
              db.prepare('DELETE FROM machine_jobs WHERE owner_id = ? AND kind = ? AND recipe = ?').run(me.user_id, machineId, cur.recipe);
            } else {
              db.prepare('UPDATE machine_jobs SET ready_at = ?, queue_count = ?, poached = 0 WHERE owner_id = ? AND kind = ? AND recipe = ?')
                .run(cur.ready_at + done * cycle, total - done, me.user_id, machineId, cur.recipe);
            }
            counter.n += done;
          }
          if (counter.n) { bumpQuest(me.user_id, 'process', counter.n); bumpFest(me.user_id, 'process', counter.n); }
        })();
      }
      async function machineCollect(request, reply, machineId, recipeId) {
        const machine = MACHINES[machineId];
        const me = request.farmer;
        if (!machine) return reply.code(400).send({ error: 'bad_request' });
        const now = Date.now();
        const jobs = recipeId
          ? db.prepare('SELECT * FROM machine_jobs WHERE owner_id = ? AND kind = ? AND recipe = ?').all(me.user_id, machineId, recipeId)
          : db.prepare('SELECT * FROM machine_jobs WHERE owner_id = ? AND kind = ? AND ready_at <= ?').all(me.user_id, machineId, now);
        if (!jobs.length) return reply.code(400).send({ error: recipeId ? 'mill_empty' : 'not_ready' });
        if (recipeId && now < jobs[0].ready_at) return reply.code(400).send({ error: 'not_ready' });
        const got = {}; const counter = { n: 0 };
        collectJobs(me, jobs, now, got, counter);
        return { me: fresh(me.user_id), product: Object.keys(got)[0], items: got, collected: counter.n };
      }
      // Thu hết: mọi job đã chín ở mọi máy.
      api.post('/machine-collect-all', async (request, reply) => {
        const me = request.farmer;
        const now = Date.now();
        const jobs = db.prepare('SELECT * FROM machine_jobs WHERE owner_id = ? AND ready_at <= ?').all(me.user_id, now);
        if (!jobs.length) return reply.code(400).send({ error: 'not_ready' });
        const got = {}; const counter = { n: 0 };
        collectJobs(me, jobs, now, got, counter);
        return { me: fresh(me.user_id), product: Object.keys(got)[0], items: got, collected: counter.n };
      });

      api.post('/machine-run', async (request, reply) => machineRun(request, reply, request.body?.machine, request.body?.recipe, request.body?.count));
      api.post('/machine-collect', async (request, reply) => machineCollect(request, reply, request.body?.machine, request.body?.recipe));
      api.post('/mill', async (request, reply) => machineRun(request, reply, 'coixay', request.body?.recipe));
      api.post('/mill-collect', async (request, reply) => machineCollect(request, reply, 'coixay'));

      // ---- Con vật may mắn: bấm trúng ăn kim cương ----
      api.post('/critter-catch', async (request, reply) => {
        const me = request.farmer;
        const now = Date.now();
        const at = me.critter_next_at;
        if (!at || now < at || now > at + CRITTER.windowMs + CRITTER.graceMs) {
          return reply.code(400).send({ error: 'critter_gone' });
        }
        const gems = CRITTER.gemMin + Math.floor(Math.random() * (CRITTER.gemMax - CRITTER.gemMin + 1));
        const gapMin = scaleMs(CRITTER.minGapMs, config.fast);
        const gapMax = scaleMs(CRITTER.maxGapMs, config.fast);
        const next = now + gapMin + Math.floor(Math.random() * (gapMax - gapMin));
        db.transaction(() => {
          grant(me.user_id, { gems });
          db.prepare('UPDATE farmers SET critter_next_at = ? WHERE user_id = ?').run(next, me.user_id);
        })();
        logEvent(`✨ ${me.name} tóm được ${critterKindFor(at)} may mắn — +${gems} kim cương!`);
        return { me: fresh(me.user_id), gems, kind: critterKindFor(at) };
      });

      // ---- Đơn hàng ----
      api.post('/order-deliver', async (request, reply) => {
        const { id } = request.body ?? {};
        const me = request.farmer;
        const order = db.prepare('SELECT * FROM orders WHERE id = ? AND owner_id = ?').get(id, me.user_id);
        if (!order) return reply.code(400).send({ error: 'no_order' });
        const items = JSON.parse(order.items_json);
        for (const [item, qty] of Object.entries(items)) {
          if (invQty(me.user_id, item) < qty) return reply.code(400).send({ error: 'not_enough_items' });
        }
        db.transaction(() => {
          for (const [item, qty] of Object.entries(items)) invTake(me.user_id, item, qty);
          const orderGold = Math.round(order.gold * (1 + 0.05 * skillRank(me, 'nguoibankheo')));
          grant(me.user_id, { gold: orderGold, xp: order.exp, stars: order.stars });
          addSold.run(orderGold, me.user_id);
          db.prepare('DELETE FROM orders WHERE id = ?').run(order.id);
          db.prepare('UPDATE farmers SET next_order_at = ? WHERE user_id = ?')
            .run(Date.now() + scaleMs(ORDER_REFRESH_MS, config.fast), me.user_id);
          bumpQuest(me.user_id, 'deliver');
          bumpFest(me.user_id, 'deliver');
        })();
        logEvent(`🚚 ${me.name} giao một đơn hàng, nhận ${order.gold} vàng`);
        return { me: fresh(me.user_id), gained: order.gold };
      });

      api.post('/order-discard', async (request, reply) => {
        const { id } = request.body ?? {};
        const me = request.farmer;
        const order = db.prepare('SELECT * FROM orders WHERE id = ? AND owner_id = ?').get(id, me.user_id);
        if (!order) return reply.code(400).send({ error: 'no_order' });
        db.transaction(() => {
          db.prepare('DELETE FROM orders WHERE id = ?').run(order.id);
          db.prepare('UPDATE farmers SET next_order_at = ? WHERE user_id = ?')
            .run(Date.now() + scaleMs(ORDER_REFRESH_MS, config.fast), me.user_id);
        })();
        return { me: fresh(me.user_id) };
      });

      // ---- Nhiệm vụ ngày: rương ----
      api.post('/quest-chest', async (request, reply) => {
        const me = request.farmer;
        const d = getDaily(me.user_id);
        if (d.chest_claimed) return reply.code(400).send({ error: 'already_claimed' });
        const done = DAILY_QUESTS.filter((q) => (d.counters[q.id] || 0) >= q.target);
        if (done.length < DAILY_CHEST.questsRequired) return reply.code(400).send({ error: 'not_enough_quests' });
        const gem = Math.random() < DAILY_CHEST.gemChance ? 1 : 0;
        db.transaction(() => {
          // Thưởng từng nhiệm vụ đã xong + rương tổng.
          for (const q of done) grant(me.user_id, { gold: q.gold * GOLD_MULT, xp: q.exp, stars: q.stars || 0 });
          grant(me.user_id, { gold: DAILY_CHEST.gold * GOLD_MULT, xp: DAILY_CHEST.exp, gems: gem });
          db.prepare('UPDATE daily SET chest_claimed = 1 WHERE owner_id = ? AND day = ?').run(me.user_id, d.day);
        })();
        logEvent(`🎁 ${me.name} mở rương nhiệm vụ ngày`);
        return { me: fresh(me.user_id), gem };
      });

      // ---- Mốc sao ----
      api.post('/star-claim', async (request, reply) => {
        const me = request.farmer;
        const next = STAR_MILESTONES.find(
          (m) => !db.prepare('SELECT 1 FROM star_claims WHERE owner_id = ? AND milestone = ?').get(me.user_id, m.stars),
        );
        if (!next) return reply.code(400).send({ error: 'no_milestone' });
        if (me.stars < next.stars) return reply.code(400).send({ error: 'not_enough_stars' });
        db.transaction(() => {
          grant(me.user_id, { gold: (next.gold || 0) * GOLD_MULT, gems: next.gems || 0 });
          db.prepare('INSERT INTO star_claims (owner_id, milestone) VALUES (?, ?)').run(me.user_id, next.stars);
        })();
        return { me: fresh(me.user_id), claimed: next };
      });

      // ---- Mở rộng đất ----
      // ---- Bể hút vàng: nâng cấp nhà máy, xa xỉ phẩm, xổ số làng ----
      // ---- Cho tiền / xin tiền giữa người chơi (chuyển vàng, không tạo vàng mới) ----
      const GOLD_ASK_MAX_OPEN = 5;
      const parseAmount = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 1 && n <= 1_000_000_000 ? n : 0; };
      api.post('/gold-give', async (request, reply) => {
        const { toId, amount } = request.body ?? {};
        const me = request.farmer;
        const n = parseAmount(amount);
        const to = getFarmer.get(Number(toId));
        if (!to || to.user_id === me.user_id) return reply.code(400).send({ error: 'no_farm' });
        if (!n) return reply.code(400).send({ error: 'bad_amount' });
        if (me.gold < n) return reply.code(400).send({ error: 'not_enough_gold' });
        db.transaction(() => { grant(me.user_id, { gold: -n }); grant(to.user_id, { gold: n }); })();
        logEvent(`💝 ${me.name} tặng ${to.name} ${n.toLocaleString('vi')} vàng`);
        pushTo([to.user_id], 'Ăn trộm dzui dzẻ 😋', `💝 ${me.name} vừa tặng bạn ${n.toLocaleString('vi')} vàng!`);
        return { me: fresh(me.user_id), given: n };
      });
      api.post('/gold-ask', async (request, reply) => {
        const { toId, amount, note } = request.body ?? {};
        const me = request.farmer;
        const n = parseAmount(amount);
        const to = getFarmer.get(Number(toId));
        if (!to || to.user_id === me.user_id) return reply.code(400).send({ error: 'no_farm' });
        if (!n) return reply.code(400).send({ error: 'bad_amount' });
        const open = db.prepare("SELECT COUNT(*) n FROM gold_requests WHERE from_id = ? AND status = 'open'").get(me.user_id).n;
        if (open >= GOLD_ASK_MAX_OPEN) return reply.code(400).send({ error: 'too_many_requests' });
        const text = String(note || '').slice(0, 80);
        db.prepare('INSERT INTO gold_requests (from_id, to_id, amount, note, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(me.user_id, to.user_id, n, text, 'open', Date.now());
        pushTo([to.user_id], 'Ăn trộm dzui dzẻ 😋', `🙏 ${me.name} xin bạn ${n.toLocaleString('vi')} vàng${text ? `: “${text}”` : ''} — vào Xin/Cho để trả lời.`);
        return { me: fresh(me.user_id), asked: n };
      });
      function goldRequestsView(meId) {
        const q = (sql, ...a) => db.prepare(sql).all(...a).map((r) => ({ id: r.id, fromId: r.from_id, fromName: r.from_name, toId: r.to_id, toName: r.to_name, amount: r.amount, note: r.note, status: r.status, createdAt: r.created_at, resolvedAt: r.resolved_at }));
        const base = 'SELECT g.*, f.name AS from_name, t.name AS to_name FROM gold_requests g JOIN farmers f ON f.user_id = g.from_id JOIN farmers t ON t.user_id = g.to_id';
        return {
          incoming: q(`${base} WHERE g.to_id = ? AND g.status = 'open' ORDER BY g.created_at DESC`, meId),
          outgoing: q(`${base} WHERE g.from_id = ? ORDER BY g.created_at DESC LIMIT 20`, meId),
        };
      }
      api.get('/gold-requests', async (request) => goldRequestsView(request.farmer.user_id));
      api.post('/gold-request-act', async (request, reply) => {
        const { id, action } = request.body ?? {};
        const me = request.farmer;
        const row = db.prepare('SELECT * FROM gold_requests WHERE id = ?').get(Number(id));
        if (!row || row.status !== 'open') return reply.code(400).send({ error: 'request_closed' });
        const now = Date.now();
        if (action === 'cancel') {
          if (row.from_id !== me.user_id) return reply.code(403).send({ error: 'forbidden' });
          db.prepare("UPDATE gold_requests SET status = 'cancelled', resolved_at = ? WHERE id = ?").run(now, row.id);
        } else if (action === 'decline') {
          if (row.to_id !== me.user_id) return reply.code(403).send({ error: 'forbidden' });
          db.prepare("UPDATE gold_requests SET status = 'declined', resolved_at = ? WHERE id = ?").run(now, row.id);
          pushTo([row.from_id], 'Ăn trộm dzui dzẻ 😋', `🙅 ${me.name} chưa cho được ${row.amount.toLocaleString('vi')} vàng bạn xin.`);
        } else if (action === 'pay') {
          if (row.to_id !== me.user_id) return reply.code(403).send({ error: 'forbidden' });
          if (me.gold < row.amount) return reply.code(400).send({ error: 'not_enough_gold' });
          db.transaction(() => {
            grant(me.user_id, { gold: -row.amount });
            grant(row.from_id, { gold: row.amount });
            db.prepare("UPDATE gold_requests SET status = 'paid', resolved_at = ? WHERE id = ?").run(now, row.id);
          })();
          const asker = getFarmer.get(row.from_id);
          logEvent(`💝 ${me.name} cho ${asker?.name || '?'} ${row.amount.toLocaleString('vi')} vàng theo lời xin`);
          pushTo([row.from_id], 'Ăn trộm dzui dzẻ 😋', `💝 ${me.name} đã cho bạn ${row.amount.toLocaleString('vi')} vàng như bạn xin!`);
        } else return reply.code(400).send({ error: 'bad_request' });
        return { me: fresh(me.user_id), requests: goldRequestsView(me.user_id) };
      });

      api.post('/away-ack', async (request) => {
        db.prepare('UPDATE farmers SET away_report_json = NULL WHERE user_id = ?').run(request.farmer.user_id);
        return { me: fresh(request.farmer.user_id) };
      });

      api.post('/machine-upgrade', async (request, reply) => {
        const { machine } = request.body ?? {};
        const me = request.farmer;
        if (!MACHINES[machine]) return reply.code(400).send({ error: 'bad_request' });
        const lv = machineLevel(me, machine);
        if (lv >= MACHINE_UPGRADE_GOLD.length) return reply.code(400).send({ error: 'max_level' });
        const cost = MACHINE_UPGRADE_GOLD[lv];
        if (me.gold < cost) return reply.code(400).send({ error: 'not_enough_gold' });
        const levels = { ...machineLevels(me), [machine]: lv + 1 };
        db.transaction(() => {
          grant(me.user_id, { gold: -cost });
          db.prepare('UPDATE farmers SET machine_levels_json = ?, sunk_gold = sunk_gold + ? WHERE user_id = ?').run(JSON.stringify(levels), cost, me.user_id);
        })();
        logEvent(`⚙️ ${me.name} nâng cấp ${MACHINES[machine].name} lên cấp ${lv + 1} (−${(lv + 1) * 10}% thời gian)`);
        return { me: fresh(me.user_id) };
      });

      api.post('/luxury-buy', async (request, reply) => {
        const { item } = request.body ?? {};
        const me = request.farmer;
        const lux = LUXURY[item];
        if (!lux) return reply.code(400).send({ error: 'bad_request' });
        if (db.prepare('SELECT 1 FROM luxury WHERE owner_id = ? AND item = ?').get(me.user_id, item)) return reply.code(400).send({ error: 'already_owned' });
        if (me.gold < lux.price) return reply.code(400).send({ error: 'not_enough_gold' });
        db.transaction(() => {
          grant(me.user_id, { gold: -lux.price });
          db.prepare('INSERT INTO luxury (owner_id, item, at) VALUES (?, ?, ?)').run(me.user_id, item, Date.now());
          db.prepare('UPDATE farmers SET sunk_gold = sunk_gold + ? WHERE user_id = ?').run(lux.price, me.user_id);
          if (lux.kind === 'title') db.prepare('UPDATE farmers SET title_id = ? WHERE user_id = ?').run(item, me.user_id);
          if (lux.kind === 'frame') db.prepare('UPDATE farmers SET frame_id = ? WHERE user_id = ?').run(item, me.user_id);
        })();
        logEvent(`💎 ${me.name} vung ${lux.price.toLocaleString('vi')} vàng tậu ${lux.emoji} ${lux.name}!`);
        const others = db.prepare('SELECT user_id FROM farmers WHERE user_id != ?').all(me.user_id).map((r) => r.user_id);
        pushTo(others, 'Ăn trộm dzui dzẻ 😋', `💎 ${me.name} vừa vung ${lux.price.toLocaleString('vi')} vàng tậu ${lux.emoji} ${lux.name}!`);
        return { me: fresh(me.user_id) };
      });

      api.post('/luxury-equip', async (request, reply) => {
        const { item, kind } = request.body ?? {};
        const me = request.farmer;
        const k = item ? LUXURY[item]?.kind : kind;
        if (!['title', 'frame'].includes(k)) return reply.code(400).send({ error: 'bad_request' });
        if (item && !db.prepare('SELECT 1 FROM luxury WHERE owner_id = ? AND item = ?').get(me.user_id, item)) return reply.code(400).send({ error: 'not_owned' });
        db.prepare(`UPDATE farmers SET ${k === 'title' ? 'title_id' : 'frame_id'} = ? WHERE user_id = ?`).run(item || '', me.user_id);
        return { me: fresh(me.user_id) };
      });

      function lotteryView(me) {
        const day = thiefDayKey();
        const tot = db.prepare('SELECT COALESCE(SUM(qty), 0) q, COUNT(*) n FROM lottery_tickets WHERE day = ?').get(day);
        const mine = db.prepare('SELECT qty FROM lottery_tickets WHERE day = ? AND owner_id = ?').get(day, me.user_id)?.qty || 0;
        const lastRow = db.prepare('SELECT * FROM lottery_draws ORDER BY at DESC LIMIT 1').get() || null;
        let last = null;
        if (lastRow) {
          let winners = [];
          try { winners = lastRow.winners_json ? JSON.parse(lastRow.winners_json) : []; } catch { winners = []; }
          if (!winners.length) winners = [{ id: lastRow.winner_id, name: lastRow.winner_name, rank: 1, gold: lastRow.pot }];
          last = { day: lastRow.day, pot: lastRow.pot, tickets: lastRow.tickets, winners };
        }
        return { ticket: LOTTERY.ticket, maxPerDay: LOTTERY.maxPerDay, base: LOTTERY.base, perTicket: LOTTERY.perTicket, shares: LOTTERY.shares, tickets: tot.q, players: tot.n, pot: tot.q > 0 ? LOTTERY.base + LOTTERY.perTicket * tot.q : LOTTERY.base, mine, last };
      }
      api.get('/lottery', async (request) => { settleThiefBoard(); return lotteryView(request.farmer); });
      api.post('/lottery-buy', async (request, reply) => {
        const me = request.farmer;
        const n = Math.max(1, Math.min(LOTTERY.maxPerDay, Math.floor(Number(request.body?.qty) || 1)));
        const day = thiefDayKey();
        const mine = db.prepare('SELECT qty FROM lottery_tickets WHERE day = ? AND owner_id = ?').get(day, me.user_id)?.qty || 0;
        if (mine + n > LOTTERY.maxPerDay) return reply.code(400).send({ error: 'lottery_max' });
        const cost = n * LOTTERY.ticket;
        if (me.gold < cost) return reply.code(400).send({ error: 'not_enough_gold' });
        db.transaction(() => {
          grant(me.user_id, { gold: -cost });
          db.prepare('UPDATE farmers SET sunk_gold = sunk_gold + ? WHERE user_id = ?').run(cost, me.user_id);
          db.prepare('INSERT INTO lottery_tickets (day, owner_id, qty) VALUES (?, ?, ?) ON CONFLICT(day, owner_id) DO UPDATE SET qty = qty + excluded.qty').run(day, me.user_id, n);
        })();
        return { me: fresh(me.user_id), lottery: lotteryView(me) };
      });

      api.post('/expand', async (request, reply) => {
        const me = request.farmer;
        if (me.plots_count >= MAX_PLOTS) return reply.code(400).send({ error: 'max_plots' });
        const exp = EXPANSIONS[(me.plots_count - START_PLOTS) / 4];
        if (levelFor(me.xp) < exp.level) return reply.code(400).send({ error: 'level_too_low' });
        if (me.gold < exp.gold) return reply.code(400).send({ error: 'not_enough_gold' });
        db.transaction(() => {
          grant(me.user_id, { gold: -exp.gold });
          db.prepare('UPDATE farmers SET plots_count = plots_count + 4 WHERE user_id = ?').run(me.user_id);
        })();
        logEvent(`🧱 ${me.name} mở rộng nông trại lên ${me.plots_count + 4} ô`);
        return { me: fresh(me.user_id) };
      });

      // ---- Kim cương tăng tốc (cây hoặc cối xay) ----
      api.post('/speedup', async (request, reply) => {
        const { target, idx } = request.body ?? {};
        const me = request.farmer;
        const now = Date.now();
        let remaining;
        if (target === 'plot') {
          const plot = getPlot.get(me.user_id, idx);
          if (!plot || now >= plot.ready_at) return reply.code(400).send({ error: 'not_growing' });
          remaining = plot.ready_at - now;
          const cost = speedupCost(remaining);
          if (me.gems < cost) return reply.code(400).send({ error: 'not_enough_gems' });
          db.transaction(() => {
            grant(me.user_id, { gems: -cost });
            db.prepare('UPDATE plots SET ready_at = ? WHERE owner_id = ? AND idx = ?').run(now, me.user_id, idx);
          })();
          return { me: fresh(me.user_id), cost };
        }
        if (target === 'mill' || target === 'machine') {
          const mk = target === 'machine' && MACHINES[request.body?.kind] ? request.body.kind : 'coixay';
          const rc = request.body?.recipe;
          const cur = rc
            ? db.prepare('SELECT * FROM machine_jobs WHERE owner_id = ? AND kind = ? AND recipe = ?').get(me.user_id, mk, rc)
            : db.prepare('SELECT * FROM machine_jobs WHERE owner_id = ? AND kind = ? AND ready_at > ? ORDER BY ready_at LIMIT 1').get(me.user_id, mk, now);
          if (!cur || now >= cur.ready_at) return reply.code(400).send({ error: 'not_processing' });
          remaining = cur.ready_at - now;
          const cost = speedupCost(remaining);
          if (me.gems < cost) return reply.code(400).send({ error: 'not_enough_gems' });
          db.transaction(() => {
            grant(me.user_id, { gems: -cost });
            db.prepare('UPDATE machine_jobs SET ready_at = ? WHERE owner_id = ? AND kind = ? AND recipe = ?').run(now, me.user_id, mk, cur.recipe);
          })();
          return { me: fresh(me.user_id), cost };
        }
        return reply.code(400).send({ error: 'bad_request' });
      });

      // ---- Kỹ năng ----
      api.post('/skill-learn', async (request, reply) => {
        const { id } = request.body ?? {};
        const me = request.farmer;
        const node = SKILL_NODES[id];
        if (!node) return reply.code(400).send({ error: 'bad_request' });
        if (levelFor(me.xp) < SKILLS.unlockLevel) return reply.code(400).send({ error: 'level_too_low' });
        const learned = skillsOf(me);
        const rank = learned[id] || 0;
        if (rank >= SKILL_MAX_RANK) return reply.code(400).send({ error: 'max_rank' });
        const cost = skillCost(node, rank + 1);
        if (skillPointsLeft(me) < cost) return reply.code(400).send({ error: 'no_skill_points' });
        learned[id] = rank + 1;
        db.prepare('UPDATE farmers SET skills_json = ? WHERE user_id = ?').run(JSON.stringify(learned), me.user_id);
        logEvent(`🎓 ${me.name} nâng kỹ năng ${node.name} lên bậc ${rank + 1}`);
        return { me: fresh(me.user_id), rank: rank + 1 };
      });

      api.post('/skill-respec', async (request, reply) => {
        const me = request.farmer;
        const now = Date.now();
        if (now < (me.last_respec_at || 0) + SKILLS.respecCooldownMs) return reply.code(400).send({ error: 'respec_cooldown' });
        if (me.gems < SKILLS.respecGems) return reply.code(400).send({ error: 'not_enough_gems' });
        db.transaction(() => {
          grant(me.user_id, { gems: -SKILLS.respecGems });
          db.prepare("UPDATE farmers SET skills_json = '{}', last_respec_at = ? WHERE user_id = ?").run(now, me.user_id);
        })();
        return { me: fresh(me.user_id) };
      });

      // ---- Chó canh vườn ----
      // Gọi trước mỗi lần trộm nhà người khác. Trả về null nếu thoát; nếu bị tóm
      // thì đã trừ tiền phạt, chuyển cho chủ, ghi log — trả về reply 400.
      const ownerOnline = (owner, now = Date.now()) => now - (owner.last_seen_at || 0) < scaleMs(DOG.onlineMs, config.fast);
      const dogChance = (owner, now = Date.now()) => DOG.catchChance + (ownerOnline(owner, now) ? DOG.onlineBonus : 0);
      function dogCatch(owner, thief, { quiet = false } = {}) {
        const now = Date.now();
        if (!owner || (owner.dog_until || 0) <= now) return null;
        if (Math.random() >= dogChance(owner, now)) return null;
        const streak = thief.caught_streak || 0; // số lần bị tóm liên tiếp trước đó
        const fine = DOG.fine + DOG.fineStep * streak;
        const paid = Math.min(fine, Math.max(0, thief.gold));
        // Không đủ vàng: phần thiếu + phạt thêm thành nợ chủ vườn (lãi 5%/10 phút).
        const debt = paid < fine ? fine - paid + DOG.debtPenalty : 0;
        db.transaction(() => {
          grant(thief.user_id, { gold: -paid });
          grant(owner.user_id, { gold: paid });
          if (debt > 0) db.prepare('INSERT INTO debts (debtor_id, creditor_id, amount, at) VALUES (?, ?, ?, ?)').run(thief.user_id, owner.user_id, debt, now);
          db.prepare('UPDATE farmers SET last_caught_at = ?, caught_streak = ? WHERE user_id = ?').run(now, streak + 1, thief.user_id);
        })();
        const debtNote = debt > 0 ? ` — thiếu tiền, ghi nợ ${debt.toLocaleString('vi')} vàng (+${DOG.debtPenalty} phạt), mỗi 10 phút +${Math.round(DOG.debtInterest * 100)}% lãi, có vàng là tự trừ` : '';
        const nth = streak + 1;
        if (!quiet) {
          logEvent(`🐕 Chó nhà ${owner.name} tóm được ${thief.name}${nth > 1 ? ` (lần ${nth} liên tiếp)` : ''} — nộp phạt ${paid.toLocaleString('vi')} vàng cho chủ vườn${debtNote}`);
          pushTo([owner.user_id], 'Ăn trộm dzui dzẻ 😋', `🐕 Chó nhà bạn vừa tóm được ${thief.name} — thu ${paid.toLocaleString('vi')} vàng tiền phạt${debt > 0 ? `, còn ghi nợ ${debt.toLocaleString('vi')} (tự thu khi họ có vàng, lãi 5%/10 phút)` : ''}!`);
        }
        return { paid, nth, debt, message: `🐕 Gâu! Chó nhà ${owner.name} tóm được bạn — nộp phạt ${paid.toLocaleString('vi')} vàng${nth > 1 ? ` (bị tóm ${nth} lần liên tiếp)` : ''}${debtNote}. Trộm trót lọt một lần là phạt về lại ${DOG.fine}.` };
      }
      function dogCheck(reply, owner, thief) {
        const c = dogCatch(owner, thief);
        if (!c) return null;
        return reply.code(400).send({ error: 'caught_by_dog', fine: c.paid, streak: c.nth, message: c.message });
      }
      // Trộm trót lọt: chuỗi bị tóm về 0.
      const thiefEscaped = db.prepare('UPDATE farmers SET caught_streak = 0 WHERE user_id = ? AND caught_streak > 0');
      // Hái ké một ô (đã kiểm tra chín/lượt/chó): khách +POACH_YIELD, ô +1 lượt bị hái.
      function poachPlot(me, owner, plot) {
        const crop0 = plot.tree ? TREES[plot.crop] : CROPS[plot.crop];
        const crop = crop0?.risky ? CROPS[disguiseFor(owner, plot.idx, plot.planted_at)] : crop0; // cần sa nguỵ trang: kẻ trộm chỉ lấy được cây giả
        db.transaction(() => {
          markAction.run(owner.user_id, plot.idx, plot.planted_at, me.user_id, 'poach', Date.now());
          db.prepare('UPDATE plots SET poached = poached + 1 WHERE owner_id = ? AND idx = ?').run(owner.user_id, plot.idx);
          invAdd(me.user_id, crop.id, POACH_YIELD);
          recordTheft(owner.user_id, me.user_id, crop.id, POACH_YIELD);
          grant(me.user_id, { xp: POACH_EXP * POACH_YIELD });
          bumpPoached(me.user_id, POACH_YIELD);
          thiefEscaped.run(me.user_id);
        })();
        return crop;
      }

      api.post('/dog-hire', async (request, reply) => {
        const me = request.farmer;
        const hours = Number(request.body?.hours);
        if (!DOG.hoursOptions.includes(hours)) return reply.code(400).send({ error: 'bad_request' });
        const cost = DOG.pricePerHour * hours;
        if (me.gold < cost) return reply.code(400).send({ error: 'not_enough_gold' });
        const now = Date.now();
        const until = Math.max(now, me.dog_until || 0) + scaleMs(hours * 60 * 60 * 1000, config.fast);
        db.transaction(() => {
          grant(me.user_id, { gold: -cost });
          db.prepare('UPDATE farmers SET dog_until = ? WHERE user_id = ?').run(until, me.user_id);
        })();
        logEvent(`🐕 ${me.name} thuê chó canh vườn ${hours} giờ`);
        return { me: fresh(me.user_id) };
      });

      // ---- Cướp chuồng / cướp máy (chủ chưa thu kịp) ----
      // Giới hạn thiệt hại: mỗi nhà mỗi giờ chỉ mất tối đa 1 sản phẩm chuồng
      // + 1 mẻ máy, bất kể bao nhiêu kẻ trộm ghé.
      const lootGuardAt = (ownerId, kind) => {
        const r = db.prepare('SELECT at FROM poach_guard WHERE owner_id = ? AND kind = ?').get(ownerId, kind);
        return r ? r.at + scaleMs(POACH_LOOT_COOLDOWN_MS, config.fast) : 0;
      };
      const markLootGuard = db.prepare(`INSERT INTO poach_guard (owner_id, kind, at) VALUES (?, ?, ?)
        ON CONFLICT(owner_id, kind) DO UPDATE SET at = excluded.at`);

      api.post('/poach-animal', async (request, reply) => {
        const { ownerId } = request.body ?? {};
        const me = request.farmer;
        if (ownerId === me.user_id) return reply.code(400).send({ error: 'own_farm' });
        const owner = getFarmer.get(ownerId);
        if (!owner) return reply.code(400).send({ error: 'no_farm' });
        const now = Date.now();
        if (now < lootGuardAt(ownerId, 'animal')) return reply.code(400).send({ error: 'poach_cooldown' });
        const row = db.prepare('SELECT * FROM animals WHERE owner_id = ? AND ready_at IS NOT NULL AND ready_at <= ? ORDER BY ready_at LIMIT 1')
          .get(ownerId, now);
        if (!row) return reply.code(400).send({ error: 'nothing_to_poach' });
        if (dogCheck(reply, owner, me)) return reply;
        const a = ANIMALS[row.kind];
        const got = 2 + Math.round(Math.random()); // khách nhận 2-3, chủ chỉ mất 1
        db.transaction(() => {
          invAdd(me.user_id, a.product, got);
          recordTheft(owner.user_id, me.user_id, a.product, got);
          grant(me.user_id, { xp: POACH_EXP * got });
          db.prepare('UPDATE animals SET ready_at = NULL WHERE id = ?').run(row.id);
          markLootGuard.run(ownerId, 'animal', now);
          bumpPoached(me.user_id, got);
        })();
        const info = GOODS[a.product];
        thiefEscaped.run(me.user_id);
        logEvent(`😋 ${me.name} cuỗm ${got} ${info.name} ${info.emoji} trong chuồng nhà ${owner.name}`);
        pushTo([ownerId], 'Ăn trộm dzui dzẻ 😋', `😋 ${me.name} vừa cuỗm ${info.name} ${info.emoji} trong chuồng nhà bạn — thu hoạch nhanh kẻo mất!`);
        return { ...visitPayload(request, ownerId), got };
      });

      api.post('/poach-machine', async (request, reply) => {
        const { ownerId } = request.body ?? {};
        const me = request.farmer;
        if (ownerId === me.user_id) return reply.code(400).send({ error: 'own_farm' });
        const owner = getFarmer.get(ownerId);
        if (!owner) return reply.code(400).send({ error: 'no_farm' });
        const now = Date.now();
        if (now < lootGuardAt(ownerId, 'machine')) return reply.code(400).send({ error: 'poach_cooldown' });
        const row = db.prepare('SELECT * FROM machine_jobs WHERE owner_id = ? AND ready_at <= ? AND poached = 0 ORDER BY ready_at LIMIT 1')
          .get(ownerId, now);
        if (!row || !MACHINES[row.kind]?.recipes[row.recipe]) return reply.code(400).send({ error: 'nothing_to_poach' });
        if (dogCheck(reply, owner, me)) return reply;
        const recipe = MACHINES[row.kind].recipes[row.recipe];
        const product = Object.keys(recipe.out)[0];
        const got = 2 + Math.round(Math.random()); // khách nhận 2-3, chủ chỉ mất 1 mẻ
        db.transaction(() => {
          invAdd(me.user_id, product, got);
          recordTheft(owner.user_id, me.user_id, product, got);
          grant(me.user_id, { xp: POACH_EXP * got });
          db.prepare('UPDATE machine_jobs SET poached = 1 WHERE owner_id = ? AND kind = ? AND recipe = ?').run(ownerId, row.kind, row.recipe);
          markLootGuard.run(ownerId, 'machine', now);
          bumpPoached(me.user_id, got);
        })();
        const info = itemInfo(product);
        thiefEscaped.run(me.user_id);
        logEvent(`😋 ${me.name} cuỗm ${got} ${info.name} ${info.emoji} từ ${MACHINES[row.kind].name} nhà ${owner.name}`);
        pushTo([ownerId], 'Ăn trộm dzui dzẻ 😋', `😋 ${me.name} vừa cuỗm ${info.name} ${info.emoji} từ máy nhà bạn — thu vào kho kẻo mất!`);
        return { ...visitPayload(request, ownerId), got };
      });

      // ---- Cây ăn quả ----
      // Trồng giúp: khách bỏ tiền hạt của mình gieo kín ô trống nhà bạn,
      // cây thuộc về chủ vườn; khách nhận EXP.
      api.post('/plant-help', async (request, reply) => {
        const { ownerId } = request.body ?? {};
        const me = request.farmer;
        if (ownerId === me.user_id) return reply.code(400).send({ error: 'own_farm' });
        const owner = getFarmer.get(ownerId);
        if (!owner) return reply.code(400).send({ error: 'no_farm' });
        const occupied = new Set(db.prepare('SELECT idx FROM plots WHERE owner_id = ?').all(ownerId).map((r) => r.idx));
        const empty = [];
        for (let i = 0; i < owner.plots_count; i += 1) if (!occupied.has(i)) empty.push(i);
        if (!empty.length) return reply.code(400).send({ error: 'no_empty_plot' });
        const pool = Object.values(CROPS).filter((c) => c.level <= levelFor(owner.xp));
        let gold = me.gold;
        const plan = [];
        for (const i of empty) {
          const c = pool[Math.floor(Math.random() * pool.length)];
          if (gold < c.seed) continue;
          gold -= c.seed;
          plan.push({ idx: i, crop: c });
        }
        if (!plan.length) return reply.code(400).send({ error: 'not_enough_gold' });
        const now = Date.now();
        const cost = plan.reduce((a, x) => a + x.crop.seed, 0);
        db.transaction(() => {
          const ins = db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at, watered) VALUES (?, ?, ?, ?, ?, 0)');
          for (const x of plan) ins.run(ownerId, x.idx, x.crop.id, now, now + cropTime(owner, scaleMs(x.crop.growMs, config.fast)));
          grant(me.user_id, { gold: -cost, xp: PLANT_HELP_EXP * plan.length });
        })();
        logEvent(`🌱 ${me.name} trồng giúp ${plan.length} ô nhà ${owner.name}`);
        pushTo([ownerId], 'Ăn trộm dzui dzẻ 😋', `🌱 ${me.name} vừa trồng giúp bạn ${plan.length} ô đó!`);
        return { ...visitPayload(request, ownerId), helped: plan.length, cost };
      });

      api.post('/plant-tree', async (request, reply) => {
        if (request.farmer.tax_owed > 0) return reply.code(400).send({ error: 'tax_due' });
        const { idx, tree: treeId } = request.body ?? {};
        const tree = TREES[treeId];
        const me = request.farmer;
        if (!tree || !Number.isInteger(idx) || idx < 0 || idx >= me.plots_count) {
          return reply.code(400).send({ error: 'bad_request' });
        }
        if (levelFor(me.xp) < tree.level) return reply.code(400).send({ error: 'level_too_low' });
        if (me.gold < tree.price) return reply.code(400).send({ error: 'not_enough_gold' });
        if (getPlot.get(me.user_id, idx)) return reply.code(400).send({ error: 'plot_busy' });
        const now = Date.now();
        db.transaction(() => {
          grant(me.user_id, { gold: -tree.price });
          db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at, tree, tree_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
            .run(me.user_id, idx, tree.id, now, now + cropTime(me, scaleMs(tree.growMs, config.fast)), now);
        })();
        logEvent(`${tree.emoji} ${me.name} trồng một cây ${tree.name}`);
        return { me: fresh(me.user_id) };
      });

      api.post('/remove-tree', async (request, reply) => {
        const { idx } = request.body ?? {};
        const me = request.farmer;
        const plot = getPlot.get(me.user_id, idx);
        if (!plot || !plot.tree) return reply.code(400).send({ error: 'no_plot' });
        db.prepare('DELETE FROM plots WHERE owner_id = ? AND idx = ?').run(me.user_id, idx);
        return { me: fresh(me.user_id) };
      });

      // ---- Hồ câu cá ----
      api.post('/fish', async (request, reply) => {
        const me = request.farmer;
        if (levelFor(me.xp) < FISHING.level) return reply.code(400).send({ error: 'level_too_low' });
        const now = Date.now();
        const cur = currentEnergy(me, now);
        if (cur < FISHING.energyCost) return reply.code(400).send({ error: 'not_enough_energy' });
        const casts = POND_LEVELS[me.pond_level - 1];
        const caught = [];
        let exp = 0;
        for (let i = 0; i < casts; i += 1) {
          const id = rollFish(Math.random);
          caught.push(id);
          exp += GOODS[id].expCatch;
        }
        db.transaction(() => {
          setEnergy(me.user_id, me, cur - FISHING.energyCost, now);
          for (const id of caught) invAdd(me.user_id, id, 1);
          grant(me.user_id, { xp: exp });
          bumpQuest(me.user_id, 'fish');
        })();
        for (const id of caught) {
          if (id === 'cakoi' || id === 'cachep') logEvent(`🎣 ${me.name} câu được ${GOODS[id].name} ${GOODS[id].emoji}!`);
        }
        return { me: fresh(me.user_id), caught, exp };
      });

      api.post('/buy-energy', async (request, reply) => {
        const me = request.farmer;
        if (me.gems < ENERGY.buyGems) return reply.code(400).send({ error: 'not_enough_gems' });
        const now = Date.now();
        const cur = currentEnergy(me, now);
        if (cur >= ENERGY.buyCap) return reply.code(400).send({ error: 'energy_full' });
        db.transaction(() => {
          grant(me.user_id, { gems: -ENERGY.buyGems });
          setEnergy(me.user_id, me, Math.min(ENERGY.buyCap, cur + ENERGY.buyAmount), now);
        })();
        return { me: fresh(me.user_id) };
      });

      // ---- Nâng cấp chuồng gà / ao cá ----
      async function upgradeBarn(request, reply, kind) {
        const a = ANIMALS[kind];
        const me = request.farmer;
        if (!a) return reply.code(400).send({ error: 'bad_request' });
        const lv = barnLevel(me, kind);
        if (lv >= a.capacities.length) return reply.code(400).send({ error: 'max_level' });
        const gold = BARN_UPGRADE_GOLD[lv - 1];
        if (me.gold < gold) return reply.code(400).send({ error: 'not_enough_gold' });
        db.transaction(() => {
          grant(me.user_id, { gold: -gold });
          bumpBarnLevel(me, kind);
        })();
        logEvent(`${a.emoji} ${me.name} nâng chuồng ${a.name} lên cấp ${lv + 1}`);
        return { me: fresh(me.user_id) };
      }
      api.post('/upgrade-barn', async (request, reply) => upgradeBarn(request, reply, request.body?.kind));
      api.post('/upgrade-coop', async (request, reply) => upgradeBarn(request, reply, 'ga'));

      // ---- Ao nuôi: thả giống (tiêu hao) → thu hoạch cả mẻ ----
      api.post('/fish-stock', async (request, reply) => {
        const { species, qty } = request.body ?? {};
        const me = request.farmer;
        const sp = FISH_FARM[species];
        if (!sp) return reply.code(400).send({ error: 'bad_request' });
        if (levelFor(me.xp) < sp.level) return reply.code(400).send({ error: 'level_too_low' });
        const capacity = FISH_STOCK_BY_LEVEL[Math.min(me.pond_level, FISH_STOCK_BY_LEVEL.length) - 1];
        const used = db.prepare('SELECT COALESCE(SUM(qty), 0) s FROM fish_batches WHERE owner_id = ?').get(me.user_id).s;
        const room = capacity - used;
        if (room <= 0) return reply.code(400).send({ error: 'pond_full' });
        const asked = qty === 'max' ? room : Math.max(1, Math.floor(Number(qty) || 1));
        const n = Math.min(asked, room, Math.floor(me.gold / sp.fry));
        if (n < 1) return reply.code(400).send({ error: 'not_enough_gold' });
        const now = Date.now();
        db.transaction(() => {
          grant(me.user_id, { gold: -sp.fry * n });
          db.prepare('INSERT INTO fish_batches (owner_id, species, qty, planted_at, ready_at) VALUES (?, ?, ?, ?, ?)')
            .run(me.user_id, sp.id, n, now, now + animalTime(me, scaleMs(sp.growMs, config.fast)));
        })();
        logEvent(`${sp.emoji} ${me.name} thả ${n} con ${sp.name} xuống ao`);
        return { me: fresh(me.user_id), stocked: n, cost: sp.fry * n };
      });

      api.post('/fish-harvest', async (request, reply) => {
        const me = request.farmer;
        const now = Date.now();
        const id = Number(request.body?.id);
        const batches = id
          ? db.prepare('SELECT * FROM fish_batches WHERE owner_id = ? AND id = ?').all(me.user_id, id)
          : db.prepare('SELECT * FROM fish_batches WHERE owner_id = ? AND ready_at <= ?').all(me.user_id, now);
        if (!batches.length) return reply.code(400).send({ error: 'not_ready' });
        if (id && now < batches[0].ready_at) return reply.code(400).send({ error: 'not_ready' });
        const got = {};
        let xp = 0;
        db.transaction(() => {
          for (const b of batches) {
            const sp = FISH_FARM[b.species];
            if (sp) { invAdd(me.user_id, sp.product, b.qty); got[sp.product] = (got[sp.product] || 0) + b.qty; xp += sp.exp * b.qty; }
            db.prepare('DELETE FROM fish_batches WHERE id = ?').run(b.id);
          }
          grant(me.user_id, { xp });
          bumpQuest(me.user_id, 'harvest', batches.length);
        })();
        return { me: fresh(me.user_id), items: got, xp };
      });

      api.post('/upgrade-pond', async (request, reply) => {
        const me = request.farmer;
        if (levelFor(me.xp) < FISHING.level) return reply.code(400).send({ error: 'level_too_low' });
        if (me.pond_level >= POND_LEVELS.length) return reply.code(400).send({ error: 'max_level' });
        const gold = POND_UPGRADE_GOLD[me.pond_level - 1];
        if (me.gold < gold) return reply.code(400).send({ error: 'not_enough_gold' });
        db.transaction(() => {
          grant(me.user_id, { gold: -gold });
          db.prepare('UPDATE farmers SET pond_level = pond_level + 1 WHERE user_id = ?').run(me.user_id);
        })();
        logEvent(`🎣 ${me.name} nâng ao cá lên cấp ${me.pond_level + 1}`);
        return { me: fresh(me.user_id) };
      });

      // ---- Lễ hội: nhận mốc ----
      api.post('/fest-claim', async (request, reply) => {
        const { id } = request.body ?? {};
        const me = request.farmer;
        const ms = FESTIVAL.milestones.find((x) => x.id === Number(id));
        if (!ms) return reply.code(400).send({ error: 'bad_request' });
        const f = getFest(me.user_id);
        if (f.claims.includes(ms.id)) return reply.code(400).send({ error: 'already_claimed' });
        if ((f.counters[ms.type] || 0) < ms.target) return reply.code(400).send({ error: 'not_enough_progress' });
        db.transaction(() => {
          grant(me.user_id, { gold: (ms.gold || 0) * GOLD_MULT, gems: ms.gems || 0 });
          f.claims.push(ms.id);
          db.prepare('UPDATE festival SET claims_json = ? WHERE owner_id = ? AND cycle = ?')
            .run(JSON.stringify(f.claims), me.user_id, f.cycle);
        })();
        logEvent(`🎪 ${me.name} nhận thưởng Lễ Hội Thu Hoạch: ${ms.label}`);
        return { me: fresh(me.user_id), claimed: ms };
      });

      // ---- Tưới toàn bộ ruộng mình ----
      api.post('/water-all', async (request, reply) => {
        const me = request.farmer;
        const now = Date.now();
        const dry = db.prepare('SELECT * FROM plots WHERE owner_id = ? AND watered = 0 AND ready_at > ?')
          .all(me.user_id, now);
        if (dry.length === 0) return reply.code(400).send({ error: 'nothing_to_water' });
        db.transaction(() => {
          const upd = db.prepare('UPDATE plots SET watered = 1 WHERE owner_id = ? AND idx = ?');
          for (const plot of dry) {
            upd.run(me.user_id, plot.idx);
            markAction.run(me.user_id, plot.idx, plot.planted_at, me.user_id, 'water', now);
          }
        })();
        return { me: fresh(me.user_id), watered: dry.length };
      });

      // ---- Thăm ruộng ----
      function visitPayload(request, ownerId) {
        const v = visitPayloadBase(request, ownerId);
        if (v && v.farm) v.farm.luxury = luxuryView(getFarmer.get(ownerId));
        return v;
      }
      function visitPayloadBase(request, ownerId) {
        const owner = getFarmer.get(ownerId);
        const li = levelInfo(owner.xp);
        const plots = plotViews(ownerId, owner.plots_count);
        for (const p of plots) if (p.crop && CROPS[p.crop]?.risky) p.crop = disguiseFor(owner, p.idx, p.plantedAt); // người ngoài thấy như cây khác
        const myActs = {};
        const now2 = Date.now();
        const again = scaleMs(POACH_AGAIN_MS, config.fast);
        for (const p of plots) {
          if (!p.crop) continue;
          const lastWater = lastAction.get(ownerId, p.idx, p.plantedAt, request.farmer.user_id, 'water');
          myActs[p.idx] = {
            watered: p.watered || !!lastWater,
            canWater: !p.ready && (!lastWater || now2 - lastWater.at >= scaleMs(WATER_HELP_COOLDOWN_MS, config.fast)),
            poached: p.poached,
            canPoach: p.ready && (p.poachedN || 0) < (p.tree ? (p.fruits || 0) : 1 + Math.floor(Math.max(0, now2 - p.readyAt) / again)),
          };
        }
        const loot = {
          animalPoachAt: lootGuardAt(ownerId, 'animal'),
          machinePoachAt: lootGuardAt(ownerId, 'machine'),
          emptyPlots: owner.plots_count - db.prepare('SELECT COUNT(*) c FROM plots WHERE owner_id = ?').get(ownerId).c,
          animalsReady: db.prepare('SELECT COUNT(*) c FROM animals WHERE owner_id = ? AND ready_at IS NOT NULL AND ready_at <= ?').get(ownerId, now2).c,
          machinesReady: db.prepare('SELECT COUNT(*) c FROM machine_jobs WHERE owner_id = ? AND ready_at <= ? AND poached = 0').get(ownerId, now2).c,
        };
        return {
          farm: { id: owner.user_id, name: owner.name, level: li.level, stars: owner.stars, plotsCount: owner.plots_count, plots, loot, dogUntil: owner.dog_until || 0, online: ownerOnline(owner), dogChance: Math.round(dogChance(owner) * 100) },
          myActs,
          me: fresh(request.farmer.user_id),
        };
      }

      api.get('/farm/:id', async (request, reply) => {
        const ownerId = Number(request.params.id);
        if (!getFarmer.get(ownerId)) return reply.code(404).send({ error: 'no_farm' });
        return visitPayload(request, ownerId);
      });

      // Avatar từ Chat
      api.get('/avatar/:id', async (request, reply) => {
        const uid = Number(request.params.id);
        if (!Number.isInteger(uid)) return reply.code(400).send({ error: 'invalid_id' });
        const res = await fetch(`${config.chatApiUrl}/api/users/${uid}/avatar`, { headers: { cookie: request.headers.cookie } });
        if (!res.ok) return reply.code(res.status).send();
        reply.header('content-type', res.headers.get('content-type') || 'application/octet-stream');
        reply.header('cache-control', 'private, max-age=86400');
        return reply.send(Buffer.from(await res.arrayBuffer()));
      });
    },
    { prefix: '/farm/api' },
  );

  // ---- Static + cache-bust (giữ nguyên bài v1) ----------------------------
  const BOOT_VERSION = Date.now().toString(36);
  // Regex thay vì chuỗi cứng: index có thể đã mang sẵn ?v=... tay (bản
  // redesign từng hardcode v=3 khiến per-boot bust chết lặng — không tái diễn).
  const INDEX_HTML = readFileSync(join(PUBLIC_DIR, 'index.html'), 'utf8')
    .replace(/href="style\.css[^"]*"/, `href="style.css?v=${BOOT_VERSION}"`)
    .replace(/src="app\.js[^"]*"/, `src="app.js?v=${BOOT_VERSION}"`);

  app.register(staticPlugin, { root: PUBLIC_DIR, prefix: '/farm/', index: false });

  app.addHook('onSend', async (request, reply, payload) => {
    const url = request.raw.url || '';
    // Mọi phản hồi API mang phiên bản boot — client lệch bản là tự tải lại
    // ngay ở thao tác kế tiếp, kể cả khi tab đang ẩn không chạy vòng refresh.
    if (url.startsWith('/farm/api/')) reply.header('x-farm-boot', BOOT_VERSION);
    const isAsset =
      url.startsWith('/farm/') && !url.startsWith('/farm/api/') && url !== '/farm/' && !url.startsWith('/farm/index.html');
    if (isAsset) {
      reply.header('cache-control', url.includes('?v=') ? 'public, max-age=31536000, immutable' : 'no-cache');
    }
    return payload;
  });

  const serveIndex = async (request, reply) =>
    reply.type('text/html; charset=utf-8').header('cache-control', 'no-store').send(INDEX_HTML);
  app.get('/farm/', serveIndex);
  app.get('/farm/index.html', serveIndex);
  app.get('/farm', async (request, reply) => reply.redirect('/farm/'));
  app.get('/', async (request, reply) => reply.redirect('/farm/'));
  app.get('/healthz', async () => ({ ok: true }));

  return app;
}
