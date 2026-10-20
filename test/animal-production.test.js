import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { ANIMALS } from '../server/src/game.js';

test('returning-owner action settles accumulated animal cycles in bounded batches', async () => {
  const db = openDb(':memory:');
  const app = buildApp({ db, logger: false,
    config: { mockChatUser: { id: 1, username: 'animalfarmer', display_name: 'Animal farmer' } } });
  const state = () => app.inject({ method: 'GET', url: '/farm/api/state' });
  const qty = (item) => db.prepare('SELECT qty FROM inventory WHERE owner_id = 1 AND item = ?').get(item)?.qty || 0;
  try {
    assert.equal((await state()).statusCode, 200);
    db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, 100) ON CONFLICT(owner_id, item) DO UPDATE SET qty = 100').run('thucan');
    db.prepare('INSERT INTO animals (owner_id, kind, ready_at) VALUES (1, ?, ?)')
      .run('ga', Date.now() - 29 * 15 * 60_000 - 1000);

    assert.equal((await state()).statusCode, 200);
    assert.equal(qty('trung'), 24);
    assert.equal(qty('thucan'), 76);
    assert.equal((await state()).statusCode, 200);
    assert.equal(qty('trung'), 30);
    assert.equal(qty('thucan'), 70);
    assert.equal((await state()).statusCode, 200);
    assert.equal(qty('trung'), 30);
  } finally {
    await app.close();
    db.close();
  }
});

test('manual feeding applies animal-speed skills consistently for every species and replays once', async () => {
  const db = openDb(':memory:');
  const app = buildApp({ db, logger: false,
    config: { mockChatUser: { id: 1, username: 'keeper', display_name: 'Keeper' } } });
  const post = (kind, key) => app.inject({ method: 'POST', url: '/farm/api/feed', payload: { kind }, headers: { 'idempotency-key': key } });
  const snapshot = () => ({
    farmer: db.prepare('SELECT gold, xp, mutation_version FROM farmers WHERE user_id = 1').get(),
    animals: db.prepare('SELECT id, kind, ready_at FROM animals WHERE owner_id = 1 ORDER BY id').all(),
    feed: db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'thucan'").get()?.qty || 0,
  });
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    for (const rank of [0, 2]) {
      db.prepare('UPDATE farmers SET xp = 1000000000, gold = 1000000, skills_json = ? WHERE user_id = 1')
        .run(JSON.stringify({ nguoibannho: rank }));
      for (const animal of Object.values(ANIMALS)) {
        db.prepare('DELETE FROM animals WHERE owner_id = 1').run();
        db.prepare("INSERT INTO inventory (owner_id, item, qty) VALUES (1, 'thucan', ?) ON CONFLICT(owner_id, item) DO UPDATE SET qty = excluded.qty")
          .run(animal.feedQty * 2);
        for (let i = 0; i < 2; i += 1) db.prepare('INSERT INTO animals (owner_id, kind, ready_at) VALUES (1, ?, NULL)').run(animal.id);
        const key = `animal-skill-feed-${rank}-${animal.id}`;
        const cycle = Math.round(animal.produceMs * (1 - 0.05 * rank));
        const startedAt = Date.now();
        const response = await post(animal.id, key);
        const finishedAt = Date.now();
        assert.equal(response.statusCode, 200, response.body);
        assert.equal(response.json().fed, 2);
        const after = snapshot();
        assert.equal(after.feed, 0, `${animal.id}: consume exactly two animals' feed`);
        assert.equal(after.animals.length, 2);
        assert.equal(after.animals[0].ready_at, after.animals[1].ready_at);
        assert.ok(after.animals.every((row) => row.ready_at >= startedAt + cycle && row.ready_at <= finishedAt + cycle),
          `${animal.id} rank ${rank}: manual production must match the skill-adjusted cycle`);
        const replay = await post(animal.id, key);
        assert.equal(replay.statusCode, 200, replay.body);
        assert.deepEqual(snapshot(), after, `${animal.id}: retry must preserve feed, deadlines and player value`);
      }
    }
  } finally {
    await app.close();
    db.close();
  }
});
