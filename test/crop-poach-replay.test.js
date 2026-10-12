import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('single and bulk crop theft replay without granting produce or charging fines twice', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-poach-replay-'));
  const db = openDb(dataDir);
  const config = { dataDir, mockChatUser: (request) => {
    const id = Number(request.headers['x-test-user']);
    return { id, username: `farmer${id}`, display_name: `Farmer ${id}` };
  } };
  let app = buildApp({ db, logger: false, config });
  const post = (route, payload, key) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'x-test-user': '1', 'idempotency-key': key },
  });
  const plots = () => db.prepare('SELECT idx, planted_at, poached FROM plots WHERE owner_id = 2 ORDER BY idx').all();
  const snapshot = () => ({
    thief: db.prepare('SELECT gold, xp, caught_streak FROM farmers WHERE user_id = 1').get(),
    owner: db.prepare('SELECT gold FROM farmers WHERE user_id = 2').get(),
    inventory: db.prepare('SELECT item, qty FROM inventory WHERE owner_id = 1 ORDER BY item').all(),
    plots: plots(),
    debts: db.prepare('SELECT amount FROM debts WHERE debtor_id = 1 ORDER BY id').all(),
  });
  const insertPlot = (idx, plantedAt) => db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at) VALUES (2, ?, ?, ?, ?)')
    .run(idx, 'luami', plantedAt, Date.now() - 1000);
  try {
    for (const id of [1, 2]) assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state', headers: { 'x-test-user': String(id) } })).statusCode, 200);
    insertPlot(0, Date.now() - 2000);
    const single = await post('/poach', { ownerId: 2, idx: 0 }, 'single-poach-request-01');
    assert.equal(single.statusCode, 200, single.body);
    const afterSingle = snapshot();
    assert.equal((await post('/poach', { ownerId: 2, idx: 0 }, 'single-poach-request-01')).statusCode, 200);
    assert.deepEqual(snapshot(), afterSingle);

    db.prepare('DELETE FROM plots WHERE owner_id = 2 AND idx = 0').run();
    insertPlot(0, Date.now());
    insertPlot(1, Date.now() + 1);
    insertPlot(2, Date.now() + 2);
    assert.equal((await post('/poach', { ownerId: 2, idx: 0 }, 'single-poach-request-01')).statusCode, 200);
    assert.equal(plots()[0].poached, 0);
    const bulk = await post('/poach-all', { ownerId: 2 }, 'bulk-poach-request-01');
    assert.equal(bulk.statusCode, 200, bulk.body);
    assert.ok(bulk.json().poached > 0);
    const afterBulk = snapshot();
    assert.equal((await post('/poach-all', { ownerId: 2 }, 'bulk-poach-request-01')).statusCode, 200);
    assert.deepEqual(snapshot(), afterBulk);
    assert.equal((await post('/poach-all', { ownerId: 2 }, 'bulk-poach-request-02')).statusCode, 400);

    insertPlot(3, Date.now() + 3);
    db.prepare('UPDATE farmers SET dog_until = ? WHERE user_id = 2').run(Date.now() + 60000);
    const originalRandom = Math.random;
    let caught;
    try {
      Math.random = () => 0;
      caught = await post('/poach', { ownerId: 2, idx: 3 }, 'caught-poach-request-01');
    } finally {
      Math.random = originalRandom;
    }
    assert.equal(caught.statusCode, 400, caught.body);
    assert.equal(caught.json().error, 'caught_by_dog');
    const afterCaught = snapshot();
    let bulkCaught;
    try {
      Math.random = () => 0;
      bulkCaught = await post('/poach-all', { ownerId: 2 }, 'bulk-caught-request-01');
    } finally {
      Math.random = originalRandom;
    }
    assert.equal(bulkCaught.statusCode, 200, bulkCaught.body);
    assert.ok(bulkCaught.json().caught?.times > 0);
    const afterBulkCaught = snapshot();
    await app.close();
    app = buildApp({ db, logger: false, config });
    const replay = await post('/poach', { ownerId: 2, idx: 3 }, 'caught-poach-request-01');
    assert.equal(replay.statusCode, 400, replay.body);
    assert.deepEqual(replay.json(), caught.json());
    assert.deepEqual(snapshot(), afterBulkCaught);
    const bulkReplay = await post('/poach-all', { ownerId: 2 }, 'bulk-caught-request-01');
    assert.equal(bulkReplay.statusCode, 200, bulkReplay.body);
    assert.deepEqual(bulkReplay.json().caught, bulkCaught.json().caught);
    assert.deepEqual(snapshot(), afterBulkCaught);
    assert.ok(afterBulkCaught.thief.caught_streak > afterCaught.thief.caught_streak);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
