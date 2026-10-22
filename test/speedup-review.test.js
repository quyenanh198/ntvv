import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { xpNeedFor } from '../server/src/game.js';

test('reviewed speedups reject stale state and insufficient gems without spending', async () => {
  const db = openDb(':memory:');
  const app = buildApp({ db, logger: false, config: {
    mockChatUser: { id: 1, username: 'speedfarmer', display_name: 'Speed farmer' },
  } });
  const post = (route, payload, key) => app.inject({ method: 'POST', url: `/farm/api/${route}`, payload, headers: { 'idempotency-key': key } });
  const snapshot = () => ({
    farmer: db.prepare('SELECT gold, gems, xp, mutation_version FROM farmers WHERE user_id = 1').get(),
    plots: db.prepare('SELECT * FROM plots WHERE owner_id = 1 ORDER BY idx').all(),
    jobs: db.prepare('SELECT * FROM machine_jobs WHERE owner_id = 1 ORDER BY kind, recipe').all(),
    records: db.prepare('SELECT request_key FROM mutation_results WHERE owner_id = 1 ORDER BY request_key').all(),
  });
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    const xp = Array.from({ length: 18 }, (_, i) => xpNeedFor(i + 1)).reduce((sum, need) => sum + need, 0);
    const cases = [{ target: 'plot', idx: 0 }, { target: 'machine', kind: 'coixay', recipe: 'botmi' }, { target: 'mill' }];
    for (const [index, body] of cases.entries()) {
      db.prepare('DELETE FROM plots WHERE owner_id = 1').run();
      db.prepare('DELETE FROM machine_jobs WHERE owner_id = 1').run();
      db.prepare('UPDATE farmers SET xp = ?, gold = 10000, gems = 3 WHERE user_id = 1').run(xp);
      const now = Date.now();
      const future = now + 17 * 60000;
      if (body.target === 'plot') db.prepare("INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at) VALUES (1, 0, 'luami', ?, ?)").run(now, future);
      else db.prepare("INSERT INTO machine_jobs (owner_id, kind, recipe, ready_at, queue_count) VALUES (1, 'coixay', 'botmi', ?, 2)").run(future);
      const reviewedVersion = snapshot().farmer.mutation_version;
      const plant = await post('plant', { idx: 2, crop: 'luami' }, `speed-review-concurrent-${index}`);
      assert.equal(plant.statusCode, 200, plant.body);
      const before = snapshot();
      const stale = await post('speedup', { ...body, expectedVersion: reviewedVersion }, `speed-review-stale-${index}`);
      assert.equal(stale.statusCode, 409, stale.body);
      assert.equal(stale.json().error, 'state_changed');
      assert.deepEqual(snapshot(), before);
      const refreshedBody = { ...body, expectedVersion: before.farmer.mutation_version };
      for (const expectedVersion of [-1, 1.5, '1', null]) {
        const invalid = await post('speedup', { ...body, expectedVersion }, `speed-review-invalid-${index}`);
        assert.equal(invalid.statusCode, 400, invalid.body);
        assert.equal(invalid.json().error, 'bad_request');
        assert.deepEqual(snapshot(), before);
      }
      const key = `speed-review-current-${index}`;
      const shortage = await post('speedup', refreshedBody, key);
      assert.equal(shortage.statusCode, 400, shortage.body);
      assert.equal(shortage.json().error, 'not_enough_gems');
      assert.deepEqual(snapshot(), before);
      db.prepare('UPDATE farmers SET gems = 4 WHERE user_id = 1').run();
      const completed = await post('speedup', refreshedBody, key);
      assert.equal(completed.statusCode, 200, completed.body);
      assert.equal(completed.json().cost, 4);
      const after = snapshot();
      assert.equal(after.farmer.gems, 0);
      assert.equal(after.farmer.mutation_version, before.farmer.mutation_version + 1);
      const readyAt = body.target === 'plot' ? after.plots.find((plot) => plot.idx === 0).ready_at : after.jobs[0].ready_at;
      assert.ok(readyAt <= Date.now() && readyAt < future);
      if (body.target !== 'plot') assert.equal(after.jobs[0].queue_count, 2, 'Speeding one batch must retain the remaining queue');
      const replay = await post('speedup', refreshedBody, key);
      assert.equal(replay.statusCode, 200, replay.body);
      assert.deepEqual(snapshot(), after);
    }
  } finally {
    await app.close();
    db.close();
  }
});
