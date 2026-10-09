import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { xpNeedFor } from '../server/src/game.js';

const players = [
  { id: 1, username: 'browser', display_name: 'Browser Farmer' },
  { id: 2, username: 'friend', display_name: 'Friend Farmer' },
];
const isFriend = (cookie) => String(cookie || '').includes('friend-smoke');
const chatServer = createServer((request, response) => {
  if (request.url !== '/api/users') {
    response.writeHead(404).end('{}');
    return;
  }
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify([players[isFriend(request.headers.cookie) ? 0 : 1]]));
});
await new Promise((resolve, reject) => {
  chatServer.once('error', reject);
  chatServer.listen(0, '127.0.0.1', resolve);
});
const db = openDb(':memory:');
const app = buildApp({
  config: {
    mockChatUser: (request) => players[isFriend(request.headers.cookie) ? 1 : 0],
    chatApiUrl: `http://127.0.0.1:${chatServer.address().port}`,
    fast: false,
  },
  db,
  logger: false,
});
const outputDir = resolve('artifacts/browser');
const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
mkdirSync(outputDir, { recursive: true });
let browser;

async function checkNoOverflow(page, label) {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(sizes.document <= sizes.viewport + 1, `${label} overflows horizontally: ${JSON.stringify(sizes)}`);
}

async function auditAccessibility(page, label) {
  if (!await page.evaluate(() => !!window.axe)) {
    await page.route('**/farm/axe.min.js', (route) => route.fulfill({ path: axePath, contentType: 'application/javascript' }));
    await page.addScriptTag({ url: new URL('/farm/axe.min.js', page.url()).href });
  }
  const results = await page.evaluate(() => window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  }));
  const violations = results.violations.map(({ id, impact, nodes }) => ({
    id,
    impact,
    targets: nodes.map(({ target }) => target),
  }));
  writeFileSync(resolve(outputDir, `accessibility-${label}.json`), `${JSON.stringify(violations, null, 2)}\n`);
  console.log(`${label} accessibility scan: ${violations.length} rule violations`);
  assert.deepEqual(violations, [], `${label} has automated WCAG A/AA violations`);
  return violations;
}

