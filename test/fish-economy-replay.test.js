import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('fishing, fish farming, and currency purchases survive lost responses', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-fish-economy-replay-'));
  const config = { dataDir, mockChatUser: { id: 1, username: 'angler', display_name: 'Angler' } };
  let db = openDb(dataDir);
  let app = buildApp({ db, logger: false, config });
  const post = (route, payload, key) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'idempotency-key': key },
  });
  const snapshot = () => ({
    farmer: db.prepare('SELECT gold, gems, xp, energy, energy_at, sunk_gold FROM farmers WHERE user_id = 1').get(),
    batches: db.prepare('SELECT species, qty, ready_at FROM fish_batches WHERE owner_id = 1 ORDER BY id').all(),
    inventory: db.prepare('SELECT item, qty FROM inventory WHERE owner_id = 1 ORDER BY item').all(),
  });
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    db.prepare('UPDATE farmers SET xp = 1000000000, gold = 20000000, gems = 50, energy = 20, energy_at = ? WHERE user_id = 1').run(Date.now());
    const cases = [
      ['/fish', {}, 'fish-cast-request-01'],
      ['/fish-stock', { species: 'oc', qty: 2 }, 'fish-stock-request-01'],
      ['/buy-gems', { pack: 'g5' }, 'gem-purchase-request-01'],
      ['/buy-energy', {}, 'energy-purchase-request-01'],
    ];
    for (const [route, body, key] of cases) {
      const first = await post(route, body, key);
      assert.equal(first.statusCode, 200, `${route}: ${first.body}`);
      const after = snapshot();
      const replay = await post(route, body, key);
      assert.equal(replay.statusCode, 200, `${route} replay: ${replay.body}`);
      assert.deepEqual(snapshot(), after, `${route} changed value on replay`);
      if (route === '/fish') assert.deepEqual(replay.json().caught, first.json().caught);
      assert.equal((await post(route, { ...body, changed: true }, key)).statusCode, 409);
    }
    const beforeConcurrent = snapshot();
    const concurrent = await Promise.all([
      post('/fish-stock', { species: 'oc', qty: 1 }, 'fish-stock-concurrent-01'),
      post('/fish-stock', { species: 'oc', qty: 1 }, 'fish-stock-concurrent-01'),
    ]);
    assert.deepEqual(concurrent.map((response) => response.statusCode), [200, 200]);
    assert.equal(snapshot().batches.length, beforeConcurrent.batches.length + 1, 'concurrent retries stocked twice');
    db.prepare('UPDATE fish_batches SET ready_at = ? WHERE owner_id = 1').run(Date.now() - 1);
    const harvest = await post('/fish-harvest', {}, 'fish-harvest-request-01');
    assert.equal(harvest.statusCode, 200, harvest.body);
    assert.equal(harvest.json().items.oc, 3);
    const afterHarvest = snapshot();
    assert.equal((await post('/fish-harvest', {}, 'fish-harvest-request-01')).statusCode, 200);
    assert.deepEqual(snapshot(), afterHarvest);
    await app.close();
    db.close();
    db = openDb(dataDir);
    app = buildApp({ db, logger: false, config });
    const replay = await post('/fish-harvest', {}, 'fish-harvest-request-01');
    assert.equal(replay.statusCode, 200, replay.body);
    assert.deepEqual(snapshot(), afterHarvest, 'restart replay harvested twice');
    assert.equal(db.prepare('SELECT COUNT(*) n FROM mutation_results WHERE owner_id = 1').get().n, 6);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
