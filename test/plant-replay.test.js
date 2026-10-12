import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { xpNeedFor } from '../server/src/game.js';

test('single and bulk planting replay without charging or awarding XP twice', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-plant-'));
  const db = openDb(dataDir);
  const app = buildApp({
    db, logger: false,
    config: { dataDir, mockChatUser: { id: 1, username: 'planter', display_name: 'Planter' } },
  });
  const post = (route, payload, key) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'idempotency-key': key },
  });
  const balance = () => db.prepare('SELECT gold, xp FROM farmers WHERE user_id = 1').get();
  const plots = () => db.prepare('SELECT idx, crop, tree FROM plots WHERE owner_id = 1 ORDER BY idx').all();
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    const first = await post('/plant', { idx: 0, crop: 'luami' }, 'single-plant-request-01');
    assert.equal(first.statusCode, 200, first.body);
    const afterSingle = balance();
    assert.equal((await post('/plant', { idx: 0, crop: 'luami' }, 'single-plant-request-01')).statusCode, 200);
    assert.deepEqual(balance(), afterSingle);
    assert.equal(plots().length, 1);
    assert.equal((await post('/plant', { idx: 0, crop: 'carot' }, 'single-plant-request-01')).statusCode, 409);

    const bulk = await post('/plant-all', { crop: 'carot' }, 'bulk-plant-request-01');
    assert.equal(bulk.statusCode, 200, bulk.body);
    assert.equal(bulk.json().planted, 11);
    const afterBulk = balance();
    assert.equal((await post('/plant-all', { crop: 'carot' }, 'bulk-plant-request-01')).statusCode, 200);
    assert.deepEqual(balance(), afterBulk);
    assert.equal(plots().length, 12);
    assert.equal((await post('/plant-all', { crop: 'carot' }, 'bulk-plant-request-02')).statusCode, 400);

    db.prepare('DELETE FROM plots WHERE owner_id = 1').run();
    const level12Xp = Array.from({ length: 11 }, (_, i) => xpNeedFor(i + 1)).reduce((sum, value) => sum + value, 0);
    db.prepare('UPDATE farmers SET xp = ?, gold = 10000 WHERE user_id = 1').run(level12Xp);
    const trees = await post('/plant-all', { crop: 'cam' }, 'bulk-tree-request-01');
    assert.equal(trees.statusCode, 200, trees.body);
    const afterTrees = balance();
    assert.equal((await post('/plant-all', { crop: 'cam' }, 'bulk-tree-request-01')).statusCode, 200);
    assert.deepEqual(balance(), afterTrees);
    assert.equal(plots().filter((p) => p.tree === 1).length, trees.json().planted);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
