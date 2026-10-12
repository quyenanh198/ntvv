import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('cross-site browser mutations are rejected before farmer state changes', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-csrf-'));
  const db = openDb(dataDir);
  const app = buildApp({ db, logger: false, config: {
    dataDir, mockChatUser: { id: 1, username: 'csrf', display_name: 'CSRF Farmer' },
  } });
  const buy = (headers) => app.inject({ method: 'POST', url: '/farm/api/buy',
    headers, payload: { item: 'thucan', qty: 1 } });
  try {
    const crossSite = await buy({ host: 'farm.example', origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' });
    assert.equal(crossSite.statusCode, 403);
    assert.equal(crossSite.json().error, 'cross_origin_request');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM farmers').get().n, 0);

    const spoofedSite = await buy({ host: 'farm.example', origin: 'https://evil.example', 'sec-fetch-site': 'same-origin' });
    assert.equal(spoofedSite.statusCode, 403);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM farmers').get().n, 0);

    const sameSiteOtherOrigin = await buy({ host: 'farm.example', origin: 'http://other.example', 'sec-fetch-site': 'same-site' });
    assert.equal(sameSiteOtherOrigin.statusCode, 403);

    const simpleForm = await app.inject({ method: 'POST', url: '/farm/api/buy-energy',
      headers: { host: 'farm.example', 'content-type': 'text/plain' }, payload: '{}' });
    assert.equal(simpleForm.statusCode, 415);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM farmers').get().n, 0);

    const sameOrigin = await buy({ host: 'farm.example', origin: 'http://farm.example', 'sec-fetch-site': 'same-origin' });
    assert.equal(sameOrigin.statusCode, 200, sameOrigin.body);
    const secureOrigin = await buy({ host: 'farm.example', 'x-forwarded-proto': 'https', origin: 'https://farm.example', 'sec-fetch-site': 'same-origin' });
    assert.equal(secureOrigin.statusCode, 200, secureOrigin.body);
    const wrongScheme = await buy({ host: 'farm.example', 'x-forwarded-proto': 'https', origin: 'http://farm.example', 'sec-fetch-site': 'same-origin' });
    assert.equal(wrongScheme.statusCode, 403);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM farmers').get().n, 1);
    assert.equal(db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'thucan'").get().qty, 2);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
