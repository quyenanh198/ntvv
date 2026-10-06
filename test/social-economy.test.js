import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('gold gifts and fulfilled trade orders replay without moving value twice', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-social-'));
  const db = openDb(dataDir);
  const app = buildApp({
    db,
    logger: false,
    config: {
      dataDir,
      mockChatUser: (request) => {
        const id = Number(request.headers['x-test-user']);
        return { id, username: `farmer${id}`, display_name: `Farmer ${id}` };
      },
    },
  });
  const inject = (user, method, url, payload, key) => app.inject({
    method,
    url: `/farm/api${url}`,
    headers: { 'x-test-user': String(user), ...(key ? { 'idempotency-key': key } : {}) },
    ...(payload ? { payload } : {}),
  });
  try {
    assert.equal((await inject(1, 'GET', '/state')).statusCode, 200);
    assert.equal((await inject(2, 'GET', '/state')).statusCode, 200);
    const gold = (id) => db.prepare('SELECT gold FROM farmers WHERE user_id = ?').get(id).gold;
    const before1 = gold(1);
    const before2 = gold(2);

    const gift = { toId: 2, amount: 100 };
    assert.equal((await inject(1, 'POST', '/gold-give', gift, 'gold-gift-request-01')).statusCode, 200);
    assert.equal((await inject(1, 'POST', '/gold-give', gift, 'gold-gift-request-01')).statusCode, 200);
    assert.equal(gold(1), before1 - 100);
    assert.equal(gold(2), before2 + 100);
    assert.equal((await inject(1, 'POST', '/gold-give', { toId: 2, amount: 50 }, 'gold-gift-request-01')).statusCode, 409);

    assert.equal((await inject(1, 'POST', '/want-create', { item: 'luami', qty: 1 })).statusCode, 200);
    const wantId = db.prepare('SELECT id FROM wants WHERE owner_id = 1').get().id;
    db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (2, ?, 1)').run('luami');
    const sellerGold = gold(2);
    const fill = await inject(2, 'POST', '/want-fill', { id: wantId, qty: 1 }, 'want-fill-request-01');
    assert.equal(fill.statusCode, 200);
    const replay = await inject(2, 'POST', '/want-fill', { id: wantId, qty: 1 }, 'want-fill-request-01');
    assert.equal(replay.statusCode, 200);
    assert.equal(replay.json().gained, fill.json().gained);
    assert.equal(gold(2), sellerGold + fill.json().gained);
    assert.equal(db.prepare('SELECT qty FROM inventory WHERE owner_id = 1 AND item = ?').get('luami').qty, 1);
    assert.equal(db.prepare('SELECT qty FROM inventory WHERE owner_id = 2 AND item = ?').get('luami'), undefined);
    assert.equal(db.prepare('SELECT id FROM wants WHERE id = ?').get(wantId), undefined);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
