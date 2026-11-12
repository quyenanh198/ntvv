import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

function harness(extra = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-cat-'));
  const db = openDb(dataDir);
  const app = buildApp({ db, logger: false, config: {
    dataDir, mockChatUser: { id: 7, username: 'cat', display_name: 'Catalog Farmer' }, ...extra,
  } });
  return { db, app };
}

test('catalog is public, versioned and revalidated with ETag', async () => {
  const { app, db } = harness();
  const first = await app.inject({ method: 'GET', url: '/farm/api/catalog' });
  assert.equal(first.statusCode, 200);
  const etag = first.headers.etag;
  assert.match(etag, /^"[0-9a-f]{16}"$/);
  assert.match(first.headers['cache-control'], /max-age=86400/);
  const catalog = first.json();
  for (const key of ['crops', 'goods', 'animals', 'machines', 'trees', 'luxury', 'skillTree']) {
    assert.ok(Object.keys(catalog[key]).length > 0, `${key} present`);
  }
  assert.equal('poachDailyLimit' in catalog, false, 'unused limit is no longer sent');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM farmers').get().n, 0, 'catalog does not create a farmer');

  const again = await app.inject({ method: 'GET', url: '/farm/api/catalog', headers: { 'if-none-match': etag } });
  assert.equal(again.statusCode, 304);
});

test('slim state omits the catalog but reports its version', async () => {
  const { app } = harness();
  const catalogEtag = (await app.inject({ method: 'GET', url: '/farm/api/catalog' })).headers.etag.replaceAll('"', '');
  const full = (await app.inject({ method: 'GET', url: '/farm/api/state' })).json();
  const slim = (await app.inject({ method: 'GET', url: '/farm/api/state?slim=1' })).json();
  assert.ok(full.config.crops);
  assert.equal(slim.config, undefined);
  assert.equal(slim.catalogVersion, catalogEtag);
  assert.equal(full.catalogVersion, catalogEtag);
  assert.deepEqual(Object.keys(slim.me).sort(), Object.keys(full.me).sort());
  assert.ok(JSON.stringify(slim).length < JSON.stringify(full).length / 2, 'slim state is far smaller');
});

test('write requests are rate limited at 90 per minute and answer 429', async () => {
  const { app } = harness();
  let limited = null;
  for (let i = 1; i <= 95 && !limited; i += 1) {
    const res = await app.inject({ method: 'POST', url: '/farm/api/buy', headers: { host: 'x', 'content-type': 'application/json' }, payload: { item: 'thucan', qty: 1 } });
    if (res.statusCode === 429) limited = { at: i, res };
  }
  assert.ok(limited, 'a 429 is returned');
  assert.equal(limited.at, 91);
  assert.equal(limited.res.headers['retry-after'], '60');
  assert.equal(limited.res.json().error, 'rate_limited');
});

test('repeated reads do not rewrite the farmer row', async () => {
  const { app, db } = harness();
  await app.inject({ method: 'GET', url: '/farm/api/state?slim=1' });
  const seenAt = db.prepare('SELECT last_seen_at s FROM farmers WHERE user_id = 7').get().s;
  assert.ok(seenAt > 0);
  await app.inject({ method: 'GET', url: '/farm/api/state?slim=1' });
  assert.equal(db.prepare('SELECT last_seen_at s FROM farmers WHERE user_id = 7').get().s, seenAt, 'no write within a minute');
});

test('renamed Chat users are picked up without a full upsert', async () => {
  let name = 'First Name';
  const { app, db } = harness({ mockChatUser: () => ({ id: 9, username: 'ren', display_name: name }) });
  await app.inject({ method: 'GET', url: '/farm/api/state?slim=1' });
  assert.equal(db.prepare('SELECT name FROM farmers WHERE user_id = 9').get().name, 'First Name');
  name = 'Second Name';
  await app.inject({ method: 'GET', url: '/farm/api/state?slim=1' });
  assert.equal(db.prepare('SELECT name FROM farmers WHERE user_id = 9').get().name, 'Second Name');
});
