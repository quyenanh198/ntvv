import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('farm visits appear briefly in the owner state and expire without a heartbeat', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-visitors-'));
  const db = openDb(dataDir);
  let now = Date.now();
  const app = buildApp({ db, logger: false, config: { dataDir, now: () => now, mockChatUser: request => {
    const id = Number(request.headers['x-test-user']);
    return { id, username: `farmer${id}`, display_name: `Farmer ${id}` };
  } } });
  const get = (user, route) => app.inject({ method: 'GET', url: `/farm/api${route}`, headers: { 'x-test-user': String(user) } });
  try {
    await get(1, '/state'); await get(2, '/state');
    assert.deepEqual((await get(2, '/state?slim=1')).json().visitors, []);
    assert.equal((await get(1, '/farm/2')).statusCode, 200);
    assert.deepEqual((await get(2, '/state?slim=1')).json().visitors, [{ id: 1, name: 'Farmer 1' }]);
    now += 46_000;
    assert.deepEqual((await get(2, '/state?slim=1')).json().visitors, []);
    await get(2, '/farm/2');
    assert.deepEqual((await get(2, '/state?slim=1')).json().visitors, []);
  } finally { await app.close(); db.close(); rmSync(dataDir, { recursive: true, force: true }); }
});
