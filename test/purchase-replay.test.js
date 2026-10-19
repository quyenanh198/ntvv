import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { LOTTERY, xpNeedFor } from '../server/src/game.js';

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
    assert.equal((await post('/buy-animal', { count: 2, kind: 'ga' }, 'animal-purchase-request-01')).statusCode, 200,
      'the same JSON fields in another order should replay');
    assert.equal(gold(), afterAnimal);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM animals WHERE owner_id = 1 AND kind = 'ga'").get().n, 2);
    assert.equal((await post('/buy-animal', { kind: 'ga', count: 1 }, 'animal-purchase-request-01')).statusCode, 409);
    const legacyHash = createHash('sha256').update(JSON.stringify(animal)).digest('hex');
    db.prepare('UPDATE mutation_results SET body_hash = ? WHERE owner_id = 1 AND request_key = ?')
      .run(legacyHash, 'animal-purchase-request-01');
    assert.equal((await post('/buy-animal', animal, 'animal-purchase-request-01')).statusCode, 200,
      'records written before canonical hashing should still replay');
    assert.equal(gold(), afterAnimal);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM animals WHERE owner_id = 1 AND kind = 'ga'").get().n, 2);
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
    const lotterySnapshot = () => ({
      ...db.prepare('SELECT gold, sunk_gold, mutation_version FROM farmers WHERE user_id = 1').get(),
      qty: db.prepare('SELECT qty FROM lottery_tickets WHERE owner_id = 1').get().qty,
    });
    for (const capRace of [false, true]) {
      db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(LOTTERY.ticket * (capRace ? 2 : 1));
      if (capRace) db.prepare('UPDATE lottery_tickets SET qty = ? WHERE owner_id = 1').run(LOTTERY.maxPerDay - 1);
      const before = lotterySnapshot();
      const keys = [0, 1].map((index) => `lottery-${capRace ? 'cap' : 'balance'}-race-${index}`);
      const responses = await Promise.all(keys.map((key) => post('/lottery-buy', { qty: 1 }, key)));
      assert.deepEqual(responses.map((response) => response.statusCode).sort(), [200, 400]);
      const winner = responses.findIndex((response) => response.statusCode === 200);
      assert.equal(responses[1 - winner].json().error, capRace ? 'lottery_max' : 'not_enough_gold');
      const after = lotterySnapshot();
      assert.equal(after.gold, before.gold - LOTTERY.ticket);
      assert.equal(after.sunk_gold, before.sunk_gold + LOTTERY.ticket);
      assert.equal(after.qty, before.qty + 1);
      assert.equal((await post('/lottery-buy', { qty: 1 }, keys[winner])).statusCode, 200);
      assert.deepEqual(lotterySnapshot(), after, 'The winning purchase must replay without charging or granting again');
    }
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
