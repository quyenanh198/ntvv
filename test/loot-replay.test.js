import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('barn and machine theft replay rewards and dog fines exactly once', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-loot-replay-'));
  const db = openDb(dataDir);
  const config = { dataDir, mockChatUser: (request) => {
    const id = Number(request.headers['x-test-user']);
    return { id, username: `farmer${id}`, display_name: `Farmer ${id}` };
  } };
  let app = buildApp({ db, logger: false, config });
  const post = (route, key) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload: { ownerId: 2 },
    headers: { 'x-test-user': '1', 'idempotency-key': key },
  });
  const snapshot = () => ({
    thief: db.prepare('SELECT gold, xp, caught_streak FROM farmers WHERE user_id = 1').get(),
    owner: db.prepare('SELECT gold FROM farmers WHERE user_id = 2').get(),
    inventory: db.prepare('SELECT item, qty FROM inventory WHERE owner_id = 1 ORDER BY item').all(),
    animal: db.prepare('SELECT ready_at FROM animals WHERE owner_id = 2').get(),
    job: db.prepare("SELECT poached FROM machine_jobs WHERE owner_id = 2 AND kind = 'bepan'").get(),
    debts: db.prepare('SELECT amount FROM debts WHERE debtor_id = 1 ORDER BY id').all(),
  });
  try {
    for (const id of [1, 2]) assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state', headers: { 'x-test-user': String(id) } })).statusCode, 200);
    db.prepare('INSERT INTO animals (owner_id, kind, ready_at) VALUES (2, ?, ?)').run('ga', Date.now() - 1000);
    db.prepare('INSERT INTO machine_jobs (owner_id, kind, recipe, ready_at) VALUES (2, ?, ?, ?)').run('bepan', 'khoaichien', Date.now() - 1000);

    const animal = await post('/poach-animal', 'animal-loot-request-01');
    assert.equal(animal.statusCode, 200, animal.body);
    assert.ok(animal.json().got >= 2);
    const afterAnimal = snapshot();
    assert.equal((await post('/poach-animal', 'animal-loot-request-01')).statusCode, 200);
    assert.deepEqual(snapshot(), afterAnimal);
    assert.equal((await post('/poach-animal', 'animal-loot-request-02')).statusCode, 400);

    const machine = await post('/poach-machine', 'machine-loot-request-01');
    assert.equal(machine.statusCode, 200, machine.body);
    const afterMachine = snapshot();
    assert.equal((await post('/poach-machine', 'machine-loot-request-01')).statusCode, 200);
    assert.deepEqual(snapshot(), afterMachine);

    db.prepare('UPDATE farmers SET dog_until = ? WHERE user_id = 2').run(Date.now() + 60000);
    db.prepare('UPDATE poach_guard SET at = 0 WHERE owner_id = 2 AND kind = ?').run('animal');
    db.prepare('UPDATE animals SET ready_at = ? WHERE owner_id = 2').run(Date.now() - 1000);
    const originalRandom = Math.random;
    let caught;
    try {
      Math.random = () => 0;
      caught = await post('/poach-animal', 'animal-caught-request-01');
    } finally {
      Math.random = originalRandom;
    }
    assert.equal(caught.statusCode, 400, caught.body);
    assert.equal(caught.json().error, 'caught_by_dog');
    const afterCaught = snapshot();
    await app.close();
    app = buildApp({ db, logger: false, config });
    const replay = await post('/poach-animal', 'animal-caught-request-01');
    assert.equal(replay.statusCode, 400, replay.body);
    assert.deepEqual(replay.json(), caught.json());
    assert.deepEqual(snapshot(), afterCaught);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
