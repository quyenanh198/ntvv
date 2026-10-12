import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('malformed purchase, queue, and harvest quantities leave player value untouched', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-quantity-validation-'));
  const db = openDb(dataDir);
  const app = buildApp({ db, logger: false, config: {
    dataDir, mockChatUser: { id: 1, username: 'validator', display_name: 'Validator' },
  } });
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    db.prepare("INSERT INTO fish_batches (owner_id, species, qty, planted_at, ready_at) VALUES (1, 'oc', 1, 1, 1)").run();
    const snapshot = () => ({
      farmer: db.prepare('SELECT gold, gems, xp FROM farmers WHERE user_id = 1').get(),
      animals: db.prepare('SELECT COUNT(*) AS n FROM animals WHERE owner_id = 1').get().n,
      jobs: db.prepare('SELECT COUNT(*) AS n FROM machine_jobs WHERE owner_id = 1').get().n,
      tickets: db.prepare('SELECT COUNT(*) AS n FROM lottery_tickets WHERE owner_id = 1').get().n,
      fish: db.prepare('SELECT id, qty FROM fish_batches WHERE owner_id = 1').all(),
      inventory: db.prepare('SELECT item, qty FROM inventory WHERE owner_id = 1 ORDER BY item').all(),
    });
    const before = snapshot();
    const cases = [
      ['/buy-animal', { kind: 'ga', count: -2 }],
      ['/buy-animal', { kind: 'ga', count: 'banana' }],
      ['/machine-run', { machine: 'coixay', recipe: 'botmi', count: 0 }],
      ['/machine-run', { machine: 'coixay', recipe: 'botmi', count: 1.5 }],
      ['/machine-run', { machine: 'coixay', recipe: 'botmi', count: 51 }],
      ['/lottery-buy', { qty: 'banana' }],
      ['/lottery-buy', { qty: -1 }],
      ['/fish-stock', { species: 'oc', qty: 0 }],
      ['/fish-stock', { species: 'oc', qty: 'banana' }],
      ['/fish-harvest', { id: 0 }],
      ['/fish-harvest', { id: 'banana' }],
    ];
    for (const [route, payload] of cases) {
      const response = await app.inject({ method: 'POST', url: `/farm/api${route}`, payload });
      assert.equal(response.statusCode, 400, `${route} ${JSON.stringify(payload)}: ${response.body}`);
      assert.equal(response.json().error, 'bad_request');
      assert.deepEqual(snapshot(), before, `${route} changed value for ${JSON.stringify(payload)}`);
    }

    db.prepare("INSERT INTO fish_batches (owner_id, species, qty, planted_at, ready_at) VALUES (1, 'oc', 1, 1, 1)").run();
    const selectedId = before.fish[0].id;
    const selected = await app.inject({ method: 'POST', url: '/farm/api/fish-harvest', payload: { id: selectedId } });
    assert.equal(selected.statusCode, 200, selected.body);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM fish_batches WHERE owner_id = 1').get().n, 1);

    db.prepare('UPDATE farmers SET xp = 1000000000, gold = 20000000 WHERE user_id = 1').run();
    const animalMax = await app.inject({ method: 'POST', url: '/farm/api/buy-animal', payload: { kind: 'ga', count: 'max' } });
    assert.equal(animalMax.statusCode, 200, animalMax.body);
    assert.ok(animalMax.json().bought > 0);
    const fishMax = await app.inject({ method: 'POST', url: '/farm/api/fish-stock', payload: { species: 'oc', qty: 'max' } });
    assert.equal(fishMax.statusCode, 200, fishMax.body);
    assert.ok(fishMax.json().stocked > 0);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
