import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('gold requests create and resolve once across retries, concurrency, and restart', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-gold-request-'));
  const config = { dataDir, mockChatUser: (request) => {
    const id = Number(request.headers['x-test-user']);
    return { id, username: `farmer${id}`, display_name: `Farmer ${id}` };
  } };
  let db = openDb(dataDir);
  let app = buildApp({ db, logger: false, config });
  const post = (user, route, payload, key) => app.inject({ method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'x-test-user': String(user), 'idempotency-key': key } });
  const gold = (id) => db.prepare('SELECT gold FROM farmers WHERE user_id = ?').get(id).gold;
  const requests = () => db.prepare('SELECT id, amount, status FROM gold_requests ORDER BY id').all();
  try {
    for (const user of [1, 2]) assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state', headers: { 'x-test-user': String(user) } })).statusCode, 200);
    const ask = { toId: 2, amount: 100, note: 'Seeds' };
    assert.equal((await post(1, '/gold-ask', ask, 'gold-ask-retry-0001')).statusCode, 200);
    assert.equal((await post(1, '/gold-ask', ask, 'gold-ask-retry-0001')).statusCode, 200);
    assert.equal(requests().length, 1);
    assert.equal((await post(1, '/gold-ask', { ...ask, amount: 50 }, 'gold-ask-retry-0001')).statusCode, 409);
    const firstId = requests()[0].id;
    assert.equal((await post(1, '/gold-request-act', { id: firstId, action: 'pay' }, 'unauthorized-pay-0001')).statusCode, 403);
    const before = [gold(1), gold(2)];
    const pay = { id: firstId, action: 'pay' };
    assert.equal((await post(2, '/gold-request-act', pay, 'gold-pay-retry-0001')).statusCode, 200);
    assert.equal((await post(2, '/gold-request-act', pay, 'gold-pay-retry-0001')).statusCode, 200);
    assert.deepEqual([gold(1), gold(2)], [before[0] + 100, before[1] - 100]);
    assert.equal(requests()[0].status, 'paid');
    assert.equal((await post(2, '/gold-request-act', pay, 'gold-pay-new-key-0001')).statusCode, 400);

    assert.equal((await post(1, '/gold-ask', { toId: 2, amount: 50 }, 'gold-ask-second-0001')).statusCode, 200);
    const secondId = requests()[1].id;
    const beforeConcurrent = [gold(1), gold(2)];
    const concurrent = await Promise.all([post(2, '/gold-request-act', { id: secondId, action: 'pay' }, 'gold-pay-concurrent-0001'), post(2, '/gold-request-act', { id: secondId, action: 'pay' }, 'gold-pay-concurrent-0001')]);
    assert.deepEqual(concurrent.map((response) => response.statusCode), [200, 200]);
    assert.deepEqual([gold(1), gold(2)], [beforeConcurrent[0] + 50, beforeConcurrent[1] - 50]);

    assert.equal((await post(1, '/gold-ask', { toId: 2, amount: 30 }, 'gold-ask-third-0001')).statusCode, 200);
    const thirdId = requests()[2].id;
    assert.equal((await post(2, '/gold-request-act', { id: thirdId, action: 'decline' }, 'gold-decline-0001')).statusCode, 200);
    assert.equal((await post(2, '/gold-request-act', { id: thirdId, action: 'decline' }, 'gold-decline-0001')).statusCode, 200);
    assert.equal(requests()[2].status, 'declined');
    assert.equal((await post(1, '/gold-ask', { toId: 2, amount: 20 }, 'gold-ask-fourth-0001')).statusCode, 200);
    const fourthId = requests()[3].id;
    assert.equal((await post(1, '/gold-request-act', { id: fourthId, action: 'cancel' }, 'gold-cancel-0001')).statusCode, 200);
    assert.equal((await post(1, '/gold-request-act', { id: fourthId, action: 'cancel' }, 'gold-cancel-0001')).statusCode, 200);
    assert.equal(requests()[3].status, 'cancelled');
    const finalGold = [gold(1), gold(2)];
    await app.close();
    db.close();
    db = openDb(dataDir);
    app = buildApp({ db, logger: false, config });
    assert.equal((await post(2, '/gold-request-act', pay, 'gold-pay-retry-0001')).statusCode, 200);
    assert.deepEqual([gold(1), gold(2)], finalGold);
    assert.equal(requests().length, 4);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
