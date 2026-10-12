import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { xpNeedFor } from '../server/src/game.js';

test('animal and lottery purchases do not repeat after a lost response', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-purchases-'));
  const db = openDb(dataDir);
  const app = buildApp({
    db, logger: false,
    config: { dataDir, mockChatUser: { id: 1, username: 'buyer', display_name: 'Buyer' } },
  });
  const post = (route, payload, key) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'idempotency-key': key },
  });
  const gold = () => db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state' })).statusCode, 200);
    db.prepare('UPDATE farmers SET xp = ?, gold = 500000 WHERE user_id = 1').run(xpNeedFor(1) + xpNeedFor(2));

    const animal = { kind: 'ga', count: 2 };
    const first = await post('/buy-animal', animal, 'animal-purchase-request-01');
    assert.equal(first.statusCode, 200, first.body);
    assert.equal(first.json().bought, 2);
    const afterAnimal = gold();
    assert.equal((await post('/buy-animal', animal, 'animal-purchase-request-01')).statusCode, 200);
    assert.equal(gold(), afterAnimal);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM animals WHERE owner_id = 1 AND kind = 'ga'").get().n, 2);
    assert.equal((await post('/buy-animal', { kind: 'ga', count: 1 }, 'animal-purchase-request-01')).statusCode, 409);
    assert.equal((await post('/buy-chicken', {}, 'chicken-purchase-request-01')).statusCode, 200);
    const afterChicken = gold();
    assert.equal((await post('/buy-chicken', {}, 'chicken-purchase-request-01')).statusCode, 200);
    assert.equal(gold(), afterChicken);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM animals WHERE owner_id = 1 AND kind = 'ga'").get().n, 3);

    const ticket = await post('/lottery-buy', { qty: 2 }, 'lottery-purchase-request-01');
    assert.equal(ticket.statusCode, 200, ticket.body);
    const afterTicket = gold();
    const replay = await post('/lottery-buy', { qty: 2 }, 'lottery-purchase-request-01');
    assert.equal(replay.statusCode, 200);
    assert.equal(gold(), afterTicket);
    assert.equal(replay.json().lottery.mine, ticket.json().lottery.mine);
    assert.equal(db.prepare('SELECT qty FROM lottery_tickets WHERE owner_id = 1').get().qty, 2);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
