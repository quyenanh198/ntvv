import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

const out = process.argv[2] || 'artifacts/ui-audit-3d';
mkdirSync(out, { recursive: true });
const db = openDb(mkdtempSync(join(tmpdir(), 'ntvv-ui-')));
const app = buildApp({ db, logger: false, config: { dataDir: tmpdir(), fast: false, mockChatUser: { id: 1, username: 'ui', display_name: 'UI Farmer' } } });
const address = await app.listen({ port: 0, host: '127.0.0.1' });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const width of [320, 390, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${address}/farm/?view=3d#debug`);
    await page.waitForFunction(() => window.__farm?.store.me && document.querySelector('#boot').hidden, null, { timeout: 30000 });
    await page.screenshot({ path: `${out}/farm-${width}.png` });
    await page.click('#bMore');
    await page.waitForSelector('#prodSheet:not([hidden])');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/menu-${width}.png` });
    const layout = await page.evaluate(() => {
      const visible = id => { const r = document.querySelector(id).getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && r.left >= 0 && r.right <= innerWidth; };
      const sheet = document.querySelector('#prodSheet .sheet').getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth > innerWidth, seedToggle: visible('#seedToggle'), close: visible('#prodClose'), sheetFits: sheet.left >= 0 && sheet.right <= innerWidth };
    });
    assert.deepEqual(layout, { overflow: false, seedToggle: true, close: true, sheetFits: true }, `${width}px layout`);
    await page.click('#prodRows .more-card:first-of-type button');
    assert.equal(await page.locator('#prodTitle').textContent(), 'Sao và cột mốc');
    await page.click('#prodClose');
    await page.click('#bMachines');
    await page.screenshot({ path: `${out}/machines-${width}.png` });
    assert.equal(await page.locator('#prodTitle').textContent(), 'Chế biến');
    await page.click('#prodClose');
    await page.click('#khoBtn');
    await page.screenshot({ path: `${out}/inventory-${width}.png` });
    assert.equal(await page.locator('#storeTitle').textContent(), 'Kho nông sản');
    assert.equal(await page.locator('#store .sheet').evaluate(el => el.scrollWidth > el.clientWidth), false, `${width}px inventory overflow`);
    assert.deepEqual(errors, [], `${width}px browser errors`);
    console.log(`PASS 3D UI ${width}px`);
    await page.close();
  }
} finally { await browser.close(); await app.close(); }
