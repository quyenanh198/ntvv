import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { LUXURY } from '../server/src/game.js';

test('luxury purchases and equipment replay without moving gold or reverting a later choice', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-luxury-replay-'));
  const config = { dataDir, mockChatUser: { id: 1, username: 'collector', display_name: 'Collector' } };
  let db = openDb(dataDir);
  let app = buildApp({ db, logger: false, config });
  const post = (route, payload, key) => app.inject({ method: 'POST', url: `/farm/api${route}`, payload, headers: { 'idempotency-key': key } });
  const farmer = () => db.prepare('SELECT gold, sunk_gold, title_id FROM farmers WHERE user_id = 1').get();
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    db.prepare('UPDATE farmers SET gold = 50000000 WHERE user_id = 1').run();
    const first = await post('/luxury-buy', { item: 'nongdanchamchi' }, 'luxury-buy-first-0001');
    assert.equal(first.statusCode, 200, first.body);
    const afterFirst = farmer();
    assert.equal(afterFirst.gold, 50000000 - LUXURY.nongdanchamchi.price);
    assert.equal((await post('/luxury-buy', { item: 'nongdanchamchi' }, 'luxury-buy-first-0001')).statusCode, 200);
    assert.deepEqual(farmer(), afterFirst);
    assert.equal((await post('/luxury-buy', { item: 'daigiaruong' }, 'luxury-buy-first-0001')).statusCode, 409);
    assert.equal((await post('/luxury-buy', { item: 'nongdanchamchi' }, 'luxury-buy-new-key-0001')).statusCode, 400);
    assert.equal((await post('/luxury-buy', { item: 'daigiaruong' }, 'luxury-buy-second-0001')).statusCode, 200);
    assert.equal((await post('/luxury-equip', { item: 'nongdanchamchi' }, 'luxury-equip-first-0001')).statusCode, 200);
    assert.equal((await post('/luxury-equip', { item: 'daigiaruong' }, 'luxury-equip-second-0001')).statusCode, 200);
    const afterSecond = farmer();
    assert.equal(afterSecond.title_id, 'daigiaruong');
    assert.equal((await post('/luxury-equip', { item: 'nongdanchamchi' }, 'luxury-equip-first-0001')).statusCode, 200);
    assert.deepEqual(farmer(), afterSecond, 'old equipment retry reverted newer selection');
    await app.close();
    db.close();
    db = openDb(dataDir);
    app = buildApp({ db, logger: false, config });
    assert.equal((await post('/luxury-buy', { item: 'nongdanchamchi' }, 'luxury-buy-first-0001')).statusCode, 200);
    assert.deepEqual(farmer(), afterSecond, 'restart replay changed purchase or equipment');
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
