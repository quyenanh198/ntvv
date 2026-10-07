import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('animal feeding and collection replay without consuming or granting twice', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-animal-care-'));
  const db = openDb(dataDir);
  const app = buildApp({
    db, logger: false,
    config: { dataDir, mockChatUser: { id: 1, username: 'keeper', display_name: 'Keeper' } },
  });
  const post = (route, key) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload: { kind: 'ga' },
    headers: { 'idempotency-key': key },
  });
  const qty = (item) => db.prepare('SELECT qty FROM inventory WHERE owner_id = 1 AND item = ?').get(item)?.qty || 0;
  const animalTimes = () => db.prepare("SELECT ready_at FROM animals WHERE owner_id = 1 AND kind = 'ga' ORDER BY id").all().map((row) => row.ready_at);
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    db.prepare("INSERT INTO animals (owner_id, kind) VALUES (1, 'ga')").run();
    db.prepare("INSERT INTO animals (owner_id, kind) VALUES (1, 'ga')").run();
    db.prepare("INSERT INTO inventory (owner_id, item, qty) VALUES (1, 'thucan', 2) ON CONFLICT(owner_id, item) DO UPDATE SET qty = 2").run();
    const feed = await post('/feed', 'animal-feed-request-01');
    assert.equal(feed.statusCode, 200, feed.body);
    assert.equal(feed.json().fed, 2);
    const fedTimes = animalTimes();
    const feedAfter = qty('thucan');
    assert.equal((await post('/feed', 'animal-feed-request-01')).statusCode, 200);
    assert.deepEqual(animalTimes(), fedTimes);
    assert.equal(qty('thucan'), feedAfter);
    assert.equal((await post('/feed', 'animal-feed-request-02')).statusCode, 400);

    db.prepare("UPDATE animals SET ready_at = ? WHERE owner_id = 1 AND kind = 'ga'").run(Date.now() - 1000);
    const xpBefore = db.prepare('SELECT xp FROM farmers WHERE user_id = 1').get().xp;
    const collect = await post('/collect', 'animal-collect-request-01');
    assert.equal(collect.statusCode, 200, collect.body);
    assert.equal(collect.json().collected, 2);
    const eggsAfter = qty('trung');
    const xpAfter = db.prepare('SELECT xp FROM farmers WHERE user_id = 1').get().xp;
    assert.equal(eggsAfter, 2);
    assert.ok(xpAfter > xpBefore);
    assert.equal((await post('/collect', 'animal-collect-request-01')).statusCode, 200);
    assert.equal(qty('trung'), eggsAfter);
    assert.equal(db.prepare('SELECT xp FROM farmers WHERE user_id = 1').get().xp, xpAfter);
    assert.equal((await post('/collect', 'animal-collect-request-02')).statusCode, 400);
    assert.deepEqual(animalTimes(), [null, null]);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
