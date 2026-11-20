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
    // Keep synthetic visual states stable while the real server refresh timer would replace them.
    await page.addInitScript(() => {
      const set = window.setInterval;
      window.setInterval = (fn, ms, ...args) => ms === 20_000 ? 0 : set(fn, ms, ...args);
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${address}/farm/?view=3d#debug`);
    await page.waitForFunction(() => window.__farm?.store.me && document.querySelector('#boot').hidden, null, { timeout: 30000 });
    await page.screenshot({ path: `${out}/farm-${width}.png` });
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('#tags .tag')].every(el => {
      const style = getComputedStyle(el); if (style.visibility === 'hidden' || style.display === 'none') return true;
      const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight - 210;
    })), true, `${width}px world labels fit`);
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
    await page.waitForSelector('#prodSheet:not([hidden])');
    await page.locator('#prodSheet').evaluate(el => el.getAnimations({ subtree: true }).forEach(a => a.finish()));
    await page.screenshot({ path: `${out}/machines-${width}.png` });
    assert.equal(await page.locator('#prodTitle').textContent(), 'Chế biến');
    await page.click('#prodClose');
    await page.click('#khoBtn');
    await page.waitForSelector('#store:not([hidden])');
    await page.locator('#store').evaluate(el => el.getAnimations({ subtree: true }).forEach(a => a.finish()));
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
      assert.equal(await page.evaluate(() => __farm.guardDogSprite.isGroup && __farm.guardDogSprite.children.length >= 10), true, 'guard dog is a 3D model');
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
      assert.equal(await page.evaluate(() => [...__farm.luxuryScene.values()].every(sprite => {
        const p = __farm.toScreen(sprite.position.x, sprite.position.y, sprite.position.z);
        return p.x > 25 && p.x < innerWidth - 25 && p.y > 70 && p.y < innerHeight - 230;
      })), true, 'gallery fits mobile view');
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
      await page.evaluate(() => { const p = __farm.plots[1]; p.crop.geometry = __farm.template('huongduong', 'ripe'); __farm.camTarget.set(p.x, 0, p.z); __farm.setZoom(0.65); });
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${out}/crop-sunflower-1280.png` });
      assert.equal(await page.evaluate(() => new Set(Array.from(__farm.template('huongduong', 'ripe').attributes.color.array).map(v => v.toFixed(2))).size > 10), true, 'sunflower keeps contrasting center and petals');
      await page.evaluate(() => { __farm.plots[1].crop.geometry = __farm.template('ngo', 'ripe'); });
      await page.evaluate(() => { const p = __farm.plots[4]; __farm.camTarget.set(p.x, 0, p.z); __farm.setZoom(0.65); });
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${out}/crop-grape-1280.png` });
      assert.equal(await page.evaluate(() => __farm.template('nho', 'ripe').attributes.position.count > __farm.template('dualeo', 'ripe').attributes.position.count), true, 'grape vines have distinct bunches');
      await page.evaluate(() => { const p = __farm.plots[9]; __farm.camTarget.set(p.x, 0, p.z); });
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${out}/crop-mushroom-1280.png` });
      await page.evaluate(() => {
        const ids = ['cam', 'dua', 'xoai', 'chuoi', 'tao', 'saurieng', 'quabo', 'thanhlong', 'dao', 'chanh'];
        ids.forEach((id, i) => { const p = __farm.plots[i]; p.crop.geometry = __farm.template(id, 'ripe', 6); });
        __farm.camTarget.set(2, 0, 3); __farm.setZoom(1.15);
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/tree-families-1280.png` });
      await page.evaluate(() => {
        const animals = Object.keys(__farm.store.catalog.animals).map((kind, i) => ({ id: 1000 + i, kind, ready_at: Date.now() + 3600000, ready: false }));
        __farm.herd.sync({ ...__farm.store.me, animals });
        __farm.camTarget.set(-21, 0, 7); __farm.setZoom(1.1);
      });
      await page.waitForFunction(() => __farm.herd.ents.size === 15);
      for (const kind of ['ong', 'tam']) {
        const start = await page.evaluate(name => {
          const a = [...__farm.herd.ents.values()].find(e => e.a.serverKind === name).a;
          return { count: a.movers.length, pos: a.movers[0].position.toArray() };
        }, kind);
        assert.equal(start.count, 3, `${kind} has animated creatures`);
        await page.waitForFunction(({ name, pos }) => {
          const a = [...__farm.herd.ents.values()].find(e => e.a.serverKind === name).a;
          return a.movers[0].position.distanceTo({ x: pos[0], y: pos[1], z: pos[2] }) > 0.08;
        }, { name: kind, pos: start.pos });
      }
      await page.waitForTimeout(600);
      assert.equal(await page.evaluate(() => {
        const herd = [...__farm.herd.ents.values()].map(e => e.a).filter(a => !['ga', 'cuu', 'heo'].includes(a.serverKind));
        return herd.every((a, i) => herd.slice(i + 1).every(b => Math.hypot(a.g.position.x - b.g.position.x, a.g.position.z - b.g.position.z) > 1.1));
      }), true, 'pasture animals and fixed props keep space');
      const herdDrawCalls = await page.evaluate(() => __farm.renderer.info.render.calls);
      assert.ok(herdDrawCalls <= 160, `all species use ${herdDrawCalls} draw calls`);
      console.log(`All species draw calls: ${herdDrawCalls}`);
      await page.screenshot({ path: `${out}/animal-pasture-1280.png` });
      await page.evaluate(() => __farm.camTarget.set(0, 0, 0));
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${out}/animal-pens-1280.png` });
      await page.evaluate(() => {
        __farm.store.me.level = 50;
        for (const s of __farm.stations.list) if (s.state === 'locked') { s.state = 'idle'; s.site.visible = false; s.body.visible = true; }
        for (const id of ['xuongcaocap', 'nhamaysua', 'lobanh', 'quanvat', 'quanoc', 'bepan', 'mayep', 'noimut']) {
          __farm.layout.place('station:' + id);
        }
      });
      for (const [id, axis] of [['xuongcaocap', 'sway'], ['nhamaysua', 'bob'], ['lobanh', 'pulse'], ['quanvat', 'flip'], ['quanoc', 'sway'], ['bepan', 'pulse'], ['mayep', 'pulse'], ['noimut', 'pulse']]) {
        await page.waitForFunction(name => __farm.stations.byId(name).placed, id);
        await page.evaluate(name => {
          const s = __farm.stations.byId(name), recipe = Object.values(__farm.store.catalog.machines[name].recipes)[0];
          __farm.store.me.level = 50;
          __farm.store.me.machines[name] = { [recipe.id]: { recipe: recipe.id, ready: false, processing: true, readyAt: Date.now() + 300000, currentReadyAt: Date.now() + 300000, cycleMs: 600000, queue: name === 'quanvat' ? 7 : 1 } };
          s.state = 'working'; s.body.visible = true; s.site.visible = false;
          __farm.camTarget.set(s.x, 0, s.z); __farm.setZoom(0.65);
        }, id);
        await page.waitForTimeout(350);
        const before = await page.evaluate(({ id, axis }) => { const o = __farm.stations.byId(id).rotors.find(r => r.axis === axis).o; return axis === 'bob' || axis === 'flip' ? o.position.y : axis === 'sway' ? o.rotation.z : o.scale.x; }, { id, axis });
        await page.waitForFunction(({ id, axis, before }) => { const o = __farm.stations.byId(id).rotors.find(r => r.axis === axis).o; return Math.abs((axis === 'bob' || axis === 'flip' ? o.position.y : axis === 'sway' ? o.rotation.z : o.scale.x) - before) > 0.04; }, { id, axis, before });
        await page.screenshot({ path: `${out}/workshop-${id}-1280.png` });
        if (id === 'quanvat') assert.equal(await page.evaluate(() => {
          const s = __farm.stations.byId('quanvat'), progress = Number(s.tag.dataset.progress);
          return s.crates.filter(c => c.visible).length === 5 && s.tag.textContent.includes('📦7') && progress >= 40 && progress <= 60;
        }), true, 'queue crates, total and progress follow server state');
        if (id === 'quanvat') {
          const beforeReady = await page.evaluate(() => {
            const job = Object.values(__farm.store.me.machines.quanvat)[0]; job.ready = true; job.completed = 1;
            return __farm.stations.byId('quanvat').rotors[0].o.position.y;
          });
          await page.waitForFunction(before => {
            const s = __farm.stations.byId('quanvat');
            return s.badge.visible && Math.abs(s.rotors[0].o.position.y - before) > 0.04;
          }, beforeReady);
          assert.equal(await page.evaluate(() => {
            const tag = __farm.stations.byId('quanvat').tag, r = tag.getBoundingClientRect();
            return tag.textContent.includes('Xong!') && r.top >= 0 && r.bottom < innerHeight - 210;
          }), true, 'ready label stays visible above the product');
          await page.screenshot({ path: `${out}/workshop-queue-ready-1280.png` });
        }
      }
      await page.evaluate(() => {
        const m = __farm.mill, recipe = Object.values(__farm.store.catalog.machines.coixay.recipes)[0];
        __farm.store.me.level = 50;
        __farm.store.me.machines.coixay = { [recipe.id]: { recipe: recipe.id, ready: false, processing: true, readyAt: Date.now() + 300000, currentReadyAt: Date.now() + 300000, cycleMs: 600000, queue: 7 } };
        m.state = 'working'; m.site.visible = false; m.groups.forEach(g => { g.visible = true; g.scale.setScalar(1); });
        __farm.camTarget.set(m.g.position.x, 0, m.g.position.z); __farm.setZoom(0.65);
      });
      await page.waitForFunction(() => __farm.mill.crates.filter(c => c.visible).length === 5);
      assert.equal(await page.evaluate(() => {
        const tag = [...document.querySelectorAll('#tags .tag')].find(el => el.textContent.includes('Đang xay'));
        return !!tag && tag.textContent.includes('📦7') && Number(tag.dataset.progress) >= 40 && Number(tag.dataset.progress) <= 60;
      }), true, 'mill queue and progress follow server state');
      await page.evaluate(() => { Object.values(__farm.store.me.machines.coixay)[0].ready = true; __farm.mill.state = 'done'; });
      const stoneBefore = await page.evaluate(() => __farm.mill.stone.rotation.y);
      await page.waitForFunction(before => Math.abs(__farm.mill.stone.rotation.y - before) > 0.04, stoneBefore);
      await page.screenshot({ path: `${out}/mill-queue-ready-1280.png` });
      await page.evaluate(() => { Object.values(__farm.store.me.machines.coixay)[0].ready = false; __farm.mill.state = 'collect'; __farm.mill.t = 0; });
      await page.waitForFunction(() => __farm.mill.state === 'working');
      assert.equal(await page.evaluate(() => __farm.mill.crates.filter(c => c.visible).length === 5), true, 'mill resumes after collecting one batch');
    }
    assert.deepEqual(errors, [], `${width}px browser errors`);
    console.log(`PASS 3D UI ${width}px`);
    await page.close();
  }
} finally { await browser.close(); await app.close(); }
