import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';
import { ANIMALS, BARN_UPGRADE_GOLD, DOG, EXPANSIONS, FESTIVAL, FISHING, FISH_STOCK_BY_LEVEL, GEM_PACKS, GOLD_MULT, GOODS, LAND_TAX_UNLOCK_LEVEL, LOTTERY, MACHINES, MACHINE_UPGRADE_GOLD, LUXURY, POND_LEVELS, POND_UPGRADE_GOLD, START_PLOTS, TAX_PER_PLOT, xpNeedFor } from '../server/src/game.js';

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
  const pondScene = page.locator('.pond-img img');
  await pondScene.evaluate((image) => image.decode());
  assert.equal(await pondScene.evaluate((image) => image.naturalWidth), 224);
  assert.ok((await pondScene.getAttribute('src')).includes('fishing_pond_v3-224.png'));
  const dockIcons = page.locator('.bottom-dock .dock-icon img');
  assert.equal(await dockIcons.count(), 5);
  for (const icon of await dockIcons.all()) await icon.evaluate((image) => image.decode());
  const dockArt = await dockIcons.evaluateAll((images) => images.map((image) => ({
    path: new URL(image.src).pathname.split('/').pop(), alt: image.alt,
    loaded: image.naturalWidth > 0, width: image.getBoundingClientRect().width,
    label: image.closest('button').querySelector('.dock-label').textContent,
  })));
  assert.deepEqual(dockArt.map((icon) => icon.path), ['dock-farm.svg', 'dock-harvest.svg', 'dock-shop.svg', 'dock-inventory.svg', 'dock-more.svg']);
  assert.ok(dockArt.every((icon) => icon.loaded && icon.alt === '' && icon.label && icon.width === 28),
    'Dock artwork must decode at the intended size while visible labels name each control');
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
  const headerTargets = await page.locator('.hud-right button:visible').evaluateAll((buttons) => buttons.map((button) => ({
    name: button.getAttribute('aria-label'),
    width: button.getBoundingClientRect().width,
    height: button.getBoundingClientRect().height,
  })));
  assert.ok(headerTargets.every((target) => target.height >= 44),
    `320px header controls need 44px tall targets: ${JSON.stringify(headerTargets)}`);
  assert.ok(headerTargets.filter((target) => target.name?.includes('âm thanh') || target.name?.includes('bản tin')).every((target) => target.width >= 44),
    `320px round header controls need 44px wide targets: ${JSON.stringify(headerTargets)}`);
  assert.equal(await page.locator('#btn-lb:visible').count(), 0,
    'narrow header should leave leaderboard access to the More menu');
  const headerOverflow = await page.locator('.hud-right').evaluate((element) => element.scrollWidth - element.clientWidth);
  assert.ok(headerOverflow <= 1, `starter header controls should fit at 320px: ${headerOverflow}px overflow`);
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
  const soundBefore = await audioButton.getAttribute('aria-pressed');
  const soundAfter = soundBefore === 'true' ? 'false' : 'true';
  await audioButton.click();
  assert.equal(await audioButton.getAttribute('aria-label'), audioNameBefore, 'Sound toggle must keep a stable accessible name');
  assert.equal(await audioButton.getAttribute('aria-pressed'), soundAfter);
  const expectedAudioIcon = soundAfter === 'true' ? 'menu-audio-on.svg' : 'menu-audio-off.svg';
  assert.ok((await audioButton.locator('img').getAttribute('src')).includes(expectedAudioIcon));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await audioButton.waitFor();
  assert.equal(await audioButton.getAttribute('aria-pressed'), soundAfter, 'Sound preference must survive reload');
  assert.equal(await audioButton.getAttribute('aria-label'), audioNameBefore);
  assert.ok((await audioButton.locator('img').getAttribute('src')).includes(expectedAudioIcon));
  const headerIcons = page.locator('.hud-round .hud-icon, .coin-pill--energy img');
  assert.equal(await headerIcons.count(), 5);
  for (const icon of await headerIcons.all()) await icon.evaluate((image) => image.decode());
  assert.ok((await headerIcons.evaluateAll((images) => images.map((image) => image.alt === '' && image.naturalWidth > 0))).every(Boolean));
  await page.screenshot({ path: resolve(outputDir, 'header-sound-state-320.png') });
  await page.locator('.dock-btn[data-sheet="more"]').click();
  assert.equal(await page.locator('.sheet .more-card[data-action="leaderboard"]').count(), 1,
    'leaderboard should remain available from More on narrow phones');
  await page.locator('.sheet .more-card[data-sheet="festival"]').click();
  assert.equal(await page.locator('.sheet--festival [data-festival-locked]:disabled').count(), 2,
    'starter festival should explain locked orders and processing');
  await page.keyboard.press('Escape');
  await page.locator('.dock-btn[data-sheet="more"]').click();
  await page.locator('.sheet .more-card[data-sheet="family"]').click();
  const familySearch = page.locator('.sheet--family .family-search');
  assert.equal(await familySearch.isVisible(), true, 'More should open a searchable family list on phones');
  await familySearch.fill('không có ai');
  assert.equal(await page.locator('.sheet--family .family-none').count(), 1);
  await familySearch.fill('');
  assert.ok(await page.locator('.sheet--family .family-member').count() >= 2,
    'clearing search should restore the player and friends');
  await auditAccessibility(page, 'family-320');
  await page.screenshot({ path: resolve(outputDir, 'family-320.png') });
  await page.keyboard.press('Escape');

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
  await page.evaluate(() => performance.clearResourceTimings());
  await page.locator('.plot[data-idx="0"][data-kind="empty"]').click();
  await page.locator('.sheet--seed img').evaluateAll(async (images) => {
    await Promise.all(images.filter((image) => image.loading !== 'lazy').map((image) => image.decode()));
  });
  const seedTransfer = await page.evaluate(() => {
    const sprites = performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/assets/crops-v3/') || entry.name.includes('/assets/art/trees/'));
    return {
      unlockedSeeds: document.querySelectorAll('.sheet--seed [data-seed-unlocked="1"]').length,
      futureSeeds: document.querySelectorAll('.sheet--seed [data-seed-unlocked="0"]').length,
      completedSpriteRequests: sprites.length,
      spriteTransferBytes: sprites.reduce((total, entry) => total + entry.transferSize, 0),
      largestSprites: [...sprites].sort((a, b) => b.transferSize - a.transferSize).slice(0, 5)
        .map((entry) => ({ path: new URL(entry.name).pathname, bytes: entry.transferSize })),
    };
  });
  writeFileSync(resolve(outputDir, 'seed-transfer-320.json'), `${JSON.stringify(seedTransfer, null, 2)}\n`);
  console.log(`320px seed chooser sample: ${JSON.stringify(seedTransfer)}`);
  assert.equal(seedTransfer.completedSpriteRequests, seedTransfer.unlockedSeeds,
    'a closed future-unlock section should not download its hidden sprites');
  assert.ok(seedTransfer.spriteTransferBytes <= 300_000,
    `starter seed sprites exceed 300 KB: ${seedTransfer.spriteTransferBytes}`);
  await auditAccessibility(page, 'seed-320');
  await page.locator('.seed-search-disclosure > summary').click();
  await page.locator('#seed-search').fill('ngo');
  assert.equal(await page.locator('.sheet--seed .seed-card:visible').count(), 2,
    'name search should include both Ngô and Bí ngô');
  assert.equal(await page.locator('.seed-card[data-seed-name="Ngô"]').isDisabled(), true);
  assert.equal(await page.locator('.seed-future').getAttribute('open'), '',
    'search should reveal a locked matching seed with its unlock level');
  const futureCorn = page.locator('.seed-card[data-seed-name="Ngô"] > img.seed-sprite');
  await futureCorn.scrollIntoViewIfNeeded();
  await futureCorn.evaluate((image) => image.decode());
  assert.ok(await futureCorn.evaluate((image) => image.naturalWidth > 0),
    'revealing a future seed should still load its deferred sprite');
  await page.locator('#seed-search').fill('ca rot');
  assert.equal(await page.locator('.sheet--seed .seed-card:visible').count(), 1,
    'seed search should ignore Vietnamese accents');
  await page.locator('[data-seed-sort="value"]').click();
  assert.equal(await page.locator('#seed-search').inputValue(), 'ca rot', 'seed search should survive sorting');
  await page.locator('#seed-search').fill('khong co giong');
  assert.equal(await page.locator('.seed-search-empty:visible').count(), 1);
  await page.locator('#seed-search').fill('');
  await page.locator('[data-seed-sort="time"]').click();
  const seedChoice = await page.locator('.seed-card[data-crop="luami"]').evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
    detailSize: Number.parseFloat(getComputedStyle(element.querySelector('.seed-meta')).fontSize),
    costSize: Number.parseFloat(getComputedStyle(element.querySelector('.seed-cost')).fontSize),
  }));
  assert.ok(seedChoice.width >= 130 && seedChoice.height >= 44, `320px seed choice is too small: ${JSON.stringify(seedChoice)}`);
  assert.ok(seedChoice.detailSize >= 11.5 && seedChoice.costSize >= 12,
    `320px seed cost or timing is too small: ${JSON.stringify(seedChoice)}`);
  const seedHeadingLayout = await page.locator('.seed-section-title').first().evaluate((heading) => ({
    headingTop: heading.getBoundingClientRect().top,
    sortBottom: Math.max(...[...document.querySelectorAll('.seed-sort button')].map((button) => button.getBoundingClientRect().bottom)),
  }));
  assert.ok(seedHeadingLayout.headingTop >= seedHeadingLayout.sortBottom,
    `seed section heading should not cover sort controls: ${JSON.stringify(seedHeadingLayout)}`);
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
  await page.locator('.float-gain').first().waitFor({ state: 'detached' });
  await auditAccessibility(page, 'inventory-320');
  await checkNoOverflow(page, '320px inventory controls');
  assert.equal(await page.locator('.inv-worth-card').count(), 2,
    'inventory value and total assets should have separate summaries');
  assert.match(await page.locator('.inv-worth-card').first().innerText(), /Giá trị kho/);
  assert.match(await page.locator('.inv-worth-card').last().innerText(), /Tổng tài sản/);
  const summaryCards = await page.locator('.inv-worth-card').evaluateAll((cards) => cards.map((card) => ({
    left: card.getBoundingClientRect().left, right: card.getBoundingClientRect().right,
    width: card.getBoundingClientRect().width,
  })));
  assert.ok(summaryCards[0].width >= 100 && summaryCards[0].right <= summaryCards[1].left,
    `320px inventory summaries should form readable side-by-side cards: ${JSON.stringify(summaryCards)}`);
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
  const decorationArt = [['vuonhoa', 'flower-garden'], ['denlong', 'garden-lantern'], ['daiphunnuoc', 'stone-fountain'], ['caugo', 'wooden-bridge'],
    ['xekeo', 'wooden-handcart'], ['tuongga', 'golden-rooster-statue'], ['hosen', 'lotus-pond'],
    ['conglang', 'village-gate'], ['gheda', 'stone-garden-bench'], ['bangten', 'farm-sign'],
    ['coixaygio', 'windmill_v3-224', 'scene-v3'], ['bunhin', 'scarecrow'],
    ['chuongbocau', 'garden-dovecote'], ['caythong', 'decorative-pine'], ['thuyen', 'wooden-rowboat'],
    ['laudaicat', 'sandcastle'], ['tuongbovang', 'golden-cow-statue'], ['vuonbonsai', 'bonsai-garden'],
    ['phaohoa', 'fireworks-display'], ['thapdongho', 'village-clock-tower'],
    ['tuongda', 'ancient-stone-statue'], ['biethu', 'garden-villa']];
  const petArt = [['petcho', 'companion-dog', 'pets-v3'], ['petmeo', 'companion-cat', 'pets-v3'],
    ['pettho', 'rabbit_v3', 'art'], ['petvet', 'companion-parrot', 'pets-v3'],
    ['petrua', 'golden-turtle', 'pets-v3'], ['petkylan', 'gentle-unicorn', 'pets-v3'], ['petrong', 'baby-dragon', 'pets-v3']];
  const ownedArt = [...decorationArt, ...petArt];
  assert.deepEqual(petArt.map(([id]) => id).sort(), Object.values(LUXURY).filter((item) => item.kind === 'pet').map((item) => item.id).sort(),
    'The gallery walkthrough must cover every catalog pet');
  assert.deepEqual(decorationArt.map(([id]) => id).sort(), Object.values(LUXURY).filter((item) => item.kind === 'decor').map((item) => item.id).sort(),
    'The gallery walkthrough must cover every catalog decoration');
  for (const [id] of ownedArt) db.prepare('INSERT INTO luxury (owner_id, item, at) VALUES (2, ?, ?)').run(id, Date.now());
  await friendPage.reload({ waitUntil: 'domcontentloaded' });
  await friendPage.locator('.lux-strip summary').waitFor();
  assert.equal(await friendPage.locator('details.lux-strip').getAttribute('open'), null);
  await friendPage.locator('.lux-strip summary').click();
  const gallerySize = await friendPage.locator('.lux-gallery').evaluate((gallery) => ({ height: gallery.getBoundingClientRect().height, viewport: gallery.clientHeight, content: gallery.scrollHeight }));
  assert.ok(gallerySize.height <= 310 && gallerySize.content > gallerySize.viewport,
    'A complete collection should scroll inside a bounded gallery');
  await friendPage.keyboard.press('Tab');
  assert.equal(await friendPage.locator('.lux-gallery').evaluate((gallery) => gallery === document.activeElement), true);
  await friendPage.locator('.lux-gallery').evaluate((gallery) => { gallery.scrollTop = 0; });
  await friendPage.keyboard.press('ArrowDown');
  await friendPage.waitForFunction(() => document.querySelector('.lux-gallery')?.scrollTop > 0);
  for (const [id, file, folder = 'decor-v3'] of ownedArt) {
    const art = friendPage.locator(`[data-decor="${id}"] img[src*="${folder}/${file}.png"]`);
    await art.scrollIntoViewIfNeeded();
    await art.evaluate((img) => img.decode());
    assert.ok(await art.evaluate((img) => img.naturalWidth > 0));
  }
  await checkNoOverflow(friendPage, '390px owned decoration gallery');
  const beforeCountdownTick = await friendPage.locator('.plot--growing .plot-timer').first().innerText();
  await friendPage.waitForFunction((before) => document.querySelector('.plot--growing .plot-timer')?.textContent !== before, beforeCountdownTick);
  const growingCountdown = await friendPage.locator('.plot--growing').first().evaluate((plot) => ({ label: plot.getAttribute('aria-label'), timer: plot.querySelector('.plot-timer').textContent }));
  assert.ok(growingCountdown.label.includes(growingCountdown.timer),
    'A growing plot accessible name must follow its visible countdown');
  await auditAccessibility(friendPage, 'decoration-gallery-390');
  await friendPage.locator('.lux-strip').scrollIntoViewIfNeeded();
  await friendPage.screenshot({ path: resolve(outputDir, 'decoration-gallery-owner-390.png') });
  await friendPage.screenshot({ path: resolve(outputDir, 'owned-pets-390.png') });
  await friendPage.locator('.lux-strip summary').click();
  await friendPage.locator('[data-sheet="more"]').first().click();
  await friendPage.locator('[data-sheet="luxury"]').click();
  await friendPage.locator('[data-lux-view="owned"]').click();
  for (const [id, file, folder = 'decor-v3'] of ownedArt) {
    const art = friendPage.locator(`[data-lux-item="${id}"] img[src*="${folder}/${file}.png"]`);
    await art.scrollIntoViewIfNeeded();
    await art.evaluate((img) => img.decode());
  }
  await checkNoOverflow(friendPage, '390px owned decoration shop');
  await auditAccessibility(friendPage, 'decoration-shop-390');
  await friendPage.screenshot({ path: resolve(outputDir, 'decoration-shop-390.png') });
  await friendPage.locator('.sheet [data-close]').first().click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="more"]').click();
  await page.locator('.sheet .more-card[data-sheet="family"]').click();
  await page.locator('.sheet--family .family-search').fill('Friend');
  await page.locator('.sheet--family .family-member[data-visit="2"]').click();
  await page.locator('.visit-bar').waitFor();
  assert.equal(await page.locator('.visit-bar .hud-decor').innerText(), `${ownedArt.length} món trưng bày`);
  await page.locator('.lux-strip summary').focus();
  await page.keyboard.press('Enter');
  assert.notEqual(await page.locator('details.lux-strip').getAttribute('open'), null);
  assert.equal(await page.locator('.lux-gallery [data-decor]').count(), ownedArt.length);
  for (const [id] of ownedArt) {
    const art = page.locator(`[data-decor="${id}"] img`);
    await art.scrollIntoViewIfNeeded();
    await art.evaluate((img) => img.decode());
  }
  await checkNoOverflow(page, '320px visitor decoration gallery');
  await page.locator('.lux-strip').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'decoration-gallery-visitor-320.png') });
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
  assert.notEqual(await page.locator('details.lux-strip').getAttribute('open'), null, 'Decoration gallery should stay open after watering refresh');
  assert.equal(db.prepare('SELECT watered FROM plots WHERE owner_id = 2 AND idx = 0').get().watered, 1);
  await friendPage.reload({ waitUntil: 'domcontentloaded' });
  await friendPage.locator('.plot[data-idx="0"][data-kind="harvest"]').waitFor();
  await friendPage.screenshot({ path: resolve(outputDir, 'friend-helped-390.png') });

  const beforeGift = db.prepare('SELECT user_id, gold FROM farmers WHERE user_id IN (1, 2) ORDER BY user_id').all();
  await page.locator('#btn-gold-give').click();
  assert.match(await page.locator('.sheet--gift').innerText(), /Friend Farmer/);
  assert.equal(await page.locator('#btn-gift-send').isDisabled(), true);
  for (const invalid of ['0', '-1', '1.5', String(beforeGift[0].gold + 1)]) {
    await page.locator('#gift-amount').fill(invalid);
    assert.equal(await page.locator('#btn-gift-send').isDisabled(), true, `Gift ${invalid} must be blocked`);
  }
  assert.match(await page.locator('#gift-preview').innerText(), /Thiếu 1 vàng/);
  await page.locator('#gift-amount').fill('10');
  assert.match(await page.locator('#gift-preview').innerText(), /Friend Farmer nhận 10 vàng/);
  await checkNoOverflow(page, '320px gold gift preview');
  await auditAccessibility(page, 'gold-gift-320');
  await page.screenshot({ path: resolve(outputDir, 'gold-gift-preview-320.png') });
  await page.locator('.sheet--gift [data-close]').last().click();
  assert.deepEqual(db.prepare('SELECT user_id, gold FROM farmers WHERE user_id IN (1, 2) ORDER BY user_id').all(), beforeGift,
    'Cancelling a gift must preserve both balances');
  await page.locator('#btn-gold-give').click();
  await page.locator('#gift-amount').fill('10');
  await page.locator('#btn-gift-send').click();
  await page.waitForFunction((expected) => document.querySelector('.coin-pill b')?.textContent.replaceAll('.', '') === String(expected), beforeGift[0].gold - 10);
  const afterGift = db.prepare('SELECT user_id, gold FROM farmers WHERE user_id IN (1, 2) ORDER BY user_id').all();
  assert.equal(afterGift[0].gold, beforeGift[0].gold - 10);
  assert.equal(afterGift[1].gold, beforeGift[1].gold + 10);
  await friendPage.reload({ waitUntil: 'domcontentloaded' });
  assert.match(await friendPage.locator('.coin-pill').first().innerText(), new RegExp(String(afterGift[1].gold)));

  await page.locator('#btn-gold-ask').click();
  assert.equal(await page.locator('#btn-gift-send').isDisabled(), true);
  await page.locator('#gift-amount').fill('1.5');
  assert.equal(await page.locator('#btn-gift-send').isDisabled(), true);
  await page.locator('#gift-amount').fill(String(afterGift[0].gold + 1));
  assert.equal(await page.locator('#btn-gift-send').isDisabled(), false, 'Requesting gold does not spend the requester balance');
  await page.locator('#gift-amount').fill('7');
  await page.locator('#gift-note').fill('Mua hạt giống');
  assert.equal(await page.locator('#gift-note').getAttribute('maxlength'), '80');
  assert.match(await page.locator('#gift-preview').innerText(), /chưa chuyển vàng/);
  await checkNoOverflow(page, '320px gold request');
  await auditAccessibility(page, 'gold-request-320');
  await page.screenshot({ path: resolve(outputDir, 'gold-request-320.png') });
  await page.locator('.sheet--gift [data-close]').last().click();
  assert.equal(db.prepare('SELECT COUNT(*) n FROM gold_requests').get().n, 0, 'Cancelling creates no request');
  await page.locator('#btn-gold-ask').click();
  await page.locator('#gift-amount').fill('7');
  await page.locator('#gift-note').fill('Mua hạt giống');
  await page.locator('#btn-gift-send').click();
  await page.locator('.sheet--gift').waitFor({ state: 'hidden' });
  const goldRequest = db.prepare('SELECT * FROM gold_requests WHERE from_id = 1 AND to_id = 2').get();
  assert.equal(goldRequest.amount, 7);
  assert.equal(goldRequest.note, 'Mua hạt giống');
  assert.equal(goldRequest.status, 'open');
  assert.deepEqual(db.prepare('SELECT user_id, gold FROM farmers WHERE user_id IN (1, 2) ORDER BY user_id').all(), afterGift,
    'Sending a request must not move gold');
  await page.locator('#btn-gold-ask').click();
  await page.locator('#gift-amount').fill(String(afterGift[1].gold + 1));
  await page.locator('#btn-gift-send').click();
  await page.locator('.sheet--gift').waitFor({ state: 'hidden' });
  const unaffordableRequest = db.prepare('SELECT id FROM gold_requests WHERE amount = ? AND from_id = 1').get(afterGift[1].gold + 1);
  await friendPage.locator('[data-sheet="more"]').first().click();
  await friendPage.locator('[data-sheet="money"]').click();
  await friendPage.locator(`[data-gr-id="${goldRequest.id}"][data-gr-act="pay"]`).waitFor();
  assert.match(await friendPage.locator('.sheet').innerText(), /Mua hạt giống/);
  const expensiveCard = friendPage.locator(`[data-gold-request="${unaffordableRequest.id}"]`);
  assert.match(await expensiveCard.innerText(), /Thiếu 1 vàng/);
  assert.equal(await expensiveCard.locator('[data-gr-act="pay"]').isDisabled(), true);
  await checkNoOverflow(friendPage, '390px request inbox');
  await auditAccessibility(friendPage, 'gold-inbox-390');
  await friendPage.screenshot({ path: resolve(outputDir, 'gold-request-inbox-390.png') });
  await expensiveCard.locator('[data-gr-act="decline"]').click();
  await expensiveCard.waitFor({ state: 'hidden' });
  assert.equal(db.prepare('SELECT status FROM gold_requests WHERE id = ?').get(unaffordableRequest.id).status, 'declined');
  assert.deepEqual(db.prepare('SELECT user_id, gold FROM farmers WHERE user_id IN (1, 2) ORDER BY user_id').all(), afterGift,
    'Declining a request must not move gold');
  friendPage.once('dialog', (dialog) => dialog.dismiss());
  await friendPage.locator(`[data-gr-id="${goldRequest.id}"][data-gr-act="pay"]`).click();
  assert.equal(db.prepare('SELECT status FROM gold_requests WHERE id = ?').get(goldRequest.id).status, 'open');
  assert.deepEqual(db.prepare('SELECT user_id, gold FROM farmers WHERE user_id IN (1, 2) ORDER BY user_id').all(), afterGift,
    'Cancelling payment confirmation must not move gold');
  let paymentConfirmation;
  friendPage.once('dialog', (dialog) => { paymentConfirmation = dialog.message(); return dialog.accept(); });
  await friendPage.locator(`[data-gr-id="${goldRequest.id}"][data-gr-act="pay"]`).click();
  await friendPage.locator(`[data-gr-id="${goldRequest.id}"][data-gr-act="pay"]`).waitFor({ state: 'hidden' });
  assert.equal(db.prepare('SELECT status FROM gold_requests WHERE id = ?').get(goldRequest.id).status, 'paid');
  assert.match(paymentConfirmation, /Cho Browser Farmer 7 vàng/);
  const afterRequest = db.prepare('SELECT user_id, gold FROM farmers WHERE user_id IN (1, 2) ORDER BY user_id').all();
  assert.equal(afterRequest[0].gold, afterGift[0].gold + 7);
  assert.equal(afterRequest[1].gold, afterGift[1].gold - 7);
  await friendPage.locator('.sheet [data-close]').first().click();

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
  await page.locator('#want-search').fill('lua mi');
  assert.equal(await page.locator('#want-item').inputValue(), 'luami', 'unaccented item search should select wheat');
  assert.equal(await page.locator('#want-item option').evaluateAll((options) => options.filter((option) => !option.hidden).length), 1);
  await page.locator('#want-qty').fill('1.5');
  assert.equal(await page.locator('#btn-want-create').isDisabled(), true);
  assert.match(await page.locator('#want-preview').innerText(), /số lượng nguyên/);
  await page.locator('#want-qty').fill('999');
  assert.equal(await page.locator('#btn-want-create').isDisabled(), true);
  assert.match(await page.locator('#want-preview').innerText(), /Thiếu .* vàng/);
  await page.locator('#want-search').fill('no-such-product');
  assert.equal(await page.locator('#want-item').isDisabled(), true);
  assert.equal(await page.locator('#btn-want-create').isDisabled(), true);
  await page.locator('#want-search').fill('lua mi');
  await page.locator('#want-qty').fill('1');
  assert.equal(await page.locator('#btn-want-create').isEnabled(), true);
  await checkNoOverflow(page, '320px filtered trade catalog');
  await page.screenshot({ path: resolve(outputDir, 'market-catalog-search-320.png') });
  await page.locator('#want-search').fill('');
  await page.locator('#want-item').selectOption('luami');
  await page.locator('#want-qty').fill('1');
  await page.locator('#btn-want-create').click();
  await page.locator('[data-want-cancel]').waitFor();
  const want = db.prepare("SELECT id, price FROM wants WHERE owner_id = 1 AND item = 'luami'").get();
  assert.ok(want);
  assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, afterRequest[0].gold - want.price);
  await page.screenshot({ path: resolve(outputDir, 'trade-buyer-320.png') });

  await friendPage.locator('[data-sheet="more"]').first().click();
  await friendPage.locator('[data-sheet="market"]').click();
  await friendPage.locator('[data-want-view="available"]').click();
  assert.equal(await friendPage.locator('[data-want-view="available"]').getAttribute('aria-pressed'), 'true');
  await friendPage.locator('#want-board-search').fill('no-such-buyer');
  assert.equal(await friendPage.locator('[data-want]:visible').count(), 0);
  assert.equal(await friendPage.locator('#want-board-empty').isVisible(), true);
  await friendPage.locator('#want-board-search').fill('lua mi');
  assert.equal(await friendPage.locator('[data-want]:visible').count(), 1);
  const tradeQuantity = friendPage.locator(`[data-want="${want.id}"] .qty-input`);
  await tradeQuantity.fill('1.5');
  assert.equal(await friendPage.locator(`[data-want="${want.id}"] [data-want-fill]`).isDisabled(), true);
  await friendPage.locator(`[data-want="${want.id}"] [data-qstep="-1"]`).click();
  assert.equal(await tradeQuantity.inputValue(), '1');
  assert.match(await friendPage.locator(`[data-want="${want.id}"] [data-want-fill]`).innerText(), new RegExp(`Bán 1 · \\+${want.price} vàng`));
  await checkNoOverflow(friendPage, '390px seller trade preview');
  assert.ok(await friendPage.locator(`[data-want="${want.id}"] .seed-info`).evaluate((details) => details.getBoundingClientRect().width >= 180),
    'buyer and item details need readable width above sale controls');
  await auditAccessibility(friendPage, 'market-seller-390');
  await friendPage.locator(`[data-want="${want.id}"]`).scrollIntoViewIfNeeded();
  await friendPage.screenshot({ path: resolve(outputDir, 'trade-sale-preview-390.png') });
  await friendPage.locator(`[data-want="${want.id}"] [data-want-fill]`).click();
  await friendPage.locator(`[data-want="${want.id}"]`).waitFor({ state: 'detached' });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM wants WHERE id = ?').get(want.id).n, 0);
  assert.equal(db.prepare("SELECT qty FROM inventory WHERE owner_id = 2 AND item = 'luami'").get().qty, friendWheatBeforeTrade - 1);
  assert.equal(db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'luami'").get().qty, 1);
  assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 2').get().gold, afterRequest[1].gold + want.price);
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

  const barnGoldBefore = db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
  const barnFeedBefore = db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'thucan'").get()?.qty || 0;
  db.prepare('UPDATE farmers SET gold = 400 WHERE user_id = 1').run();
  db.prepare("DELETE FROM inventory WHERE owner_id = 1 AND item = 'thucan'").run();
  const hungryQuails = [1, 2].map(() => Number(db.prepare("INSERT INTO animals (owner_id, kind, ready_at) VALUES (1, 'cut', NULL)").run().lastInsertRowid));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="barns"]').click();
  const hungryBarnFilter = page.locator('[data-barn-filter="hungry"]');
  assert.match(await hungryBarnFilter.innerText(), /Cần thức ăn \(1\)/);
  await hungryBarnFilter.click();
  assert.equal(await page.locator('.barn-card:visible').count(), 1);
  assert.match(await page.locator('.barn-card:visible .barn-hunger').innerText(), /2 con đói · cần 2 túi/);
  assert.equal(await hungryBarnFilter.getAttribute('aria-pressed'), 'true');
  assert.equal(await hungryBarnFilter.evaluate((button) => getComputedStyle(button).backgroundColor), 'rgb(53, 101, 46)',
    'the selected barn filter must have its visible green treatment');
  assert.equal(await hungryBarnFilter.evaluate((button) => button === document.activeElement), true);
  assert.match(await page.locator('.barn-card:visible [data-count="max"]').innerText(), /1 con · 350 vàng/);
  await checkNoOverflow(page, '320px hungry barn overview');
  await auditAccessibility(page, 'barns-320');
  await page.screenshot({ path: resolve(outputDir, 'barns-hungry-320.png') });
  await page.locator('[data-barn="cut"]').click();
  assert.match(await page.locator('.barn-feed-help').innerText(), /Thiếu 2 túi/);
  const maxQuails = page.locator('[data-buy-animal="cut"][data-count="max"]');
  assert.match(await maxQuails.innerText(), /1 con · 350 vàng/);
  assert.equal(await page.locator('[data-feed-kind="cut"]').isDisabled(), true);
  await checkNoOverflow(page, '320px hungry barn');
  await auditAccessibility(page, 'barn-320');
  await page.locator('.barn-feed-help').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'barn-feed-help-320.png') });
  await page.locator('.barn-feed-help [data-sheet="shop"]').click();
  assert.equal(await page.locator('[data-shop-category="supplies"]').getAttribute('aria-pressed'), 'true');
  assert.deepEqual(await page.locator('[data-shop-section]:visible').evaluateAll((sections) => sections.map((section) => section.dataset.shopSection)), ['supplies']);
  assert.equal(await page.locator('[data-buy="thucan"]').count(), 3, 'feed shortcut should open feed purchase controls');
  const hundredFeed = page.locator('[data-buy="thucan"][data-qty="100"]');
  assert.match(await hundredFeed.innerText(), /100 túi\s+1\.200 vàng/);
  assert.equal(await hundredFeed.isDisabled(), true, 'unaffordable feed packs should be disabled');
  assert.equal(await page.locator('[data-buy="thucan"][data-qty="1"]').isEnabled(), true);
  await page.locator('[data-shop-category="animals"]').click();
  assert.match(await page.locator('.inv-row').filter({ has: page.locator('[data-buy-animal="ga"]') }).innerText(), /chuồng 0\/3/,
    'the chicken count must exclude the two quails');
  await page.locator('[data-shop-category="supplies"]').click();
  await checkNoOverflow(page, '320px shop purchase prices');
  await auditAccessibility(page, 'shop-320');
  await hundredFeed.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'shop-prices-320.png') });
  const feedRoundTripResponse = page.waitForResponse((response) => response.url().endsWith('/farm/api/buy') && response.request().method() === 'POST');
  await page.locator('[data-buy="thucan"][data-qty="10"]').click();
  assert.equal((await feedRoundTripResponse).status(), 200);
  assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, 400 - GOODS.thucan.buy * 10);
  assert.equal(db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'thucan'").get().qty, 8,
    'Buying feed should automatically feed both hungry quails');
  await page.locator('[data-shop-section="supplies"] [data-barn="cut"]').waitFor();
  await page.locator('[data-shop-section="supplies"] [data-barn="cut"]').click();
  assert.equal(await page.locator('[data-feed-kind="cut"]').count(), 0);
  assert.equal(await page.locator('.barn-feed-help').count(), 0);
  assert.equal(db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'thucan'").get().qty, 8);
  assert.ok(hungryQuails.every((id) => db.prepare('SELECT ready_at FROM animals WHERE id = ?').get(id).ready_at > Date.now()));
  await checkNoOverflow(page, '320px barn feed round trip');
  await page.screenshot({ path: resolve(outputDir, 'barn-fed-roundtrip-320.png') });
  await page.keyboard.press('Escape');
  for (const id of hungryQuails) db.prepare('DELETE FROM animals WHERE id = ?').run(id);
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(barnGoldBefore);
  db.prepare("DELETE FROM inventory WHERE owner_id = 1 AND item = 'thucan'").run();
  if (barnFeedBefore) db.prepare("INSERT INTO inventory (owner_id, item, qty) VALUES (1, 'thucan', ?)").run(barnFeedBefore);

  const levelTwentyXp = Array.from({ length: 19 }, (_, index) => xpNeedFor(index + 1)).reduce((sum, xp) => sum + xp, 0);
  db.prepare('UPDATE farmers SET xp = ? WHERE user_id = 1').run(levelTwentyXp);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.plot').first().waitFor();
  const sceneTargets = await page.locator('.scene-banner .sb-btn').evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return { name: button.className, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
  }));
  assert.ok(sceneTargets.every((target) => target.width >= 44 && target.height >= 44),
    `active scene shortcuts need 44px mobile targets: ${JSON.stringify(sceneTargets)}`);
  const cowTarget = sceneTargets.find((target) => target.name.includes('sb-cowbarn'));
  const sheepTarget = sceneTargets.find((target) => target.name.includes('sb-sheep'));
  assert.ok(cowTarget && sheepTarget && cowTarget.right <= sheepTarget.left,
    `cow and sheep shortcuts should stay separate at 320px: ${JSON.stringify(sceneTargets)}`);
  await checkNoOverflow(page, '320px animal scene shortcuts');
  await page.screenshot({ path: resolve(outputDir, 'animal-scene-shortcuts-320.png') });
  await page.locator('.scene-banner .sb-cowbarn').click();
  assert.match(await page.locator('.sheet').innerText(), /Chuồng Bò/,
    'tapping the cow in the scene should open its barn');
  await page.keyboard.press('Escape');
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
  const goldBeforeSeedReview = db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
  db.prepare('UPDATE farmers SET gold = 50 WHERE user_id = 1').run();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.plot[data-kind="empty"]').first().click();
  await page.locator('[data-seed-sort="value"]').click();
  const seedAvailability = await page.locator('.sheet--seed [data-seed-section]').first().locator('.seed-card').evaluateAll((cards) => cards.map((card) => card.disabled));
  const firstUnavailableSeed = seedAvailability.indexOf(true);
  assert.ok(firstUnavailableSeed > 0 && seedAvailability.slice(firstUnavailableSeed).every(Boolean),
    'affordable seeds should precede unaffordable seeds within the selected sort');
  assert.ok(await page.locator('.seed-unaffordable').count() > 0, 'unaffordable choices should explain the missing gold');
  await page.locator('#seed-search').fill('ca phe');
  assert.equal(await page.locator('.sheet--seed .seed-card:visible').count(), 1);
  assert.equal(await page.locator('.seed-card[data-seed-name="Cà phê"]').isDisabled(), true);
  await checkNoOverflow(page, '320px seed finder');
  await auditAccessibility(page, 'seed-finder-320');
  await page.locator('.seed-card[data-seed-name="Cà phê"]').scrollIntoViewIfNeeded();
  await page.locator('.seed-card[data-seed-name="Cà phê"] > img.seed-sprite').evaluate((image) => image.decode());
  await page.screenshot({ path: resolve(outputDir, 'seed-finder-320.png') });
  await page.locator('#seed-search').fill('');
  await page.locator('[data-seed-sort="time"]').click();
  await page.keyboard.press('Escape');
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(goldBeforeSeedReview);
  const goldBeforePond = db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
  db.prepare('UPDATE farmers SET gold = 350 WHERE user_id = 1').run();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="more"]').click();
  await page.locator('.more-card[data-sheet="fishing"]').click();
  assert.equal(await page.locator('label[for="fish-species"]').isVisible(), true);
  assert.equal(await page.locator('label[for="fish-qty"]').isVisible(), true);
  await page.locator('#fish-species').selectOption('luon');
  const pondDetail = page.locator('#fish-species-detail');
  assert.match(await pondDetail.innerText(), /Lươn/);
  assert.match(await pondDetail.innerText(), /150 vàng/);
  const pondDetailImage = pondDetail.locator('img[src*="farm-eel.png"]');
  await pondDetailImage.evaluate((image) => image.decode());
  assert.equal(await pondDetailImage.evaluate((image) => image.naturalWidth), 128);
  await pondDetail.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'pond-species-320.png') });
  const pondControls = await page.locator('.fish-stock-form select, .fish-stock-form input, .fish-stock-form button').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
  assert.ok(pondControls.every((height) => height >= 44), 'pond stocking controls need 44px touch targets');
  await page.locator('#fish-qty').fill('10');
  assert.match(await page.locator('#fish-preview').innerText(), /Bạn chọn 10 con.*Sẽ thả 2 con Lươn, tốn 300/);
  assert.match(await page.locator('#btn-fish-stock-max').innerText(), /Thả tối đa \(2\)/);
  await checkNoOverflow(page, '320px pond stocking');
  await auditAccessibility(page, 'fishing-320');
  await page.locator('#fish-preview').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'fishing-stock-320.png') });
  const pondStockResponse = page.waitForResponse((response) => response.url().endsWith('/farm/api/fish-stock') && response.request().method() === 'POST');
  await page.locator('#btn-fish-stock').click();
  assert.equal((await pondStockResponse).status(), 200);
  assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, 50);
  const stockedBatch = db.prepare("SELECT id, qty FROM fish_batches WHERE owner_id = 1 AND species = 'luon' ORDER BY id DESC LIMIT 1").get();
  assert.equal(stockedBatch.qty, 2, 'stocking should match the capped preview');
  db.prepare('DELETE FROM fish_batches WHERE id = ?').run(stockedBatch.id);
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(goldBeforePond);
  const energyBeforeReview = db.prepare('SELECT energy, gems FROM farmers WHERE user_id = 1').get();
  db.prepare('UPDATE farmers SET energy = 0, gems = 0, energy_at = ? WHERE user_id = 1').run(Date.now());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('.more-card[data-sheet="fishing"]').click();
  assert.equal(await page.locator('#btn-fish').isDisabled(), true);
  assert.equal(await page.locator('#btn-buy-energy').isDisabled(), true);
  assert.match(await page.locator('.fishing-energy').innerText(), /mỗi 1 phút.*đủ một lượt/);
  assert.match(await page.locator('.fishing-energy-purchase').innerText(), /Thiếu 10 kim cương/);
  await checkNoOverflow(page, '320px empty fishing energy');
  await page.screenshot({ path: resolve(outputDir, 'fishing-energy-empty-320.png') });
  db.prepare('UPDATE farmers SET energy = 115, gems = 10, energy_at = ? WHERE user_id = 1').run(Date.now());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('.more-card[data-sheet="fishing"]').click();
  assert.match(await page.locator('#btn-buy-energy').innerText(), /Mua 5 năng lượng/);
  const cappedEnergyResponse = page.waitForResponse((response) => response.url().endsWith('/farm/api/buy-energy') && response.request().method() === 'POST');
  await page.locator('#btn-buy-energy').click();
  assert.equal((await cappedEnergyResponse).status(), 200);
  await page.locator('#btn-buy-energy:disabled').waitFor();
  assert.match(await page.locator('.fishing-energy-purchase').innerText(), /Đã đạt giới hạn mua 120/);
  assert.deepEqual(db.prepare('SELECT energy, gems FROM farmers WHERE user_id = 1').get(), { energy: 120, gems: 0 });
  db.prepare('UPDATE farmers SET energy = ?, gems = ?, energy_at = ? WHERE user_id = 1')
    .run(energyBeforeReview.energy, energyBeforeReview.gems, Date.now());
  db.prepare("INSERT INTO inventory (owner_id, item, qty) VALUES (1, 'luami', 8) ON CONFLICT(owner_id, item) DO UPDATE SET qty = 8").run();
  await page.reload({ waitUntil: 'domcontentloaded' });
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
  const factorySearch = page.locator('#factory-search');
  await factorySearch.fill('ca kho tieu');
  assert.equal(await page.locator('.sheet--factory .mc-row:visible').count(), 1,
    'accent-tolerant recipe search should isolate pepper-braised fish');
  assert.equal(await page.locator('.sheet--factory .mc-row[data-recipe-output="cakho"]:visible').count(), 1);
  await page.locator('[data-factory-view="active"]').click();
  assert.equal(await factorySearch.inputValue(), 'ca kho tieu',
    'recipe search should survive factory status changes');
  await page.locator('[data-factory-view="all"]').click();
  assert.equal(await page.locator('.sheet--factory .mc-row[data-recipe-output="cakho"]:visible').count(), 1);
  await factorySearch.fill('no such recipe');
  assert.equal(await page.locator('.sheet--factory .mc-search-empty:visible').count(), 1,
    'unmatched recipe search should explain how to recover');
  await factorySearch.fill('bot mi');
  assert.ok(await page.locator('.sheet--factory .mc-row:visible').count() > 0,
    'ingredient search should ignore Vietnamese accents');
  await factorySearch.fill('');
  assert.equal(await page.locator('.sheet--factory .mc-row:visible').count(), allRecipes,
    'clearing search should restore every unlocked recipe');
  assert.match(await page.locator('.mc-bulk-note').innerText(), /Nguyên liệu dùng ngay.*không hủy được/,
    'bulk production should explain its irreversible ingredient use');
  const bulkWheatBefore = db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'luami'").get().qty;
  const bulkJobsBefore = db.prepare('SELECT COUNT(*) AS n FROM machine_jobs WHERE owner_id = 1').get().n;
  let bulkConfirmation = '';
  page.once('dialog', async (dialog) => { bulkConfirmation = dialog.message(); await dialog.dismiss(); });
  await page.locator('#btn-cook-all').click();
  assert.match(bulkConfirmation, /Xếp tối đa mọi công thức.*không thể hủy/);
  assert.equal(db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'luami'").get().qty, bulkWheatBefore,
    'canceling bulk production should leave ingredients untouched');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM machine_jobs WHERE owner_id = 1').get().n, bulkJobsBefore,
    'canceling bulk production should queue no jobs');
  for (const product of ['grilled-fish', 'butter', 'carrot-cake', 'apple-pie', 'farm-pizza', 'strawberry-cake', 'honey-cake', 'buttered-corn', 'fried-rice-cakes', 'fried-fish-balls']) {
    await page.waitForFunction((name) => {
      const image = document.querySelector(`.sheet img[src*="products-v3/${name}.png"]`);
      return image?.complete && image.naturalWidth > 0;
    }, product);
  }
  const recipeMeta = page.locator('.machine-grid .mc-recipe-meta').first();
  assert.equal(await recipeMeta.locator('span').count(), 2, 'factory recipes should separate ingredients and rewards');
  assert.match(await recipeMeta.locator('span').first().innerText(), /^Cần:/);
  const recipeWidths = await recipeMeta.evaluate((element) => ({
    details: element.getBoundingClientRect().width,
    card: element.closest('.mc-row').getBoundingClientRect().width,
  }));
  assert.ok(recipeWidths.details >= recipeWidths.card - 28,
    `factory ingredients should use the full card width: ${JSON.stringify(recipeWidths)}`);
  const recipeMetaSize = await recipeMeta.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  assert.ok(recipeMetaSize >= 12, `factory recipe details should be readable at 320px: ${recipeMetaSize}px`);
  await checkNoOverflow(page, '320px new factory goods');
  await page.screenshot({ path: resolve(outputDir, 'factory-goods-320.png') });
  await page.locator('.machine-block').filter({ has: page.locator('img[src*="machines-v3/bakery-oven.png"]') }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'bakery-goods-320.png') });
  await page.locator('.machine-block').filter({ has: page.locator('img[src*="machines-v3/snack-stall.png"]') }).scrollIntoViewIfNeeded();
  for (const machine of [MACHINES.bepan, MACHINES.quanvat]) {
    for (const recipe of Object.values(machine.recipes)) {
      const product = Object.keys(recipe.out)[0];
      const icon = page.locator(`.mc-row[data-recipe-output="${product}"] > img.seed-sprite`);
      assert.equal(await icon.count(), 1, `${product} needs its own product sprite`);
      await icon.evaluate((image) => image.decode());
      assert.equal(await icon.evaluate((image) => image.naturalWidth), 128, `${product} should use the compact game export`);
    }
  }
  for (const recipe of Object.values(MACHINES.lonuong.recipes)) {
    const product = Object.keys(recipe.out)[0];
    const icon = page.locator(`.mc-row[data-recipe-output="${product}"] > img.seed-sprite`);
    assert.equal(await icon.count(), 1, `${product} needs an individual fish-oven sprite`);
    await icon.evaluate((image) => image.decode());
  }
  await page.screenshot({ path: resolve(outputDir, 'snack-goods-320.png') });
  for (const product of ['banhtrangtron', 'nemchua', 'trasa']) {
    await page.locator(`.mc-row[data-recipe-output="${product}"]`).scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(outputDir, `snack-${product}-320.png`) });
  }
  for (const product of ['xucxich', 'banhxeo', 'cocdam']) {
    await page.locator(`.mc-row[data-recipe-output="${product}"]`).scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(outputDir, `kitchen-${product}-320.png`) });
  }
  await page.locator('.mc-row[data-recipe-output="lauech"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'factory-frog-hotpot-320.png') });
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
  db.prepare('UPDATE farmers SET orders_refresh_at = ?, next_order_at = ? WHERE user_id = 1')
    .run(Date.now() + 60 * 60 * 1000, Date.now() + 60 * 60 * 1000);
  db.prepare("DELETE FROM inventory WHERE owner_id = 1 AND item = 'toi'").run();
  db.prepare('INSERT INTO orders (owner_id, slot, items_json, gold, exp, stars) VALUES (1, 0, ?, 100, 10, 1)')
    .run(JSON.stringify({ toi: 1 }));
  db.prepare("DELETE FROM collection_discoveries WHERE owner_id = 1 AND item = 'ngo'").run();
  db.prepare('INSERT INTO animals (owner_id, kind, ready_at) VALUES (1, ?, ?)').run('ga', Date.now() - 1000);
  db.prepare('INSERT INTO machine_jobs (owner_id, kind, recipe, ready_at) VALUES (1, ?, ?, ?)').run('coixay', 'botmi', Date.now() - 1000);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.farm-next-step').waitFor();
  assert.equal(await page.locator('.farm-next-step').getAttribute('data-next-step'), 'mill',
    `finished production should take priority: ${await page.locator('.farm-next-step').innerText()}`);
  await page.locator('.farm-next-step[data-next-step="mill"]').click();
  assert.equal(await page.locator('.sheet--factory #btn-collect-all').count(), 1,
    'factory next action should open the collection controls');
  await page.keyboard.press('Escape');
  db.prepare('DELETE FROM machine_jobs WHERE owner_id = 1').run();
  db.prepare('UPDATE animals SET ready_at = NULL WHERE owner_id = 1').run();
  db.prepare("DELETE FROM inventory WHERE owner_id = 1 AND item = 'thucan'").run();
  const pondQty = (item) => db.prepare('SELECT qty FROM inventory WHERE owner_id = 1 AND item = ?').get(item)?.qty || 0;
  const snailsBefore = pondQty('oc');
  const shrimpBefore = pondQty('tom');
  const insertPondBatch = db.prepare('INSERT INTO fish_batches (owner_id, species, qty, planted_at, ready_at) VALUES (1, ?, ?, ?, ?)');
  insertPondBatch.run('oc', 3, Date.now() - 2000, Date.now() - 1000);
  insertPondBatch.run('tom', 5, Date.now() - 2000, Date.now() - 1000);
  const growingBatchId = Number(insertPondBatch.run('oc', 2, Date.now(), Date.now() + 60 * 60 * 1000).lastInsertRowid);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const pondPrompt = page.locator('.farm-next-step[data-next-step="pond"]');
  assert.match(await pondPrompt.innerText(), /2 mẻ trong ao đã lớn/);
  await pondPrompt.click();
  const pondHarvestAll = page.locator('#btn-fish-harvest-all');
  assert.equal(await page.locator('.fish-summary').innerText().then((text) => text.includes('2 mẻ')), true);
  assert.equal(await page.locator('.fish-batch').first().evaluate((row) => row.classList.contains('fish-batch--ready')), true,
    'ready pond batches should appear before growing batches');
  assert.equal(await pondHarvestAll.evaluate((button) => button === document.activeElement), true,
    'pond shortcut should focus the harvest action inside its sheet');
  const pondActionBounds = await pondHarvestAll.boundingBox();
  assert.ok(pondActionBounds.y >= 0 && pondActionBounds.y + pondActionBounds.height <= page.viewportSize().height,
    'pond shortcut should scroll its harvest controls into the viewport');
  const pondShrimp = page.locator('.fish-batch img[src*="products-v3/fresh-shrimp.png"]');
  await pondShrimp.evaluate((image) => image.decode());
  assert.equal(await pondShrimp.evaluate((image) => image.naturalWidth), 128,
    'pond batches should use their compact product sprites');
  await checkNoOverflow(page, '320px ready pond batches');
  await page.screenshot({ path: resolve(outputDir, 'pond-ready-320.png') });
  await pondHarvestAll.click();
  await pondHarvestAll.waitFor({ state: 'detached' });
  assert.equal(pondQty('oc'), snailsBefore + 3);
  assert.equal(pondQty('tom'), shrimpBefore + 5);
  assert.deepEqual(db.prepare('SELECT id FROM fish_batches WHERE owner_id = 1').all(), [{ id: growingBatchId }],
    'bulk pond harvest should leave a growing batch untouched');
  await page.keyboard.press('Escape');
  db.prepare('UPDATE fish_batches SET ready_at = ? WHERE id = ?').run(Date.now() - 1000, growingBatchId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.farm-next-step[data-next-step="pond"]').click();
  const singlePondHarvest = page.locator(`[data-fish-harvest="${growingBatchId}"]`);
  assert.equal(await singlePondHarvest.getAttribute('aria-label'), 'Thu 2 con Ốc bươu');
  assert.equal(await singlePondHarvest.evaluate((button) => button === document.activeElement), true);
  const singlePondBounds = await singlePondHarvest.boundingBox();
  assert.ok(singlePondBounds.width >= 44 && singlePondBounds.height >= 44,
    'individual pond harvest needs a 44px touch target');
  await singlePondHarvest.click();
  await singlePondHarvest.waitFor({ state: 'detached' });
  assert.equal(pondQty('oc'), snailsBefore + 5);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM fish_batches WHERE owner_id = 1').get().n, 0);
  await page.keyboard.press('Escape');
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
  for (const crop of ['luami', 'carot', 'ngo']) {
    db.prepare('INSERT OR IGNORE INTO collection_discoveries (owner_id, item, first_at) VALUES (1, ?, ?)').run(crop, Date.now());
  }
  const collectionGoldBefore = db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
  await page.reload({ waitUntil: 'domcontentloaded' });
  const collectionPrompt = page.locator('.farm-next-step[data-next-step="collections"]');
  await collectionPrompt.waitFor();
  assert.match(await collectionPrompt.innerText(), /Vụ mùa đầu tiên.*hoàn thành/,
    'a finished collection should become the next useful farm action');
  await collectionPrompt.click();
  await page.locator('.sheet [data-collection-claim="first_harvests"]:enabled').click();
  await page.locator('.sheet [data-collection-claim="first_harvests"]:disabled').waitFor();
  assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, collectionGoldBefore + 1600,
    'claiming the suggested collection should grant its reward once');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.farm-next-step[data-next-step="collections"]').count(), 0,
    'a claimed collection should leave the immediate-action prompt');
  db.prepare('UPDATE festival SET counters_json = ?, claims_json = ? WHERE owner_id = 1')
    .run(JSON.stringify({ harvest: 50 }), '[]');
  await page.reload({ waitUntil: 'domcontentloaded' });
  const festivalGoldBefore = db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold;
  await page.locator('.farm-next-step[data-next-step="festival"]').click();
  assert.equal(await page.locator('.festival-card').first().getAttribute('data-festival-id'), '1',
    'festival should place a ready reward first');
  assert.equal(await page.locator('.sheet--festival [role="progressbar"]').count(), FESTIVAL.milestones.length);
  const festivalButtonSizes = await page.locator('.festival-card-footer button').evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  assert.ok(festivalButtonSizes.every((height) => height >= 44), 'festival actions need 44px touch targets');
  await checkNoOverflow(page, '320px festival');
  await auditAccessibility(page, 'festival-320');
  await page.screenshot({ path: resolve(outputDir, 'festival-320.png') });
  await page.locator('[data-fest-claim="1"]').click();
  await page.locator('.festival-card--claimed[data-festival-id="1"]').waitFor();
  assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold,
    festivalGoldBefore + FESTIVAL.milestones.find((milestone) => milestone.id === 1).gold * GOLD_MULT);
  assert.equal(await page.locator('[data-fest-claim="1"]').count(), 0, 'claimed reward should have no second claim control');
  assert.equal(await page.locator('.festival-card').last().getAttribute('data-festival-id'), '1');
  await page.locator('.festival-card[data-festival-id="3"] [data-sheet="orders"]').click();
  assert.ok(await page.locator('.sheet .order-card').count() > 0, 'festival order activity should open the order board');
  await page.keyboard.press('Escape');
  await page.locator('.dock-btn[data-sheet="more"]').click();
  await page.locator('.more-card[data-sheet="festival"]').click();
  await page.locator('.festival-card[data-festival-id="4"] [data-sheet="mill"]').click();
  assert.equal(await page.locator('.sheet--factory').count(), 1, 'festival processing activity should open the factory');
  await page.keyboard.press('Escape');
  await page.locator('.dock-btn[data-sheet="more"]').click();
  await page.locator('.more-card[data-sheet="festival"]').click();
  await page.locator('[data-festival-farm]').last().click();
  assert.equal(await page.locator('.sheet').count(), 0);
  assert.equal(await page.locator('.plot:focus').count(), 1, 'festival harvest activity should return focus to the field');
  assert.equal(await page.locator('.farm-next-step[data-next-step="festival"]').count(), 0,
    'claiming the final ready festival reward should clear the prompt');
  for (const item of ['trunggatay', 'totam', 'suatrau', 'longalpaca', 'nhunghuou', 'banhdua', 'banhgung', 'botmi', 'botbap', 'botcacao', 'mutcam', 'mutgung', 'mutsaurieng', 'siro', 'suachua', 'phomaide', 'phomaitrau', 'kem', 'kemvani', 'kemsaurieng', 'dauoliu', 'nuoccoc', 'vai', 'lua', 'khanlen', 'khanalpaca', 'aolen', 'mulen', 'caphesua', 'socola', 'tratui', 'ruouvang', 'caonhung', 'nuochoa', 'hopphomai', 'aodai', 'buatiec', 'hopqua', 'caphehaohang', 'chaca', 'cakho', 'sushi', 'lauca', 'goicuon', 'tomnuong', 'catrakho', 'calocnuong']) {
    db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, 1) ON CONFLICT(owner_id, item) DO UPDATE SET qty = 1').run(item);
  }
  for (const item of ['cadieuhongchien', 'luonxao', 'cuahap', 'mucnuong', 'tom', 'cua', 'luon', 'ech', 'muc', 'lauech', 'oc', 'ochuong', 'ocnhoi', 'oclen', 'ocdang', 'ocmo', 'ocluocsa', 'ocrangmuoiot', 'ochuongxaotoi', 'ochuongxaosate', 'ocnhoixaome', 'ocnhoixaotoi', 'oclenxaobo', 'oclennuongmohanh', 'ocdangnuongmohanh', 'ocdanghapsa', 'ocmorangmuoiot', 'ocmoluocsa', 'ocgaoxaodua', 'ocgaoxaobo', 'ocduahapsa', 'ocduaxaodua', 'ocmitxaosate', 'ocmitnuongphomai', 'oclacnuongphomai', 'oclacxaome', 'ocbongluocsa', 'ocbongrangmuoiot', 'ocdaxaotoi', 'ocdaxaosate', 'ocgaixaome', 'ocgaixaotoi', 'ocmongtayxaobo', 'ocmongtaynuongmohanh', 'ocgiacnuongmohanh', 'ocgiachapsa', 'octoirangmuoiot', 'octoiluocsa', 'ocnhayxaodua', 'ocnhayxaobo', 'occanahapsa', 'occanaxaodua', 'ocbong', 'occana', 'ocdua', 'ocda', 'ocgao', 'oclac', 'ocmit', 'ocnhay', 'octoi', 'ocbantay', 'ocvunang', 'octuva', 'ocmongtay', 'ocgai', 'ocgiac', 'ocbantayxaosate', 'ocbantaynuongphomai', 'ocvunangnuongphomai', 'ocvunangxaome', 'octuvaluocsa', 'octuvarangmuoiot']) {
    db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, 1) ON CONFLICT(owner_id, item) DO UPDATE SET qty = 1').run(item);
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="inventory"]').click();
  const inventorySearch = page.locator('#inventory-search');
  await inventorySearch.fill('pho mai');
  assert.deepEqual(await page.locator('.sheet--inventory .inv-row[data-item]:visible').evaluateAll((rows) => rows.map((row) => row.dataset.item).sort()),
    ['hopphomai', 'ocbantaynuongphomai', 'oclacnuongphomai', 'ocmitnuongphomai', 'ocvunangnuongphomai', 'phomaide', 'phomaitrau'],
    'accent-tolerant inventory search should find stocked cheeses and the cheese snail dish');
  await page.locator('[data-inventory-group="animals"]').click();
  assert.equal(await page.locator('.sheet--inventory .inv-row[data-item]:visible').count(), 0,
    'category filter should combine with inventory search');
  assert.equal(await page.locator('.inv-filter-empty:visible').count(), 1,
    'empty category search should explain how to recover');
  await inventorySearch.fill('');
  assert.ok(await page.locator('.sheet--inventory .inv-row[data-item]:visible').count() >= 5,
    'animal-products category should show stocked animal goods');
  assert.equal(await page.locator('.sheet--inventory .inv-row[data-inventory-kind="products"]:visible').count(), 0,
    'animal-products category should hide processed goods');
  await page.locator('[data-inventory-group="all"]').click();
  await checkNoOverflow(page, '320px inventory finder');
  for (const [item, file] of [
    ['trunggatay', 'turkey-eggs'], ['totam', 'silkworm-silk'], ['suatrau', 'buffalo-milk'],
    ['longalpaca', 'alpaca-fleece'], ['nhunghuou', 'deer-velvet'],
    ['banhdua', 'pineapple-cake'], ['banhgung', 'ginger-cake'],
    ['botmi', 'wheat-flour'], ['botbap', 'corn-flour'], ['botcacao', 'cocoa-powder'],
    ['mutcam', 'orange-marmalade'], ['mutgung', 'ginger-preserve'],
    ['mutsaurieng', 'durian-jam'], ['siro', 'dragon-fruit-syrup'],
    ['suachua', 'strawberry-yogurt'], ['phomaide', 'goat-cheese'], ['phomaitrau', 'buffalo-cheese'],
    ['kem', 'watermelon-ice-cream'], ['kemvani', 'vanilla-ice-cream'], ['kemsaurieng', 'durian-ice-cream'],
    ['dauoliu', 'olive-oil'], ['nuoccoc', 'ambarella-juice'],
    ['vai', 'cotton-fabric'], ['lua', 'silk-fabric'], ['khanlen', 'wool-scarf'],
    ['khanalpaca', 'alpaca-scarf'], ['aolen', 'wool-sweater'], ['mulen', 'rabbit-wool-hat'],
    ['caphesua', 'iced-milk-coffee'], ['socola', 'milk-chocolate'], ['tratui', 'tea-bags'],
    ['ruouvang', 'aged-grape-wine'], ['caonhung', 'deer-antler-paste'],
    ['nuochoa', 'rose-perfume'], ['hopphomai', 'premium-cheese-box'],
    ['aodai', 'silk-ao-dai'], ['buatiec', 'family-feast'],
    ['hopqua', 'farm-gift-box'], ['caphehaohang', 'premium-coffee'],
    ['chaca', 'fish-cakes'], ['cakho', 'pepper-braised-fish'],
    ['sushi', 'fish-sushi'], ['lauca', 'fish-hotpot'],
    ['goicuon', 'fish-spring-rolls'], ['tomnuong', 'grilled-shrimp'],
    ['catrakho', 'braised-pangasius'], ['calocnuong', 'grilled-snakehead-fish'],
    ['cadieuhongchien', 'fried-red-tilapia'], ['luonxao', 'lemongrass-chili-eel'],
    ['cuahap', 'steamed-lemongrass-crab'], ['mucnuong', 'satay-grilled-squid'],
    ['tom', 'fresh-shrimp'], ['cua', 'freshwater-crab'], ['luon', 'farm-eel'],
    ['ocluocsa', 'boiled-apple-snails'], ['ocrangmuoiot', 'chili-salt-apple-snails'],
    ['ochuongxaotoi', 'garlic-babylon-snails'], ['ochuongxaosate', 'satay-babylon-snails'],
    ['ocnhoixaome', 'tamarind-pond-snails'], ['ocnhoixaotoi', 'garlic-pond-snails'],
    ['oclenxaobo', 'butter-mud-creeper-snails'], ['oclennuongmohanh', 'scallion-grilled-mud-creeper-snails'],
    ['ocdangnuongmohanh', 'scallion-grilled-bitter-snails'], ['ocdanghapsa', 'lemongrass-steamed-bitter-snails'],
    ['ocmorangmuoiot', 'chili-salt-moon-snails'], ['ocmoluocsa', 'lemongrass-moon-snails'],
    ['ocgaoxaodua', 'coconut-rice-snails'], ['ocgaoxaobo', 'butter-rice-snails'],
    ['ocduahapsa', 'lemongrass-coconut-snails'], ['ocduaxaodua', 'coconut-sauce-snails'],
    ['ocmitxaosate', 'satay-jackfruit-snails'], ['ocmitnuongphomai', 'cheese-jackfruit-snails'],
    ['oclacnuongphomai', 'cheese-striped-snails'], ['oclacxaome', 'tamarind-striped-snails'],
    ['ocbongluocsa', 'lemongrass-flower-snails'], ['ocbongrangmuoiot', 'chili-salt-flower-snails'],
    ['ocdaxaotoi', 'garlic-stone-snails'], ['ocdaxaosate', 'satay-stone-snails'],
    ['ocgaixaome', 'tamarind-spiny-snails'], ['ocgaixaotoi', 'garlic-spiny-snails'],
    ['ocmongtayxaobo', 'butter-razor-clams'], ['ocmongtaynuongmohanh', 'scallion-grilled-razor-clams'],
    ['ocgiacnuongmohanh', 'scallion-grilled-conch'], ['ocgiachapsa', 'lemongrass-steamed-conch'],
    ['octoirangmuoiot', 'chili-salt-garlic-snails'], ['octoiluocsa', 'lemongrass-garlic-snails'],
    ['ocnhayxaodua', 'coconut-jumping-snails'], ['ocnhayxaobo', 'butter-jumping-snails'],
    ['occanahapsa', 'lemongrass-olive-snails'], ['occanaxaodua', 'coconut-olive-snails'],
    ['ocbantayxaosate', 'satay-spider-conch'], ['ocbantaynuongphomai', 'cheese-spider-conch'],
    ['ocvunangnuongphomai', 'cheese-limpets'], ['ocvunangxaome', 'tamarind-limpets'],
    ['octuvaluocsa', 'lemongrass-trumpet-snails'], ['octuvarangmuoiot', 'chili-salt-trumpet-snails'],
    ['oc', 'apple-snail'], ['ochuong', 'spotted-babylon-snail'],
    ['ocnhoi', 'pond-snail'], ['oclen', 'mud-creeper-snail'],
    ['ocdang', 'bitter-snail'], ['ocmo', 'moon-snail'],
    ['ocbantay', 'spider-conch-shell'], ['ocvunang', 'limpet-shell'],
    ['octuva', 'trumpet-snail-shell'], ['ocmongtay', 'razor-clam-shell'],
    ['ocgai', 'spiny-snail-shell'], ['ocgiac', 'conch-shell'],
    ['ocbong', 'flower-snail-shell'], ['occana', 'olive-snail-shell'],
    ['ocdua', 'coconut-snail-shell'], ['ocda', 'stone-snail-shell'],
    ['ocgao', 'rice-snail-shell'], ['oclac', 'striped-snail-shell'],
    ['ocmit', 'jackfruit-snail-shell'], ['ocnhay', 'jumping-snail-shell'],
    ['octoi', 'garlic-snail-shell'],
    ['ech', 'farm-frog'], ['muc', 'fresh-squid'], ['lauech', 'frog-hotpot'],
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
  await page.locator('.inv-row[data-item="kemsaurieng"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'dairy-products-320.png') });
  await page.locator('.inv-row[data-item="nuoccoc"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'juice-products-320.png') });
  await page.locator('.inv-row[data-item="mulen"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'weaving-products-320.png') });
  await page.locator('.inv-row[data-item="tratui"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'roaster-products-320.png') });
  await page.locator('.inv-row[data-item="caphehaohang"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'premium-products-320.png') });
  await page.locator('.inv-row[data-item="lauca"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'fish-oven-products-320.png') });
  await page.locator('.inv-row[data-item="mucnuong"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'seafood-products-320.png') });
  await page.locator('[data-inventory-group="other"]').click();
  await page.locator('.inv-row[data-item="cua"]').scrollIntoViewIfNeeded();
  await checkNoOverflow(page, '320px aquatic product sprites');
  await page.screenshot({ path: resolve(outputDir, 'aquatic-products-320.png') });
  await inventorySearch.fill('oc');
  await page.locator('.inv-row[data-item="oc"]').scrollIntoViewIfNeeded();
  await checkNoOverflow(page, '320px snail product sprites');
  await page.screenshot({ path: resolve(outputDir, 'snail-products-320.png') });
  await page.locator('[data-inventory-group="products"]').click();
  await page.locator('.inv-row[data-item="ocluocsa"]').scrollIntoViewIfNeeded();
  await checkNoOverflow(page, '320px snail-stall product sprites');
  await page.screenshot({ path: resolve(outputDir, 'snail-stall-products-320.png') });
  await page.locator('.inv-row[data-item="oclenxaobo"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'snail-stall-butter-products-320.png') });
  await page.locator('.inv-row[data-item="ocduaxaodua"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'snail-stall-coconut-products-320.png') });
  await page.locator('.inv-row[data-item="ocdaxaotoi"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'snail-stall-stone-products-320.png') });
  await page.locator('.inv-row[data-item="ocmongtayxaobo"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'snail-stall-razor-clam-products-320.png') });
  await page.locator('.inv-row[data-item="ocnhayxaodua"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'snail-stall-jumping-products-320.png') });
  await page.locator('[data-inventory-group="all"]').click();
  await page.locator('.inv-row[data-item="ocvunang"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'raw-shell-products-320.png') });
  await page.locator('.inv-row[data-item="ocnhay"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'raw-shell-final-products-320.png') });
  await page.locator('[data-inventory-group="products"]').click();
  await page.locator('.inv-row[data-item="ocvunangnuongphomai"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'snail-stall-limpet-products-320.png') });
  db.prepare('UPDATE daily SET counters_json = ?, chest_claimed = 0 WHERE owner_id = 1')
    .run(JSON.stringify({ harvest: 15, sow: 10, feed: 5, sell: 9 }));
  db.prepare('UPDATE farmers SET stars = 50 WHERE user_id = 1').run();
  db.prepare('DELETE FROM star_claims WHERE owner_id = 1').run();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.reward-goal').click();
  assert.equal(await page.locator('[data-reward-group="quests"]').count(), 1);
  assert.equal(await page.locator('[data-reward-group="stars"]').count(), 1);
  await checkNoOverflow(page, '320px ready reward hub');
  await auditAccessibility(page, 'rewards-320');
  await page.screenshot({ path: resolve(outputDir, 'rewards-320.png') });
  await page.locator('[data-reward-group="quests"] [data-sheet="quests"]').click();
  assert.equal(await page.locator('#btn-chest').isEnabled(), true);
  assert.equal(await page.locator('[data-daily-quest="sell"] [role="progressbar"]').getAttribute('aria-valuenow'), '9');
  await checkNoOverflow(page, '320px daily quests');
  await auditAccessibility(page, 'quests-320');
  await page.screenshot({ path: resolve(outputDir, 'daily-quests-320.png') });
  await page.locator('[data-daily-quest="sell"] [data-sheet="inventory"]').click();
  assert.equal(await page.locator('.sheet--inventory').count(), 1, 'daily sale shortcut should open inventory');
  await page.keyboard.press('Escape');
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="quests"]').click();
  const chestResponse = page.waitForResponse((response) => response.url().endsWith('/farm/api/quest-chest') && response.request().method() === 'POST');
  await page.locator('#btn-chest').click();
  assert.equal((await chestResponse).status(), 200);
  await page.locator('#btn-chest:disabled').waitFor();
  assert.match(await page.locator('[data-daily-quest="harvest"]').innerText(), /Đã nhận thưởng/);
  await page.screenshot({ path: resolve(outputDir, 'daily-chest-claimed-320.png') });
  await page.keyboard.press('Escape');
  await page.locator('.reward-goal').click();
  assert.equal(await page.locator('[data-reward-group="quests"]').count(), 0, 'claimed daily chest should leave the reward hub');
  await page.locator('[data-reward-group="stars"] [data-sheet="stars"]').click();
  assert.equal(await page.locator('[data-star-milestone="50"]').getAttribute('data-star-state'), 'ready');
  assert.equal(await page.locator('[data-star-milestone="50"] [role="progressbar"]').getAttribute('aria-valuenow'), '50');
  await checkNoOverflow(page, '320px star milestone rewards');
  await auditAccessibility(page, 'star-milestones-320');
  await page.screenshot({ path: resolve(outputDir, 'star-milestones-ready-320.png') });
  const starResponse = page.waitForResponse((response) => response.url().endsWith('/farm/api/star-claim') && response.request().method() === 'POST');
  await page.locator('#btn-star-claim').click();
  assert.equal((await starResponse).status(), 200);
  await page.locator('#btn-star-claim:disabled').waitFor();
  assert.equal(await page.locator('[data-star-milestone="50"]').getAttribute('data-star-state'), 'claimed');
  const currentStars = db.prepare('SELECT stars FROM farmers WHERE user_id = 1').get().stars;
  assert.equal(await page.locator('[data-star-milestone="100"] [role="progressbar"]').getAttribute('aria-valuenow'), String(currentStars));
  assert.match(await page.locator('.sheet--stars .festival-summary').innerText(), new RegExp(`Còn ${100 - currentStars} sao`));
  await page.locator('.sheet--stars [data-sheet="quests"]').click();
  await page.locator('.sheet--quests').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('.coin-pill--gem[data-sheet="stars"]').click();
  await page.locator('.sheet--stars [data-sheet="orders"]').click();
  assert.match(await page.locator('.sheet').innerText(), /Đơn hàng/);
  await page.keyboard.press('Escape');
  if (await page.locator('.reward-goal').count()) {
    await page.locator('.reward-goal').click();
    assert.equal(await page.locator('[data-reward-group="stars"]').count(), 0, 'claimed star milestone should leave the reward hub');
  }
  const skillReviewXp = Array.from({ length: 11 }, (_, index) => xpNeedFor(index + 1)).reduce((sum, xp) => sum + xp, 0);
  db.prepare("UPDATE farmers SET xp = ?, skills_json = '{}', gems = 0, last_respec_at = 0 WHERE user_id = 1").run(skillReviewXp);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="skills"]').click();
  const availableSkills = page.locator('[data-skill-view="available"]');
  await availableSkills.click();
  assert.equal(await availableSkills.getAttribute('aria-pressed'), 'true');
  assert.equal(await availableSkills.evaluate((button) => button === document.activeElement), true);
  assert.equal(await page.locator('[data-skill-can="false"]:visible').count(), 0);
  const learnResponse = page.waitForResponse((response) => response.url().endsWith('/farm/api/skill-learn') && response.request().method() === 'POST');
  await page.locator('[data-skill-learn="bantayxanh"]').click();
  const learnedResponse = await learnResponse;
  assert.equal(learnedResponse.status(), 200);
  assert.equal((await learnedResponse.json()).me.skills.points, 1);
  await page.waitForFunction(() => document.querySelector('[data-skill="bantayxanh"] .festival-status')?.textContent === 'Bậc 1/10');
  await page.locator('[data-skill-view="all"]').click();
  const learnedSkill = page.locator('[data-skill="bantayxanh"]');
  assert.match(await learnedSkill.innerText(), /Bậc 1\/10/);
  assert.match(await learnedSkill.innerText(), /Bậc kế: 2 · 2 điểm/);
  assert.match(await learnedSkill.innerText(), /Thiếu 1 điểm/);
  assert.equal(await learnedSkill.locator('[data-skill-learn]').isDisabled(), true);
  assert.match(await page.locator('.skill-respec').innerText(), /Thiếu 20 kim cương/);
  assert.equal(await page.locator('#btn-skill-respec').isDisabled(), true);
  await checkNoOverflow(page, '320px skill rank decisions');
  await auditAccessibility(page, 'skills-320');
  await learnedSkill.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'skills-rank-320.png') });
  const noSkillXp = Array.from({ length: 9 }, (_, index) => xpNeedFor(index + 1)).reduce((sum, xp) => sum + xp, 0);
  db.prepare("UPDATE farmers SET xp = ?, skills_json = '{}' WHERE user_id = 1").run(noSkillXp);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="skills"]').click();
  await page.locator('[data-skill-view="available"]').click();
  assert.equal(await page.locator('.skill-card:visible').count(), 0);
  assert.equal(await page.locator('.skill-empty').isVisible(), true);
  const title = LUXURY.nongdanchamchi;
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(title.price - 1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="luxury"]').click();
  const titleCard = page.locator(`[data-lux-item="${title.id}"]`);
  await titleCard.waitFor();
  assert.match(await titleCard.innerText(), /Thiếu 1 vàng/);
  assert.equal(await titleCard.locator('[data-lux-buy]').isDisabled(), true);
  await page.locator('[data-lux-view="owned"]').click();
  assert.equal(await page.locator('[data-lux-item]').count(), 0);
  assert.equal(await page.locator('[data-lux-view="owned"]').evaluate((button) => button === document.activeElement), true);
  await page.locator('[data-lux-view="all"]').click();
  await checkNoOverflow(page, '320px personalization shop');
  await auditAccessibility(page, 'personalization-320');
  await titleCard.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'personalization-shop-320.png') });
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(title.price);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="luxury"]').click();
  await page.locator('[data-lux-view="available"]').click();
  assert.equal(await titleCard.isVisible(), true);
  page.once('dialog', (dialog) => dialog.accept());
  await titleCard.locator('[data-lux-buy]').click();
  await page.locator('[data-lux-view="owned"]').click();
  await titleCard.locator('[data-lux-equip=""]').waitFor();
  assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, 0);
  assert.equal(db.prepare('SELECT title_id FROM farmers WHERE user_id = 1').get().title_id, title.id);
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(LOTTERY.ticket - 1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="luxury"]').click();
  await page.locator('[data-lux-view="owned"]').click();
  const oneTicket = page.locator('[data-lottery-buy="1"]');
  await oneTicket.scrollIntoViewIfNeeded();
  assert.equal(await oneTicket.isDisabled(), true);
  assert.ok((await oneTicket.innerText()).includes(`${LOTTERY.ticket.toLocaleString('vi')} vàng`));
  assert.match(await page.locator('#lottery-hint-1').innerText(), /Thiếu 1 vàng/);
  await checkNoOverflow(page, '320px lottery purchase decisions');
  await auditAccessibility(page, 'lottery-320');
  await page.screenshot({ path: resolve(outputDir, 'lottery-costs-320.png') });
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(LOTTERY.ticket);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="luxury"]').click();
  await page.locator('[data-lux-view="owned"]').click();
  await oneTicket.click();
  await oneTicket.locator('..').locator('#lottery-hint-1').filter({ hasText: 'Thiếu' }).waitFor();
  assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, 0);
  assert.equal(db.prepare('SELECT qty FROM lottery_tickets WHERE owner_id = 1').get().qty, 1);
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(LOTTERY.ticket * 50);
  db.prepare('UPDATE lottery_tickets SET qty = ? WHERE owner_id = 1').run(LOTTERY.maxPerDay - 1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-sheet="more"]').first().click();
  await page.locator('[data-sheet="luxury"]').click();
  await page.locator('[data-lux-view="owned"]').click();
  assert.equal(await oneTicket.isEnabled(), true);
  assert.equal(await page.locator('[data-lottery-buy="10"]').isDisabled(), true);
  assert.match(await page.locator('#lottery-hint-10').innerText(), /Còn 1 vé/);
  await oneTicket.click();
  await page.locator('#lottery-hint-1').filter({ hasText: 'Đã đạt giới hạn' }).waitFor();
  assert.equal(await oneTicket.isDisabled(), true);
  assert.equal(db.prepare('SELECT qty FROM lottery_tickets WHERE owner_id = 1').get().qty, LOTTERY.maxPerDay);
  assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, LOTTERY.ticket * 49);
  await titleCard.locator('[data-lux-equip=""]').click();
  await titleCard.locator(`[data-lux-equip="${title.id}"]`).waitFor();
  assert.equal(db.prepare('SELECT title_id FROM farmers WHERE user_id = 1').get().title_id, '');
  await titleCard.locator(`[data-lux-equip="${title.id}"]`).click();
  await titleCard.locator('[data-lux-equip=""]').waitFor();
  assert.equal(db.prepare('SELECT title_id FROM farmers WHERE user_id = 1').get().title_id, title.id);
  const firstExpansion = EXPANSIONS[0];
  db.prepare('UPDATE farmers SET xp = 0, gold = 0, plots_count = ? WHERE user_id = 1').run(START_PLOTS);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.plot[data-kind="expand"]').click();
  assert.equal(await page.locator('#btn-expand').isDisabled(), true);
  assert.match(await page.locator('.expansion-level').innerText(), new RegExp(`Cần thêm ${firstExpansion.level - 1} cấp`));
  assert.ok((await page.locator('.expansion-tax').innerText()).includes(`miễn thuế đến cấp ${LAND_TAX_UNLOCK_LEVEL}`));
  assert.ok((await page.locator('.expansion-tax').innerText()).includes(`${((START_PLOTS + 4) * TAX_PER_PLOT).toLocaleString('vi')} vàng/ngày`));
  const expansionXp = Array.from({ length: firstExpansion.level - 1 }, (_, index) => xpNeedFor(index + 1)).reduce((sum, xp) => sum + xp, 0);
  db.prepare('UPDATE farmers SET xp = ?, gold = ? WHERE user_id = 1').run(expansionXp, firstExpansion.gold - 1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.plot[data-kind="expand"]').click();
  assert.match(await page.locator('.expansion-balance').innerText(), /Thiếu 1 vàng/);
  assert.equal(await page.locator('#btn-expand').isDisabled(), true);
  await checkNoOverflow(page, '320px expansion decision');
  await page.screenshot({ path: resolve(outputDir, 'expansion-shortfall-320.png') });
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(firstExpansion.gold);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.plot[data-kind="expand"]').click();
  assert.match(await page.locator('.expansion-balance').innerText(), /Sau khi mở: còn 0 vàng/);
  await auditAccessibility(page, 'expansion-320');
  await page.screenshot({ path: resolve(outputDir, 'expansion-affordable-320.png') });
  await page.locator('#btn-expand').click();
  await page.locator(`.plot[data-idx="${START_PLOTS + 3}"][data-kind="empty"]`).waitFor();
  const expandedFarmer = db.prepare('SELECT gold, plots_count FROM farmers WHERE user_id = 1').get();
  assert.equal(expandedFarmer.gold, 0);
  assert.equal(expandedFarmer.plots_count, START_PLOTS + 4);
  const pondUnlockXp = Array.from({ length: FISHING.level - 1 }, (_, index) => xpNeedFor(index + 1)).reduce((sum, need) => sum + need, 0);
  const pondUpgradeCost = POND_UPGRADE_GOLD[0];
  db.prepare('UPDATE farmers SET xp = ?, gold = ?, pond_level = 1 WHERE user_id = 1').run(pondUnlockXp, pondUpgradeCost - 1);
  db.prepare('INSERT INTO fish_batches (owner_id, species, qty, planted_at, ready_at) VALUES (1, ?, 1, ?, ?)')
    .run('oc', Date.now(), Date.now() + 86400000);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="more"]').click();
  await page.locator('.more-card[data-sheet="fishing"]').click();
  await page.locator('.pond-upgrade').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#btn-upgrade-pond').isDisabled(), true);
  assert.match(await page.locator('.pond-upgrade-balance').innerText(), /Thiếu 1 vàng/);
  assert.match(await page.locator('.pond-upgrade-capacity').innerText(), new RegExp(`${FISH_STOCK_BY_LEVEL[0]} → ${FISH_STOCK_BY_LEVEL[1]} con`));
  assert.match(await page.locator('.pond-upgrade').innerText(), /giữ nguyên/);
  await checkNoOverflow(page, '320px pond upgrade shortfall');
  await page.screenshot({ path: resolve(outputDir, 'pond-upgrade-shortfall-320.png') });
  const batchesBeforeUpgrade = db.prepare('SELECT * FROM fish_batches WHERE owner_id = 1 ORDER BY id').all();
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(pondUpgradeCost);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="more"]').click();
  await page.locator('.more-card[data-sheet="fishing"]').click();
  await page.locator('.pond-upgrade').scrollIntoViewIfNeeded();
  assert.match(await page.locator('.pond-upgrade-balance').innerText(), /Sau khi nâng: còn 0 vàng/);
  await auditAccessibility(page, 'pond-upgrade-320');
  await page.screenshot({ path: resolve(outputDir, 'pond-upgrade-affordable-320.png') });
  const pondUpgradeResponse = page.waitForResponse((response) => response.url().endsWith('/farm/api/upgrade-pond') && response.request().method() === 'POST');
  await page.locator('#btn-upgrade-pond').click();
  const pondUpgradeResult = await pondUpgradeResponse;
  assert.equal(pondUpgradeResult.status(), 200);
  const upgradedPond = await pondUpgradeResult.json();
  assert.equal(upgradedPond.me.gold, 0);
  assert.equal(upgradedPond.me.pond.level, 2);
  assert.equal(upgradedPond.me.pond.fishPerCast, POND_LEVELS[1]);
  assert.equal(upgradedPond.me.fishFarm.capacity, FISH_STOCK_BY_LEVEL[1]);
  assert.deepEqual(db.prepare('SELECT * FROM fish_batches WHERE owner_id = 1 ORDER BY id').all(), batchesBeforeUpgrade);
  assert.deepEqual(db.prepare('SELECT gold, pond_level FROM farmers WHERE user_id = 1').get(), { gold: 0, pond_level: 2 });
  const millUnlockXp = Array.from({ length: MACHINES.coixay.level - 1 }, (_, index) => xpNeedFor(index + 1)).reduce((sum, need) => sum + need, 0);
  const factoryUpgradeCost = MACHINE_UPGRADE_GOLD[0];
  db.prepare('UPDATE farmers SET xp = ?, gold = ?, machine_levels_json = ?, skills_json = ? WHERE user_id = 1')
    .run(millUnlockXp, factoryUpgradeCost - 1, '{}', JSON.stringify({ lamnhanh: 1 }));
  db.prepare('DELETE FROM machine_jobs WHERE owner_id = 1').run();
  const runningReadyAt = Date.now() + 3600000;
  db.prepare('INSERT INTO machine_jobs (owner_id, kind, recipe, ready_at, queue_count) VALUES (1, ?, ?, ?, 2)').run('coixay', 'botmi', runningReadyAt);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="more"]').click();
  await page.locator('.more-card[data-sheet="mill"]').click();
  const factoryPreview = page.locator('[data-upgrade-preview="coixay"]');
  const flourDuration = page.locator('[data-recipe-output="botmi"] .mc-duration');
  assert.equal(Number(await flourDuration.getAttribute('data-duration-ms')), Math.round(MACHINES.coixay.recipes.botmi.ms * 0.95));
  assert.match(await flourDuration.innerText(), /9:30/);
  assert.match(await factoryPreview.locator('.mc-upgrade-balance').innerText(), /Thiếu 1 vàng/);
  assert.equal(await page.locator('[data-machine-upgrade="coixay"]').isDisabled(), true);
  await factoryPreview.scrollIntoViewIfNeeded();
  await checkNoOverflow(page, '320px factory upgrade shortfall');
  await page.screenshot({ path: resolve(outputDir, 'factory-upgrade-shortfall-320.png') });
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(factoryUpgradeCost);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="more"]').click();
  await page.locator('.more-card[data-sheet="mill"]').click();
  assert.match(await factoryPreview.locator('.mc-upgrade-balance').innerText(), /Sau khi nâng: còn 0 vàng/);
  await factoryPreview.scrollIntoViewIfNeeded();
  await auditAccessibility(page, 'factory-upgrade-320');
  await page.screenshot({ path: resolve(outputDir, 'factory-upgrade-affordable-320.png') });
  const factoryUpgradeResponse = page.waitForResponse((response) => response.url().endsWith('/farm/api/machine-upgrade') && response.request().method() === 'POST');
  await page.locator('[data-machine-upgrade="coixay"]').click();
  assert.equal((await factoryUpgradeResponse).status(), 200);
  await page.locator('[data-upgrade-preview="coixay"] p').filter({ hasText: 'Cấp máy 1' }).waitFor();
  assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, 0);
  assert.deepEqual(db.prepare('SELECT ready_at, queue_count FROM machine_jobs WHERE owner_id = 1 AND kind = ? AND recipe = ?').get('coixay', 'botmi'), { ready_at: runningReadyAt, queue_count: 2 });
  const upgradedDuration = Math.round(MACHINES.coixay.recipes.botmi.ms * 0.95 * 0.9);
  assert.equal(Number(await flourDuration.getAttribute('data-duration-ms')), upgradedDuration);
  assert.match(await flourDuration.innerText(), /8:33/);
  db.prepare('DELETE FROM machine_jobs WHERE owner_id = 1').run();
  db.prepare("INSERT INTO inventory (owner_id, item, qty) VALUES (1, 'luami', 2) ON CONFLICT(owner_id, item) DO UPDATE SET qty = 2").run();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="more"]').click();
  await page.locator('.more-card[data-sheet="mill"]').click();
  const queuedAfterUpgrade = page.waitForResponse((response) => response.url().endsWith('/farm/api/machine-run') && response.request().method() === 'POST');
  const queueStartedAt = Date.now();
  await page.locator('[data-machine-run="coixay"][data-recipe="botmi"][data-count="1"]').first().click();
  assert.equal((await queuedAfterUpgrade).status(), 200);
  const queueFinishedAt = Date.now();
  const newReadyAt = db.prepare('SELECT ready_at FROM machine_jobs WHERE owner_id = 1 AND kind = ? AND recipe = ?').get('coixay', 'botmi').ready_at;
  assert.ok(newReadyAt >= queueStartedAt + upgradedDuration && newReadyAt <= queueFinishedAt + upgradedDuration,
    'The server must schedule the new batch using the duration displayed with both speed bonuses');
  db.prepare('UPDATE farmers SET gold = ?, dog_until = 0 WHERE user_id = 1').run(DOG.pricePerHour - 1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="shop"]').click();
  const dogOption = page.locator('[data-dog-option="1"]');
  await dogOption.scrollIntoViewIfNeeded();
  assert.match(await dogOption.locator('.dog-hire-balance').innerText(), /Thiếu 1 vàng/);
  assert.equal(await page.locator('[data-dog-hire="1"]').isDisabled(), true);
  assert.match(await page.locator('.dog-hire-status').innerText(), /bắt đầu ngay/);
  const dogSprite = page.locator('.dog-hire img');
  await dogSprite.evaluate((image) => image.decode());
  assert.equal(await dogSprite.evaluate((image) => image.naturalWidth), 128);
  await checkNoOverflow(page, '320px guard dog shortage');
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(DOG.pricePerHour);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="shop"]').click();
  await dogOption.scrollIntoViewIfNeeded();
  assert.match(await dogOption.locator('.dog-hire-balance').innerText(), /Sau khi thuê: còn 0 vàng/);
  await auditAccessibility(page, 'guard-dog-320');
  await page.screenshot({ path: resolve(outputDir, 'guard-dog-affordable-320.png') });
  const hireResponse = page.waitForResponse((response) => response.url().endsWith('/farm/api/dog-hire') && response.request().method() === 'POST');
  const hireStarted = Date.now();
  await page.locator('[data-dog-hire="1"]').click();
  assert.equal((await hireResponse).status(), 200);
  const hireFinished = Date.now();
  const firstDogShift = db.prepare('SELECT gold, dog_until FROM farmers WHERE user_id = 1').get();
  assert.equal(firstDogShift.gold, 0);
  assert.ok(firstDogShift.dog_until >= hireStarted + 3600000 && firstDogShift.dog_until <= hireFinished + 3600000);
  await page.locator('.dog-hire-status').filter({ hasText: 'nối tiếp ca hiện tại' }).waitFor();
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(DOG.pricePerHour);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="shop"]').click();
  const extensionResponse = page.waitForResponse((response) => response.url().endsWith('/farm/api/dog-hire') && response.request().method() === 'POST');
  await page.locator('[data-dog-hire="1"]').click();
  assert.equal((await extensionResponse).status(), 200);
  assert.deepEqual(db.prepare('SELECT gold, dog_until FROM farmers WHERE user_id = 1').get(), { gold: 0, dog_until: firstDogShift.dog_until + 3600000 });
  await page.locator('[data-shop-category="supplies"]').click();
  assert.equal(await page.locator('[data-shop-category="supplies"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('[data-shop-category="supplies"]').evaluate((button) => button === document.activeElement), true);
  assert.deepEqual(await page.locator('[data-shop-section]:visible').evaluateAll((sections) => sections.map((section) => section.dataset.shopSection)), ['supplies']);
  assert.equal(await page.locator('[data-buy-gems]').first().isVisible(), false);
  assert.equal(await page.locator('[data-buy-animal="ga"]').isVisible(), false);
  const feedCost = (await (await fetch(`${base}/farm/api/state`)).json()).config.goods.thucan.buy;
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(feedCost);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="shop"]').click();
  await page.locator('[data-shop-category="supplies"]').click();
  const feedBeforeCategoryPurchase = db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'thucan'").get()?.qty || 0;
  const categoryFeedResponse = page.waitForResponse((response) => response.url().endsWith('/farm/api/buy') && response.request().method() === 'POST');
  await page.locator('[data-buy="thucan"][data-qty="1"]').click();
  assert.equal((await categoryFeedResponse).status(), 200);
  await page.locator('[data-buy="thucan"][data-qty="1"]:disabled').waitFor();
  assert.equal(await page.locator('[data-shop-category="supplies"]').getAttribute('aria-pressed'), 'true');
  assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, 0);
  assert.equal(db.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'thucan'").get().qty, feedBeforeCategoryPurchase + 1);
  for (const category of ['animals', 'gems', 'guard', 'all']) {
    await page.locator(`[data-shop-category="${category}"]`).click();
    const visibleSections = await page.locator('[data-shop-section]:visible').evaluateAll((sections) => sections.map((section) => section.dataset.shopSection));
    assert.deepEqual(visibleSections, category === 'all' ? ['gems', 'supplies', 'guard', 'animals'] : [category]);
  }
  await page.locator('[data-shop-category="supplies"]').click();
  const categoryTouchSizes = await page.locator('[data-shop-category]').evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  assert.ok(categoryTouchSizes.every((height) => height >= 44));
  await checkNoOverflow(page, '320px shop categories');
  await auditAccessibility(page, 'shop-categories-320');
  await page.screenshot({ path: resolve(outputDir, 'shop-supplies-320.png') });
  db.prepare('UPDATE farmers SET xp = 1000000000 WHERE user_id = 1').run();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="more"]').click();
  const featureIcons = page.locator('.more-card .mc-icon img');
  assert.equal(await featureIcons.count(), 14, 'Every unlocked feature should have matching navigation artwork');
  for (const icon of await featureIcons.all()) await icon.evaluate((image) => image.decode());
  const featureArt = await featureIcons.evaluateAll((images) => images.map((image) => ({
    loaded: image.naturalWidth > 0, alt: image.alt, width: image.getBoundingClientRect().width,
    label: image.closest('button').querySelector('.mc-name').textContent,
  })));
  assert.ok(featureArt.every((icon) => icon.loaded && icon.alt === '' && icon.width === 36 && icon.label));
  await checkNoOverflow(page, '320px feature menu artwork');
  await auditAccessibility(page, 'feature-menu-320');
  await page.screenshot({ path: resolve(outputDir, 'feature-menu-top-320.png') });
  await page.locator('.more-card[data-action="leaderboard"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(outputDir, 'feature-menu-bottom-320.png') });
  db.prepare('DELETE FROM animals WHERE owner_id = 1').run();
  db.prepare("DELETE FROM inventory WHERE owner_id = 1 AND item = 'thucan'").run();
  db.prepare('INSERT INTO animals (owner_id, kind, ready_at) VALUES (1, ?, ?)').run('cut', Date.now() + 3600000);
  const upgradeAnimalsBefore = db.prepare('SELECT * FROM animals WHERE owner_id = 1 ORDER BY id').all();
  db.prepare('UPDATE farmers SET xp = ?, gold = ?, barn_levels_json = ? WHERE user_id = 1')
    .run(levelSixXp, BARN_UPGRADE_GOLD[0] - 1, '{}');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="more"]').click();
  await page.locator('.more-card[data-sheet="barns"]').click();
  await page.locator('[data-preview-barn="cut"]').click();
  assert.equal(await page.locator('[data-upgrade-barn="cut"]').isDisabled(), true);
  assert.match(await page.locator('.barn-upgrade-balance').innerText(), /Thiếu 1 vàng/);
  assert.match(await page.locator('.barn-upgrade-capacity').innerText(), new RegExp(`${ANIMALS.cut.capacities[0]} → ${ANIMALS.cut.capacities[1]} con`));
  await page.locator('.barn-upgrade-preview').scrollIntoViewIfNeeded();
  await checkNoOverflow(page, '320px barn upgrade shortage');
  await page.screenshot({ path: resolve(outputDir, 'barn-upgrade-shortfall-320.png') });
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(BARN_UPGRADE_GOLD[0]);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="more"]').click();
  await page.locator('.more-card[data-sheet="barns"]').click();
  await page.locator('[data-preview-barn="cut"]').click();
  assert.match(await page.locator('.barn-upgrade-balance').innerText(), /Sau khi nâng: còn 0 vàng/);
  await page.locator('.barn-upgrade-preview').scrollIntoViewIfNeeded();
  await auditAccessibility(page, 'barn-upgrade-320');
  await page.screenshot({ path: resolve(outputDir, 'barn-upgrade-affordable-320.png') });
  const barnUpgradeResponse = page.waitForResponse((response) => response.url().endsWith('/farm/api/upgrade-barn') && response.request().method() === 'POST');
  await page.locator('[data-upgrade-barn="cut"]').click();
  const barnUpgradeResult = await barnUpgradeResponse;
  assert.equal(barnUpgradeResult.status(), 200);
  const upgradedBarnState = (await barnUpgradeResult.json()).me;
  assert.equal(upgradedBarnState.gold, 0);
  assert.equal(upgradedBarnState.barns.cut.level, 2);
  assert.equal(upgradedBarnState.barns.cut.capacity, ANIMALS.cut.capacities[1]);
  assert.deepEqual(db.prepare('SELECT * FROM animals WHERE owner_id = 1 ORDER BY id').all(), upgradeAnimalsBefore,
    'Barn upgrades must preserve animals and their running production schedule');
  assert.equal(JSON.parse(db.prepare('SELECT barn_levels_json FROM farmers WHERE user_id = 1').get().barn_levels_json).cut, 2);
  const exchangePack = GEM_PACKS[0];
  db.prepare('UPDATE farmers SET gold = ?, gems = 7 WHERE user_id = 1').run(exchangePack.gold - 1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="shop"]').click();
  await page.locator('[data-shop-category="gems"]').click();
  const exchangeCard = page.locator(`[data-gem-pack="${exchangePack.id}"]`);
  const exchangeButton = page.locator(`[data-buy-gems="${exchangePack.id}"]`);
  assert.match(await exchangeCard.locator('.gem-exchange-balance').innerText(), /Thiếu 1 vàng/);
  assert.equal(await exchangeButton.isDisabled(), true);
  db.prepare('UPDATE farmers SET gold = ? WHERE user_id = 1').run(exchangePack.gold);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.dock-btn[data-sheet="shop"]').click();
  await page.locator('[data-shop-category="gems"]').click();
  assert.match(await exchangeCard.locator('.gem-exchange-balance').innerText(), new RegExp(`còn 0 vàng · có ${7 + exchangePack.gems} kim cương`));
  await checkNoOverflow(page, '320px gem exchange');
  await auditAccessibility(page, 'gem-exchange-320');
  await page.screenshot({ path: resolve(outputDir, 'gem-exchange-320.png') });
  const exchangeBefore = db.prepare('SELECT gold, gems, sunk_gold FROM farmers WHERE user_id = 1').get();
  page.once('dialog', (dialog) => dialog.dismiss());
  await exchangeButton.click();
  assert.deepEqual(db.prepare('SELECT gold, gems, sunk_gold FROM farmers WHERE user_id = 1').get(), exchangeBefore,
    'Cancelling the gem exchange must preserve currency');
  const exchangeResponse = page.waitForResponse((response) => response.url().endsWith('/farm/api/buy-gems') && response.request().method() === 'POST');
  page.once('dialog', (dialog) => dialog.accept());
  await exchangeButton.click();
  assert.equal((await exchangeResponse).status(), 200);
  await exchangeCard.locator('.gem-exchange-balance').filter({ hasText: 'Thiếu' }).waitFor();
  assert.deepEqual(db.prepare('SELECT gold, gems, sunk_gold FROM farmers WHERE user_id = 1').get(), {
    gold: 0, gems: 7 + exchangePack.gems, sunk_gold: exchangeBefore.sunk_gold + exchangePack.gold,
  });
  assert.equal(await page.locator('[data-shop-category="gems"]').getAttribute('aria-pressed'), 'true');
  assert.deepEqual(pageErrors, []);
  console.log('Browser smoke passed at 320px, 390px, 768px, 844px landscape, 1180px, and 1280px; screenshots saved in artifacts/browser.');
} finally {
  await browser?.close();
  await app.close();
  db.close();
  await new Promise((resolve) => chatServer.close(resolve));
}
