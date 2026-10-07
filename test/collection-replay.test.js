import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('harvest collection records unique crops and claims its reward once across a restart', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-collection-'));
  const config = { dataDir, mockChatUser: { id: 1, username: 'collector', display_name: 'Collector' } };
  let db = openDb(dataDir);
  let app = buildApp({ db, logger: false, config });
  const post = (route, payload, key) => app.inject({ method: 'POST', url: `/farm/api${route}`, payload, headers: { 'idempotency-key': key } });
  const farmer = () => db.prepare('SELECT gold, gems FROM farmers WHERE user_id = 1').get();
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    const incomplete = await post('/collection-claim', { id: 'first_harvests' }, 'collection-early-0001');
    assert.equal(incomplete.statusCode, 400);
    assert.equal(incomplete.json().error, 'collection_incomplete');
    for (const [index, crop] of ['luami', 'carot', 'ngo'].entries()) {
      db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at) VALUES (1, 0, ?, ?, ?)').run(crop, Date.now() - 1000, Date.now() - 1);
      const harvested = await post('/harvest', { idx: 0 }, `collection-harvest-${index}-0001`);
      assert.equal(harvested.statusCode, 200, harvested.body);
      assert.equal(harvested.json().me.collections[0].items[index].found, true);
    }
    assert.equal(db.prepare('SELECT COUNT(*) n FROM collection_discoveries WHERE owner_id = 1').get().n, 3);
    const before = farmer();
    const claim = await post('/collection-claim', { id: 'first_harvests' }, 'collection-claim-0001');
    assert.equal(claim.statusCode, 200, claim.body);
    assert.equal(claim.json().me.collections[0].claimed, true);
    assert.equal(farmer().gold - before.gold, claim.json().gold);
    assert.equal((await post('/collection-claim', { id: 'first_harvests' }, 'collection-claim-0001')).statusCode, 200);
    const after = farmer();
    assert.equal((await post('/collection-claim', { id: 'first_harvests' }, 'collection-new-key-0001')).statusCode, 400);
    assert.deepEqual(farmer(), after);
    await app.close();
    db.close();
    db = openDb(dataDir);
    app = buildApp({ db, logger: false, config });
    assert.equal((await post('/collection-claim', { id: 'first_harvests' }, 'collection-claim-0001')).statusCode, 200);
    assert.deepEqual(farmer(), after);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
