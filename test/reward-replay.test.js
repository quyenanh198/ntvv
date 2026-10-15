import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { DAILY_QUESTS, GOLD_MULT } from '../server/src/game.js';

test('daily, star and festival rewards replay once after a lost response', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-rewards-'));
  const db = openDb(dataDir);
  const app = buildApp({
    db,
    logger: false,
    config: { dataDir, mockChatUser: { id: 1, username: 'rewards', display_name: 'Rewards' } },
  });
  const post = (url, payload, key) => app.inject({
    method: 'POST', url: `/farm/api${url}`, payload,
    headers: { 'idempotency-key': key },
  });
  const balance = () => db.prepare('SELECT gold, gems FROM farmers WHERE user_id = 1').get();
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    db.prepare("UPDATE daily SET counters_json = ? WHERE owner_id = 1")
      .run(JSON.stringify({ harvest: 15, sow: 10, sell: 10 }));
    db.prepare('UPDATE farmers SET stars = 50 WHERE user_id = 1').run();
    db.prepare("UPDATE festival SET counters_json = ? WHERE owner_id = 1")
      .run(JSON.stringify({ harvest: 50 }));

    for (const [route, payload, key] of [
      ['/quest-chest', {}, 'daily-reward-request-01'],
      ['/star-claim', {}, 'star-reward-request-01'],
      ['/fest-claim', { id: 1 }, 'festival-reward-request-01'],
    ]) {
      const first = await post(route, payload, key);
      assert.equal(first.statusCode, 200, `${route}: ${first.body}`);
      const after = balance();
      const replay = await post(route, payload, key);
      assert.equal(replay.statusCode, 200, `${route}: ${replay.body}`);
      assert.deepEqual(balance(), after, `${route} must not pay twice`);
      assert.deepEqual(replay.json().claimed, first.json().claimed);
      assert.equal(replay.json().gem, first.json().gem);
      assert.equal((await post(route, payload, `${key}-fresh`)).statusCode, 400);
    }
    assert.equal((await post('/fest-claim', { id: 2 }, 'festival-reward-request-01')).statusCode, 409);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM mutation_results WHERE owner_id = 1').get().n, 3);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test('tasks completed after opening the daily chest pay once across retries and restart', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-late-daily-'));
  let db = openDb(dataDir);
  const makeApp = () => buildApp({ db, logger: false, config: {
    dataDir, mockChatUser: { id: 1, username: 'late-reward', display_name: 'Late Reward' },
  } });
  let app = makeApp();
  const post = (route, payload, key) => app.inject({ method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'idempotency-key': key } });
  const balance = () => db.prepare('SELECT gold, xp FROM farmers WHERE user_id = 1').get();
  try {
    await app.inject({ method: 'GET', url: '/farm/api/state' });
    db.prepare('UPDATE daily SET counters_json = ? WHERE owner_id = 1')
      .run(JSON.stringify({ harvest: 15, sow: 10, feed: 5, sell: 8 }));
    db.prepare("INSERT INTO inventory (owner_id, item, qty) VALUES (1, 'luami', 3)").run();
    const chest = await post('/quest-chest', {}, 'late-daily-chest-01');
    assert.equal(chest.statusCode, 200, chest.body);
    const quest = DAILY_QUESTS.find((entry) => entry.id === 'sell');
    const before = balance();
    const partial = await post('/sell', { item: 'luami', qty: 1 }, 'late-sale-partial');
    assert.equal(partial.statusCode, 200, partial.body);
    assert.deepEqual(balance(), { gold: before.gold + partial.json().gained, xp: before.xp },
      'an incomplete task should not pay its quest reward');
    const beforeCompletion = balance();
    const complete = await post('/sell', { item: 'luami', qty: 1 }, 'late-sale-complete');
    assert.equal(complete.statusCode, 200, complete.body);
    const paid = balance();
    assert.deepEqual(paid, { gold: beforeCompletion.gold + complete.json().gained + quest.gold * GOLD_MULT,
      xp: beforeCompletion.xp + quest.exp });
    assert.equal(complete.json().me.daily.quests.find((entry) => entry.id === 'sell').progress, quest.target);
    assert.equal((await post('/sell', { item: 'luami', qty: 1 }, 'late-sale-complete')).statusCode, 200);
    assert.deepEqual(balance(), paid);
    await app.close(); db.close();
    db = openDb(dataDir); app = makeApp();
    assert.equal((await post('/sell', { item: 'luami', qty: 1 }, 'late-sale-complete')).statusCode, 200);
    assert.deepEqual(balance(), paid, 'restart replay must not pay again');
    const extra = await post('/sell', { item: 'luami', qty: 1 }, 'late-daily-sale-extra');
    assert.equal(extra.statusCode, 200, extra.body);
    assert.deepEqual(balance(), { gold: paid.gold + extra.json().gained, xp: paid.xp },
      'further progress after the target must not pay again');
    assert.equal((await post('/quest-chest', {}, 'late-chest-again')).statusCode, 400);
  } finally {
    await app.close(); db.close(); rmSync(dataDir, { recursive: true, force: true });
  }
});
