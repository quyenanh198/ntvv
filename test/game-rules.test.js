import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CROPS,
  GOODS,
  ANIMALS,
  MACHINES,
  TREES,
  SKILLS,
  SKILL_NODES,
  ANIMAL_PRODUCTS,
  MACHINE_PRODUCTS,
  FESTIVAL,
  festivalCycle,
  critterKindFor,
  scaleMs,
  todayVN,
  yesterdayVN,
  thiefDayKey,
  THIEF_REWARDS,
  thiefEconomyMult,
  TAX_PER_PLOT,
  MACHINE_UPGRADE_GOLD,
  LOTTERY,
  MARKET_SAT,
  LUXURY,
  CANSA,
  GEM_PACKS,
  levelFor,
  levelInfo,
  xpNeedFor,
  speedupCost,
  welcomeGift,
  itemInfo,
  ORDER_SLOTS,
  ORDER_UNLOCK_LEVEL,
  ORDER_REFRESH_MS,
  ORDER_BOARD_REFRESH_MS,
  MACHINE_QUEUE_MAX,
  WANT_MARKUP,
  WANT_MAX_QTY,
  WANT_MAX_OPEN,
  DOG,
  generateOrder,
  DAILY_QUESTS,
  DAILY_CHEST,
  STAR_MILESTONES,
  POACH_DAILY_LIMIT,
  POACH_EXP,
  POACH_YIELD,
  POACH_AGAIN_MS,
  PLANT_HELP_EXP,
  HARVEST_YIELD,
  WATER_HELPER_GOLD,
  WATER_HELP_COOLDOWN_MS,
  WATER_HELP_BOOST_MS,
  WATER_HELPER_EXP,
  WATER_FRESH_EXP,
  START_PLOTS,
  EXPANSIONS,
  MAX_PLOTS,
  START_GOLD,
  START_GEMS,
  ENERGY,
  FISHING,
  FISH_FARM,
  FISH_STOCK_BY_LEVEL,
  rollFish,
  COOP_LEVELS,
  COOP_UPGRADE_GOLD,
  POND_LEVELS,
  POND_UPGRADE_GOLD,
  skillCost,
} from '../server/src/game.js';

test('CROP BALANCE: all crops have valid positive stats and unlock levels', () => {
  assert.ok(Object.keys(CROPS).length >= 25);
  for (const [id, c] of Object.entries(CROPS)) {
    assert.equal(c.id, id);
    assert.ok(c.name && typeof c.name === 'string');
    assert.ok(c.level >= 1);
    assert.ok(c.growMs > 0);
    assert.ok(c.seed >= 0);
    if (!c.risky) {
      assert.ok(c.sell > c.seed, `Crop ${id} sell price must exceed seed cost`);
      assert.ok(c.expHarvest >= c.expSow);
    }
  }
});

test('GOODS BALANCE: animal and machine products have valid prices and sources', () => {
  assert.ok(Object.keys(GOODS).length >= 30);
  for (const [id, g] of Object.entries(GOODS)) {
    assert.equal(g.id, id);
    assert.ok(g.name && typeof g.name === 'string');
    assert.ok(g.source);
    if (id !== 'thucan') {
      assert.ok(g.sell > 0, `Goods ${id} must have positive sell price`);
    }
  }
});

test('ITEM INFO HELPER: resolves crops, goods, and returns null for unknown items', () => {
  const lua = itemInfo('luami');
  assert.ok(lua);
  assert.equal(lua.name, 'Lúa mì');

  const egg = itemInfo('trung');
  assert.ok(egg);
  assert.equal(egg.name, 'Trứng');

  const unknown = itemInfo('non_existent_item_xyz');
  assert.equal(unknown, null);
});

test('LEVEL PROGRESSION: levelFor correctly maps xp to levels and increases monotonically', () => {
  assert.equal(levelFor(0), 1);
  assert.equal(levelFor(10), 1);

  let cumulativeXp = 0;
  for (let lv = 1; lv <= 30; lv += 1) {
    const need = xpNeedFor(lv);
    assert.ok(need > 0, `xp for level ${lv} should be positive`);
    cumulativeXp += need;
    assert.equal(levelFor(cumulativeXp), lv + 1);
  }
});

