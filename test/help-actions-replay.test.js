import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { HARVEST_YIELD, WATER_HELPER_GOLD, GOLD_MULT } from '../server/src/game.js';

test('help planting and harvesting keep both farmers consistent across retries and restart', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-help-replay-'));
  const config = { dataDir, mockChatUser: (request) => {
    const id = Number(request.headers['x-test-user']);
    return { id, username: `farmer${id}`, display_name: `Farmer ${id}` };
  } };
  let db = openDb(dataDir);
  let app = buildApp({ db, logger: false, config });
  const post = (route, payload, key) => app.inject({ method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'x-test-user': '1', 'idempotency-key': key } });
  const snapshot = () => ({
    helper: db.prepare('SELECT gold, xp FROM farmers WHERE user_id = 1').get(),
    owner: db.prepare('SELECT gold, xp FROM farmers WHERE user_id = 2').get(),
    plots: db.prepare('SELECT idx, crop, ready_at FROM plots WHERE owner_id = 2 ORDER BY idx').all(),
    wheat: db.prepare("SELECT qty FROM inventory WHERE owner_id = 2 AND item = 'luami'").get()?.qty || 0,
  });
  try {
    for (const user of [1, 2]) assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state', headers: { 'x-test-user': String(user) } })).statusCode, 200);
    const beforePlant = snapshot();
    const planted = await post('/plant-help', { ownerId: 2 }, 'plant-help-retry-0001');
    assert.equal(planted.statusCode, 200, planted.body);
    assert.ok(planted.json().helped > 0);
    assert.equal(snapshot().helper.gold, beforePlant.helper.gold - planted.json().cost);
    const afterPlant = snapshot();
    assert.equal((await post('/plant-help', { ownerId: 2 }, 'plant-help-retry-0001')).statusCode, 200);
    assert.deepEqual(snapshot(), afterPlant);
    assert.equal((await post('/plant-help', { ownerId: 1 }, 'plant-help-retry-0001')).statusCode, 409);

    db.prepare("UPDATE plots SET crop = 'luami', ready_at = ? WHERE owner_id = 2 AND idx = 0").run(Date.now() - 1);
    const beforeHarvest = snapshot();
    const harvested = await post('/harvest-help', { ownerId: 2, idx: 0 }, 'harvest-help-retry-0001');
    assert.equal(harvested.statusCode, 200, harvested.body);
    assert.equal(harvested.json().harvested, 1);
    assert.equal(snapshot().wheat - beforeHarvest.wheat, HARVEST_YIELD);
    assert.equal(snapshot().helper.gold - beforeHarvest.helper.gold, WATER_HELPER_GOLD * GOLD_MULT);
    assert.equal(db.prepare("SELECT item FROM collection_discoveries WHERE owner_id = 2 AND item = 'luami'").get().item, 'luami');
    const afterHarvest = snapshot();
    assert.equal((await post('/harvest-help', { ownerId: 2, idx: 0 }, 'harvest-help-retry-0001')).statusCode, 200);
    assert.deepEqual(snapshot(), afterHarvest);
    assert.equal((await post('/harvest-help', { ownerId: 2, idx: 0 }, 'harvest-help-new-key-0001')).statusCode, 400);

    db.prepare("UPDATE plots SET crop = 'carot', ready_at = ? WHERE owner_id = 2 AND idx = 1").run(Date.now() - 1);
    const concurrent = await Promise.all([post('/harvest-help', { ownerId: 2, idx: 1 }, 'harvest-help-concurrent-0001'), post('/harvest-help', { ownerId: 2, idx: 1 }, 'harvest-help-concurrent-0001')]);
    assert.deepEqual(concurrent.map((response) => response.statusCode), [200, 200]);
    assert.equal(db.prepare("SELECT qty FROM inventory WHERE owner_id = 2 AND item = 'carot'").get().qty, HARVEST_YIELD);
    const beforeRestart = snapshot();
    await app.close();
    db.close();
    db = openDb(dataDir);
    app = buildApp({ db, logger: false, config });
    assert.equal((await post('/harvest-help', { ownerId: 2, idx: 0 }, 'harvest-help-retry-0001')).statusCode, 200);
    assert.deepEqual(snapshot(), beforeRestart);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
