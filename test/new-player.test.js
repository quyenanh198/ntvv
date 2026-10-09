import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { HARVEST_YIELD, xpNeedFor } from '../server/src/game.js';

test('new and returning low-level farmers can plant without land-tax debt', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-new-farm-'));
  const db = openDb(dataDir);
  const app = buildApp({
    db,
    logger: false,
    config: { dataDir, mockChatUser: { id: 1, username: 'newfarmer', display_name: 'New Farmer' } },
  });
  try {
    const state = await app.inject({ method: 'GET', url: '/farm/api/state' });
    assert.equal(state.statusCode, 200);
    assert.equal(state.json().config.harvestYield, HARVEST_YIELD);
    assert.equal(state.json().me.tax.owed, 0);
    assert.equal(state.json().me.tax.today, 0);

    db.prepare('UPDATE farmers SET tax_owed = 48000 WHERE user_id = 1').run();
    const returning = await app.inject({ method: 'GET', url: '/farm/api/state' });
    assert.equal(returning.json().me.tax.owed, 0);

    const plant = await app.inject({ method: 'POST', url: '/farm/api/plant', payload: { idx: 0, crop: 'luami' } });
    assert.equal(plant.statusCode, 200);
    assert.equal(plant.json().me.plots[0].crop, 'luami');

    const xpForLevel20 = Array.from({ length: 19 }, (_, index) => xpNeedFor(index + 1)).reduce((sum, need) => sum + need, 0);
    db.prepare("UPDATE farmers SET xp = ?, gold = 0, tax_day = 'la-2000-01-01', tax_owed = 0 WHERE user_id = 1").run(xpForLevel20);
    const advanced = await app.inject({ method: 'GET', url: '/farm/api/state' });
    assert.equal(advanced.statusCode, 200);
    assert.equal(advanced.json().me.level, 20);
    assert.equal(advanced.json().me.tax.today, 24_000);
    assert.equal(advanced.json().me.tax.owed, 24_000);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
