import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { DOG, SKILLS } from '../server/src/game.js';

test('speedups, skills and dog hire spend once across retries and restart', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-ability-replay-'));
  const config = { dataDir, mockChatUser: { id: 1, username: 'builder', display_name: 'Builder' } };
  let db = openDb(dataDir);
  let app = buildApp({ db, logger: false, config });
  const post = (route, payload, key) => app.inject({ method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'idempotency-key': key } });
  const farmer = () => db.prepare('SELECT gold, gems, skills_json, last_respec_at, dog_until FROM farmers WHERE user_id = 1').get();
  const ready = () => ({ plot: db.prepare('SELECT ready_at FROM plots WHERE owner_id = 1 AND idx = 0').get()?.ready_at,
    machine: db.prepare("SELECT ready_at FROM machine_jobs WHERE owner_id = 1 AND kind = 'coixay' AND recipe = 'botmi'").get()?.ready_at });
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    db.prepare('UPDATE farmers SET xp = 1000000000, gold = 100000, gems = 100 WHERE user_id = 1').run();
    const future = Date.now() + 60 * 60_000;
    db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at) VALUES (1, 0, ?, ?, ?)').run('luami', Date.now(), future);
    db.prepare('INSERT INTO machine_jobs (owner_id, kind, recipe, ready_at) VALUES (1, ?, ?, ?)').run('coixay', 'botmi', future);

    const beforePlot = farmer();
    const plot = await Promise.all([post('/speedup', { target: 'plot', idx: 0 }, 'plot-speedup-retry-0001'), post('/speedup', { target: 'plot', idx: 0 }, 'plot-speedup-retry-0001')]);
    assert.deepEqual(plot.map((response) => response.statusCode), [200, 200]);
    assert.equal(farmer().gems, beforePlot.gems - plot[0].json().cost);
    assert.ok(ready().plot < future);
    const afterPlot = { ...farmer(), ...ready() };
    assert.equal((await post('/speedup', { target: 'plot', idx: 1 }, 'plot-speedup-retry-0001')).statusCode, 409);
    assert.deepEqual({ ...farmer(), ...ready() }, afterPlot);
    assert.equal((await post('/speedup', { target: 'machine', kind: 'bad-machine', recipe: 'botmi' }, 'bad-machine-key-0001')).statusCode, 400);
    const beforeMachine = farmer();
    const machine = await post('/speedup', { target: 'machine', kind: 'coixay', recipe: 'botmi' }, 'machine-speedup-key-0001');
    assert.equal(machine.statusCode, 200, machine.body);
    assert.equal((await post('/speedup', { target: 'machine', kind: 'coixay', recipe: 'botmi' }, 'machine-speedup-key-0001')).statusCode, 200);
    assert.equal(farmer().gems, beforeMachine.gems - machine.json().cost);
    assert.ok(ready().machine < future);

    const learned = await post('/skill-learn', { id: 'bantayxanh' }, 'skill-learn-retry-0001');
    assert.equal(learned.statusCode, 200, learned.body);
    assert.equal(learned.json().rank, 1);
    assert.equal((await post('/skill-learn', { id: 'bantayxanh' }, 'skill-learn-retry-0001')).json().rank, 1);
    assert.equal(JSON.parse(farmer().skills_json).bantayxanh, 1);
    const beforeRespec = farmer();
    assert.equal((await post('/skill-respec', {}, 'skill-respec-retry-0001')).statusCode, 200);
    assert.equal((await post('/skill-respec', {}, 'skill-respec-retry-0001')).statusCode, 200);
    assert.equal(farmer().gems, beforeRespec.gems - SKILLS.respecGems);
    assert.equal(farmer().skills_json, '{}');
    assert.equal((await post('/skill-respec', {}, 'skill-respec-new-key-0001')).statusCode, 400);

    const beforeDog = farmer();
    assert.equal((await post('/dog-hire', { hours: 1 }, 'dog-hire-retry-0001')).statusCode, 200);
    const afterDog = farmer();
    assert.equal(afterDog.gold, beforeDog.gold - DOG.pricePerHour);
    assert.ok(afterDog.dog_until > Date.now());
    assert.equal((await post('/dog-hire', { hours: 1 }, 'dog-hire-retry-0001')).statusCode, 200);
    assert.deepEqual(farmer(), afterDog);
    await app.close();
    db.close();
    db = openDb(dataDir);
    app = buildApp({ db, logger: false, config });
    assert.equal((await post('/dog-hire', { hours: 1 }, 'dog-hire-retry-0001')).statusCode, 200);
    assert.deepEqual(farmer(), afterDog);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
