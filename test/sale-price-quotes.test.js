import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { GOLD_MULT, MARKET_SAT, itemInfo } from '../server/src/game.js';

test('sale estimates include current skills and saturation and sales use committed skill changes', async () => {
  const db = openDb(':memory:');
  const app = buildApp({ db, logger: false, config: {
    mockChatUser: { id: 1, username: 'seller', display_name: 'Seller' },
  } });
  let gate;
  app.addHook('onRoute', (route) => {
    if (!route.url.endsWith('/sell')) return;
    const hooks = route.preHandler ? (Array.isArray(route.preHandler) ? route.preHandler : [route.preHandler]) : [];
    route.preHandler = [...hooks, async (request) => {
      if (!request.headers['x-hold-sale']) return;
      gate.snapshot = JSON.parse(request.farmer.skills_json);
      gate.arrive();
      await gate.released;
    }];
  });
  const post = (route, payload, key, hold = false) => app.inject({ method: 'POST', url: `/farm/api/${route}`, payload,
    headers: { 'idempotency-key': key, ...(hold ? { 'x-hold-sale': '1' } : {}) } });
  const state = async () => (await app.inject({ method: 'GET', url: '/farm/api/state' })).json().me;
  const snapshot = () => ({ farmer: db.prepare('SELECT gold, xp, sold_gold, mutation_version FROM farmers WHERE user_id = 1').get(),
    inventory: db.prepare('SELECT item, qty FROM inventory WHERE owner_id = 1 ORDER BY item').all(),
    market: db.prepare('SELECT * FROM market_sat ORDER BY item').all() });
  try {
    await state();
    for (const [item, skill, bonus] of [['sua', 'spcaocap', 8], ['botmi', 'donggoidep', 5], ['luami', null, 0]]) {
      db.prepare('DELETE FROM inventory WHERE owner_id = 1').run();
      db.prepare('DELETE FROM market_sat').run();
      db.prepare('UPDATE farmers SET xp = 1000000000, gold = 100000000, skills_json = ? WHERE user_id = 1').run('{}');
      db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, 3)').run(item);
      const base = itemInfo(item).sell * GOLD_MULT;
      const before = await state();
      assert.equal(before.salePrices[item].unitGold, base);
      assert.equal(before.salePrices[item].bonusPercent, 0);
      assert.equal(before.inventoryValue, base * 3, 'Asset valuation remains at catalog base value');
      gate = {};
      gate.arrived = new Promise((resolve) => { gate.arrive = resolve; });
      gate.released = new Promise((resolve) => { gate.release = resolve; });
      const timer = setTimeout(() => { gate.arrive(); gate.release(); }, 5000);
      const key = `sale-current-skill-${item}`;
      const pending = Promise.resolve(post('sell', { item, qty: 3 }, key, true));
      await gate.arrived;
      clearTimeout(timer);
      assert.deepEqual(gate.snapshot, {});
      if (skill) {
        const learned = await post('skill-learn', { id: skill }, `sale-learn-skill-${item}`);
        assert.equal(learned.statusCode, 200, learned.body);
        assert.equal(learned.json().me.salePrices[item].bonusPercent, bonus);
      }
      gate.release();
      const sale = await pending;
      assert.equal(sale.statusCode, 200, sale.body);
      assert.equal(sale.json().gained, Math.round(base * (1 + bonus / 100) * 3));
      const after = snapshot();
      const replay = await post('sell', { item, qty: 3 }, key);
      assert.equal(replay.statusCode, 200, replay.body);
      assert.deepEqual(snapshot(), after);
      db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, 3) ON CONFLICT(owner_id, item) DO UPDATE SET qty = 3').run(item);
      db.prepare('INSERT OR REPLACE INTO market_sat (item, sat, at) VALUES (?, ?, ?)').run(item, MARKET_SAT.cap * 2, Date.now());
      const saturated = await state();
      const rate = base * (1 + bonus / 100) * MARKET_SAT.floor;
      assert.equal(saturated.salePrices[item].unitGold, rate);
      assert.equal(saturated.inventoryValue, base * 3);
      const discounted = await post('sell', { item, qty: 3 }, `sale-saturated-price-${item}`);
      assert.equal(discounted.statusCode, 200, discounted.body);
      assert.equal(discounted.json().gained, Math.round(rate * 3));
    }
  } finally {
    gate?.release?.();
    await app.close();
    db.close();
  }
});