try {
  const base = await app.listen({ port: 0, host: '127.0.0.1' });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 320, height: 800 }, reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'lb_session', value: 'browser-smoke', url: base }]);
  const pageErrors = [];
  const openFarm = async () => {
    const farmPage = await context.newPage();
    farmPage.on('pageerror', (error) => pageErrors.push(error.message));
    await farmPage.goto(`${base}/farm/`, { waitUntil: 'domcontentloaded' });
    await farmPage.locator('.plot').first().waitFor();
    return farmPage;
  };
  let page = await openFarm();
  await page.waitForLoadState('load');
  const startup = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource').filter((entry) => new URL(entry.name).origin === location.origin);
    const images = resources.filter((entry) => /\.(?:png|svg|webp)(?:\?|$)/i.test(entry.name));
    return {
      plotVisibleMs: Math.round(performance.now()),
      localRequests: resources.length,
      localTransferBytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
      imageRequests: images.length,
      imageTransferBytes: images.reduce((sum, entry) => sum + entry.transferSize, 0),
      largestImages: images.map((entry) => ({ path: new URL(entry.name).pathname, bytes: entry.transferSize }))
        .sort((a, b) => b.bytes - a.bytes).slice(0, 12),
    };
  });
  writeFileSync(resolve(outputDir, 'startup-320.json'), `${JSON.stringify(startup, null, 2)}\n`);
  console.log(`320px startup sample: ${JSON.stringify(startup)}`);
  assert.ok(startup.imageTransferBytes <= 900_000, `320px image transfer exceeds 900 KB: ${startup.imageTransferBytes}`);
  assert.ok(startup.localTransferBytes <= 1_200_000, `320px local transfer exceeds 1.2 MB: ${startup.localTransferBytes}`);
  await checkNoOverflow(page, '320px farm');
  assert.equal(await page.locator('.hud-right').getAttribute('tabindex'), null, 'Resource group should not add an empty tab stop');
  const resourceNames = await page.locator('.hud-right button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));
  assert.ok(resourceNames.every((name) => name && name.length > 5), 'Header controls need descriptive screen-reader names');
  assert.match(resourceNames[0], /vàng, mở kho đồ/);
  assert.match(await page.locator('.coin-pill--star').getAttribute('aria-label'), /sao nông trại, mở mốc sao/);
  const emptyPlotNames = await page.locator('.plot[data-kind="empty"]').evaluateAll((plots) => plots.map((plot) => plot.getAttribute('aria-label')));
  assert.equal(emptyPlotNames.length, 12);
  assert.equal(new Set(emptyPlotNames).size, 12, 'Each empty plot needs a distinct accessible name');
  assert.match(emptyPlotNames[0], /Gieo hạt, Ô đất 1: trống, chọn hạt để gieo/);
  assert.match(emptyPlotNames[11], /Gieo hạt, Ô đất 12: trống, chọn hạt để gieo/);
  await page.screenshot({ path: resolve(outputDir, 'farm-320.png') });
  await auditAccessibility(page, 'farm-320');
  const audioButton = page.locator('#btn-audio-toggle');
  const audioNameBefore = await audioButton.getAttribute('aria-label');
  await audioButton.click();
  assert.notEqual(await audioButton.getAttribute('aria-label'), audioNameBefore, 'Audio control should announce its next action after toggling');

  const startingGold = db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
  await page.locator('.plot[data-idx="0"][data-kind="empty"]').click();
  await page.locator('.seed-card[data-crop="luami"]').click();
  await page.locator('.plot[data-idx="0"][data-kind="waterplot"]').waitFor();
  assert.match(await page.locator('.plot[data-idx="0"]').getAttribute('aria-label'), /Ô đất 1, .*: tưới cây, còn/);
  await page.locator('.plot[data-idx="0"][data-kind="waterplot"]').click();
  await page.locator('.plot[data-idx="0"][data-kind="plotmenu"]').waitFor();
  assert.match(await page.locator('.plot[data-idx="0"]').getAttribute('aria-label'), /Ô đất 1, .*: đã tưới, mở tùy chọn, còn/);
  assert.equal(db.prepare('SELECT watered FROM plots WHERE owner_id = 1 AND idx = 0').get().watered, 1);
  await page.screenshot({ path: resolve(outputDir, 'planted-320.png'), style: '.float-gain { visibility: hidden !important; }' });
  await page.close();
  page = await openFarm();
  await page.locator('.plot[data-idx="0"][data-kind="plotmenu"]').waitFor();
  db.prepare('UPDATE plots SET ready_at = ? WHERE owner_id = 1 AND idx = 0').run(Date.now() - 1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.plot[data-idx="0"][data-kind="harvest"]').waitFor();
  assert.match(await page.locator('.plot[data-idx="0"]').getAttribute('aria-label'), /Ô đất 1, .*: thu hoạch/);
  await page.screenshot({ path: resolve(outputDir, 'ready-320.png') });
  await page.locator('.plot[data-idx="0"][data-kind="harvest"]').click();
  await page.locator('.plot[data-idx="0"][data-kind="empty"]').waitFor();
  assert.ok(db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'luami'").get().qty > 0);
  await page.locator('.dock-btn[data-sheet="inventory"]').click();
  await auditAccessibility(page, 'inventory-320');
  await page.locator('.inv-row[data-item="luami"] [data-sell="luami"][data-qty]').click();
  await page.locator('.inv-row[data-item="luami"]').waitFor({ state: 'detached' });
  const goldAfterSale = db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
  assert.ok(goldAfterSale > startingGold);
  await page.keyboard.press('Escape');
  await page.locator('.sheet').waitFor({ state: 'detached' });
  await page.close();
  page = await openFarm();
  assert.match(await page.locator('.coin-pill').first().innerText(), new RegExp(String(goldAfterSale)));
  await page.locator('.plot[data-idx="0"][data-kind="empty"]').waitFor();

  const friendContext = await browser.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: 'reduce' });
  await friendContext.addCookies([{ name: 'lb_session', value: 'friend-smoke', url: base }]);
  const friendPage = await friendContext.newPage();
  friendPage.on('pageerror', (error) => pageErrors.push(error.message));
  await friendPage.goto(`${base}/farm/`, { waitUntil: 'domcontentloaded' });
  await friendPage.locator('.plot[data-idx="0"][data-kind="empty"]').waitFor();
  await friendPage.locator('.plot[data-idx="0"][data-kind="empty"]').click();
  await friendPage.locator('.seed-card[data-crop="luami"]').click();
  await friendPage.locator('.plot[data-idx="0"][data-kind="waterplot"]').waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.family-member[data-visit="2"]').click();
  await page.locator('.visit-bar').waitFor();
  const visitLayout = await page.locator('.visit-bar').evaluate((bar) => ({
    barWidth: bar.getBoundingClientRect().width,
    ownerWidth: bar.firstElementChild.getBoundingClientRect().width,
    buttons: [...bar.querySelectorAll('button')].map((button) => {
      const bounds = button.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height };
    }),
  }));
  assert.ok(visitLayout.ownerWidth >= visitLayout.barWidth - 30, 'Visit owner should span the mobile bar');
  assert.ok(visitLayout.buttons.every(({ width, height }) => width >= 120 && height >= 44), 'Visit actions need readable touch targets');
  await page.locator('.visit-bar').screenshot({ path: resolve(outputDir, 'visit-actions-320.png') });
  await page.screenshot({ path: resolve(outputDir, 'visit-friend-320.png') });
  await page.locator('.plot[data-idx="0"][data-kind="water"]').click();
  await page.locator('.plot[data-idx="0"].plot--ready').waitFor();
  assert.equal(db.prepare('SELECT watered FROM plots WHERE owner_id = 2 AND idx = 0').get().watered, 1);
  await friendPage.reload({ waitUntil: 'domcontentloaded' });
  await friendPage.locator('.plot[data-idx="0"][data-kind="harvest"]').waitFor();
  await friendPage.screenshot({ path: resolve(outputDir, 'friend-helped-390.png') });

  const beforeGift = db.prepare('SELECT user_id, gold FROM farmers WHERE user_id IN (1, 2) ORDER BY user_id').all();
  page.once('dialog', (dialog) => dialog.accept('10'));
  await page.locator('#btn-gold-give').click();
  await page.waitForFunction((expected) => document.querySelector('.coin-pill b')?.textContent.replaceAll('.', '') === String(expected), beforeGift[0].gold - 10);
  const afterGift = db.prepare('SELECT user_id, gold FROM farmers WHERE user_id IN (1, 2) ORDER BY user_id').all();
  assert.equal(afterGift[0].gold, beforeGift[0].gold - 10);
  assert.equal(afterGift[1].gold, beforeGift[1].gold + 10);
  await friendPage.reload({ waitUntil: 'domcontentloaded' });
  assert.match(await friendPage.locator('.coin-pill').first().innerText(), new RegExp(String(afterGift[1].gold)));

  await friendPage.locator('.plot[data-idx="0"][data-kind="harvest"]').click();
  await friendPage.locator('.plot[data-idx="0"][data-kind="empty"]').waitFor();
  const friendWheatBeforeTrade = db.prepare("SELECT qty FROM inventory WHERE owner_id = 2 AND item = 'luami'").get().qty;
  await page.locator('#btn-home').click();
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="market"]').click();
  await page.locator('#want-item').selectOption('luami');
  await page.locator('#want-qty').fill('1');
  await page.locator('#btn-want-create').click();
  await page.locator('[data-want-cancel]').waitFor();
  const want = db.prepare("SELECT id, price FROM wants WHERE owner_id = 1 AND item = 'luami'").get();
  assert.ok(want);
  assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, afterGift[0].gold - want.price);
  await page.screenshot({ path: resolve(outputDir, 'trade-buyer-320.png') });

  await friendPage.locator('[data-sheet="more"]').first().click();
  await friendPage.locator('[data-sheet="market"]').click();
  await friendPage.locator(`[data-want="${want.id}"] [data-want-fill]`).click();
  await friendPage.locator(`[data-want="${want.id}"]`).waitFor({ state: 'detached' });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM wants WHERE id = ?').get(want.id).n, 0);
  assert.equal(db.prepare("SELECT qty FROM inventory WHERE owner_id = 2 AND item = 'luami'").get().qty, friendWheatBeforeTrade - 1);
  assert.equal(db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'luami'").get().qty, 1);
  assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 2').get().gold, afterGift[1].gold + want.price);
  await friendPage.screenshot({ path: resolve(outputDir, 'trade-seller-390.png') });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="inventory"]').click();
  await page.locator('.inv-row[data-item="luami"]').waitFor();
  await page.keyboard.press('Escape');
  await friendContext.close();

  const xp = [1, 2, 3, 4].reduce((sum, level) => sum + xpNeedFor(level), 0);
  db.prepare('DELETE FROM plots WHERE owner_id = 1').run();
  db.prepare('DELETE FROM inventory WHERE owner_id = 1').run();
  db.prepare('UPDATE farmers SET xp = ?, gold = 500, orders_refresh_at = 0 WHERE user_id = 1').run(xp);
  db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, ?)').run('luami', 1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="orders"]').click();
  await page.locator('.o-fast').waitFor();
  await page.screenshot({ path: resolve(outputDir, 'quick-order-320.png') });
  await page.keyboard.press('Escape');
  db.prepare('DELETE FROM orders WHERE owner_id = 1').run();
  db.prepare('UPDATE farmers SET orders_refresh_at = ? WHERE user_id = 1').run(Date.now() + 60_000);
  const insertOrder = db.prepare('INSERT INTO orders (owner_id, slot, items_json, gold, exp, stars) VALUES (1, ?, ?, ?, 40, 1)');
  insertOrder.run(0, JSON.stringify({ luami: 3, carot: 2 }), 500);
  insertOrder.run(1, JSON.stringify({ luami: 1 }), 150);
  insertOrder.run(2, JSON.stringify({ carot: 3 }), 300);
  insertOrder.run(3, JSON.stringify({ luami: 5 }), 350);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.plot').first().waitFor();
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="orders"]').click();
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('sheet-close')), true);
  await auditAccessibility(page, 'orders-320');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-discard')), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('sheet-close')), true);
  const cards = page.locator('.order-card');
  assert.equal(await cards.count(), 4);
  assert.match(await cards.first().getAttribute('class'), /order-card--ready/);
  assert.match(await cards.first().innerText(), /Lúa mì/);
  assert.match(await cards.nth(1).innerText(), /Còn thiếu 4 sản phẩm/);
  const touchHeights = await page.locator('.order-card .sheet-actions button').evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  assert.ok(touchHeights.every((height) => height >= 44), `Order actions are too short: ${touchHeights.join(', ')}`);
  const itemFontPx = await page.locator('.o-item').first().evaluate((item) => Number.parseFloat(getComputedStyle(item).fontSize));
  assert.ok(itemFontPx >= 12, `Order item text is too small: ${itemFontPx}px`);
  await checkNoOverflow(page, '320px order sheet');
  await page.screenshot({ path: resolve(outputDir, 'orders-320.png') });
  for (const width of [390, 768, 1180]) {
    await page.setViewportSize({ width, height: 900 });
    await checkNoOverflow(page, `${width}px order sheet`);
  }
  await page.keyboard.press('Escape');
  await page.locator('.sheet').waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-sheet')), 'more');

  await page.setViewportSize({ width: 1280, height: 900 });
  await checkNoOverflow(page, '1280px farm');
  await page.screenshot({ path: resolve(outputDir, 'farm-1280.png') });
  assert.deepEqual(pageErrors, []);
  console.log('Browser smoke passed at 320px, 390px, 768px, 1180px, and 1280px; screenshots saved in artifacts/browser.');
} finally {
  await browser?.close();
  await app.close();
  db.close();
  await new Promise((resolve) => chatServer.close(resolve));
}
