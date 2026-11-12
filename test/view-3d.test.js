import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

function harness() {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-3d-'));
  const db = openDb(dataDir);
  const app = buildApp({ db, logger: false, config: { dataDir, release: 'test-rel', mockChatUser: { id: 3, username: 'v', display_name: 'V' } } });
  return { app, db };
}

test('?view=3d serves the 3D shell and plain /farm/ still serves the 2D client', async () => {
  const { app } = harness();
  const three = await app.inject({ method: 'GET', url: '/farm/?view=3d' });
  assert.equal(three.statusCode, 200);
  assert.match(three.body, /<canvas id="c"/);
  assert.match(three.body, /3d\/main\.js\?v=test-rel/, 'boot version is injected into asset URLs');
  assert.doesNotMatch(three.body, /__BOOT__/);
  assert.equal(three.headers['cache-control'], 'no-store');
  const two = await app.inject({ method: 'GET', url: '/farm/' });
  assert.equal(two.statusCode, 200);
  assert.doesNotMatch(two.body, /<canvas id="c"/);
});

test('the 3D client modules and the pinned three build are served from the same origin', async () => {
  const { app } = harness();
  for (const [url, type] of [['/farm/3d/main.js', /javascript/], ['/farm/3d/net.js', /javascript/], ['/farm/3d/store.js', /javascript/], ['/farm/3d/art.js', /javascript/], ['/farm/3d/style.css', /css/], ['/farm/vendor/three.module.js', /javascript/]]) {
    const res = await app.inject({ method: 'GET', url });
    assert.equal(res.statusCode, 200, url);
    assert.match(res.headers['content-type'], type, url);
  }
  const csp = (await app.inject({ method: 'GET', url: '/farm/?view=3d' })).headers['content-security-policy'];
  assert.match(csp, /default-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-eval|script-src[^;]*unsafe-inline/, 'the 3D client needs no relaxed script policy');
});

test('the 3D client never decides outcomes: it carries no economy rules of its own', () => {
  const main = readFileSync(new URL('../public/3d/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /G\.gold\s*[-+]?=|G\.xp\s*[-+]?=|G\.store\b/, 'no client-side gold/xp/inventory mutation');
  assert.doesNotMatch(main, /\.gold\s*\+=|\.xp\s*\+=/, 'no local currency arithmetic');
  for (const route of ['/plant', '/water', '/harvest', '/plant-all', '/water-all', '/harvest-all', '/sell', '/expand']) {
    assert.ok(main.includes(`'${route}'`), `main.js calls ${route}`);
  }
});

test('a new farmer gets a usable first state through the slim API', async () => {
  const { app } = harness();
  const [catalog, state] = await Promise.all([
    app.inject({ method: 'GET', url: '/farm/api/catalog' }),
    app.inject({ method: 'GET', url: '/farm/api/state?slim=1' }),
  ]);
  const cat = catalog.json(), me = state.json().me;
  assert.equal(me.plotsCount, 12);
  assert.equal(me.plots.length, 12);
  const first = Object.values(cat.crops).filter((c) => c.level <= me.level);
  assert.ok(first.length >= 2, 'at least two seeds are available at level 1');
  assert.ok(me.gold >= Math.min(...first.map((c) => c.seed)), 'can afford a seed');
  assert.ok(me.expandNext && me.expandNext.plots === 4);
});
