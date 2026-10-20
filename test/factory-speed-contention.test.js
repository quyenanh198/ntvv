import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { MACHINES, MACHINE_UPGRADE_GOLD, xpNeedFor } from '../server/src/game.js';

test('factory queue and collection use upgrades committed after authentication', { timeout: 30000 }, async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-factory-speed-'));
  const db = openDb(dataDir);
  const app = buildApp({ db, logger: false, config: {
    dataDir, mockChatUser: { id: 1, username: 'maker', display_name: 'Maker' },
  } });
  let held;
  app.addHook('onRoute', (route) => {
    if (!['machine-run', 'mill', 'machine-run-all', 'machine-collect', 'mill-collect', 'machine-collect-all'].includes(route.url.split('/').pop())) return;
    const hooks = route.preHandler ? (Array.isArray(route.preHandler) ? route.preHandler : [route.preHandler]) : [];
    route.preHandler = [...hooks, async (request) => {
      if (!request.headers['x-hold-factory']) return;
      held.snapshot = JSON.parse(request.farmer.machine_levels_json);
      held.arrive();
      await held.released;
    }];
  });
  const post = (route, payload, key, hold = false) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'idempotency-key': key, ...(hold ? { 'x-hold-factory': '1' } : {}) },
  });
  const snapshot = () => ({
    farmer: db.prepare('SELECT gold, xp, mutation_version, machine_levels_json FROM farmers WHERE user_id = 1').get(),
    inventory: db.prepare('SELECT item, qty FROM inventory WHERE owner_id = 1 ORDER BY item').all(),
    jobs: db.prepare('SELECT * FROM machine_jobs WHERE owner_id = 1 ORDER BY kind, recipe').all(),
  });
  const recipe = MACHINES.coixay.recipes.botmi;
  const cycle = Math.round(recipe.ms * 0.9);
  const xp = Array.from({ length: MACHINES.coixay.level - 1 }, (_, index) => xpNeedFor(index + 1)).reduce((sum, need) => sum + need, 0);
  const cases = [
    ['/machine-run', { machine: 'coixay', recipe: 'botmi', count: 1 }, 'queue'],
    ['/mill', { recipe: 'botmi' }, 'queue'],
    ['/machine-run-all', {}, 'queue'],
    ['/machine-collect', { machine: 'coixay', recipe: 'botmi' }, 'collect'],
    ['/mill-collect', {}, 'collect'],
    ['/machine-collect-all', {}, 'collect'],
  ];
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    for (const [index, [route, payload, mode]] of cases.entries()) {
      db.prepare('DELETE FROM machine_jobs WHERE owner_id = 1').run();
      db.prepare('DELETE FROM inventory WHERE owner_id = 1').run();
      db.prepare('UPDATE farmers SET xp = ?, gold = ?, machine_levels_json = ?, skills_json = ? WHERE user_id = 1')
        .run(xp, MACHINE_UPGRADE_GOLD[0], '{}', '{}');
      if (mode === 'queue') {
        db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, ?)').run('luami', recipe.in.luami);
      } else {
        // Two batches are complete at the new speed; only one at the old speed.
        db.prepare('INSERT INTO machine_jobs (owner_id, kind, recipe, ready_at, queue_count) VALUES (1, ?, ?, ?, 2)')
          .run('coixay', 'botmi', Date.now() - cycle - 5000);
      }
      held = {};
      held.arrived = new Promise((resolve) => { held.arrive = resolve; });
      held.released = new Promise((resolve) => { held.release = resolve; });
      const timer = setTimeout(() => { held.arrive(); held.release(); }, 5000);
      const key = `factory-speed-action-${index}`;
      const pending = post(route, payload, key, true);
      // Start injection now, then hold its handler after the old farmer row loads.
      const responsePromise = Promise.resolve(pending);
      await held.arrived;
      clearTimeout(timer);
      assert.deepEqual(held.snapshot, {}, `${route} must authenticate before the upgrade`);
      const upgrade = await post('/machine-upgrade', { machine: 'coixay' }, `factory-speed-upgrade-${index}`);
      assert.equal(upgrade.statusCode, 200, upgrade.body);
      const startedAt = Date.now();
      held.release();
      const response = await responsePromise;
      const finishedAt = Date.now();
      assert.equal(response.statusCode, 200, `${route}: ${response.body}`);
      const after = snapshot();
      assert.equal(after.farmer.gold, 0);
      assert.equal(JSON.parse(after.farmer.machine_levels_json).coixay, 1);
      if (mode === 'queue') {
        assert.equal(after.jobs.length, 1);
        assert.equal(after.jobs[0].queue_count, 1);
        assert.ok(after.jobs[0].ready_at >= startedAt + cycle && after.jobs[0].ready_at <= finishedAt + cycle,
          `${route} must schedule with the committed upgrade`);
        assert.equal(after.inventory.find((item) => item.item === 'luami')?.qty || 0, 0);
      } else {
        assert.equal(response.json().collected, 2, `${route} must count completed cycles at the committed speed`);
        assert.equal(after.jobs.length, 0);
        assert.equal(after.inventory.find((item) => item.item === 'botmi')?.qty, 2);
      }
      const replay = await post(route, payload, key);
      assert.equal(replay.statusCode, 200, replay.body);
      assert.deepEqual(snapshot(), after, `${route} retry must not consume ingredients, reschedule, or collect twice`);
    }
  } finally {
    held?.release?.();
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
