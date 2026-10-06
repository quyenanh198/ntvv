import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('order delivery and discard survive a lost response without repeating effects', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-order-replay-'));
  const db = openDb(dataDir);
  const app = buildApp({
    db, logger: false,
    config: { dataDir, mockChatUser: { id: 1, username: 'orders', display_name: 'Orders' } },
  });
  const post = (route, id, key) => app.inject({
    method: 'POST', url: `/farm/api/${route}`, payload: { id },
    headers: { 'idempotency-key': key },
  });
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    const addOrder = db.prepare('INSERT INTO orders (owner_id, slot, items_json, gold, exp, stars) VALUES (1, ?, ?, 100, 10, 1)');
    const firstId = Number(addOrder.run(1, JSON.stringify({ luami: 2 })).lastInsertRowid);
    db.prepare("INSERT INTO inventory (owner_id, item, qty) VALUES (1, 'luami', 2)").run();
    const before = db.prepare('SELECT gold, xp, stars FROM farmers WHERE user_id = 1').get();

    const first = await post('order-deliver', firstId, 'deliver-order-request-01');
    assert.equal(first.statusCode, 200, first.body);
    const after = db.prepare('SELECT gold, xp, stars FROM farmers WHERE user_id = 1').get();
    assert.equal(after.gold, before.gold + first.json().gained);
    assert.equal(after.xp, before.xp + 10);
    assert.equal(after.stars, before.stars + 1);
    assert.equal((await post('order-deliver', firstId, 'deliver-order-request-01')).statusCode, 200);
    assert.deepEqual(db.prepare('SELECT gold, xp, stars FROM farmers WHERE user_id = 1').get(), after);
    assert.equal(db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'luami'").get(), undefined);
    assert.equal((await post('order-deliver', firstId, 'deliver-order-request-02')).statusCode, 400);

    const secondId = Number(addOrder.run(2, JSON.stringify({ carot: 1 })).lastInsertRowid);
    assert.equal((await post('order-discard', secondId, 'discard-order-request-01')).statusCode, 200);
    const nextOrderAt = db.prepare('SELECT next_order_at FROM farmers WHERE user_id = 1').get().next_order_at;
    assert.equal((await post('order-discard', secondId, 'discard-order-request-01')).statusCode, 200);
    assert.equal(db.prepare('SELECT next_order_at FROM farmers WHERE user_id = 1').get().next_order_at, nextOrderAt);
    assert.equal((await post('order-discard', secondId, 'discard-order-request-02')).statusCode, 400);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM orders WHERE owner_id = 1').get().n, 0);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
