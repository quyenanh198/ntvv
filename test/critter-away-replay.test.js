import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('critter rewards and away-report dismissal survive delayed retries', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-critter-replay-'));
  const db = openDb(dataDir);
  const config = { dataDir, mockChatUser: { id: 1, username: 'farmer', display_name: 'Farmer' } };
  let app = buildApp({ db, logger: false, config });
  const post = (route, key) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload: {},
    headers: { 'idempotency-key': key },
  });
  const farmer = () => db.prepare('SELECT gems, critter_next_at, away_report_json FROM farmers WHERE user_id = 1').get();
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    db.prepare('UPDATE farmers SET critter_next_at = ?, away_report_json = ? WHERE user_id = 1')
      .run(Date.now() - 1000, JSON.stringify({ old: true }));
    const caught = await post('/critter-catch', 'critter-catch-request-01');
    assert.equal(caught.statusCode, 200, caught.body);
    const afterCatch = farmer();
    assert.ok(caught.json().gems > 0);
    assert.equal((await post('/critter-catch', 'critter-catch-request-01')).statusCode, 200);
    assert.deepEqual(farmer(), afterCatch);
    assert.equal((await post('/critter-catch', 'critter-catch-request-02')).statusCode, 400);

    assert.equal((await post('/away-ack', 'away-ack-request-01')).statusCode, 200);
    assert.equal(farmer().away_report_json, null);
    db.prepare('UPDATE farmers SET away_report_json = ? WHERE user_id = 1').run(JSON.stringify({ new: true }));
    await app.close();
    app = buildApp({ db, logger: false, config });
    assert.equal((await post('/away-ack', 'away-ack-request-01')).statusCode, 200);
    assert.equal((await post('/critter-catch', 'critter-catch-request-01')).statusCode, 200);
    assert.equal(farmer().away_report_json, JSON.stringify({ new: true }));
    assert.equal(farmer().gems, afterCatch.gems);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
