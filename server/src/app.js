import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import staticPlugin from '@fastify/static';

import {
  CROPS,
  GOODS,
  itemInfo,
  CHICKEN,
  MILL,
  START_PLOTS,
  EXPANSIONS,
  MAX_PLOTS,
  START_GOLD,
  START_GEMS,
  speedupCost,
  levelInfo,
  levelFor,
  ORDER_SLOTS,
  ORDER_UNLOCK_LEVEL,
  ORDER_REFRESH_MS,
  generateOrder,
  DAILY_QUESTS,
  DAILY_CHEST,
  STAR_MILESTONES,
  POACH_DAILY_LIMIT,
  POACH_EXP,
  WATER_HELPER_GOLD,
  WATER_HELPER_EXP,
  WATER_FRESH_EXP,
  FESTIVAL,
  festivalCycle,
  ENERGY,
  FISHING,
  rollFish,
  COOP_LEVELS,
  COOP_UPGRADE_GOLD,
  POND_LEVELS,
  POND_UPGRADE_GOLD,
  scaleMs,
  todayVN,
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

  async function requireFarmer(request, reply) {
    const user = await chatUserFor(request);
    if (!user) return reply.code(401).send({ error: 'not_logged_in' });
    upsertFarmer.run(user.id, user.display_name || user.username, START_GOLD, START_GEMS, START_PLOTS, Date.now());
    const legacy = db.prepare('SELECT xp FROM legacy_levels WHERE user_id = ?').get(user.id);
    if (legacy) db.prepare('UPDATE farmers SET xp = ? WHERE user_id = ? AND xp < ?').run(legacy.xp, user.id, legacy.xp);
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
  function bumpQuest(userId, questId, by = 1) {
    const d = getDaily(userId);
    d.counters[questId] = (d.counters[questId] || 0) + by;
    db.prepare('UPDATE daily SET counters_json = ? WHERE owner_id = ? AND day = ?')
      .run(JSON.stringify(d.counters), userId, d.day);
  }

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
    const have = db.prepare('SELECT slot FROM orders WHERE owner_id = ?').all(farmer.user_id).map((r) => r.slot);
    if (have.length >= ORDER_SLOTS) return;
    if (now < farmer.next_order_at && have.length > 0) return;
    const rng = Math.random;
    const level = levelFor(farmer.xp);
    for (let slot = 0; slot < ORDER_SLOTS; slot += 1) {
      if (have.includes(slot)) continue;
      const o = generateOrder(level, rng);
      db.prepare('INSERT INTO orders (owner_id, slot, items_json, gold, exp, stars) VALUES (?, ?, ?, ?, ?, ?)')
        .run(farmer.user_id, slot, JSON.stringify(o.items), o.gold, o.exp, o.stars);
    }
    db.prepare('UPDATE farmers SET next_order_at = ? WHERE user_id = ?').run(now, farmer.user_id);
  }

  // ---- View ---------------------------------------------------------------
  function plotViews(ownerId, plotsCount) {
    const rows = db.prepare('SELECT * FROM plots WHERE owner_id = ?').all(ownerId);
    const byIdx = new Map(rows.map((r) => [r.idx, r]));
    const now = Date.now();
    const out = [];
    for (let i = 0; i < plotsCount; i += 1) {
      const r = byIdx.get(i);
      if (!r) {
        out.push({ idx: i, crop: null });
        continue;
      }
      out.push({
        idx: i,
        crop: r.crop,
        plantedAt: r.planted_at,
        readyAt: r.ready_at,
        ready: now >= r.ready_at,
        watered: !!r.watered,
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
    const mill = db.prepare('SELECT * FROM machines WHERE owner_id = ? AND kind = ?').get(f.user_id, 'coixay');
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
      orders: db.prepare('SELECT id, slot, items_json, gold, exp, stars FROM orders WHERE owner_id = ? ORDER BY slot').all(f.user_id)
        .map((o) => ({ id: o.id, slot: o.slot, items: JSON.parse(o.items_json), gold: o.gold, exp: o.exp, stars: o.stars })),
      daily: {
        quests: DAILY_QUESTS.map((q) => ({ ...q, progress: Math.min(q.target, d.counters[q.id] || 0) })),
        done: questsDone,
        required: DAILY_CHEST.questsRequired,
        chestClaimed: !!d.chest_claimed,
      },
      energy: energyView(f0),
      coop: {
        level: f.coop_level,
        capacity: COOP_LEVELS[f.coop_level - 1],
        next: f.coop_level < COOP_LEVELS.length
          ? { level: f.coop_level + 1, capacity: COOP_LEVELS[f.coop_level], gold: COOP_UPGRADE_GOLD[f.coop_level - 1] }
          : null,
      },
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
  const markAction = db.prepare(
    'INSERT INTO plot_actions (owner_id, idx, planted_at, helper_id, action, at) VALUES (?, ?, ?, ?, ?, ?)',
  );

  function fresh(userId) {
    return farmerView(getFarmer.get(userId));
  }

  // ---- API ----------------------------------------------------------------
  app.register(
    async (api) => {
      api.addHook('preHandler', requireFarmer);

      api.get('/state', async (request) => {
        ensureOrders(request.farmer);
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
          return { ...u, level: f ? levelFor(f.xp) : null };
        });
        return {
          me: fresh(request.farmer.user_id),
          family,
          config: {
            crops: Object.fromEntries(Object.entries(CROPS).map(([k, c]) => [k, { ...c, growMs: scaleMs(c.growMs, config.fast) }])),
            goods: GOODS,
            chicken: { ...CHICKEN, produceMs: scaleMs(CHICKEN.produceMs, config.fast) },
            mill: {
              ...MILL,
              recipes: Object.fromEntries(
                Object.entries(MILL.recipes).map(([k, r]) => [k, { ...r, ms: scaleMs(r.ms, config.fast) }]),
              ),
            },
            orderUnlockLevel: ORDER_UNLOCK_LEVEL,
            fishing: {
              ...FISHING,
              loot: FISHING.loot.map((l) => ({ ...l, pct: Math.round((l.weight / FISHING.loot.reduce((a, x) => a + x.weight, 0)) * 100) })),
            },
            energy: ENERGY,
            starMilestones: STAR_MILESTONES,
            poachDailyLimit: POACH_DAILY_LIMIT,
            fast: config.fast,
          },
          events: db.prepare('SELECT at, text FROM events ORDER BY id DESC LIMIT 25').all(),
        };
      });

      api.get('/leaderboard', async () => {
        return db.prepare('SELECT user_id AS id, name, gold, xp, stars FROM farmers ORDER BY xp DESC, stars DESC LIMIT 20')
          .all()
          .map((f, i) => ({ ...f, level: levelFor(f.xp), rank: i + 1 }));
      });

      // ---- Trồng trọt ----
      api.post('/plant', async (request, reply) => {
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
          db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at) VALUES (?, ?, ?, ?, ?)')
            .run(me.user_id, idx, crop.id, now, now + scaleMs(crop.growMs, config.fast));
          bumpQuest(me.user_id, 'sow');
        })();
        return { me: fresh(me.user_id) };
      });

      api.post('/plant-all', async (request, reply) => {
        const { crop: cropId } = request.body ?? {};
        const crop = CROPS[cropId];
        const me = request.farmer;
        if (!crop) return reply.code(400).send({ error: 'bad_request' });
        if (levelFor(me.xp) < crop.level) return reply.code(400).send({ error: 'level_too_low' });
        const occupied = new Set(db.prepare('SELECT idx FROM plots WHERE owner_id = ?').all(me.user_id).map((r) => r.idx));
        const empty = [];
        for (let i = 0; i < me.plots_count; i += 1) if (!occupied.has(i)) empty.push(i);
        const count = Math.min(empty.length, Math.floor(me.gold / crop.seed));
        if (count === 0) return reply.code(400).send({ error: empty.length === 0 ? 'no_empty_plot' : 'not_enough_gold' });
        const now = Date.now();
        const readyAt = now + scaleMs(crop.growMs, config.fast);
        db.transaction(() => {
          grant(me.user_id, { gold: -crop.seed * count, xp: crop.expSow * count });
          const ins = db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at) VALUES (?, ?, ?, ?, ?)');
          for (const i of empty.slice(0, count)) ins.run(me.user_id, i, crop.id, now, readyAt);
          bumpQuest(me.user_id, 'sow', count);
        })();
        logEvent(`${crop.emoji} ${me.name} gieo ${crop.name} kín ${count} ô`);
        return { me: fresh(me.user_id), planted: count };
      });

      function harvestPlot(me, plot) {
        const crop = CROPS[plot.crop];
        const xp = crop.expHarvest + (plot.watered ? WATER_FRESH_EXP : 0);
        grant(me.user_id, { xp });
        invAdd(me.user_id, crop.id, 1);
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
        if (Date.now() < plot.ready_at) return reply.code(400).send({ error: 'not_ready' });
        let crop;
        db.transaction(() => {
          crop = harvestPlot(me, plot);
        })();
        return { me: fresh(me.user_id), item: crop.id };
      });

      api.post('/harvest-all', async (request, reply) => {
        const me = request.farmer;
        const now = Date.now();
        const ready = db.prepare('SELECT * FROM plots WHERE owner_id = ? AND ready_at <= ?').all(me.user_id, now);
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
        if (Date.now() >= plot.ready_at) return reply.code(400).send({ error: 'already_ready' });
        if (plot.watered) return reply.code(400).send({ error: 'already_watered' });
        if (hasAction.get(ownerId, idx, plot.planted_at, me.user_id, 'water')) {
          return reply.code(400).send({ error: 'already_watered' });
        }
        db.transaction(() => {
          db.prepare('UPDATE plots SET watered = 1 WHERE owner_id = ? AND idx = ?').run(ownerId, idx);
          markAction.run(ownerId, idx, plot.planted_at, me.user_id, 'water', Date.now());
          if (ownerId !== me.user_id) grant(me.user_id, { gold: WATER_HELPER_GOLD, xp: WATER_HELPER_EXP });
        })();
        if (ownerId !== me.user_id) logEvent(`💧 ${me.name} tưới giúp ruộng của ${owner.name}`);
        if (ownerId === me.user_id) return { me: fresh(me.user_id) };
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
        if (Date.now() < plot.ready_at) return reply.code(400).send({ error: 'not_ready' });
        if (hasAction.get(ownerId, idx, plot.planted_at, me.user_id, 'poach')) {
          return reply.code(400).send({ error: 'already_poached' });
        }
        const d = getDaily(me.user_id);
        const crop = CROPS[plot.crop];
        db.transaction(() => {
          markAction.run(ownerId, idx, plot.planted_at, me.user_id, 'poach', Date.now());
          invAdd(me.user_id, crop.id, 1);
          grant(me.user_id, { xp: POACH_EXP });
          db.prepare('UPDATE daily SET poached = poached + 1 WHERE owner_id = ? AND day = ?').run(me.user_id, d.day);
        })();
        logEvent(`😋 ${me.name} hái ké ${crop.name} ${crop.emoji} nhà ${owner.name}`);
        pushTo([ownerId], 'Nông trại vui vẻ 🌾', `😋 ${me.name} vừa hái ké ${crop.name} ${crop.emoji} nhà bạn!`);
        return visitPayload(request, ownerId);
      });

      // ---- Kho & cửa hàng ----
      api.post('/sell', async (request, reply) => {
        const { item, qty } = request.body ?? {};
        const info = itemInfo(item);
        const me = request.farmer;
        const n = Math.max(1, Math.min(999, Number(qty) || 1));
        if (!info || !info.sell) return reply.code(400).send({ error: 'bad_request' });
        if (!invTake(me.user_id, item, n)) return reply.code(400).send({ error: 'not_enough_items' });
        grant(me.user_id, { gold: info.sell * n });
        bumpQuest(me.user_id, 'sell', n);
        return { me: fresh(me.user_id), gained: info.sell * n };
      });

      api.post('/buy', async (request, reply) => {
        const { item, qty } = request.body ?? {};
        const info = GOODS[item];
        const me = request.farmer;
        const n = Math.max(1, Math.min(99, Number(qty) || 1));
        if (!info || !info.buy) return reply.code(400).send({ error: 'bad_request' });
        if (me.gold < info.buy * n) return reply.code(400).send({ error: 'not_enough_gold' });
        db.transaction(() => {
          grant(me.user_id, { gold: -info.buy * n });
          invAdd(me.user_id, item, n);
        })();
        return { me: fresh(me.user_id) };
      });

      // ---- Chuồng gà ----
      api.post('/buy-chicken', async (request, reply) => {
        const me = request.farmer;
        if (levelFor(me.xp) < CHICKEN.level) return reply.code(400).send({ error: 'level_too_low' });
        const count = db.prepare('SELECT COUNT(*) c FROM animals WHERE owner_id = ?').get(me.user_id).c;
        if (count >= COOP_LEVELS[me.coop_level - 1]) return reply.code(400).send({ error: 'coop_full' });
        if (me.gold < CHICKEN.price) return reply.code(400).send({ error: 'not_enough_gold' });
        db.transaction(() => {
          grant(me.user_id, { gold: -CHICKEN.price });
          db.prepare('INSERT INTO animals (owner_id, kind) VALUES (?, ?)').run(me.user_id, 'ga');
        })();
        logEvent(`🐔 ${me.name} đón một chú gà mới về chuồng`);
        return { me: fresh(me.user_id) };
      });

      api.post('/feed', async (request, reply) => {
        const me = request.farmer;
        const hungry = db.prepare('SELECT * FROM animals WHERE owner_id = ? AND ready_at IS NULL').all(me.user_id);
        if (hungry.length === 0) return reply.code(400).send({ error: 'no_hungry_animal' });
        const canFeed = Math.min(hungry.length, Math.floor(invQty(me.user_id, CHICKEN.feedItem) / CHICKEN.feedQty));
        if (canFeed === 0) return reply.code(400).send({ error: 'not_enough_feed' });
        const readyAt = Date.now() + scaleMs(CHICKEN.produceMs, config.fast);
        db.transaction(() => {
          invTake(me.user_id, CHICKEN.feedItem, canFeed * CHICKEN.feedQty);
          const upd = db.prepare('UPDATE animals SET ready_at = ? WHERE id = ?');
          for (const a of hungry.slice(0, canFeed)) upd.run(readyAt, a.id);
          bumpQuest(me.user_id, 'feed', canFeed);
        })();
        return { me: fresh(me.user_id), fed: canFeed };
      });

      api.post('/collect', async (request, reply) => {
        const me = request.farmer;
        const now = Date.now();
        const ready = db.prepare('SELECT * FROM animals WHERE owner_id = ? AND ready_at IS NOT NULL AND ready_at <= ?')
          .all(me.user_id, now);
        if (ready.length === 0) return reply.code(400).send({ error: 'nothing_ready' });
        db.transaction(() => {
          for (const a of ready) {
            invAdd(me.user_id, CHICKEN.product, 1);
            grant(me.user_id, { xp: CHICKEN.expCollect });
            db.prepare('UPDATE animals SET ready_at = NULL WHERE id = ?').run(a.id);
          }
        })();
        return { me: fresh(me.user_id), collected: ready.length };
      });

      // ---- Cối xay ----
      api.post('/mill', async (request, reply) => {
        const { recipe: recipeId } = request.body ?? {};
        const recipe = MILL.recipes[recipeId];
        const me = request.farmer;
        if (!recipe) return reply.code(400).send({ error: 'bad_request' });
        if (levelFor(me.xp) < MILL.level) return reply.code(400).send({ error: 'level_too_low' });
        const cur = db.prepare('SELECT * FROM machines WHERE owner_id = ? AND kind = ?').get(me.user_id, 'coixay');
        if (cur && cur.recipe) return reply.code(400).send({ error: 'mill_busy' });
        for (const [item, qty] of Object.entries(recipe.in)) {
          if (invQty(me.user_id, item) < qty) return reply.code(400).send({ error: 'not_enough_items' });
        }
        db.transaction(() => {
          for (const [item, qty] of Object.entries(recipe.in)) invTake(me.user_id, item, qty);
          db.prepare(`
            INSERT INTO machines (owner_id, kind, recipe, ready_at) VALUES (?, 'coixay', ?, ?)
            ON CONFLICT(owner_id, kind) DO UPDATE SET recipe = excluded.recipe, ready_at = excluded.ready_at
          `).run(me.user_id, recipeId, Date.now() + scaleMs(recipe.ms, config.fast));
        })();
        return { me: fresh(me.user_id) };
      });

      api.post('/mill-collect', async (request, reply) => {
        const me = request.farmer;
        const cur = db.prepare('SELECT * FROM machines WHERE owner_id = ? AND kind = ?').get(me.user_id, 'coixay');
        if (!cur || !cur.recipe) return reply.code(400).send({ error: 'mill_empty' });
        if (Date.now() < cur.ready_at) return reply.code(400).send({ error: 'not_ready' });
        const recipe = MILL.recipes[cur.recipe];
        db.transaction(() => {
          for (const [item, qty] of Object.entries(recipe.out)) invAdd(me.user_id, item, qty);
          grant(me.user_id, { xp: recipe.exp });
          db.prepare('UPDATE machines SET recipe = NULL, ready_at = NULL WHERE owner_id = ? AND kind = ?').run(me.user_id, 'coixay');
          bumpQuest(me.user_id, 'process');
          bumpFest(me.user_id, 'process');
        })();
        return { me: fresh(me.user_id) };
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
          grant(me.user_id, { gold: order.gold, xp: order.exp, stars: order.stars });
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
          for (const q of done) grant(me.user_id, { gold: q.gold, xp: q.exp, stars: q.stars || 0 });
          grant(me.user_id, { gold: DAILY_CHEST.gold, xp: DAILY_CHEST.exp, gems: gem });
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
          grant(me.user_id, { gold: next.gold || 0, gems: next.gems || 0 });
          db.prepare('INSERT INTO star_claims (owner_id, milestone) VALUES (?, ?)').run(me.user_id, next.stars);
        })();
        return { me: fresh(me.user_id), claimed: next };
      });

      // ---- Mở rộng đất ----
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
        if (target === 'mill') {
          const cur = db.prepare('SELECT * FROM machines WHERE owner_id = ? AND kind = ?').get(me.user_id, 'coixay');
          if (!cur || !cur.recipe || now >= cur.ready_at) return reply.code(400).send({ error: 'not_processing' });
          remaining = cur.ready_at - now;
          const cost = speedupCost(remaining);
          if (me.gems < cost) return reply.code(400).send({ error: 'not_enough_gems' });
          db.transaction(() => {
            grant(me.user_id, { gems: -cost });
            db.prepare('UPDATE machines SET ready_at = ? WHERE owner_id = ? AND kind = ?').run(now, me.user_id, 'coixay');
          })();
          return { me: fresh(me.user_id), cost };
        }
        return reply.code(400).send({ error: 'bad_request' });
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
      api.post('/upgrade-coop', async (request, reply) => {
        const me = request.farmer;
        if (me.coop_level >= COOP_LEVELS.length) return reply.code(400).send({ error: 'max_level' });
        const gold = COOP_UPGRADE_GOLD[me.coop_level - 1];
        if (me.gold < gold) return reply.code(400).send({ error: 'not_enough_gold' });
        db.transaction(() => {
          grant(me.user_id, { gold: -gold });
          db.prepare('UPDATE farmers SET coop_level = coop_level + 1 WHERE user_id = ?').run(me.user_id);
        })();
        logEvent(`🐔 ${me.name} nâng chuồng gà lên cấp ${me.coop_level + 1}`);
        return { me: fresh(me.user_id) };
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
          grant(me.user_id, { gold: ms.gold || 0, gems: ms.gems || 0 });
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
        const owner = getFarmer.get(ownerId);
        const li = levelInfo(owner.xp);
        const plots = plotViews(ownerId, owner.plots_count);
        const myActs = {};
        for (const p of plots) {
          if (!p.crop) continue;
          myActs[p.idx] = {
            watered: p.watered || !!hasAction.get(ownerId, p.idx, p.plantedAt, request.farmer.user_id, 'water'),
            poached: !!hasAction.get(ownerId, p.idx, p.plantedAt, request.farmer.user_id, 'poach'),
          };
        }
        return {
          farm: { id: owner.user_id, name: owner.name, level: li.level, stars: owner.stars, plotsCount: owner.plots_count, plots },
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
