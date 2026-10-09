import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { xpNeedFor } from '../server/src/game.js';

const db = openDb(':memory:');
const app = buildApp({
  config: { mockChatUser: { id: 1, username: 'browser', display_name: 'Browser Farmer' }, chatApiUrl: 'http://127.0.0.1:1', fast: false },
  db,
  logger: false,
});
const outputDir = resolve('artifacts/browser');
mkdirSync(outputDir, { recursive: true });
let browser;

async function checkNoOverflow(page, label) {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(sizes.document <= sizes.viewport + 1, `${label} overflows horizontally: ${JSON.stringify(sizes)}`);
}

try {
  const base = await app.listen({ port: 0, host: '127.0.0.1' });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 320, height: 800 }, reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'lb_session', value: 'browser-smoke', url: base }]);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${base}/farm/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.plot').first().waitFor();
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
  await page.screenshot({ path: resolve(outputDir, 'farm-320.png') });

  const startingGold = db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
  await page.locator('.plot[data-idx="0"][data-kind="empty"]').click();
  await page.locator('.seed-card[data-crop="luami"]').click();
  await page.locator('.plot[data-idx="0"][data-kind="waterplot"]').waitFor();
  await page.locator('.plot[data-idx="0"][data-kind="waterplot"]').click();
  await page.locator('.plot[data-idx="0"][data-kind="plotmenu"]').waitFor();
  assert.equal(db.prepare('SELECT watered FROM plots WHERE owner_id = 1 AND idx = 0').get().watered, 1);
  await page.screenshot({ path: resolve(outputDir, 'planted-320.png'), style: '.float-gain { visibility: hidden !important; }' });
  db.prepare('UPDATE plots SET ready_at = ? WHERE owner_id = 1 AND idx = 0').run(Date.now() - 1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.plot[data-idx="0"][data-kind="harvest"]').waitFor();
  await page.screenshot({ path: resolve(outputDir, 'ready-320.png') });
  await page.locator('.plot[data-idx="0"][data-kind="harvest"]').click();
  await page.locator('.plot[data-idx="0"][data-kind="empty"]').waitFor();
  assert.ok(db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'luami'").get().qty > 0);
  await page.locator('.dock-btn[data-sheet="inventory"]').click();
  await page.locator('.inv-row[data-item="luami"] [data-sell="luami"][data-qty]').click();
  await page.locator('.inv-row[data-item="luami"]').waitFor({ state: 'detached' });
  assert.ok(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold > startingGold);
  await page.keyboard.press('Escape');
  await page.locator('.sheet').waitFor({ state: 'detached' });

  const xp = [1, 2, 3, 4].reduce((sum, level) => sum + xpNeedFor(level), 0);
  db.prepare('DELETE FROM plots WHERE owner_id = 1').run();
  db.prepare('UPDATE farmers SET xp = ?, gold = 500, orders_refresh_at = ? WHERE user_id = 1').run(xp, Date.now() + 60_000);
  db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, ?)').run('luami', 1);
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
}
