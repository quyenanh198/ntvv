import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('protected funnel counts new-player milestones once and excludes existing farmers', async () => {
  let now = Date.now();
  const day = 86_400_000;
  const db = openDb(':memory:');
  db.prepare('INSERT INTO farmers (user_id, name, gold, gems, plots_count, created_at) VALUES (2, ?, 500, 50, 12, ?)')
    .run('Existing farmer', now - 10 * day);
  const app = buildApp({
    db,
    logger: false,
    config: {
      now: () => now,
      internalSecret: 'funnel-test-secret',
      mockChatUser: { id: 1, username: 'newfarmer', display_name: 'New farmer' },
    },
  });
  const funnel = (secret) => app.inject({ method: 'GET', url: '/internal/farm/funnel',
    headers: secret ? { 'x-farm-secret': secret } : {} });
  const post = (route, payload, key) => app.inject({ method: 'POST', url: `/farm/api/${route}`,
    payload, headers: key ? { 'idempotency-key': key } : {} });
  try {
    assert.equal((await funnel()).statusCode, 404);
    assert.equal((await funnel('wrong-secret')).statusCode, 403);
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/leaderboard' })).statusCode, 200);
    assert.deepEqual((await funnel('funnel-test-secret')).json().players,
      { players: 1, firstPlant: 0, firstHarvest: 0, firstSale: 0 });

    assert.equal((await post('plant', { idx: -1, crop: 'luami' })).statusCode, 400);
    assert.equal(db.prepare('SELECT first_plant_at FROM farmers WHERE user_id = 1').get().first_plant_at, 0);
    const plant = () => post('plant', { idx: 0, crop: 'luami' }, 'funnel-plant-request-01');
    assert.equal((await plant()).statusCode, 200);
    const plantedAt = db.prepare('SELECT first_plant_at FROM farmers WHERE user_id = 1').get().first_plant_at;
    assert.ok(plantedAt >= now);
    assert.equal((await plant()).statusCode, 200);
    assert.equal(db.prepare('SELECT first_plant_at FROM farmers WHERE user_id = 1').get().first_plant_at, plantedAt);

    db.prepare('UPDATE plots SET ready_at = ? WHERE owner_id = 1 AND idx = 0').run(now - 1);
    assert.equal((await post('harvest', { idx: 0 })).statusCode, 200);
    assert.equal((await post('sell', { item: 'luami', qty: 1 })).statusCode, 200);
    const measured = (await funnel('funnel-test-secret')).json();
    assert.deepEqual(measured.players, { players: 1, firstPlant: 1, firstHarvest: 1, firstSale: 1 });
    assert.deepEqual(measured.firstTenMinutes, { eligible: 0, planted: 0, harvested: 0, sold: 0 });
    assert.deepEqual(measured.dayTwo, { eligible: 0, returned: 0 });

    now += 30 * 60 * 60_000;
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/leaderboard' })).statusCode, 200);
    assert.equal(db.prepare('SELECT day2_return_at FROM farmers WHERE user_id = 1').get().day2_return_at, now);
    now += 19 * 60 * 60_000;
    const mature = (await funnel('funnel-test-secret')).json();
    assert.deepEqual(mature.firstTenMinutes, { eligible: 1, planted: 1, harvested: 1, sold: 1 });
    assert.deepEqual(mature.dayTwo, { eligible: 1, returned: 1 });
    assert.equal(db.prepare('SELECT funnel_enrolled_at FROM farmers WHERE user_id = 2').get().funnel_enrolled_at, 0);
  } finally {
    await app.close();
    db.close();
  }
});
