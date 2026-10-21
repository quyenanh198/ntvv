import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('tree planting and removal replay without repeating a purchase or removing a later tree', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-tree-replay-'));
  const db = openDb(dataDir);
  const app = buildApp({
    db, logger: false,
    config: { dataDir, mockChatUser: { id: 1, username: 'grower', display_name: 'Grower' } },
  });
  const post = (route, payload, key) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'idempotency-key': key },
  });
  const gold = () => db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
  const plot = () => db.prepare('SELECT crop, tree FROM plots WHERE owner_id = 1 AND idx = 0').get();
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    db.prepare('UPDATE farmers SET xp = 1000000000, gold = 100000000 WHERE user_id = 1').run();

    const planted = await post('/plant-tree', { idx: 0, tree: 'cam' }, 'tree-plant-request-01');
    assert.equal(planted.statusCode, 200, planted.body);
    const afterPlant = gold();
    const firstTreeVersion = db.prepare('SELECT mutation_version FROM farmers WHERE user_id = 1').get().mutation_version;
    assert.deepEqual(plot(), { crop: 'cam', tree: 1 });
    assert.equal((await post('/plant-tree', { idx: 0, tree: 'cam' }, 'tree-plant-request-01')).statusCode, 200);
    assert.equal(gold(), afterPlant);
    assert.equal((await post('/plant-tree', { idx: 0, tree: 'chuoi' }, 'tree-plant-request-01')).statusCode, 409);

    assert.equal((await post('/remove-tree', { idx: 0 }, 'tree-remove-request-01')).statusCode, 200);
    assert.equal(plot(), undefined);
    assert.equal((await post('/plant-tree', { idx: 0, tree: 'cam' }, 'tree-plant-request-02')).statusCode, 200);
    const afterReplant = gold();
    assert.equal((await post('/remove-tree', { idx: 0 }, 'tree-remove-request-01')).statusCode, 200);
    assert.deepEqual(plot(), { crop: 'cam', tree: 1 });
    assert.equal(gold(), afterReplant);
    const currentVersion = db.prepare('SELECT mutation_version FROM farmers WHERE user_id = 1').get().mutation_version;
    const staleRemoval = await post('/remove-tree', { idx: 0, expectedVersion: firstTreeVersion }, 'tree-remove-stale-review');
    assert.equal(staleRemoval.statusCode, 409, staleRemoval.body);
    assert.equal(staleRemoval.json().error, 'state_changed');
    assert.deepEqual(plot(), { crop: 'cam', tree: 1 });
    assert.equal(gold(), afterReplant);
    assert.equal(db.prepare('SELECT mutation_version FROM farmers WHERE user_id = 1').get().mutation_version, currentVersion);
    for (const expectedVersion of [-1, 1.5, '1', null]) {
      const invalid = await post('/remove-tree', { idx: 0, expectedVersion }, 'tree-remove-invalid-version');
      assert.equal(invalid.statusCode, 400, invalid.body);
      assert.equal(invalid.json().error, 'bad_request');
      assert.deepEqual(plot(), { crop: 'cam', tree: 1 });
    }
    const guardedBody = { idx: 0, expectedVersion: currentVersion };
    assert.equal((await post('/remove-tree', guardedBody, 'tree-remove-guarded-review')).statusCode, 200);
    assert.equal(plot(), undefined);
    assert.equal((await post('/plant-tree', { idx: 0, tree: 'cam' }, 'tree-plant-request-03')).statusCode, 200);
    const afterGuardedReplant = gold();
    assert.equal((await post('/remove-tree', guardedBody, 'tree-remove-guarded-review')).statusCode, 200);
    assert.deepEqual(plot(), { crop: 'cam', tree: 1 });
    assert.equal(gold(), afterGuardedReplant);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
