import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { LUXURY } from '../server/src/game.js';

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
    if (width === 390) {
      db.prepare('INSERT INTO luxury (owner_id, item, at) VALUES (1, ?, ?)').run('vuonhoa', Date.now());
      db.prepare('INSERT INTO luxury (owner_id, item, at) VALUES (1, ?, ?)').run('petcho', Date.now());
      db.prepare('UPDATE farmers SET dog_until = ? WHERE user_id = 1').run(Date.now() + 3600000);
      await page.click('#storeClose');
      await page.evaluate(() => __farm.refresh());
      await page.waitForFunction(() => __farm.luxuryScene.size === 2 && [...__farm.luxuryScene.values()].every(sprite => sprite.material.map.image?.width > 0));
      await page.waitForFunction(() => __farm.guardDogSprite?.visible);
      const dogStart = await page.evaluate(() => __farm.guardDogSprite.position.clone().toArray());
      await page.waitForTimeout(1200);
      assert.equal(await page.evaluate(start => __farm.guardDogSprite.position.distanceTo({ x: start[0], y: start[1], z: start[2] }) > 0.5, dogStart), true, 'guard dog patrols');
      await page.evaluate(() => { __farm.camTarget.set(-19, 0, -13); __farm.setZoom(0.8); });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${out}/gallery-390.png` });
      await page.evaluate(() => __farm.camTarget.set(__farm.guardDogSprite.position.x, 0, __farm.guardDogSprite.position.z));
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${out}/guard-dog-390.png` });
      const artIds = Object.values(LUXURY).filter(item => item.kind === 'decor' || item.kind === 'pet').map(item => item.id);
      for (const id of artIds) db.prepare('INSERT OR IGNORE INTO luxury (owner_id, item, at) VALUES (1, ?, ?)').run(id, Date.now());
      await page.evaluate(() => __farm.refresh());
      await page.waitForFunction(count => __farm.luxuryScene.size === count && [...__farm.luxuryScene.values()].every(sprite => sprite.material.map.image?.width > 0), artIds.length);
      assert.equal(await page.evaluate(() => {
        const ids = __farm.store.me.luxury.decor, sprites = ids.map(id => __farm.luxuryScene.get(id));
        return sprites.every((a, i) => sprites.slice(i + 1).every(b => a.position.distanceTo(b.position) > a.scale.x));
      }), true, 'decorations do not share space');
      await page.evaluate(() => __farm.camTarget.set(-21, 0, -13));
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${out}/gallery-full-390.png` });
      console.log(`Full gallery draw calls: ${await page.evaluate(() => __farm.renderer.info.render.calls)}`);
      db.prepare('DELETE FROM luxury WHERE owner_id = 1').run();
      db.prepare('UPDATE farmers SET dog_until = 0 WHERE user_id = 1').run();
      db.prepare("INSERT INTO animals (owner_id, kind, ready_at) VALUES (1, 'ga', NULL)").run();
      await page.evaluate(() => __farm.refresh());
      await page.waitForFunction(() => [...__farm.herd.ents.values()].some(e => e.a.serverKind === 'ga'));
      await page.evaluate(() => {
        const hen = __farm.store.me.animals.find(a => a.kind === 'ga');
        __farm.herd.sync({ ...__farm.store.me, animals: [{ ...hen, ready_at: Date.now() - 1000, ready: true }] });
        const a = [...__farm.herd.ents.values()].find(e => e.a.serverKind === 'ga').a;
        __farm.camTarget.set(a.g.position.x, 0, a.g.position.z); __farm.setZoom(1.5);
      });
      await page.waitForFunction(() => [...__farm.herd.ents.values()].some(e => e.a.serverKind === 'ga' && e.a.flag.userData.icon.material.map?.userData.ready));
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${out}/animal-product-390.png` });
      db.prepare('DELETE FROM animals WHERE owner_id = 1').run();
    }
    if (width === 1280) {
      await page.click('#storeClose');
      assert.equal(await page.evaluate(() => {
        const ids = Object.keys(__farm.store.catalog.trees);
        return ids.length === 13 && ids.every(id => __farm.template(id, 'ripe', 12).attributes.position.count > __farm.template(id, 'ripe', 0).attributes.position.count)
          && new Set(['cam', 'dua', 'xoai'].map(id => Array.from(__farm.template(id, 'grow').attributes.position.array).map(n => n.toFixed(2)).join(','))).size === 3;
      }), true, 'tree canopies and fruit stock');
      await page.evaluate(() => {
        const ids = ['luami', 'ngo', 'carot', 'bingo', 'nho', 'cachua', 'tra', 'bapcai', 'hoahong', 'nam'];
        ids.forEach((id, i) => { const p = __farm.plots[i]; p.crop.geometry = __farm.template(id, 'ripe'); p.crop.visible = true; });
        __farm.camTarget.set(2, 0, 3); __farm.setZoom(1.15);
      });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}/crop-families-1280.png` });
      await page.evaluate(() => {
        const ids = ['cam', 'dua', 'xoai', 'chuoi', 'tao', 'saurieng', 'quabo', 'thanhlong', 'dao', 'chanh'];
        ids.forEach((id, i) => { const p = __farm.plots[i]; p.crop.geometry = __farm.template(id, 'ripe', 6); });
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/tree-families-1280.png` });
    }
    assert.deepEqual(errors, [], `${width}px browser errors`);
    console.log(`PASS 3D UI ${width}px`);
    await page.close();
  }
} finally { await browser.close(); await app.close(); }
