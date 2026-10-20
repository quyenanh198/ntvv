import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { ANIMALS, BARN_UPGRADE_GOLD, CROPS, FISH_FARM, FISH_STOCK_BY_LEVEL, xpNeedFor } from '../server/src/game.js';

test('competing purchases and upgrades conserve balances and shared capacity', { timeout: 30000 }, async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-spending-contention-'));
  const db = openDb(dataDir);
  const app = buildApp({ db, logger: false, config: {
    dataDir, mockChatUser: { id: 1, username: 'spender', display_name: 'Spender' },
  } });
  const gates = new Map();
  // Hold both requests after their farmer snapshots load, before either route
  // handler enters its transaction. This reproduces the stale-balance window.
  app.addHook('onRoute', (route) => {
    if (!['plant', 'buy-animal', 'buy-chicken', 'upgrade-barn', 'upgrade-coop', 'fish-stock'].includes(route.url.split('/').pop())) return;
    const hooks = route.preHandler ? (Array.isArray(route.preHandler) ? route.preHandler : [route.preHandler]) : [];
    route.preHandler = [...hooks, async (request) => {
      const group = request.headers['x-spending-race'];
      if (!group) return;
      let gate = gates.get(group);
      if (!gate) {
        gate = { snapshots: [] };
        gate.ready = new Promise((resolve) => { gate.release = resolve; });
        gate.timer = setTimeout(() => { gate.error = new Error(`Both ${group} requests did not reach the spending barrier`); gate.release(); }, 5000);
        gates.set(group, gate);
      }
      gate.snapshots.push(request.farmer.gold);
      if (gate.snapshots.length === 2) { clearTimeout(gate.timer); gate.release(); }
      await gate.ready;
      if (gate.error) throw gate.error;
    }];
  });
  const post = (route, payload, key, group) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'idempotency-key': key, ...(group ? { 'x-spending-race': group } : {}) },
  });
  const state = () => ({
    farmer: db.prepare('SELECT gold, xp, mutation_version, coop_level, pond_level FROM farmers WHERE user_id = 1').get(),
    plots: db.prepare('SELECT idx, crop FROM plots WHERE owner_id = 1 ORDER BY idx').all(),
    animals: db.prepare('SELECT id, kind FROM animals WHERE owner_id = 1 ORDER BY id').all(),
    fish: db.prepare('SELECT id, species, qty FROM fish_batches WHERE owner_id = 1 ORDER BY id').all(),
  });
  const seed = CROPS.luami.seed;
  const chicken = ANIMALS.ga.price;
  const scenarios = [
    { name: 'two-plots', budget: seed, actions: [
      { route: '/plant', payload: { idx: 0, crop: 'luami' }, cost: seed, kind: 'plot' },
      { route: '/plant', payload: { idx: 1, crop: 'luami' }, cost: seed, kind: 'plot' },
    ] },
    { name: 'animal-aliases', budget: chicken, actions: [
      { route: '/buy-animal', payload: { kind: 'ga', count: 1 }, cost: chicken, kind: 'animal' },
      { route: '/buy-chicken', payload: {}, cost: chicken, kind: 'animal' },
    ] },
    { name: 'mixed-actions', budget: Math.max(seed, chicken), actions: [
      { route: '/plant', payload: { idx: 0, crop: 'luami' }, cost: seed, kind: 'plot' },
      { route: '/buy-animal', payload: { kind: 'ga', count: 'max' }, cost: chicken, kind: 'animal' },
    ] },
  ];
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    const xp = xpNeedFor(1) + xpNeedFor(2);
    for (const { name, budget, actions } of scenarios) {
      db.prepare('DELETE FROM plots WHERE owner_id = 1').run();
      db.prepare('DELETE FROM animals WHERE owner_id = 1').run();
      db.prepare('UPDATE farmers SET gold = ?, xp = ?, tax_owed = 0 WHERE user_id = 1').run(budget, xp);
      const responses = await Promise.all(actions.map((action, index) => post(action.route, action.payload, `spend-${name}-${index}`, name)));
      assert.deepEqual(gates.get(name).snapshots, [budget, budget], 'Both requests must enter with the same affordable snapshot');
      assert.deepEqual(responses.map((response) => response.statusCode).sort(), [200, 400], `${name}: ${responses.map((response) => response.body).join('\n')}`);
      const winner = responses.findIndex((response) => response.statusCode === 200);
      assert.equal(responses[1 - winner].json().error, 'not_enough_gold');
      const settled = state();
      assert.equal(settled.farmer.gold, budget - actions[winner].cost);
      assert.equal(settled.plots.length, Number(actions[winner].kind === 'plot'));
      assert.equal(settled.animals.length, Number(actions[winner].kind === 'animal'));
      if (settled.plots.length) assert.equal(settled.plots[0].idx, actions[winner].payload.idx);
      const replay = await post(actions[winner].route, actions[winner].payload, `spend-${name}-${winner}`);
      assert.equal(replay.statusCode, 200, replay.body);
      assert.deepEqual(state(), settled, 'A winning retry must preserve the settled balance, XP, and ownership');
    }

    const upgradeBudget = BARN_UPGRADE_GOLD[0];
    db.prepare('UPDATE farmers SET gold = ?, coop_level = 1 WHERE user_id = 1').run(upgradeBudget);
    const upgrades = [
      { route: '/upgrade-barn', payload: { kind: 'ga' } },
      { route: '/upgrade-coop', payload: {} },
    ];
    const upgraded = await Promise.all(upgrades.map((action, index) => post(action.route, action.payload, `upgrade-contention-${index}`, 'upgrade-aliases')));
    assert.deepEqual(gates.get('upgrade-aliases').snapshots, [upgradeBudget, upgradeBudget]);
    assert.deepEqual(upgraded.map((response) => response.statusCode).sort(), [200, 400], upgraded.map((response) => response.body).join(String.fromCharCode(10)));
    const upgradeWinner = upgraded.findIndex((response) => response.statusCode === 200);
    assert.equal(upgraded[1 - upgradeWinner].json().error, 'not_enough_gold');
    const afterUpgrade = state();
    assert.equal(afterUpgrade.farmer.gold, 0);
    assert.equal(afterUpgrade.farmer.coop_level, 2, 'Alias routes must upgrade the same barn only once');
    const upgradeReplay = await post(upgrades[upgradeWinner].route, upgrades[upgradeWinner].payload, `upgrade-contention-${upgradeWinner}`);
    assert.equal(upgradeReplay.statusCode, 200, upgradeReplay.body);
    assert.deepEqual(state(), afterUpgrade);

    const species = Object.values(FISH_FARM)[0];
    const fishXp = Array.from({ length: species.level - 1 }, (_, index) => xpNeedFor(index + 1)).reduce((sum, need) => sum + need, 0);
    const fishBudget = species.fry * 2;
    const capacity = FISH_STOCK_BY_LEVEL[0];
    db.prepare('UPDATE farmers SET gold = ?, xp = ?, pond_level = 1 WHERE user_id = 1').run(fishBudget, fishXp);
    const now = Date.now();
    db.prepare('INSERT INTO fish_batches (owner_id, species, qty, planted_at, ready_at) VALUES (?, ?, ?, ?, ?)')
      .run(1, species.id, capacity - 1, now, now + 86400000);
    const beforeStock = state();
    const stocked = await Promise.all([1, 'max'].map((qty, index) => post('/fish-stock', { species: species.id, qty }, `stock-contention-${index}`, 'last-pond-slot')));
    assert.deepEqual(gates.get('last-pond-slot').snapshots, [fishBudget, fishBudget]);
    assert.deepEqual(stocked.map((response) => response.statusCode).sort(), [200, 400], stocked.map((response) => response.body).join('\n'));
    const stockWinner = stocked.findIndex((response) => response.statusCode === 200);
    assert.equal(stocked[1 - stockWinner].json().error, 'pond_full');
    assert.equal(stocked[stockWinner].json().stocked, 1);
    assert.equal(stocked[stockWinner].json().cost, species.fry);
    const afterStock = state();
    assert.equal(afterStock.farmer.gold, fishBudget - species.fry);
    assert.equal(afterStock.fish.reduce((sum, batch) => sum + batch.qty, 0), capacity);
    assert.equal(afterStock.fish.length, beforeStock.fish.length + 1);
    const stockReplay = await post('/fish-stock', { species: species.id, qty: [1, 'max'][stockWinner] }, `stock-contention-${stockWinner}`);
    assert.equal(stockReplay.statusCode, 200, stockReplay.body);
    assert.deepEqual(state(), afterStock, 'Retrying a successful stocking must not add fish or spend gold again');
  } finally {
    for (const gate of gates.values()) clearTimeout(gate.timer);
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
