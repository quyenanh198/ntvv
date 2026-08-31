import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import staticPlugin from '@fastify/static';

import {
  CROPS,
  PLOT_SLOTS,
  START_PLOTS,
  MAX_PLOTS,
  START_COINS,
  DAILY_COINS,
  DAILY_XP,
  WATER_CUT,
  WATER_COINS,
  WATER_XP,
  STEAL_XP,
  stealCap,
  xpForLevel,
  levelFor,
  growMsFor,
  todayVN,
} from './game.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '../../public');

// Cache kết quả /api/me của Chat theo cookie — đỡ gọi Chat mỗi request.
const ME_CACHE_TTL_MS = 30_000;
const ME_CACHE_MAX = 300;

export function buildApp({ config, db, logger = true }) {
  const app = Fastify({ logger, trustProxy: true });
  const meCache = new Map(); // cookie -> { user, until }

  // ---- Xác thực: Chat là "auth oracle" -----------------------------------
  // Trình duyệt gửi cookie lb_session (cùng domain qua caddy); farm chuyển
  // tiếp nguyên cookie sang Chat /api/me. Chat trả ai thì người đó là farmer.
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
    INSERT INTO farmers (user_id, name, coins, xp, plots_count, created_at)
    VALUES (?, ?, ?, 0, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET name = excluded.name
  `);

  async function requireFarmer(request, reply) {
    const user = await chatUserFor(request);
    if (!user) return reply.code(401).send({ error: 'not_logged_in' });
    upsertFarmer.run(user.id, user.display_name || user.username, START_COINS, START_PLOTS, Date.now());
    request.farmer = db.prepare('SELECT * FROM farmers WHERE user_id = ?').get(user.id);
    request.chatUser = user;
  }

  // ---- Push qua Chat (trộm rau thì báo chủ ruộng) ------------------------
  function pushTo(userIds, title, body) {
    if (!config.internalSecret) return;
    fetch(`${config.chatApiUrl}/internal/farm/notify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-farm-secret': config.internalSecret },
      body: JSON.stringify({ userIds, title, body, url: '/farm/' }),
    }).catch((err) => app.log.warn({ err }, 'farm push notify failed'));
  }

  // ---- Bản tin làng ------------------------------------------------------
  const insertEvent = db.prepare('INSERT INTO events (at, text) VALUES (?, ?)');
  function logEvent(text) {
    const { lastInsertRowid } = insertEvent.run(Date.now(), text);
    if (Number(lastInsertRowid) % 50 === 0) {
      db.prepare('DELETE FROM events WHERE id <= ?').run(Number(lastInsertRowid) - 500);
    }
  }

  // ---- Dựng view ---------------------------------------------------------
  function cropView(c) {
    return { ...c, growMs: growMsFor(c, config.fast), stealCap: stealCap(c) };
  }

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
      const crop = CROPS[r.crop];
      out.push({
        idx: i,
        crop: r.crop,
        plantedAt: r.planted_at,
        readyAt: r.ready_at,
        ready: now >= r.ready_at,
        stolen: r.stolen,
        stealCap: stealCap(crop),
        yieldLeft: crop.yield - r.stolen,
      });
    }
    return out;
  }

  function farmerView(f) {
    const level = levelFor(f.xp);
    return {
      id: f.user_id,
      name: f.name,
      coins: f.coins,
      xp: f.xp,
      level,
      levelXp: xpForLevel(level),
      nextLevelXp: xpForLevel(level + 1),
      plotsCount: f.plots_count,
      nextPlot:
        f.plots_count < MAX_PLOTS
          ? { ...PLOT_SLOTS[f.plots_count - START_PLOTS], idx: f.plots_count }
          : null,
      dailyAvailable: f.last_daily !== todayVN(),
      plots: plotViews(f.user_id, f.plots_count),
    };
  }

  function grantXp(userId, delta) {
    db.prepare('UPDATE farmers SET xp = xp + ? WHERE user_id = ?').run(delta, userId);
  }

  const getFarmer = db.prepare('SELECT * FROM farmers WHERE user_id = ?');
  const getPlot = db.prepare('SELECT * FROM plots WHERE owner_id = ? AND idx = ?');
  const hasAction = db.prepare(
    'SELECT 1 FROM plot_actions WHERE owner_id = ? AND idx = ? AND planted_at = ? AND helper_id = ? AND action = ?',
  );
  const markAction = db.prepare(
    'INSERT INTO plot_actions (owner_id, idx, planted_at, helper_id, action, at) VALUES (?, ?, ?, ?, ?, ?)',
  );

  // ---- API ---------------------------------------------------------------
  app.register(
    async (api) => {
      api.addHook('preHandler', requireFarmer);

      api.get('/state', async (request) => {
        let others = [];
        try {
          const res = await fetch(`${config.chatApiUrl}/api/users`, {
            headers: { cookie: request.headers.cookie },
          });
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
          me: farmerView(request.farmer),
          family,
          config: {
            crops: Object.fromEntries(Object.entries(CROPS).map(([k, c]) => [k, cropView(c)])),
            plotSlots: PLOT_SLOTS,
            maxPlots: MAX_PLOTS,
            daily: { coins: DAILY_COINS, xp: DAILY_XP },
            fast: config.fast,
          },
          events: db.prepare('SELECT at, text FROM events ORDER BY id DESC LIMIT 25').all(),
        };
      });

      api.get('/leaderboard', async () => {
        return db
          .prepare('SELECT user_id AS id, name, coins, xp FROM farmers ORDER BY xp DESC, coins DESC LIMIT 20')
          .all()
          .map((f, i) => ({ ...f, level: levelFor(f.xp), rank: i + 1 }));
      });

      api.get('/farm/:id', async (request, reply) => {
        const ownerId = Number(request.params.id);
        const owner = getFarmer.get(ownerId);
        if (!owner) return reply.code(404).send({ error: 'no_farm' });
        const view = farmerView(owner);
        const myActs = {};
        for (const p of view.plots) {
          if (!p.crop) continue;
          myActs[p.idx] = {
            watered: !!hasAction.get(ownerId, p.idx, p.plantedAt, request.farmer.user_id, 'water'),
            stolenByMe: !!hasAction.get(ownerId, p.idx, p.plantedAt, request.farmer.user_id, 'steal'),
          };
        }
        delete view.coins; // ví của người khác không phải việc của mình
        delete view.dailyAvailable;
        return { farm: view, myActs };
      });

      api.post('/plant', async (request, reply) => {
        const { idx, crop: cropId } = request.body ?? {};
        const crop = CROPS[cropId];
        const me = request.farmer;
        if (!crop || !Number.isInteger(idx) || idx < 0 || idx >= me.plots_count) {
          return reply.code(400).send({ error: 'bad_request' });
        }
        if (levelFor(me.xp) < crop.level) return reply.code(400).send({ error: 'level_too_low' });
        if (me.coins < crop.cost) return reply.code(400).send({ error: 'not_enough_coins' });
        if (getPlot.get(me.user_id, idx)) return reply.code(400).send({ error: 'plot_busy' });
        const now = Date.now();
        db.transaction(() => {
          db.prepare('UPDATE farmers SET coins = coins - ? WHERE user_id = ?').run(crop.cost, me.user_id);
          db.prepare(
            'INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at) VALUES (?, ?, ?, ?, ?)',
          ).run(me.user_id, idx, crop.id, now, now + growMsFor(crop, config.fast));
        })();
        logEvent(`${crop.emoji} ${me.name} vừa gieo ${crop.name}`);
        return { me: farmerView(getFarmer.get(me.user_id)) };
      });

      api.post('/harvest', async (request, reply) => {
        const { idx } = request.body ?? {};
        const me = request.farmer;
        const plot = getPlot.get(me.user_id, idx);
        if (!plot) return reply.code(400).send({ error: 'no_plot' });
        if (Date.now() < plot.ready_at) return reply.code(400).send({ error: 'not_ready' });
        const crop = CROPS[plot.crop];
        const gain = (crop.yield - plot.stolen) * crop.sell;
        db.transaction(() => {
          db.prepare('UPDATE farmers SET coins = coins + ?, xp = xp + ? WHERE user_id = ?').run(
            gain,
            crop.xp,
            me.user_id,
          );
          db.prepare('DELETE FROM plots WHERE owner_id = ? AND idx = ?').run(me.user_id, idx);
        })();
        logEvent(`${crop.emoji} ${me.name} thu hoạch ${crop.name} được ${gain} xu`);
        return { me: farmerView(getFarmer.get(me.user_id)), gain };
      });

      api.post('/buy-plot', async (request, reply) => {
        const me = request.farmer;
        if (me.plots_count >= MAX_PLOTS) return reply.code(400).send({ error: 'max_plots' });
        const slot = PLOT_SLOTS[me.plots_count - START_PLOTS];
        if (levelFor(me.xp) < slot.level) return reply.code(400).send({ error: 'level_too_low' });
        if (me.coins < slot.price) return reply.code(400).send({ error: 'not_enough_coins' });
        db.prepare('UPDATE farmers SET coins = coins - ?, plots_count = plots_count + 1 WHERE user_id = ?').run(
          slot.price,
          me.user_id,
        );
        logEvent(`🧱 ${me.name} mở thêm ô đất thứ ${me.plots_count + 1}`);
        return { me: farmerView(getFarmer.get(me.user_id)) };
      });

      api.post('/daily', async (request, reply) => {
        const me = request.farmer;
        const today = todayVN();
        if (me.last_daily === today) return reply.code(400).send({ error: 'already_claimed' });
        db.prepare('UPDATE farmers SET coins = coins + ?, xp = xp + ?, last_daily = ? WHERE user_id = ?').run(
          DAILY_COINS,
          DAILY_XP,
          today,
          me.user_id,
        );
        return { me: farmerView(getFarmer.get(me.user_id)), gain: DAILY_COINS };
      });

      api.post('/water', async (request, reply) => {
        const { ownerId, idx } = request.body ?? {};
        const me = request.farmer;
        if (ownerId === me.user_id) return reply.code(400).send({ error: 'own_farm' });
        const owner = getFarmer.get(ownerId);
        const plot = owner && getPlot.get(ownerId, idx);
        if (!plot) return reply.code(400).send({ error: 'no_plot' });
        const now = Date.now();
        if (now >= plot.ready_at) return reply.code(400).send({ error: 'already_ready' });
        if (hasAction.get(ownerId, idx, plot.planted_at, me.user_id, 'water')) {
          return reply.code(400).send({ error: 'already_watered' });
        }
        const newReady = plot.ready_at - Math.round((plot.ready_at - now) * WATER_CUT);
        db.transaction(() => {
          db.prepare('UPDATE plots SET ready_at = ? WHERE owner_id = ? AND idx = ?').run(newReady, ownerId, idx);
          markAction.run(ownerId, idx, plot.planted_at, me.user_id, 'water', now);
          db.prepare('UPDATE farmers SET coins = coins + ? WHERE user_id = ?').run(WATER_COINS, me.user_id);
          grantXp(me.user_id, WATER_XP);
        })();
        logEvent(`💧 ${me.name} tưới giúp ruộng của ${owner.name}`);
        return refreshVisit(request, ownerId);
      });

      api.post('/steal', async (request, reply) => {
        const { ownerId, idx } = request.body ?? {};
        const me = request.farmer;
        if (ownerId === me.user_id) return reply.code(400).send({ error: 'own_farm' });
        const owner = getFarmer.get(ownerId);
        const plot = owner && getPlot.get(ownerId, idx);
        if (!plot) return reply.code(400).send({ error: 'no_plot' });
        if (Date.now() < plot.ready_at) return reply.code(400).send({ error: 'not_ready' });
        const crop = CROPS[plot.crop];
        if (plot.stolen >= stealCap(crop)) return reply.code(400).send({ error: 'steal_capped' });
        if (hasAction.get(ownerId, idx, plot.planted_at, me.user_id, 'steal')) {
          return reply.code(400).send({ error: 'already_stolen' });
        }
        db.transaction(() => {
          db.prepare('UPDATE plots SET stolen = stolen + 1 WHERE owner_id = ? AND idx = ?').run(ownerId, idx);
          markAction.run(ownerId, idx, plot.planted_at, me.user_id, 'steal', Date.now());
          db.prepare('UPDATE farmers SET coins = coins + ? WHERE user_id = ?').run(crop.sell, me.user_id);
          grantXp(me.user_id, STEAL_XP);
        })();
        logEvent(`😈 ${me.name} trộm ${crop.name} ${crop.emoji} của ${owner.name}`);
        pushTo([ownerId], 'Nông trại vui vẻ 🌾', `😈 ${me.name} vừa trộm ${crop.name} ${crop.emoji} của bạn!`);
        return refreshVisit(request, ownerId);
      });

      // Avatar lấy thẳng từ Chat (cùng cookie) — farm không lưu ảnh.
      api.get('/avatar/:id', async (request, reply) => {
        const uid = Number(request.params.id);
        if (!Number.isInteger(uid)) return reply.code(400).send({ error: 'invalid_id' });
        const res = await fetch(`${config.chatApiUrl}/api/users/${uid}/avatar`, {
          headers: { cookie: request.headers.cookie },
        });
        if (!res.ok) return reply.code(res.status).send();
        reply.header('content-type', res.headers.get('content-type') || 'application/octet-stream');
        reply.header('cache-control', 'private, max-age=86400');
        return reply.send(Buffer.from(await res.arrayBuffer()));
      });

      // Sau tưới/trộm trả luôn view ruộng đang thăm + ví mình — client khỏi gọi lại.
      function refreshVisit(request, ownerId) {
        const owner = getFarmer.get(ownerId);
        const view = farmerView(owner);
        const myActs = {};
        for (const p of view.plots) {
          if (!p.crop) continue;
          myActs[p.idx] = {
            watered: !!hasAction.get(ownerId, p.idx, p.plantedAt, request.farmer.user_id, 'water'),
            stolenByMe: !!hasAction.get(ownerId, p.idx, p.plantedAt, request.farmer.user_id, 'steal'),
          };
        }
        delete view.coins;
        delete view.dailyAvailable;
        return { farm: view, myActs, me: farmerView(getFarmer.get(request.farmer.user_id)) };
      }
    },
    { prefix: '/farm/api' },
  );

  // ---- Static + điều hướng ----------------------------------------------
  app.register(staticPlugin, { root: PUBLIC_DIR, prefix: '/farm/' });
  app.get('/farm', async (request, reply) => reply.redirect('/farm/'));
  app.get('/', async (request, reply) => reply.redirect('/farm/'));
  app.get('/healthz', async () => ({ ok: true }));

  return app;
}
