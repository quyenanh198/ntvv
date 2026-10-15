import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { MAX_PLOTS } from '../server/src/game.js';

test('malformed mutation targets are rejected before farmer state changes', async () => {
  const db = openDb(':memory:');
  const app = buildApp({ db, logger: false, config: {
    mockChatUser: (request) => {
      const id = Number(request.headers['x-test-user'] || 1);
      return { id, username: `farmer${id}`, display_name: `Farmer ${id}` };
    },
  } });
  const post = (route, payload) => app.inject({ method: 'POST', url: `/farm/api${route}`,
    headers: { 'content-type': 'application/json' }, payload: JSON.stringify(payload) });
  try {
    for (const body of [null, [], [1], 42, true, 'text']) {
      const rejected = await post('/harvest-all', body);
      assert.equal(rejected.statusCode, 400, rejected.body);
      assert.equal(rejected.json().error, 'bad_request');
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM farmers').get().n, 0);
    }
    for (const id of [1, 2]) {
      assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state', headers: { 'x-test-user': String(id) } })).statusCode, 200);
    }
    const now = Date.now();
    const plant = db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at) VALUES (?, ?, ?, ?, ?)');
    for (const owner of [1, 2]) {
      plant.run(owner, 0, 'luami', now - 1000, now + 60 * 60_000);
      plant.run(owner, 1, 'luami', now - 2000, now - 1000);
    }
    const orderId = Number(db.prepare('INSERT INTO orders (owner_id, slot, items_json, gold, exp, stars) VALUES (1, 0, ?, 100, 10, 1)')
      .run(JSON.stringify({ luami: 1 })).lastInsertRowid);
    const requestId = Number(db.prepare("INSERT INTO gold_requests (from_id, to_id, amount, status, created_at) VALUES (2, 1, 10, 'open', ?)")
      .run(now).lastInsertRowid);
    db.prepare("INSERT INTO inventory (owner_id, item, qty) VALUES (1, 'luami', 10)").run();
    db.prepare('UPDATE festival SET counters_json = ? WHERE owner_id = 1').run(JSON.stringify({ harvest: 50 }));
    const tables = ['farmers', 'plots', 'inventory', 'orders', 'animals', 'machine_jobs', 'fish_batches',
      'mutation_results', 'plot_actions', 'gold_requests', 'wants', 'luxury', 'festival'];
    const snapshot = () => Object.fromEntries(tables.map((table) => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
    const before = snapshot();
    const reject = async (route, payload) => {
      const response = await post(route, payload);
      assert.equal(response.statusCode, 400, `${route} ${JSON.stringify(payload)}: ${response.body}`);
      assert.equal(response.json().error, 'bad_request', `${route}: ${response.body}`);
      assert.deepEqual(snapshot(), before, `${route} changed state for ${JSON.stringify(payload)}`);
    };
    const idTargets = [
      ['/water', { ownerId: 2, idx: 0 }, 'ownerId'],
      ['/poach', { ownerId: 2, idx: 1 }, 'ownerId'],
      ['/poach-all', { ownerId: 2 }, 'ownerId'],
      ['/inspect', { ownerId: 2, idx: 1 }, 'ownerId'],
      ['/harvest-help', { ownerId: 2, all: true }, 'ownerId'],
      ['/water-help-all', { ownerId: 2 }, 'ownerId'],
      ['/plant-help', { ownerId: 2 }, 'ownerId'],
      ['/poach-animal', { ownerId: 2 }, 'ownerId'],
      ['/poach-machine', { ownerId: 2 }, 'ownerId'],
      ['/gold-give', { toId: 2, amount: 1 }, 'toId'],
      ['/gold-ask', { toId: 2, amount: 1 }, 'toId'],
      ['/order-deliver', { id: orderId }, 'id'],
      ['/order-discard', { id: orderId }, 'id'],
      ['/gold-request-act', { id: requestId, action: 'pay' }, 'id'],
      ['/fish-harvest', { id: 1 }, 'id'],
      ['/want-cancel', { id: 1 }, 'id'],
      ['/want-fill', { id: 1, qty: 1 }, 'id'],
      ['/fest-claim', { id: 1 }, 'id'],
    ];
    for (const [route, payload, field] of idTargets) {
      for (const value of [null, '2', false, 0, -1, 1.5, {}, [payload[field]], Number.MAX_SAFE_INTEGER + 1]) {
        await reject(route, { ...payload, [field]: value });
      }
    }
    const plotTargets = [
      ['/plant', { idx: 0, crop: 'luami' }], ['/harvest', { idx: 1 }], ['/water', { idx: 0 }],
      ['/poach', { ownerId: 2, idx: 1 }], ['/inspect', { ownerId: 2, idx: 1 }],
      ['/harvest-help', { ownerId: 2, idx: 1 }], ['/speedup', { target: 'plot', idx: 0 }],
      ['/plant-tree', { idx: 0, tree: 'cam' }], ['/remove-tree', { idx: 0 }],
    ];
    for (const [route, payload] of plotTargets) {
      for (const idx of [null, '0', false, -1, 0.5, {}, [0], MAX_PLOTS]) await reject(route, { ...payload, idx });
    }
    const catalogTargets = [
      ['/plant', { idx: 0, crop: 'luami' }, 'crop'], ['/plant-all', { crop: 'luami' }, 'crop'],
      ['/plant-tree', { idx: 0, tree: 'cam' }, 'tree'], ['/buy-animal', { kind: 'ga' }, 'kind'],
      ['/feed', { kind: 'ga' }, 'kind'], ['/collect', { kind: 'ga' }, 'kind'], ['/upgrade-barn', { kind: 'ga' }, 'kind'],
      ['/buy', { item: 'thucan', qty: 1 }, 'item'], ['/sell', { item: 'luami', qty: 1 }, 'item'],
      ['/want-create', { item: 'luami', qty: 1 }, 'item'], ['/fish-stock', { species: 'oc', qty: 1 }, 'species'],
      ['/machine-run', { machine: 'coixay', recipe: 'botmi' }, 'machine'],
      ['/machine-run', { machine: 'coixay', recipe: 'botmi' }, 'recipe'],
      ['/machine-collect', { machine: 'coixay' }, 'machine'],
      ['/machine-collect', { machine: 'coixay', recipe: 'botmi' }, 'recipe'],
      ['/mill', { recipe: 'botmi' }, 'recipe'], ['/machine-upgrade', { machine: 'coixay' }, 'machine'],
      ['/speedup', { target: 'machine', kind: 'coixay' }, 'kind'],
      ['/speedup', { target: 'machine', kind: 'coixay', recipe: 'botmi' }, 'recipe'],
      ['/luxury-buy', { item: 'nongdanchamchi' }, 'item'], ['/luxury-equip', { item: 'nongdanchamchi' }, 'item'],
      ['/skill-learn', { id: 'bantayxanh' }, 'id'], ['/collection-claim', { id: 'first_harvests' }, 'id'],
    ];
    for (const [route, payload, field] of catalogTargets) {
      for (const value of [null, 42, {}, [payload[field]]]) await reject(route, { ...payload, [field]: value });
    }
    await reject('/harvest-help', { ownerId: 2, all: 'true' });
    await reject('/harvest-help', { ownerId: 2, all: 1 });
    await reject('/harvest-help', { ownerId: 2 });
    await reject('/speedup', { target: 'plot' });
    await reject('/speedup', { target: 'machine' });
    await reject('/gold-request-act', { id: requestId, action: ['pay'] });

    const ownWater = await post('/water', { idx: 0 });
    assert.equal(ownWater.statusCode, 200, ownWater.body);
    assert.equal(db.prepare('SELECT watered FROM plots WHERE owner_id = 1 AND idx = 0').get().watered, 1);
    assert.equal(db.prepare('SELECT watered FROM plots WHERE owner_id = 2 AND idx = 0').get().watered, 0);
    const friendWater = await post('/water', { ownerId: 2, idx: 0 });
    assert.equal(friendWater.statusCode, 200, friendWater.body);
    assert.equal(db.prepare('SELECT watered FROM plots WHERE owner_id = 2 AND idx = 0').get().watered, 1);
  } finally {
    await app.close();
    db.close();
  }
});
