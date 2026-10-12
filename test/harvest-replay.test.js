import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('single and bulk harvest replay without duplicating crops or XP', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-harvest-'));
  const db = openDb(dataDir);
  const app = buildApp({
    db, logger: false,
    config: { dataDir, mockChatUser: { id: 1, username: 'harvester', display_name: 'Harvester' } },
  });
  const post = (route, payload, key) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'idempotency-key': key },
  });
  const plot = db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at) VALUES (1, ?, ?, ?, ?)');
  const balance = () => ({
    xp: db.prepare('SELECT xp FROM farmers WHERE user_id = 1').get().xp,
    wheat: db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'luami'").get()?.qty || 0,
    carrot: db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'carot'").get()?.qty || 0,
  });
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    const past = Date.now() - 60_000;
    plot.run(0, 'luami', past - 60_000, past);
    const single = await post('/harvest', { idx: 0 }, 'single-harvest-request-01');
    assert.equal(single.statusCode, 200, single.body);
    assert.equal(single.json().item, 'luami');
    const afterSingle = balance();
    assert.equal((await post('/harvest', { idx: 0 }, 'single-harvest-request-01')).statusCode, 200);
    assert.deepEqual(balance(), afterSingle);
    assert.equal((await post('/harvest', { idx: 0 }, 'single-harvest-request-02')).statusCode, 400);

    plot.run(1, 'carot', past - 60_000, past);
    plot.run(2, 'carot', past - 60_000, past);
    const bulk = await post('/harvest-all', {}, 'bulk-harvest-request-01');
    assert.equal(bulk.statusCode, 200, bulk.body);
    assert.equal(bulk.json().harvested, 2);
    const afterBulk = balance();
    assert.equal((await post('/harvest-all', {}, 'bulk-harvest-request-01')).statusCode, 200);
    assert.deepEqual(balance(), afterBulk);
    assert.equal(afterBulk.carrot, 8);
    assert.equal((await post('/harvest-all', {}, 'bulk-harvest-request-02')).statusCode, 400);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
