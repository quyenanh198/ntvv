// End-to-end: real server (mock Chat auth) + Chromium driving the 3D client. Run: node scripts/e2e-3d.mjs [screenshotDir]
import { mkdtempSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const { buildApp } = await import(`${pathToFileURL(ROOT)}server/src/app.js`);
const { openDb } = await import(`${pathToFileURL(ROOT)}server/src/db.js`);
import { chromium } from 'playwright';

const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-e2e-'));
const db = openDb(dataDir);
const app = buildApp({ db, logger: false, config: { dataDir, fast: false, mockChatUser: { id: 1, username: 'e2e', display_name: 'E2E Farmer' } } });
await app.listen({ port: 8091, host: '127.0.0.1' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const out = process.argv[2] || join(tmpdir(), 'ntvv-e2e-shots');
mkdirSync(out, { recursive: true });
const log = [];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// 1) under the server's real CSP: the client must boot without violations
const cspPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
const cspErrs = [];
cspPage.on('console', (m) => { if (/Content Security Policy|violates/i.test(m.text())) cspErrs.push(m.text().slice(0, 140)); });
cspPage.on('pageerror', (e) => cspErrs.push('pageerror ' + e.message));
await cspPage.goto('http://127.0.0.1:8091/farm/?view=3d');
await cspPage.waitForSelector('#boot[hidden]', { state: 'attached', timeout: 30000 });
await cspPage.waitForTimeout(1500);
await cspPage.close();
// 2) scripted waits need eval, so the driven session bypasses CSP
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, bypassCSP: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const reqs = [];
page.on('response', (r) => { const u = r.url(); if (r.status() >= 400) reqs.push(String(r.status()) + ' ' + u); if (u.includes('/farm/')) reqs.push(`${r.status()} ${u.replace('http://127.0.0.1:8091', '')}`); });
const step = (name, ok, extra = '') => { const line = `${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`; log.push(line); console.log(line); };

await page.goto('http://127.0.0.1:8091/farm/?view=3d#debug');
await page.waitForFunction(() => window.__farm && window.__farm.store.me, null, { timeout: 30000 });
await wait(1500);
await page.screenshot({ path: `${out}/e2e-1-loaded.png` });
let st = await page.evaluate(() => ({ gold: __farm.store.me.gold, level: __farm.store.me.level, plots: __farm.plots.length, plotsCount: __farm.store.me.plotsCount, seed: __farm.G.seed, boot: document.querySelector('#boot').hidden }));
step('loads real state', st.plots === st.plotsCount && st.plots === 12 && st.boot, JSON.stringify(st));

const goldBefore = st.gold;
await page.evaluate(() => __farm.tapPlot(__farm.plots[0]));
await page.waitForFunction(() => __farm.store.me.plots[0].crop, null, { timeout: 15000 });
st = await page.evaluate(() => ({ crop: __farm.store.me.plots[0].crop, gold: __farm.store.me.gold, state: __farm.plots[0].state }));
step('plant via server', st.crop === 'luami' && st.gold < goldBefore, JSON.stringify(st));
await page.screenshot({ path: `${out}/e2e-2-planted.png` });

await page.evaluate(() => __farm.tapPlot(__farm.plots[0]));
await page.waitForFunction(() => __farm.store.me.plots[0].watered, null, { timeout: 15000 });
step('water via server', true);

db.prepare('UPDATE plots SET ready_at = ?').run(Date.now() - 1000); await page.evaluate(() => __farm.refresh());
await page.waitForFunction(() => __farm.plots[0].state === 'ripe', null, { timeout: 20000 });
await wait(800);
await page.screenshot({ path: `${out}/e2e-3-ripe.png` });
const invBefore = await page.evaluate(() => __farm.store.me.inventory.luami || 0);
await page.evaluate(() => __farm.tapPlot(__farm.plots[0]));
await page.waitForFunction(() => !__farm.store.me.plots[0].crop, null, { timeout: 20000 });
const invAfter = await page.evaluate(() => __farm.store.me.inventory.luami || 0);
step('harvest via server', invAfter > invBefore, `inventory ${invBefore} -> ${invAfter}`);

await page.click('#bPlant');
await page.waitForFunction(() => __farm.store.me.plots.every((p) => p.crop), null, { timeout: 15000 });
step('plant-all fills every empty plot', true);
db.prepare('UPDATE plots SET ready_at = ?').run(Date.now() - 1000);
await page.evaluate(() => __farm.refresh());
await wait(600);
await page.screenshot({ path: `${out}/e2e-4-field.png` });
await page.click('#bHarvest');
await page.waitForFunction(() => __farm.store.me.plots.every((p) => !p.crop), null, { timeout: 15000 });
step('harvest-all empties the field', true);

const g0 = await page.evaluate(() => __farm.store.me.gold);
await page.click('#khoBtn'); await wait(300);
await page.screenshot({ path: `${out}/e2e-5-store.png` });
await page.click('#sellAll');
await page.waitForFunction(() => __farm.truck.state !== 'away', null, { timeout: 15000 });
const held = await page.evaluate(() => ({ shown: document.querySelector('#gold').textContent, server: __farm.store.me.gold, hold: __farm.G.holdGold }));
step('gold held while truck is on the road', held.hold !== null && held.server > g0, JSON.stringify(held));
await page.waitForFunction(() => __farm.truck.state === 'away', null, { timeout: 30000 });
await wait(1200);
const done = await page.evaluate(() => ({ shown: document.querySelector('#gold').textContent, server: __farm.store.me.gold, hold: __farm.G.holdGold }));
step('gold released when truck leaves', done.hold === null && Number(done.shown.replace(/\D/g, '')) === done.server, JSON.stringify(done));
await page.screenshot({ path: `${out}/e2e-6-sold.png` });

await page.reload();
await page.waitForFunction(() => window.__farm && window.__farm.store.me, null, { timeout: 30000 });
const after = await page.evaluate(() => ({ gold: __farm.store.me.gold, plots: __farm.plots.length }));
step('reload restores the same farm', after.gold === done.server && after.plots === 12, JSON.stringify(after));

const nx = await page.evaluate(() => __farm.store.me.expandNext);
step('expansion offered', !!nx, JSON.stringify(nx));

// ---- P3: machines. The mill in the scene follows the server's job state ----
db.prepare('UPDATE farmers SET xp = 100000, gold = 1000000 WHERE user_id = 1').run();
db.prepare("INSERT INTO inventory (owner_id, item, qty) VALUES (1, 'luami', 10) ON CONFLICT(owner_id, item) DO UPDATE SET qty = 10").run();
await page.evaluate(() => __farm.refresh());
await page.waitForFunction(() => __farm.mill.state === 'idle', null, { timeout: 20000 });
await page.click('#bMachines');
await page.waitForSelector('#prodRows .cta');
await page.screenshot({ path: `${out}/e2e-7-machines.png` });
await page.evaluate(() => [...document.querySelectorAll('#prodRows .cta')].find((b) => b.textContent === 'Chế 1 mẻ').click());
await page.waitForFunction(() => Object.keys(__farm.store.me.machines.coixay || {}).length > 0, null, { timeout: 15000 });
await page.waitForFunction(() => __farm.mill.state === 'working', null, { timeout: 15000 });
step('machine job queued by the server; mill starts working', await page.evaluate(() => __farm.store.me.inventory.luami === 8));
db.prepare("UPDATE machine_jobs SET ready_at = ? WHERE kind = 'coixay'").run(Date.now() - 1000);
await page.evaluate(() => __farm.refresh());
await page.waitForFunction(() => __farm.mill.state === 'done', null, { timeout: 15000 });
await page.screenshot({ path: `${out}/e2e-8-mill-done.png` });
await page.evaluate(() => [...document.querySelectorAll('#prodRows .cta')].find((b) => b.textContent === 'Lấy thành phẩm').click());
await page.waitForFunction(() => (__farm.store.me.inventory.botmi || 0) >= 1 && __farm.mill.state === 'idle', null, { timeout: 15000 });
step('finished goods collected; mill returns to idle', true);
await page.click('#prodClose');

// ---- P3: barn. Buy, feed, collect all go through the server ----
await page.click('#bBarn');
await page.waitForSelector('#prodRows .cta');
await page.evaluate(() => [...document.querySelectorAll('#prodRows .row')].find((r) => r.textContent.includes('Gà') && r.querySelector('.cta:not(:disabled)')).querySelector('.cta').click());
await page.waitForFunction(() => (__farm.store.me.animals || []).some((a) => a.kind === 'ga'), null, { timeout: 15000 });
db.prepare("INSERT INTO inventory (owner_id, item, qty) VALUES (1, 'thucan', 20) ON CONFLICT(owner_id, item) DO UPDATE SET qty = 20").run();
await page.evaluate(() => __farm.refresh());
// the server auto-feeds hungry animals when feed is in the barn (autoTend); the UI must reflect that either way
await page.evaluate(() => [...document.querySelectorAll('#prodRows .cta')].find((b) => b.textContent === 'Cho ăn' && !b.disabled)?.click());
await page.waitForFunction(() => (__farm.store.me.animals || []).every((a) => a.ready_at != null), null, { timeout: 15000 });
db.prepare('UPDATE animals SET ready_at = ?').run(Date.now() - 1000);
await page.evaluate(() => __farm.refresh());
await page.screenshot({ path: `${out}/e2e-9-barn.png` });
// with feed in the barn the server also collects ripe products on its own
await page.waitForFunction(() => (__farm.store.me.inventory.trung || 0) >= 1, null, { timeout: 15000 });
step('barn: buy via the server; server feeds and collects with feed in stock', true);
await page.click('#prodClose');

// ---- P3: orders. Delivery pays out only when the server accepts it ----
await page.evaluate(() => __farm.refresh());
const order = await page.evaluate(() => __farm.store.me.orders[0]);
step('server offers orders', !!order && Object.keys(order.items).length > 0, JSON.stringify(order?.items));
for (const [item, qty] of Object.entries(order.items)) db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, ?) ON CONFLICT(owner_id, item) DO UPDATE SET qty = ?').run(item, qty, qty);
await page.evaluate(() => __farm.refresh());
const goldBeforeOrder = await page.evaluate(() => __farm.store.me.gold);
await page.click('#bOrders');
await page.waitForSelector('#prodRows .cta');
await page.screenshot({ path: `${out}/e2e-10-orders.png` });
await page.evaluate(() => [...document.querySelectorAll('#prodRows .cta')].find((b) => b.textContent === 'Giao hàng' && !b.disabled).click());
await page.waitForFunction((id) => !__farm.store.me.orders.some((o) => o.id === id), order.id, { timeout: 15000 });
const goldAfterOrder = await page.evaluate(() => __farm.store.me.gold);
step('order delivered; gold granted by the server', goldAfterOrder > goldBeforeOrder, `${goldBeforeOrder} -> ${goldAfterOrder}`);
await page.click('#prodClose');

const catalogCalls = reqs.filter((r) => r.includes('/api/catalog')).length;
const stateCalls = reqs.filter((r) => r.includes('/api/state')).length;
step('catalog requested once per page load', catalogCalls <= 2, `catalog ${catalogCalls}, state ${stateCalls}`);
log.push(`${cspErrs.length ? 'FAIL' : 'PASS'} no CSP violations or page errors under the real CSP ${cspErrs.join(' ; ')}`);
console.log(log.join('\n'));
console.log('js errors:', errs.length ? errs.slice(0, 6).join(' | ') : 'none');
await browser.close(); await app.close();

if (log.some((l) => l.startsWith("FAIL")) || errs.length) process.exitCode = 1;