test('LEVEL INFO: returns current level, into, and need', () => {
  const info = levelInfo(150);
  assert.ok(info.level >= 1);
  assert.ok(info.into >= 0);
  assert.ok(info.need > 0);
  assert.ok(info.into <= info.need);
});

test('SPEEDUP COST: gem cost scales proportionally with remaining time', () => {
  const cost0 = speedupCost(0);
  assert.equal(cost0, 1);

  const cost1m = speedupCost(60_000);
  const cost10m = speedupCost(600_000);
  const cost1h = speedupCost(3_600_000);

  assert.equal(cost1m, 1);
  assert.equal(cost10m, 2);
  assert.equal(cost1h, 12);
  assert.ok(cost1h > cost10m);
});

test('SCALE MS: fast mode accelerates clocks by 60x with floor of 3000ms', () => {
  assert.equal(scaleMs(60_000, true), 3_000);
  assert.equal(scaleMs(360_000, true), 6_000);
  assert.equal(scaleMs(60_000, false), 60_000);
});

test('WELCOME GIFT: grants progressive catchup gold based on village max level', () => {
  const giftNovice = welcomeGift(1, 1);
  assert.ok(giftNovice >= 0);

  const giftCatchup = welcomeGift(1, 50);
  assert.ok(giftCatchup > giftNovice, 'Catchup gift should be greater in advanced village');

  const giftAdvanced = welcomeGift(45, 50);
  assert.ok(giftAdvanced >= giftNovice);
});

test('DATE HELPERS: todayVN and yesterdayVN format valid ISO dates in Asia/Ho_Chi_Minh', () => {
  const now = Date.now();
  const today = todayVN(now);
  const yest = yesterdayVN(now);

  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(yest, /^\d{4}-\d{2}-\d{2}$/);
  assert.notEqual(today, yest);
});

test('THIEF SETTLEMENT: thiefDayKey respects Los Angeles 9 AM cutoff', () => {
  const key = thiefDayKey();
  assert.match(key, /^la-\d{4}-\d{2}-\d{2}$/);
});

test('THIEF ECONOMY: multiplier scales with village total gold', () => {
  assert.equal(thiefEconomyMult(0), 1);
  assert.equal(thiefEconomyMult(4_999_999), 1);
  assert.equal(thiefEconomyMult(5_000_000), 2);
  assert.equal(thiefEconomyMult(10_000_000), 3);
  assert.equal(thiefEconomyMult(25_000_000), 6);
});

test('FESTIVAL: cycle calculations and milestone rewards integrity', () => {
  const { cycle, daysLeft } = festivalCycle();
  assert.ok(cycle >= 0);
  assert.ok(daysLeft >= 1 && daysLeft <= FESTIVAL.cycleDays);

  assert.ok(Array.isArray(FESTIVAL.milestones));
  assert.ok(FESTIVAL.milestones.length >= 5);
  for (const m of FESTIVAL.milestones) {
    assert.ok(m.id >= 1);
    assert.ok(m.target > 0);
    assert.ok(m.gold || m.gems);
  }
});

test('CRITTER KIND: deterministic lucky critter emoji based on timestamp', () => {
  const c1 = critterKindFor(100);
  const c2 = critterKindFor(100);
  const c3 = critterKindFor(101);

  assert.equal(c1, c2);
  assert.ok(typeof c1 === 'string');
  assert.ok(typeof c3 === 'string');
});

test('SKILLS TREE: branches and nodes structure verification', () => {
  assert.ok(SKILLS.branches.length >= 3);
  for (const b of SKILLS.branches) {
    assert.ok(b.id && b.name && b.emoji);
    assert.ok(b.nodes.length >= 4);
    for (const n of b.nodes) {
      assert.ok(n.id && n.name && n.desc);
      assert.ok(n.cost >= 1);
      assert.ok(SKILL_NODES[n.id]);
    }
  }
});

