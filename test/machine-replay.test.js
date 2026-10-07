import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { xpNeedFor } from '../server/src/game.js';

test('all machine queue and collection routes replay without moving value twice', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-machine-replay-'));
  const db = openDb(dataDir);
  const app = buildApp({
    db, logger: false,
    config: { dataDir, mockChatUser: { id: 1, username: 'miller', display_name: 'Miller' } },
  });
  const post = (route, payload, key) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'idempotency-key': key },
  });
  const qty = (item) => db.prepare('SELECT qty FROM inventory WHERE owner_id = 1 AND item = ?').get(item)?.qty || 0;
  const state = () => ({
    wheat: qty('luami'), flour: qty('botmi'),
    xp: db.prepare('SELECT xp FROM farmers WHERE user_id = 1').get().xp,
    jobs: db.prepare('SELECT recipe, ready_at, queue_count FROM machine_jobs WHERE owner_id = 1 ORDER BY recipe').all(),
  });
  const stockWheat = (count) => db.prepare("INSERT INTO inventory (owner_id, item, qty) VALUES (1, 'luami', ?) ON CONFLICT(owner_id, item) DO UPDATE SET qty = excluded.qty").run(count);
  const makeReady = () => db.prepare("UPDATE machine_jobs SET ready_at = ? WHERE owner_id = 1 AND kind = 'coixay'").run(Date.now() - 60 * 60_000);
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    const level10Xp = Array.from({ length: 9 }, (_, i) => xpNeedFor(i + 1)).reduce((sum, value) => sum + value, 0);
    db.prepare('UPDATE farmers SET xp = ? WHERE user_id = 1').run(level10Xp);

    stockWheat(20);
    const mill = await post('/mill', { recipe: 'botmi' }, 'mill-queue-request-01');
    assert.equal(mill.statusCode, 200, mill.body);
    const afterMill = state();
    assert.equal((await post('/mill', { recipe: 'botmi' }, 'mill-queue-request-01')).statusCode, 200);
    assert.deepEqual(state(), afterMill);
    makeReady();
    const millCollect = await post('/mill-collect', {}, 'mill-collect-request-01');
    assert.equal(millCollect.statusCode, 200, millCollect.body);
    const afterMillCollect = state();
    assert.equal((await post('/mill-collect', {}, 'mill-collect-request-01')).statusCode, 200);
    assert.deepEqual(state(), afterMillCollect);

    const machine = { machine: 'coixay', recipe: 'botmi', count: 2 };
    assert.equal((await post('/machine-run', machine, 'machine-queue-request-01')).statusCode, 200);
    const afterRun = state();
    assert.equal((await post('/machine-run', machine, 'machine-queue-request-01')).statusCode, 200);
    assert.deepEqual(state(), afterRun);
    assert.equal((await post('/machine-run', { ...machine, count: 1 }, 'machine-queue-request-01')).statusCode, 409);
    makeReady();
    assert.equal((await post('/machine-collect', { machine: 'coixay', recipe: 'botmi' }, 'machine-collect-request-01')).statusCode, 200);
    const afterCollect = state();
    assert.equal((await post('/machine-collect', { machine: 'coixay', recipe: 'botmi' }, 'machine-collect-request-01')).statusCode, 200);
    assert.deepEqual(state(), afterCollect);

    stockWheat(8);
    const all = await post('/machine-run-all', {}, 'machine-all-request-01');
    assert.equal(all.statusCode, 200, all.body);
    assert.ok(all.json().queued >= 1);
    const afterAll = state();
    assert.equal((await post('/machine-run-all', {}, 'machine-all-request-01')).statusCode, 200);
    assert.deepEqual(state(), afterAll);
    makeReady();
    const collectAll = await post('/machine-collect-all', {}, 'machine-collect-all-request-01');
    assert.equal(collectAll.statusCode, 200, collectAll.body);
    const afterCollectAll = state();
    assert.equal((await post('/machine-collect-all', {}, 'machine-collect-all-request-01')).statusCode, 200);
    assert.deepEqual(state(), afterCollectAll);
    assert.equal((await post('/machine-collect-all', {}, 'machine-collect-all-request-02')).statusCode, 400);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
