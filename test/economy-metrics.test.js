import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('private daily sale totals persist and replayed requests do not inflate them', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-economy-'));
  const db = openDb(dataDir);
  const app = buildApp({ db, logger: false,
    config: { dataDir, internalSecret: 'economy-test-secret',
      mockChatUser: { id: 1, username: 'seller', display_name: 'Seller' } } });
  const post = (route, payload, key) => app.inject({ method: 'POST', url: `/farm/api/${route}`,
    payload, headers: { 'idempotency-key': key } });
  const economy = (secret) => app.inject({ method: 'GET', url: '/internal/farm/economy',
    headers: secret ? { 'x-farm-secret': secret } : {} });
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    assert.equal((await economy()).statusCode, 404);
    assert.equal((await economy('wrong-secret')).statusCode, 403);
    const stock = db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, ?)');
    stock.run('luami', 2);
    stock.run('trung', 1);
    stock.run('carot', 1);
    const firstSale = () => post('sell', { item: 'luami', qty: 2 }, 'economy-crop-sale-01');
    assert.equal((await firstSale()).statusCode, 200);
    assert.equal((await firstSale()).statusCode, 200);
    assert.equal((await post('sell', { item: 'trung', qty: 1 }, 'economy-animal-sale-01')).statusCode, 200);
    const orderId = Number(db.prepare('INSERT INTO orders (owner_id, slot, items_json, gold, exp, stars) VALUES (1, 0, ?, 100, 10, 1)')
      .run(JSON.stringify({ carot: 1 })).lastInsertRowid);
    const delivery = () => post('order-deliver', { id: orderId }, 'economy-order-01');
    assert.equal((await delivery()).statusCode, 200);
    assert.equal((await delivery()).statusCode, 200);
    const rows = (await economy('economy-test-secret')).json().rows;
    assert.deepEqual(rows.map(({ channel, category, transactions, units }) => ({ channel, category, transactions, units })), [
      { channel: 'direct', category: 'animal_product', transactions: 1, units: 1 },
      { channel: 'direct', category: 'field_crop', transactions: 1, units: 2 },
      { channel: 'order', category: 'mixed_order', transactions: 1, units: 1 },
    ]);
    assert.equal(rows.reduce((sum, row) => sum + row.gold, 0),
      db.prepare('SELECT sold_gold FROM farmers WHERE user_id = 1').get().sold_gold);
  } finally {
    await app.close();
    db.close();
  }
  try {
    const reopened = openDb(dataDir);
    assert.equal(reopened.prepare('SELECT COUNT(*) count FROM economy_sales').get().count, 3);
    reopened.close();
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});
