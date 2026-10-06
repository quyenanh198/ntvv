import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('failed gold credit rolls back inventory removal during a sale', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-sale-'));
  const db = openDb(dataDir);
  const app = buildApp({
    db,
    logger: false,
    config: { dataDir, mockChatUser: { id: 1, username: 'farmer', display_name: 'Farmer' } },
  });
  try {
    const initial = await app.inject({ method: 'GET', url: '/farm/api/state' });
    assert.equal(initial.statusCode, 200);
    assert.equal(initial.json().me.soldGold, 0);
    db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, 3)').run('luami');
    const goldBefore = db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
    for (const qty of [-2, 0, 1.5, '2']) {
      const invalid = await app.inject({ method: 'POST', url: '/farm/api/sell', payload: { item: 'luami', qty } });
      assert.equal(invalid.statusCode, 400);
    }
    assert.equal(db.prepare('SELECT qty FROM inventory WHERE owner_id = 1 AND item = ?').get('luami').qty, 3);
    assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, goldBefore);
    db.exec(`CREATE TRIGGER reject_gold_credit BEFORE UPDATE OF gold ON farmers
      WHEN NEW.gold > OLD.gold BEGIN SELECT RAISE(ABORT, 'gold_credit_failed'); END;`);

    const sale = await app.inject({
      method: 'POST',
      url: '/farm/api/sell',
      payload: { item: 'luami', qty: 2 },
    });
    assert.equal(sale.statusCode, 500);
    assert.equal(db.prepare('SELECT qty FROM inventory WHERE owner_id = 1 AND item = ?').get('luami').qty, 3);
    assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, goldBefore);

    db.exec('DROP TRIGGER reject_gold_credit');
    const successful = await app.inject({ method: 'POST', url: '/farm/api/sell', payload: { item: 'luami', qty: 2 } });
    assert.equal(successful.statusCode, 200);
    assert.equal(successful.json().me.soldGold, successful.json().gained);
    assert.equal(db.prepare('SELECT qty FROM inventory WHERE owner_id = 1 AND item = ?').get('luami').qty, 1);
    assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, goldBefore + successful.json().gained);

    const oversell = await app.inject({ method: 'POST', url: '/farm/api/sell', payload: { item: 'luami', qty: 2 } });
    assert.equal(oversell.statusCode, 400);
    assert.equal(db.prepare('SELECT qty FROM inventory WHERE owner_id = 1 AND item = ?').get('luami').qty, 1);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
