import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

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
