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
  const scarecrow = page.locator('.scarecrow-img');
  assert.match(await scarecrow.getAttribute('src'), /assets\/decor-v3\/scarecrow\.png\?v=/);
  assert.ok(await scarecrow.evaluate((image) => image.complete && image.naturalWidth > 0),
    'painted scarecrow sprite should load on the farm');
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
  for (const [selector, minimum] of [
    ['.farm-next-step b', 14], ['.farm-next-step small', 12],
    ['.collection-goal b', 13], ['.collection-goal small', 11],
    ['.plot-note', 11], ['.dock-label', 11],
  ]) {
    const size = await page.locator(selector).first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    assert.ok(size >= minimum, `${selector} is too small at 320px: ${size}px`);
  }
  await page.screenshot({ path: resolve(outputDir, 'farm-320.png') });
  await auditAccessibility(page, 'farm-320');
  const audioButton = page.locator('#btn-audio-toggle');
  const audioNameBefore = await audioButton.getAttribute('aria-label');
  await audioButton.click();
  assert.notEqual(await audioButton.getAttribute('aria-label'), audioNameBefore, 'Audio control should announce its next action after toggling');

  // A delayed older poll must not replace a newer farm state.
  let releaseOldState;
  let oldStateCaptured;
  const oldStateReady = new Promise((resolve) => { oldStateCaptured = resolve; });
  let stateRequests = 0;
  await page.route('**/farm/api/state', async (route) => {
    stateRequests += 1;
    if (stateRequests !== 1) return route.continue();
    const oldResponse = await route.fetch();
    oldStateCaptured();
    await new Promise((resolve) => { releaseOldState = resolve; });
    await route.fulfill({ response: oldResponse });
  });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await oldStateReady;
  db.prepare('UPDATE farmers SET gold = gold + 7 WHERE user_id = 1').run();
  const currentGold = db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForFunction((gold) => document.querySelector('.coin-pill')?.getAttribute('aria-label')?.includes(gold.toLocaleString('vi')), currentGold);
  const delayedPoll = page.waitForResponse((response) => response.url().endsWith('/farm/api/state') && response.status() === 200);
  releaseOldState();
  await delayedPoll;
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.match(await page.locator('.coin-pill').first().getAttribute('aria-label'), new RegExp(currentGold.toLocaleString('vi')),
    'An older poll must not roll back a newer balance');
  await page.unroute('**/farm/api/state');

  const startingGold = db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
  await page.locator('.plot[data-idx="0"][data-kind="empty"]').click();
  await auditAccessibility(page, 'seed-320');
  const seedChoice = await page.locator('.seed-card[data-crop="luami"]').evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
    detailSize: Number.parseFloat(getComputedStyle(element.querySelector('.seed-meta')).fontSize),
    costSize: Number.parseFloat(getComputedStyle(element.querySelector('.seed-cost')).fontSize),
  }));
  assert.ok(seedChoice.width >= 130 && seedChoice.height >= 44, `320px seed choice is too small: ${JSON.stringify(seedChoice)}`);
  assert.ok(seedChoice.detailSize >= 11.5 && seedChoice.costSize >= 12,
    `320px seed cost or timing is too small: ${JSON.stringify(seedChoice)}`);
  await checkNoOverflow(page, '320px seed chooser');
  await page.screenshot({ path: resolve(outputDir, 'seed-320.png') });
  await page.locator('.seed-card[data-crop="luami"]').click();
  await page.locator('.plot[data-idx="0"][data-kind="waterplot"]').waitFor();
  assert.match(await page.locator('.plot[data-idx="0"]').getAttribute('aria-label'), /Ô đất 1, .*: tưới cây, còn/);
  let releaseMarket;
  let marketCaptured;
  const marketReady = new Promise((resolve) => { marketCaptured = resolve; });
  await page.route('**/farm/api/wants', async (route) => {
    const response = await route.fetch();
    marketCaptured();
    await new Promise((resolve) => { releaseMarket = resolve; });
    await route.fulfill({ response });
  });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="market"]').click();
  await marketReady;
  await page.keyboard.press('Escape');
  await page.locator('.sheet').waitFor({ state: 'detached' });
  await page.locator('.plot[data-idx="0"][data-kind="waterplot"]').click();
  await page.locator('.plot[data-idx="0"][data-kind="plotmenu"]').waitFor();
  const delayedMarket = page.waitForResponse((response) => response.url().endsWith('/farm/api/wants') && response.status() === 200);
  releaseMarket();
  await delayedMarket;
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.locator('.sheet').count(), 0, 'A stale market response must not reopen a closed sheet');
  await page.unroute('**/farm/api/wants');
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
  await checkNoOverflow(page, '320px inventory controls');
  const inventoryControls = await page.locator('.inv-row[data-item="luami"] .qty-ctl > *').evaluateAll((items) => items.map((item) => ({
    width: item.getBoundingClientRect().width,
    height: item.getBoundingClientRect().height,
  })));
  assert.ok(inventoryControls.every(({ width, height }) => width >= 44 && height >= 44),
    `Inventory quantity controls need 44px targets: ${JSON.stringify(inventoryControls)}`);
  await page.screenshot({ path: resolve(outputDir, 'inventory-320.png') });
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
  await auditAccessibility(page, 'market-320');
  await checkNoOverflow(page, '320px trade board');
  const tradeFormHeights = await page.locator('.want-form select, .want-form input, .want-form button').evaluateAll((controls) => controls.map((control) => control.getBoundingClientRect().height));
  assert.ok(tradeFormHeights.every((height) => height >= 44), `Trade form touch targets are too short: ${tradeFormHeights.join(', ')}`);
  await page.screenshot({ path: resolve(outputDir, 'market-320.png') });
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
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="orders"]').click();
  await page.locator('.o-fast').waitFor();
  const quickOrder = db.prepare('SELECT id, items_json, gold FROM orders WHERE owner_id = 1 AND slot = 0').get();
  assert.ok(quickOrder, 'The board should contain a quick crop order');
  const [[quickCrop, quickQty]] = Object.entries(JSON.parse(quickOrder.items_json));
  assert.ok(quickQty >= 1 && quickQty <= 4);
  const growOrder = page.locator('.order-card').filter({ has: page.locator('.o-fast') })
    .locator(`[data-grow-order="${quickCrop}"]`);
  assert.equal(await growOrder.isEnabled(), true, 'A missing quick crop should lead directly to planting');
  await page.screenshot({ path: resolve(outputDir, 'quick-order-320.png') });
  await growOrder.click();
  assert.equal(await page.locator('.seed-card').first().getAttribute('data-crop'), quickCrop,
    'The requested crop should appear first in the seed chooser');
  assert.match(await page.locator(`.seed-card[data-crop="${quickCrop}"]`).getAttribute('class'), /seed-card--recommended/);
  await checkNoOverflow(page, '320px order seed chooser');
  await page.locator(`.seed-card[data-crop="${quickCrop}"]`).click();
  await page.locator('.plot[data-idx="0"][data-kind="waterplot"]').waitFor();
  db.prepare('UPDATE plots SET ready_at = ? WHERE owner_id = 1 AND idx = 0').run(Date.now() - 1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.plot[data-idx="0"][data-kind="harvest"]').click();
  await page.locator('.plot[data-idx="0"][data-kind="empty"]').waitFor();
  const orderPrompt = page.locator('.farm-next-step[data-next-step="orders"]');
  await orderPrompt.waitFor();
  assert.match(await orderPrompt.innerText(), /đơn sẵn sàng giao/);
  await orderPrompt.click();
  await page.locator('.o-fast').waitFor();
  const quickCard = page.locator('.order-card').filter({ has: page.locator('.o-fast') });
  await quickCard.locator(`[data-deliver="${quickOrder.id}"]:not(:disabled)`).waitFor();
  const quickInventoryBefore = db.prepare('SELECT qty FROM inventory WHERE owner_id = 1 AND item = ?').get(quickCrop)?.qty || 0;
  const quickGoldBefore = db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
  assert.ok(quickInventoryBefore >= quickQty);
  await page.screenshot({ path: resolve(outputDir, 'quick-order-ready-320.png') });
  await quickCard.locator(`[data-deliver="${quickOrder.id}"]`).click();
  await page.locator(`[data-deliver="${quickOrder.id}"]`).waitFor({ state: 'detached' });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders WHERE id = ?').get(quickOrder.id).n, 0);
  assert.equal(db.prepare('SELECT qty FROM inventory WHERE owner_id = 1 AND item = ?').get(quickCrop)?.qty || 0, quickInventoryBefore - quickQty);
  assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, quickGoldBefore + quickOrder.gold);
  await page.screenshot({ path: resolve(outputDir, 'quick-order-delivered-320.png') });
  await page.keyboard.press('Escape');
  db.prepare('DELETE FROM orders WHERE owner_id = 1').run();
  db.prepare('DELETE FROM inventory WHERE owner_id = 1').run();
  db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, ?)').run('luami', 1);
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
  await page.setViewportSize({ width: 320, height: 800 });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="orders"]').click();
  await page.locator('.order-card').nth(1).locator('[data-grow-order="luami"]').click();
  assert.match(await page.locator('.seed-card[data-crop="luami"]').getAttribute('class'), /seed-card--recommended/,
    'a regular multi-item order should lead to its missing crop');
  await page.keyboard.press('Escape');

  const levelSixXp = [1, 2, 3, 4, 5].reduce((sum, level) => sum + xpNeedFor(level), 0);
  db.prepare('UPDATE farmers SET xp = ? WHERE user_id = 1').run(levelSixXp);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.plot').first().waitFor();
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="barns"]').click();
  await page.locator('[data-barn="cut"]').click();
  const quailProduct = page.locator('.sheet img[src*="products-v3/quail-eggs.png"]');
  assert.ok(await quailProduct.count() > 0, 'Quail barn should use its product sprite');
  assert.ok((await quailProduct.first().getAttribute('src')).includes('?v='), 'Product sprite should use the deploy version');
  assert.ok(await quailProduct.first().evaluate((image) => image.complete && image.naturalWidth > 0), 'Quail product sprite should load');
  await checkNoOverflow(page, '320px quail barn');
  await page.screenshot({ path: resolve(outputDir, 'quail-barn-320.png') });
  await page.keyboard.press('Escape');

  const levelTwentyXp = Array.from({ length: 19 }, (_, index) => xpNeedFor(index + 1)).reduce((sum, xp) => sum + xp, 0);
  db.prepare('UPDATE farmers SET xp = ? WHERE user_id = 1').run(levelTwentyXp);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.plot').first().waitFor();
  for (const [animal, product] of [['de', 'goat-milk'], ['heo', 'pork']]) {
    await page.locator('[data-sheet="more"]').first().click();
    await page.locator('[data-sheet="barns"]').click();
    await page.locator(`[data-barn="${animal}"]`).click();
    const productSprite = page.locator(`.sheet img[src*="products-v3/${product}.png"]`).first();
    await productSprite.waitFor();
    assert.ok(await productSprite.evaluate((image) => image.complete && image.naturalWidth > 0), `${product} sprite should load in the barn`);
    await checkNoOverflow(page, `320px ${animal} barn`);
    await page.screenshot({ path: resolve(outputDir, `${animal}-barn-320.png`) });
    await page.keyboard.press('Escape');
  }
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('.more-card[data-sheet="mill"]').click();
  const allRecipes = await page.locator('.sheet--factory .mc-row').count();
  assert.ok(allRecipes > 0, 'all factory recipes should be visible by default');
  await page.locator('[data-factory-view="available"]').click();
  assert.equal(await page.locator('[data-factory-view="available"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.sheet--factory .mc-row[data-can-make="0"]').count(), 0,
    'available view should only show craftable recipes');
  assert.ok(await page.locator('.sheet--factory .mc-row').count() <= allRecipes);
  await page.locator('[data-factory-view="active"]').click();
  assert.equal(await page.locator('.sheet--factory .mc-row[data-job-active="0"]').count(), 0,
    'active view should only show queued or ready recipes');
  if (await page.locator('.sheet--factory .mc-row').count() === 0) {
    assert.equal(await page.locator('.mc-view-empty').count(), 1,
      'empty active view should explain the next action');
  }
  await page.locator('[data-factory-view="all"]').click();
  assert.equal(await page.locator('.sheet--factory .mc-row').count(), allRecipes,
    'all view should restore every recipe');
  for (const product of ['grilled-fish', 'butter', 'carrot-cake', 'apple-pie', 'farm-pizza', 'strawberry-cake', 'honey-cake']) {
    await page.waitForFunction((name) => {
      const image = document.querySelector(`.sheet img[src*="products-v3/${name}.png"]`);
      return image?.complete && image.naturalWidth > 0;
    }, product);
  }
  const recipeMeta = page.locator('.machine-grid .mc-recipe-meta').first();
  assert.equal(await recipeMeta.locator('span').count(), 2, 'factory recipes should separate ingredients and rewards');
  const recipeMetaSize = await recipeMeta.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  assert.ok(recipeMetaSize >= 12, `factory recipe details should be readable at 320px: ${recipeMetaSize}px`);
  await checkNoOverflow(page, '320px new factory goods');
  await page.screenshot({ path: resolve(outputDir, 'factory-goods-320.png') });
  await page.locator('.machine-block').filter({ has: page.locator('img[src*="machines-v3/bakery-oven.png"]') }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'bakery-goods-320.png') });
  await page.keyboard.press('Escape');
  db.prepare('DELETE FROM orders WHERE owner_id = 1').run();
  db.prepare('UPDATE farmers SET orders_refresh_at = ? WHERE user_id = 1').run(Date.now() + 60 * 60 * 1000);
  db.prepare('INSERT INTO orders (owner_id, slot, items_json, gold, exp, stars) VALUES (1, 1, ?, 1000, 40, 1)')
    .run(JSON.stringify({ pizza: 1 }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="orders"]').click();
  await page.locator('[data-make-order="pizza"]').click();
  const pizzaRecipe = page.locator('.mc-row--recommended[data-recipe-output="pizza"]');
  assert.equal(await pizzaRecipe.count(), 1,
    'an order missing a processed good should highlight its factory recipe');
  assert.match(await pizzaRecipe.locator('.mc-missing').innerText(), /Thiếu .*Bột mì.*Sốt cà chua.*Phô mai/,
    'the recipe should name each missing ingredient');
  const buyMissing = pizzaRecipe.locator('.mc-plus--want');
  assert.equal(await buyMissing.isEnabled(), true, 'buy-missing control should be actionable');
  assert.equal(await buyMissing.getAttribute('aria-disabled'), null,
    'buy-missing control should not announce itself as disabled');
  page.once('dialog', (dialog) => dialog.dismiss());
  await buyMissing.click();
  await checkNoOverflow(page, '320px order factory shortcut');
  await page.screenshot({ path: resolve(outputDir, 'order-factory-320.png') });
  await page.keyboard.press('Escape');
  db.prepare('DELETE FROM orders WHERE owner_id = 1').run();
  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.setViewportSize({ width: 844, height: 390 });
  await checkNoOverflow(page, '844px landscape farm');
  await page.locator('.plot[data-kind="empty"]').first().click();
  await page.locator('.sheet-close').waitFor();
  const landscapeSheet = await page.locator('.sheet').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const close = element.querySelector('.sheet-close').getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, viewport: innerHeight, closeWidth: close.width, closeHeight: close.height };
  });
  assert.ok(landscapeSheet.top >= -1 && landscapeSheet.bottom <= landscapeSheet.viewport + 1,
    `Landscape sheet should fit the viewport: ${JSON.stringify(landscapeSheet)}`);
  assert.ok(landscapeSheet.closeWidth >= 44 && landscapeSheet.closeHeight >= 44,
    `Landscape sheet close target is too small: ${JSON.stringify(landscapeSheet)}`);
  await checkNoOverflow(page, '844px landscape seed sheet');
  await page.screenshot({ path: resolve(outputDir, 'seed-landscape-844.png') });
  await page.keyboard.press('Escape');
  await page.screenshot({ path: resolve(outputDir, 'farm-landscape-844.png') });

  await page.setViewportSize({ width: 1280, height: 900 });
  await checkNoOverflow(page, '1280px farm');
  await page.screenshot({ path: resolve(outputDir, 'farm-1280.png') });
  await page.locator('.dock-btn[data-sheet="shop"]').click();
  await auditAccessibility(page, 'shop-1280');
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 320, height: 800 });
  let releaseFirstPlant;
  let firstPlantCaptured;
  const firstPlantReady = new Promise((resolve) => { firstPlantCaptured = resolve; });
  let plantRequests = 0;
  await page.route('**/farm/api/plant', async (route) => {
    plantRequests += 1;
    if (plantRequests !== 1) return route.continue();
    const response = await route.fetch();
    firstPlantCaptured();
    await new Promise((resolve) => { releaseFirstPlant = resolve; });
    await route.fulfill({ response });
  });
  await page.locator('.plot[data-idx="0"][data-kind="empty"]').click();
  await page.locator('.seed-card[data-crop="luami"]').click();
  await firstPlantReady;
  assert.equal(await page.locator('.sheet .seed-card[data-crop="luami"]').isDisabled(), true,
    'pending seed choice should be disabled');
  assert.equal(await page.locator('.sheet .seed-card[data-crop="luami"]').getAttribute('aria-busy'), 'true',
    'pending seed choice should announce its busy state');
  await page.keyboard.press('Escape');
  await page.locator('.plot[data-idx="1"][data-kind="empty"]').click();
  await page.locator('.seed-card[data-crop="carot"]').click();
  await page.locator('.plot[data-idx="1"][data-kind="waterplot"]').waitFor();
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM plots WHERE owner_id = 1').get().n, 2);
  const goldAfterBothPlants = db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
  const delayedPlant = page.waitForResponse((response) => response.url().endsWith('/farm/api/plant') && response.status() === 200);
  releaseFirstPlant();
  await delayedPlant;
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.match(await page.locator('.coin-pill').first().innerText(), new RegExp(goldAfterBothPlants.toLocaleString('vi')),
    'The older planting response must not restore an older gold balance');
  assert.equal(await page.locator('.plot[data-idx="1"][data-kind="waterplot"]').count(), 1,
    'The older planting response must not remove the second crop');
  await page.unroute('**/farm/api/plant');

  let releaseThirdPlant;
  let thirdPlantCaptured;
  const thirdPlantReady = new Promise((resolve) => { thirdPlantCaptured = resolve; });
  await page.route('**/farm/api/plant', async (route) => {
    const response = await route.fetch();
    thirdPlantCaptured();
    await new Promise((resolve) => { releaseThirdPlant = resolve; });
    await route.fulfill({ response });
  });
  await page.locator('.plot[data-idx="2"][data-kind="empty"]').click();
  await page.locator('.seed-card[data-crop="luami"]').click();
  await thirdPlantReady;
  await page.keyboard.press('Escape');
  await page.locator('.plot[data-idx="3"][data-kind="empty"]').click();
  const delayedThirdPlant = page.waitForResponse((response) => response.url().endsWith('/farm/api/plant') && response.status() === 200);
  releaseThirdPlant();
  await delayedThirdPlant;
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.locator('.sheet .seed-card[data-crop="carot"]').count(), 1,
    'A completed plot action must keep a newer seed chooser open');
  await page.unroute('**/farm/api/plant');
  await page.locator('.sheet .seed-card[data-crop="carot"]').click();
  await page.locator('.plot[data-idx="3"][data-kind="waterplot"]').waitFor();
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM plots WHERE owner_id = 1').get().n, 4);
  // A returning farmer should see finished production without opening More first.
  const levelTenXp = Array.from({ length: 9 }, (_, index) => xpNeedFor(index + 1)).reduce((sum, xp) => sum + xp, 0);
  db.prepare('UPDATE farmers SET xp = ? WHERE user_id = 1').run(levelTenXp);
  db.prepare('UPDATE plots SET ready_at = ?, watered = 1 WHERE owner_id = 1').run(Date.now() + 60 * 60 * 1000);
  db.prepare('DELETE FROM orders WHERE owner_id = 1').run();
  db.prepare('INSERT INTO animals (owner_id, kind, ready_at) VALUES (1, ?, ?)').run('ga', Date.now() - 1000);
  db.prepare('INSERT INTO machine_jobs (owner_id, kind, recipe, ready_at) VALUES (1, ?, ?, ?)').run('coixay', 'botmi', Date.now() - 1000);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.farm-next-step[data-next-step="mill"]').click();
  assert.equal(await page.locator('.sheet--factory #btn-collect-all').count(), 1,
    'factory next action should open the collection controls');
  await page.keyboard.press('Escape');
  db.prepare('DELETE FROM machine_jobs WHERE owner_id = 1').run();
  db.prepare('UPDATE animals SET ready_at = NULL WHERE owner_id = 1').run();
  db.prepare("DELETE FROM inventory WHERE owner_id = 1 AND item = 'thucan'").run();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.farm-next-step[data-next-step="feed"]').click();
  assert.equal(await page.locator('.sheet [data-buy="thucan"]').count(), 3,
    'hungry animal next action should open feed purchase controls');
  await page.keyboard.press('Escape');
  db.prepare('DELETE FROM animals WHERE owner_id = 1').run();
  const plantedAt = Date.now();
  const insertWaitingPlot = db.prepare('INSERT INTO plots (owner_id, idx, crop, planted_at, ready_at, watered) VALUES (1, ?, ?, ?, ?, 1)');
  for (let idx = 4; idx < 12; idx += 1) insertWaitingPlot.run(idx, 'luami', plantedAt, plantedAt + 2 * 60 * 60 * 1000);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const growingPrompt = page.locator('.farm-next-step[data-next-step="growing"]');
  await growingPrompt.waitFor();
  assert.match(await growingPrompt.innerText(), /Ô 1 chín sau/,
    'a fully planted farm should show the next crop return time');
  await growingPrompt.click();
  assert.equal(await page.locator('.sheet #btn-speedup-plot').count(), 1,
    'waiting prompt should open the next growing plot');
  await page.keyboard.press('Escape');
  for (const item of ['trunggatay', 'totam', 'suatrau', 'longalpaca', 'nhunghuou', 'banhdua', 'banhgung', 'botmi', 'botbap', 'botcacao', 'mutcam', 'mutgung', 'mutsaurieng', 'siro']) {
    db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, 1) ON CONFLICT(owner_id, item) DO UPDATE SET qty = 1').run(item);
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="inventory"]').click();
  for (const [item, file] of [
    ['trunggatay', 'turkey-eggs'], ['totam', 'silkworm-silk'], ['suatrau', 'buffalo-milk'],
    ['longalpaca', 'alpaca-fleece'], ['nhunghuou', 'deer-velvet'],
    ['banhdua', 'pineapple-cake'], ['banhgung', 'ginger-cake'],
    ['botmi', 'wheat-flour'], ['botbap', 'corn-flour'], ['botcacao', 'cocoa-powder'],
    ['mutcam', 'orange-marmalade'], ['mutgung', 'ginger-preserve'],
    ['mutsaurieng', 'durian-jam'], ['siro', 'dragon-fruit-syrup'],
  ]) {
    const image = page.locator(`.inv-row[data-item="${item}"] img[src*="products-v3/${file}.png"]`);
    await image.waitFor();
    assert.ok(await image.evaluate((element) => element.complete && element.naturalWidth > 0), `${item} product sprite should load in inventory`);
  }
  await page.locator('.inv-row[data-item="nhunghuou"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'animal-products-320.png') });
  await page.locator('.inv-row[data-item="botcacao"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'flour-products-320.png') });
  await page.locator('.inv-row[data-item="siro"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'jam-products-320.png') });
  assert.deepEqual(pageErrors, []);
  console.log('Browser smoke passed at 320px, 390px, 768px, 844px landscape, 1180px, and 1280px; screenshots saved in artifacts/browser.');
} finally {
  await browser?.close();
  await app.close();
  db.close();
  await new Promise((resolve) => chatServer.close(resolve));
}
