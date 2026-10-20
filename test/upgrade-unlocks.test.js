import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { ANIMALS, BARN_UPGRADE_GOLD, MACHINES, MACHINE_UPGRADE_GOLD, xpNeedFor } from '../server/src/game.js';

test('machine and barn upgrades enforce catalog unlocks before spending', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-upgrade-unlocks-'));
  const db = openDb(dataDir);
  const app = buildApp({ db, logger: false, config: {
    dataDir, mockChatUser: { id: 1, username: 'builder', display_name: 'Builder' },
  } });
  const post = (route, payload, key) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload, headers: { 'idempotency-key': key },
  });
  const snapshot = () => ({
    farmer: db.prepare('SELECT gold, xp, sunk_gold, mutation_version, coop_level, barn_levels_json, machine_levels_json FROM farmers WHERE user_id = 1').get(),
    records: db.prepare('SELECT request_key FROM mutation_results WHERE owner_id = 1 ORDER BY request_key').all(),
  });
  const cases = [
    ...Object.values(MACHINES).map((machine) => ({ route: '/machine-upgrade', payload: { machine: machine.id }, level: machine.level, cost: MACHINE_UPGRADE_GOLD[0], machine: machine.id })),
    ...Object.values(ANIMALS).map((animal) => ({ route: '/upgrade-barn', payload: { kind: animal.id }, level: animal.level, cost: BARN_UPGRADE_GOLD[0], kind: animal.id })),
    { route: '/upgrade-coop', payload: {}, level: ANIMALS.ga.level, cost: BARN_UPGRADE_GOLD[0], kind: 'ga' },
  ];
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    db.prepare('UPDATE farmers SET xp = 0, gold = 100000000 WHERE user_id = 1').run();
    const lockedBefore = snapshot();
    for (const [index, action] of cases.entries()) {
      const response = await post(action.route, action.payload, `upgrade-locked-catalog-${index}`);
      assert.equal(response.statusCode, 400, `${action.route}: ${response.body}`);
      assert.equal(response.json().error, 'level_too_low');
      assert.deepEqual(snapshot(), lockedBefore, 'A locked upgrade must not spend, advance levels, or record a successful mutation');
    }
    // Exercise an individual machine, a JSON-backed barn and the legacy coop
    // at their exact unlock levels. The rejected key must remain usable.
    const unlockedCases = [cases[0], cases.find((action) => action.kind === 'cut'), cases.at(-1)];
    for (const action of unlockedCases) {
      const index = cases.indexOf(action);
      const xp = Array.from({ length: action.level - 1 }, (_, i) => xpNeedFor(i + 1)).reduce((sum, need) => sum + need, 0);
      db.prepare('UPDATE farmers SET xp = ?, gold = ? WHERE user_id = 1').run(xp, action.cost);
      const before = snapshot();
      const key = `upgrade-locked-catalog-${index}`;
      const response = await post(action.route, action.payload, key);
      assert.equal(response.statusCode, 200, response.body);
      assert.equal(response.json().me.gold, 0);
      if (action.machine) assert.equal(response.json().me.machineLevels[action.machine], 1);
      else assert.equal(response.json().me.barns[action.kind].level, 2);
      const after = snapshot();
      assert.equal(after.farmer.mutation_version, before.farmer.mutation_version + 1);
      assert.equal(after.records.length, before.records.length + 1);
      const replay = await post(action.route, action.payload, key);
      assert.equal(replay.statusCode, 200, replay.body);
      assert.deepEqual(snapshot(), after, 'An unlocked upgrade retry must preserve currency and levels');
    }
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
