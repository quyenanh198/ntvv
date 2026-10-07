import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('gold-spending upgrades replay once across retries and a restart', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-upgrade-replay-'));
  const config = { dataDir, mockChatUser: { id: 1, username: 'builder', display_name: 'Builder' } };
  let db = openDb(dataDir);
  let app = buildApp({ db, logger: false, config });
  const post = (route, payload, key) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'idempotency-key': key },
  });
  const snapshot = () => db.prepare('SELECT gold, plots_count, pond_level, coop_level, machine_levels_json, barn_levels_json FROM farmers WHERE user_id = 1').get();
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    db.prepare('UPDATE farmers SET xp = 1000000000, gold = 100000000 WHERE user_id = 1').run();
    const cases = [
      ['/machine-upgrade', { machine: 'coixay' }, 'machine-upgrade-key-01'],
      ['/expand', {}, 'land-expansion-key-01'],
      ['/upgrade-barn', { kind: 'vit' }, 'barn-upgrade-key-01'],
      ['/upgrade-coop', {}, 'coop-upgrade-key-01'],
      ['/upgrade-pond', {}, 'pond-upgrade-key-01'],
    ];
    for (const [route, body, key] of cases) {
      const first = await post(route, body, key);
      assert.equal(first.statusCode, 200, `${route}: ${first.body}`);
      const after = snapshot();
      const replay = await post(route, body, key);
      assert.equal(replay.statusCode, 200, `${route} replay: ${replay.body}`);
      assert.deepEqual(snapshot(), after, `${route} spent gold or upgraded twice`);
      assert.equal((await post(route, { ...body, extra: true }, key)).statusCode, 409, `${route} accepted a changed body`);
    }
    const beforeConcurrent = snapshot();
    const concurrent = await Promise.all([
      post('/expand', {}, 'land-expansion-concurrent-01'),
      post('/expand', {}, 'land-expansion-concurrent-01'),
    ]);
    assert.deepEqual(concurrent.map((response) => response.statusCode), [200, 200]);
    assert.equal(snapshot().plots_count, beforeConcurrent.plots_count + 4, 'concurrent retries expanded twice');
    const beforeRestart = snapshot();
    await app.close();
    db.close();
    db = openDb(dataDir);
    app = buildApp({ db, logger: false, config });
    const replay = await post('/expand', {}, 'land-expansion-key-01');
    assert.equal(replay.statusCode, 200, replay.body);
    assert.deepEqual(snapshot(), beforeRestart, 'restart replay expanded land again');
    assert.equal(db.prepare('SELECT COUNT(*) n FROM mutation_results WHERE owner_id = 1').get().n, cases.length + 1);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
