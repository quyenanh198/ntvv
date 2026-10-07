import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { CANSA, GOLD_MULT, WATER_HELPER_GOLD } from '../server/src/game.js';

test('watering and inspection replay without duplicate social rewards or plot changes', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-social-actions-'));
  const config = { dataDir, mockChatUser: (request) => {
    const id = Number(request.headers['x-test-user']);
    return { id, username: `farmer${id}`, display_name: `Farmer ${id}` };
  } };
  let db = openDb(dataDir);
  let app = buildApp({ db, logger: false, config });
  const post = (user, route, payload, key) => app.inject({ method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'x-test-user': String(user), 'idempotency-key': key } });
  const plot = (owner, idx) => db.prepare('SELECT watered, ready_at FROM plots WHERE owner_id = ? AND idx = ?').get(owner, idx);
  const gold = (owner) => db.prepare('SELECT gold FROM farmers WHERE user_id = ?').get(owner).gold;
  try {
    for (const user of [1, 2]) assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state', headers: { 'x-test-user': String(user) } })).statusCode, 200);
    const future = Date.now() + 60 * 60_000;
    const insert = db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at) VALUES (?, ?, ?, ?, ?)');
    insert.run(1, 0, 'luami', Date.now(), future);
    insert.run(2, 0, 'luami', Date.now(), future);
    insert.run(2, 1, 'carot', Date.now(), future);
    const own = { idx: 0 };
    assert.equal((await post(1, '/water', own, 'own-water-retry-0001')).statusCode, 200);
    assert.equal((await post(1, '/water', own, 'own-water-retry-0001')).statusCode, 200);
    assert.equal(plot(1, 0).watered, 1);
    assert.equal((await post(1, '/water', own, 'own-water-new-key-0001')).statusCode, 400);
    insert.run(1, 1, 'carot', Date.now(), future);
    insert.run(1, 2, 'luami', Date.now(), future);
    const ownBulk = await Promise.all([post(1, '/water-all', {}, 'own-bulk-water-0001'), post(1, '/water-all', {}, 'own-bulk-water-0001')]);
    assert.deepEqual(ownBulk.map((response) => response.statusCode), [200, 200]);
    assert.equal(ownBulk[0].json().watered, 2);
    assert.equal(plot(1, 1).watered, 1);
    assert.equal(plot(1, 2).watered, 1);
    assert.equal((await post(1, '/water-all', {}, 'own-bulk-new-key-0001')).statusCode, 400);

    const beforeHelp = gold(1);
    const help = { ownerId: 2, idx: 0 };
    const first = await post(1, '/water', help, 'help-water-retry-0001');
    assert.equal(first.statusCode, 200, first.body);
    const afterHelpPlot = plot(2, 0);
    assert.equal((await post(1, '/water', help, 'help-water-retry-0001')).statusCode, 200);
    assert.deepEqual(plot(2, 0), afterHelpPlot);
    assert.equal(gold(1) - beforeHelp, WATER_HELPER_GOLD * GOLD_MULT);
    assert.equal((await post(1, '/water', { ownerId: 2, idx: 1 }, 'help-water-retry-0001')).statusCode, 409);

    const beforeBulk = gold(1);
    const bulk = await Promise.all([post(1, '/water-help-all', { ownerId: 2 }, 'bulk-water-retry-0001'), post(1, '/water-help-all', { ownerId: 2 }, 'bulk-water-retry-0001')]);
    assert.deepEqual(bulk.map((response) => response.statusCode), [200, 200]);
    assert.equal(bulk[0].json().watered, 1);
    assert.equal(gold(1) - beforeBulk, WATER_HELPER_GOLD * GOLD_MULT);
    assert.equal(plot(2, 1).watered, 1);
    assert.equal((await post(1, '/water-help-all', { ownerId: 2 }, 'bulk-water-new-key-0001')).statusCode, 400);

    insert.run(2, 2, 'cansa', Date.now(), future);
    const beforeInspect = gold(1);
    const inspect = await post(1, '/inspect', { ownerId: 2, idx: 2 }, 'inspect-retry-key-0001');
    assert.equal(inspect.statusCode, 200, inspect.body);
    assert.equal(inspect.json().found, true);
    assert.equal((await post(1, '/inspect', { ownerId: 2, idx: 2 }, 'inspect-retry-key-0001')).statusCode, 200);
    assert.equal(gold(1) - beforeInspect, CANSA.bounty - CANSA.inspectFee);
    assert.equal(plot(2, 2), undefined);
    const afterInspect = gold(1);
    await app.close();
    db.close();
    db = openDb(dataDir);
    app = buildApp({ db, logger: false, config });
    assert.equal((await post(1, '/inspect', { ownerId: 2, idx: 2 }, 'inspect-retry-key-0001')).statusCode, 200);
    assert.equal(gold(1), afterInspect);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
