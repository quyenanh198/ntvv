import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('returning-owner action settles accumulated animal cycles in bounded batches', async () => {
  const db = openDb(':memory:');
  const app = buildApp({ db, logger: false,
    config: { mockChatUser: { id: 1, username: 'animalfarmer', display_name: 'Animal farmer' } } });
  const state = () => app.inject({ method: 'GET', url: '/farm/api/state' });
  const qty = (item) => db.prepare('SELECT qty FROM inventory WHERE owner_id = 1 AND item = ?').get(item)?.qty || 0;
  try {
    assert.equal((await state()).statusCode, 200);
    db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, 100) ON CONFLICT(owner_id, item) DO UPDATE SET qty = 100').run('thucan');
    db.prepare('INSERT INTO animals (owner_id, kind, ready_at) VALUES (1, ?, ?)')
      .run('ga', Date.now() - 29 * 15 * 60_000 - 1000);

    assert.equal((await state()).statusCode, 200);
    assert.equal(qty('trung'), 24);
    assert.equal(qty('thucan'), 76);
    assert.equal((await state()).statusCode, 200);
    assert.equal(qty('trung'), 30);
    assert.equal(qty('thucan'), 70);
    assert.equal((await state()).statusCode, 200);
    assert.equal(qty('trung'), 30);
  } finally {
    await app.close();
    db.close();
  }
});
