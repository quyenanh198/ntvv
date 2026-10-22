import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { CANSA, CROPS, HARVEST_YIELD, TREES, WATER_FRESH_EXP } from '../server/src/game.js';

test('harvest reward reports exact transactional crop, tree and risky gains and replays unchanged', async () => {
  const db = openDb(':memory:');
  const app = buildApp({ db, logger: false, config: { mockChatUser: { id: 1, username: 'reward', display_name: 'Reward' } } });
  const post = key => app.inject({ method: 'POST', url: '/farm/api/harvest', payload: { idx: 0 }, headers: { 'idempotency-key': key } });
  const farmer = () => db.prepare('SELECT gold, xp, mutation_version FROM farmers WHERE user_id = 1').get();
  const quantity = item => db.prepare('SELECT qty FROM inventory WHERE owner_id = 1 AND item = ?').get(item)?.qty || 0;
  try {
    await app.inject({ method: 'GET', url: '/farm/api/state' });
    const cases = [
      { crop: 'luami', watered: 0, poached: 0, tree: 0, stock: 0, quantity: HARVEST_YIELD, xp: CROPS.luami.expHarvest, gold: 0 },
      { crop: 'luami', watered: 1, poached: 2, tree: 0, stock: 0, quantity: HARVEST_YIELD - 2, xp: CROPS.luami.expHarvest + WATER_FRESH_EXP, gold: 0 },
      { crop: 'cam', watered: 1, poached: 0, tree: 1, stock: 3, quantity: 3, xp: TREES.cam.exp + WATER_FRESH_EXP, gold: 0 },
      { crop: 'cansa', watered: 0, poached: 0, tree: 0, stock: 0, quantity: 0, xp: CROPS.cansa.expHarvest, gold: CANSA.reward },
    ];
    for (const [index, entry] of cases.entries()) {
      db.prepare('DELETE FROM plots WHERE owner_id = 1').run();
      db.prepare('DELETE FROM inventory WHERE owner_id = 1').run();
      const now = Date.now();
      db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at, watered, poached, tree, tree_at, fruit_stock) VALUES (1, 0, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(entry.crop, now - 10000, entry.tree ? now + 3600000 : now - 1, entry.watered, entry.poached, entry.tree, now - 10000, entry.stock);
      const before = farmer();
      const response = await post(`harvest-reward-${index}`);
      assert.equal(response.statusCode, 200, response.body);
      const expected = { item: entry.crop, quantity: entry.quantity, xp: entry.xp, gold: entry.gold };
      assert.deepEqual(response.json().reward, expected);
      assert.equal(quantity(entry.crop), entry.quantity);
      assert.equal(farmer().xp - before.xp, expected.xp);
      assert.equal(farmer().gold - before.gold, expected.gold);
      db.prepare('DELETE FROM plots WHERE owner_id = 1').run();
      db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at) VALUES (1, 0, ?, ?, ?)').run('carot', now, now + 60000);
      const after = farmer();
      const replay = await post(`harvest-reward-${index}`);
      assert.deepEqual(replay.json().reward, expected);
      assert.deepEqual(farmer(), after);
      assert.equal(quantity(entry.crop), entry.quantity);
      assert.equal(db.prepare('SELECT crop FROM plots WHERE owner_id = 1 AND idx = 0').get().crop, 'carot');
    }
  } finally { await app.close(); db.close(); }
});

test('bulk harvest groups exact mixed rewards and preserves them on retry', async () => {
  const db = openDb(':memory:');
  const app = buildApp({ db, logger: false, config: { mockChatUser: { id: 1, username: 'bulk', display_name: 'Bulk' } } });
  const harvest = () => app.inject({ method: 'POST', url: '/farm/api/harvest-all', payload: {}, headers: { 'idempotency-key': 'bulk-exact-rewards' } });
  try {
    await app.inject({ method: 'GET', url: '/farm/api/state' });
    db.prepare("INSERT INTO inventory (owner_id, item, qty) VALUES (1, 'luami', 7)").run();
    const now = Date.now();
    const insert = db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at, watered, poached, tree, tree_at, fruit_stock) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insert.run(0, 'luami', now - 10000, now - 1, 1, 1, 0, null, 0);
    insert.run(1, 'carot', now - 10000, now - 1, 0, 0, 0, null, 0);
    insert.run(2, 'cam', now - 10000, now + 3600000, 1, 0, 1, now - 10000, 3);
    insert.run(3, 'cansa', now - 10000, now - 1, 0, 0, 0, null, 0);
    const response = await harvest();
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().harvested, 4);
    assert.deepEqual(response.json().reward, { items: { luami: HARVEST_YIELD - 1, carot: HARVEST_YIELD, cam: 3 },
      xp: CROPS.luami.expHarvest + CROPS.carot.expHarvest + TREES.cam.exp + CROPS.cansa.expHarvest + 2 * WATER_FRESH_EXP,
      gold: CANSA.reward });
    assert.equal(db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'luami'").get().qty, 7 + HARVEST_YIELD - 1);
    const after = db.prepare('SELECT gold, xp, mutation_version FROM farmers WHERE user_id = 1').get();
    const replay = await harvest();
    assert.deepEqual(replay.json().reward, response.json().reward);
    assert.deepEqual(db.prepare('SELECT gold, xp, mutation_version FROM farmers WHERE user_id = 1').get(), after);
  } finally { await app.close(); db.close(); }
});