test('SKILL COST: calculates increasing point cost per rank', () => {
  const testNode = { cost: 2 };
  assert.equal(skillCost(testNode, 1), 2);
  assert.equal(skillCost(testNode, 2), 4);
  assert.equal(skillCost(testNode, 3), 6);
});

test('ECONOMIC CONSTANTS: anti-inflation sinks and pricing thresholds', () => {
  assert.equal(TAX_PER_PLOT, 2000);
  assert.ok(MACHINE_UPGRADE_GOLD.length === 5);
  assert.ok(MACHINE_UPGRADE_GOLD.every((c, i, a) => i === 0 || c > a[i - 1]));

  assert.ok(LOTTERY.ticket > 0);
  assert.ok(LOTTERY.shares.reduce((a, b) => a + b, 0) <= 1.0001);

  assert.ok(MARKET_SAT.floor < 1 && MARKET_SAT.floor > 0);
  assert.ok(MARKET_SAT.cap > 0);

  assert.ok(GEM_PACKS.length >= 3);
  for (const p of GEM_PACKS) {
    assert.ok(p.gems > 0 && p.gold > 0);
  }

  assert.ok(CANSA.reward > CANSA.bounty);
});

test('LUXURY CATALOGUE: frames, titles, decor and pets have valid attributes', () => {
  const items = Object.values(LUXURY);
  assert.ok(items.length >= 30);

  const kinds = new Set(['title', 'frame', 'decor', 'pet']);
  for (const item of items) {
    assert.ok(kinds.has(item.kind), `Item ${item.id} has invalid kind: ${item.kind}`);
    assert.ok(item.price >= 5_000_000, `Luxury item ${item.id} price should be >= 5M`);
    assert.ok(item.emoji && item.name && item.desc);
  }
});

test('TRADE ORDERS: order slots and refresh intervals', () => {
  assert.equal(ORDER_SLOTS, 4);
  assert.equal(ORDER_UNLOCK_LEVEL, 5);
  assert.ok(ORDER_REFRESH_MS > 0);
  assert.ok(ORDER_BOARD_REFRESH_MS > ORDER_REFRESH_MS);

  const order = generateOrder(10, Math.random);
  assert.ok(order.items && Object.keys(order.items).length >= 1);
  assert.ok(order.gold > 0);
  assert.ok(order.exp > 0);
  assert.ok(order.stars >= 1);
});

test('MARKETPLACE WANTS: rules for peer-to-peer buying markup and caps', () => {
  assert.equal(WANT_MARKUP, 1.3);
  assert.equal(WANT_MAX_QTY, 999);
  assert.equal(WANT_MAX_OPEN, 5);
});

test('WATCHDOG: pricing tiers, catch chance, and fine calculations', () => {
  assert.ok(DOG.catchChance > 0 && DOG.catchChance < 1);
  assert.ok(DOG.pricePerHour > 0);
  assert.ok(DOG.hoursOptions.length >= 3);
  assert.ok(DOG.onlineBonus > 0);
});

test('DAILY QUESTS & CHEST: reward tiers and counter thresholds', () => {
  assert.ok(DAILY_QUESTS.length >= 4);
  for (const q of DAILY_QUESTS) {
    assert.ok(q.id && q.name && q.target > 0);
  }
  assert.ok(DAILY_CHEST.gold > 0);
  assert.ok(DAILY_CHEST.exp > 0);
  assert.ok(DAILY_CHEST.gemChance > 0);
  assert.ok(DAILY_CHEST.questsRequired > 0);
});

test('STAR MILESTONES: rewards increase at higher star thresholds', () => {
  assert.ok(STAR_MILESTONES.length >= 5);
  let prevStars = 0;
  for (const ms of STAR_MILESTONES) {
    assert.ok(ms.stars > prevStars, 'Milestones should require strictly increasing stars');
    assert.ok(ms.gold > 0 || ms.gems > 0);
    prevStars = ms.stars;
  }
});

