import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

const engineName = process.env.NTVV_BROWSER || 'chromium';
const engine = { chromium, firefox, webkit }[engineName];
if (!engine) throw new Error('NTVV_BROWSER must be chromium, firefox or webkit');
const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const out = resolve('artifacts/browser-3d', engineName);
mkdirSync(out, { recursive: true });
const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-browser-3d-'));
const db = openDb(dataDir);
const app = buildApp({ db, logger: false, config: { dataDir, fast: false, mockChatUser: { id: 1, username: 'smoke', display_name: 'Smoke Farmer' } } });
let browser;
try {
  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  browser = await engine.launch(engineName === 'chromium' ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
  for (const width of [320, 390, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${address}/farm/#debug`);
    const webgl = await page.evaluate(() => !!(document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl')));
    if (!webgl) {
      await page.locator('#bootMsg a[href="?view=2d"]').waitFor();
      assert.equal(await page.locator('#bootTitle').isVisible(), true);
      await page.screenshot({ path: join(out, `fallback-${width}.png`) });
      console.log(`${engineName} ${width}px: WebGL fallback passed`);
      await page.close();
      continue;
    }
    await page.waitForFunction(() => window.__farm?.store.me && document.querySelector('#boot').hidden, null, { timeout: 60_000 });
    assert.equal(await page.evaluate(() => __farm.plots.length), 12);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width}px horizontal overflow`);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('#bulk button:not([hidden])')].every(button => {
      const r = button.getBoundingClientRect();
      return r.width >= 44 && r.height >= 44 && r.left >= 0 && r.right <= innerWidth;
    })), true, `${width}px action buttons fit`);
    await page.screenshot({ path: join(out, `farm-${width}.png`) });
    if (width === 320) {
      await page.route('**/farm/axe.min.js', route => route.fulfill({ path: axePath, contentType: 'application/javascript' }));
      await page.addScriptTag({ url: `${address}/farm/axe.min.js` });
      const violations = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }).then(result => result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => ({ target: node.target, summary: node.failureSummary, data: node.any.map(check => check.data) })) }))));
      writeFileSync(join(out, 'accessibility-farm-320.json'), `${JSON.stringify(violations, null, 2)}\n`);
      assert.deepEqual(violations, [], '320px farm accessibility');
    }
    await page.locator('#bMore').click();
    await page.locator('#prodSheet:not([hidden])').waitFor();
    await page.locator('#prodSheet').evaluate(el => el.getAnimations({ subtree: true }).forEach(animation => animation.finish()));
    assert.equal(await page.evaluate(() => {
      const sheet = document.querySelector('#prodSheet .sheet').getBoundingClientRect();
      const close = document.querySelector('#prodClose').getBoundingClientRect();
      return sheet.left >= 0 && sheet.right <= innerWidth && close.width >= 44 && close.height >= 44;
    }), true, `${width}px sheet layout`);
    await page.screenshot({ path: join(out, `menu-${width}.png`) });
    if (width === 320) {
      const violations = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }).then(result => result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))));
      writeFileSync(join(out, 'accessibility-menu-320.json'), `${JSON.stringify(violations, null, 2)}\n`);
      assert.deepEqual(violations, [], '320px menu accessibility');
      await page.locator('#prodClose').focus();
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.querySelector('#prodSheet').contains(document.activeElement)), true, 'Shift+Tab stays in the sheet');
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'bMore', 'Escape returns focus to the opener');
      await page.locator('#khoBtn').click();
      await page.locator('#storeClose').focus();
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.querySelector('#store').contains(document.activeElement)), true, 'Shift+Tab stays in inventory');
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'khoBtn', 'inventory returns focus to the opener');
    } else {
      await page.locator('#prodClose').click();
    }
    assert.deepEqual(errors, [], `${width}px browser errors`);
    const resources = await page.evaluate(() => performance.getEntriesByType('resource').filter(e => new URL(e.name).origin === location.origin && !e.name.endsWith('/farm/axe.min.js')).map(e => ({ path: new URL(e.name).pathname, transfer: e.transferSize, encoded: e.encodedBodySize })));
    writeFileSync(join(out, `transfer-${width}.json`), `${JSON.stringify(resources, null, 2)}\n`);
    console.log(`${engineName} ${width}px: 3D farm, menu and layout passed; ${resources.reduce((sum, e) => sum + e.transfer, 0)} transfer bytes`);
    await page.close();
  }
} finally {
  await browser?.close();
  await app.close();
  db.close();
  rmSync(dataDir, { recursive: true, force: true });
}
