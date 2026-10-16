import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('competing sellers and cancellation conserve trade value across a database reopen', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-trade-contention-'));
  const config = { dataDir, mockChatUser: (request) => {
    const id = Number(request.headers['x-test-user']);
    return { id, username: `trader${id}`, display_name: `Trader ${id}` };
  } };
  let db = openDb(dataDir);
  let app = buildApp({ db, logger: false, config });
  const post = (user, route, payload, key) => app.inject({
    method: 'POST', url: `/farm/api${route}`, payload,
    headers: { 'x-test-user': String(user), 'idempotency-key': key },
  });
  const gold = (id) => db.prepare('SELECT gold FROM farmers WHERE user_id = ?').get(id).gold;
  const wheat = (id) => db.prepare("SELECT qty FROM inventory WHERE owner_id = ? AND item = 'luami'").get(id)?.qty || 0;
  const totals = () => ({
    gold: db.prepare('SELECT SUM(gold) n FROM farmers').get().n
      + db.prepare('SELECT COALESCE(SUM((qty - filled) * price), 0) n FROM wants').get().n,
    wheat: db.prepare("SELECT COALESCE(SUM(qty), 0) n FROM inventory WHERE item = 'luami'").get().n,
  });
  const snapshot = () => ({
    farmers: db.prepare('SELECT user_id, gold, sold_gold, mutation_version FROM farmers ORDER BY user_id').all(),
    inventory: db.prepare('SELECT owner_id, item, qty FROM inventory ORDER BY owner_id, item').all(),
    wants: db.prepare('SELECT * FROM wants ORDER BY id').all(),
  });
  const attempts = [];
  const attempt = async (user, route, payload, key) => {
    const response = await post(user, route, payload, key);
    attempts.push({ user, route, payload, key, status: response.statusCode, body: response.json() });
    return response;
  };
  const create = async (qty, key) => {
    const response = await attempt(1, '/want-create', { item: 'luami', qty }, key);
    assert.equal(response.statusCode, 200, response.body);
    return db.prepare('SELECT * FROM wants WHERE owner_id = 1').get();
  };
  try {
    for (const user of [1, 2, 3]) {
      assert.equal((await app.inject({ method: 'GET', url: '/farm/api/state', headers: { 'x-test-user': String(user) } })).statusCode, 200);
    }
    for (const user of [2, 3]) db.prepare("INSERT INTO inventory (owner_id, item, qty) VALUES (?, 'luami', 10)").run(user);
    const conserved = totals();
    const first = await create(1, 'competing-trade-create-01');
    const sellerGold = [gold(2), gold(3)];
    const fills = await Promise.all([2, 3].map((user) => attempt(user, '/want-fill', { id: first.id, qty: 1 }, `competing-trade-fill-${user}`)));
    assert.deepEqual(fills.map((r) => r.statusCode).sort(), [200, 400]);
    const winner = fills.findIndex((r) => r.statusCode === 200);
    assert.equal(fills[1 - winner].json().error, 'no_want');
    assert.equal(wheat(1), 1);
    for (const [index, user] of [2, 3].entries()) {
      assert.equal(wheat(user), index === winner ? 9 : 10);
      assert.equal(gold(user), sellerGold[index] + (index === winner ? first.price : 0));
    }
    assert.deepEqual(totals(), conserved);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM wants').get().n, 0);

    // Exercise both scheduling orders. A partial fill may complete before the
    // cancellation, but only the unfilled escrow may ever be refunded.
    for (const cancelFirst of [false, true]) {
      const key = cancelFirst ? 'cancel-first' : 'fill-first';
      const order = await create(2, `trade-${key}-create`);
      const buyerGold = gold(1);
      const sellerBefore = gold(2);
      const buyerWheat = wheat(1);
      const sellerWheat = wheat(2);
      const cancel = () => attempt(1, '/want-cancel', { id: order.id }, `trade-${key}-cancel`);
      const fill = () => attempt(2, '/want-fill', { id: order.id, qty: 1 }, `trade-${key}-fill`);
      const responses = await Promise.all(cancelFirst ? [cancel(), fill()] : [fill(), cancel()]);
      assert.equal(responses[cancelFirst ? 0 : 1].statusCode, 200);
      const filled = responses[cancelFirst ? 1 : 0].statusCode === 200;
      assert.equal(gold(1), buyerGold + order.price * (filled ? 1 : 2));
      assert.equal(gold(2), sellerBefore + (filled ? order.price : 0));
      assert.equal(wheat(1), buyerWheat + Number(filled));
      assert.equal(wheat(2), sellerWheat - Number(filled));
      assert.equal(db.prepare('SELECT COUNT(*) n FROM wants').get().n, 0);
      assert.deepEqual(totals(), conserved);
    }

    const settled = snapshot();
    await app.close();
    db.close();
    db = openDb(dataDir);
    app = buildApp({ db, logger: false, config });
    for (const { user, route, payload, key, status, body } of attempts) {
      const response = await post(user, route, payload, key);
      assert.equal(response.statusCode, status, `${route} after reopen: ${response.body}`);
      for (const field of ['gained', 'sold', 'refund', 'error']) assert.equal(response.json()[field], body[field]);
      assert.deepEqual(snapshot(), settled, `${route} retry must preserve settled ownership and balances`);
    }
    assert.deepEqual(totals(), conserved);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