test('POACHING RULES: daily limits and cooldowns', () => {
  assert.ok(POACH_DAILY_LIMIT > 0);
  assert.ok(POACH_EXP > 0);
  assert.ok(POACH_YIELD >= 1);
  assert.ok(POACH_AGAIN_MS > 0);
});

test('WATER & HARVEST: yields and helper boost mechanics', () => {
  assert.equal(HARVEST_YIELD, 4);
  assert.ok(PLANT_HELP_EXP > 0);
  assert.ok(WATER_HELPER_GOLD > 0);
  assert.ok(WATER_HELP_COOLDOWN_MS > 0);
  assert.ok(WATER_HELP_BOOST_MS > 0);
  assert.ok(WATER_HELPER_EXP > 0);
  assert.ok(WATER_FRESH_EXP > 0);
});

test('FARM PLOT EXPANSION: progression steps up to MAX_PLOTS', () => {
  assert.equal(START_PLOTS, 12);
  assert.ok(MAX_PLOTS >= 36);
  assert.ok(EXPANSIONS.length >= 6);

  let prevPlots = START_PLOTS;
  for (const exp of EXPANSIONS) {
    assert.ok(exp.level >= 1);
    assert.ok(exp.gold > 0);
    prevPlots += 4;
  }
  assert.equal(prevPlots, MAX_PLOTS);
});

test('POND FISHING: energy, catch tables and roll fish logic', () => {
  assert.ok(ENERGY.max >= 20);
  assert.ok(ENERGY.regenMs > 0);
  assert.ok(FISHING.level >= 1);

  const fishId = rollFish(Math.random);
  assert.ok(['canho', 'caro', 'cachep', 'cakoi'].includes(fishId));
});

test('BUILDING UPGRADES: coop and pond capacity scaling', () => {
  assert.ok(COOP_LEVELS.length >= 3);
  assert.ok(POND_LEVELS.length >= 3);
  for (const cap of COOP_LEVELS) {
    assert.ok(cap > 0);
  }
  for (const fishPerCast of POND_LEVELS) {
    assert.ok(fishPerCast >= 1);
  }
  assert.ok(COOP_UPGRADE_GOLD.length === COOP_LEVELS.length - 1);
  assert.ok(POND_UPGRADE_GOLD.length === POND_LEVELS.length - 1);
});

test('FRUIT TREES: multiple cycles and harvest yields', () => {
  assert.ok(Object.keys(TREES).length >= 4);
  for (const [id, t] of Object.entries(TREES)) {
    assert.equal(t.id, id);
    assert.ok(t.name);
    assert.ok(t.growMs > 0);
    assert.ok(t.cycleMs > 0);
    assert.ok(t.lifeMs > t.growMs);
    assert.ok(t.yield >= 1);
    assert.ok(t.sell > 0);
  }
});

test('ANIMAL CATALOGUE: feed requirements, level gates and products', () => {
  const animals = Object.values(ANIMALS);
  assert.ok(animals.length >= 4);
  for (const a of animals) {
    assert.ok(a.id && a.name && a.product);
    assert.ok(a.level >= 1);
    assert.ok(a.price > 0);
    assert.ok(a.produceMs > 0);
    assert.ok(ANIMAL_PRODUCTS.has(a.product));
  }
});

test('PROCESSING MACHINES: recipes, input goods and output goods', () => {
  const machines = Object.values(MACHINES);
  assert.ok(machines.length >= 5);
  for (const m of machines) {
    assert.ok(m.id && m.name);
    assert.ok(m.level >= 1);
    assert.ok(Object.keys(m.recipes).length >= 1);
    for (const [rId, r] of Object.entries(m.recipes)) {
      assert.ok(r.name);
      assert.ok(r.ms > 0);
      assert.ok(r.in && Object.keys(r.in).length >= 1);
      assert.ok(r.out && Object.keys(r.out).length >= 1);
    }
  }
});

test('INITIAL CONDITIONS: starting currency and inventory constants', () => {
  assert.equal(START_GOLD, 500);
  assert.equal(START_GEMS, 50);
  assert.equal(MACHINE_QUEUE_MAX, 50);
});
