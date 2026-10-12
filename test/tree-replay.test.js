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
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
