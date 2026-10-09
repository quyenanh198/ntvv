import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { ANIMALS, CROPS, EXPANSIONS, FEED_ITEM, GOLD_MULT, HARVEST_YIELD, LAND_TAX_UNLOCK_LEVEL, MACHINES, MAX_PLOTS, ORDER_BOARD_REFRESH_MS, ORDER_UNLOCK_LEVEL, START_GOLD, START_PLOTS, TAX_PER_PLOT, generateOrder, itemInfo, xpNeedFor } from '../server/src/game.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const crops = Object.values(CROPS).filter((crop) => !crop.risky && crop.sell > 0).map((crop) => ({
  ...crop,
  minutes: crop.growMs / 60_000,
  gross: crop.sell * GOLD_MULT * HARVEST_YIELD,
  profit: crop.sell * GOLD_MULT * HARVEST_YIELD - crop.seed,
  xp: crop.expSow + crop.expHarvest,
}));
const rank = (items, score) => [...items].sort((a, b) => score(b) - score(a) || a.level - b.level)[0];
const name = (crop) => `${crop.name} (${crop.id})`;
const fmt = (value) => Math.round(value).toLocaleString('en-US');
const hours = (value) => `${value < 10 ? value.toFixed(1) : fmt(value)} h`;
const cadenceMinutes = [10, 60, 480];
const hourly = (crop, cadence) => crop.profit * 60 / Math.max(crop.minutes, cadence);
const xpHourly = (crop, cadence) => crop.xp * 60 / Math.max(crop.minutes, cadence);
const maxLevel = Math.max(...crops.map((crop) => crop.level));
const milestones = [...new Set([1, 4, 8, 13, 20, maxLevel])];
const levelRows = milestones.map((level) => {
  const available = crops.filter((crop) => crop.level <= level);
  const best = cadenceMinutes.map((cadence) => rank(available, (crop) => hourly(crop, cadence)));
  const xpCrop = rank(available, (crop) => xpHourly(crop, 60));
  const xpHours = xpNeedFor(level) / (xpHourly(xpCrop, 60) * START_PLOTS);
  return `| ${level} | ${fmt(xpNeedFor(level))} | ${best.map((crop, i) => `${name(crop)} (${fmt(hourly(crop, cadenceMinutes[i]))}/h)`).join(' | ')} | ${name(xpCrop)} (${hours(xpHours)}) |`;
});
const unlockRows = [...crops].sort((a, b) => a.level - b.level || a.id.localeCompare(b.id)).map((crop) =>
  `| ${crop.level} | ${name(crop)} | ${fmt(crop.minutes)} | ${fmt(crop.seed)} | ${fmt(crop.profit)} | ${crop.xp} | ${fmt(hourly(crop, 60))} |`);
const unprofitable = crops.filter((crop) => crop.profit <= 0);
const unaffordable = crops.filter((crop) => crop.level === 1 && crop.seed > START_GOLD);
const wheat = crops.find((crop) => crop.id === 'luami');
const expansionModel = EXPANSIONS.map((expansion, index) => {
  const available = crops.filter((crop) => crop.level <= expansion.level);
  const oneVisit = rank(available, (crop) => hourly(crop, 1440));
  const threeVisits = rank(available, (crop) => hourly(crop, 480));
  const tax = expansion.level >= LAND_TAX_UNLOCK_LEVEL ? TAX_PER_PLOT : 0;
  const dailyOne = hourly(oneVisit, 1440) * 24 - tax;
  const dailyThree = hourly(threeVisits, 480) * 24 - tax;
  return { ...expansion, index, plots: START_PLOTS + 4 * (index + 1), tax,
    oneVisit, threeVisits, dailyOne, dailyThree,
    paybackDays: dailyThree > 0 ? expansion.gold / (4 * dailyThree) : Infinity };
});
const sampledExpansionIndexes = [...new Set([0, 4, 9, 19, 24, 49, 74, EXPANSIONS.length - 1])].filter((index) => index < EXPANSIONS.length);
const expansionRows = sampledExpansionIndexes.map((index) => {
  const row = expansionModel[index];
  return `| ${index + 1} | ${row.level} | ${row.plots} | ${fmt(row.gold)} | ${fmt(row.tax)} | ${name(row.oneVisit)}: ${fmt(row.dailyOne)} | ${name(row.threeVisits)}: ${fmt(row.dailyThree)} | ${Number.isFinite(row.paybackDays) ? row.paybackDays.toFixed(1) : 'never'} |`;
});
const nonpositiveExpansionIncome = expansionModel.filter((row) => row.dailyOne <= 0 || row.dailyThree <= 0);
const longestPayback = [...expansionModel].sort((a, b) => b.paybackDays - a.paybackDays)[0];
const machineModels = Object.values(MACHINES).sort((a, b) => a.level - b.level).map((machine) => {
  const recipes = Object.values(machine.recipes).map((recipe) => {
    const inputValue = Object.entries(recipe.in).reduce((sum, [id, qty]) => {
      const item = itemInfo(id);
      return sum + qty * (item?.sell > 0 ? item.sell * GOLD_MULT : item?.buy || 0);
    }, 0);
    const outputValue = Object.entries(recipe.out).reduce((sum, [id, qty]) => sum + qty * (itemInfo(id)?.sell || 0) * GOLD_MULT, 0);
    const margin = outputValue - inputValue;
    return { ...recipe, margin, perHour: margin * 3_600_000 / recipe.ms, sellable: outputValue > 0 };
  });
  return { ...machine, recipes, best: rank(recipes.filter((recipe) => recipe.sellable), (recipe) => recipe.perHour) };
});
const machineRows = machineModels.map((machine) => `| ${machine.name} | ${machine.level} | ${machine.recipes.length} | ${machine.best.name} | ${fmt(machine.best.margin)} | ${fmt(machine.best.perHour)} |`);
const supplyRows = machineModels.map((machine) => {
  const cropRecipes = machine.recipes.filter((recipe) => recipe.sellable && Object.keys(recipe.in).every((id) => CROPS[id]?.level <= machine.level));
  const ranked = cropRecipes.map((recipe) => {
    const plotDaysPerBatch = Object.entries(recipe.in).reduce((sum, [id, qty]) => {
      const cropCyclesPerDay = 1440 / Math.max(CROPS[id].growMs / 60_000, 480);
      return sum + qty / (HARVEST_YIELD * cropCyclesPerDay);
    }, 0);
    const machineBatches = 86_400_000 / recipe.ms;
    const cropBatches = START_PLOTS / plotDaysPerBatch;
    const batches = Math.min(machineBatches, cropBatches);
    return { ...recipe, plotDaysPerBatch, machineBatches, cropBatches, batches, marginPerDay: batches * recipe.margin };
  });
  const best = rank(ranked, (recipe) => recipe.marginPerDay);
  return `| ${machine.name} | ${machine.level} | ${cropRecipes.length} | ${best ? best.name : 'none'} | ${best ? best.plotDaysPerBatch.toFixed(2) : '—'} | ${best ? best.batches.toFixed(1) : '—'} | ${best ? fmt(best.marginPerDay) : '—'} | ${best ? (best.cropBatches < best.machineBatches ? 'crops' : 'machine') : '—'} |`;
});
const nonpositiveCrafts = machineModels.flatMap((machine) => machine.recipes.filter((recipe) => recipe.sellable && recipe.margin <= 0).map((recipe) => `${machine.id}/${recipe.id}`));
const utilityCrafts = machineModels.flatMap((machine) => machine.recipes.filter((recipe) => !recipe.sellable).map((recipe) => `${machine.id}/${recipe.id}`));
const feedPrice = itemInfo(FEED_ITEM).buy;
const animalModels = Object.values(ANIMALS).sort((a, b) => a.level - b.level).map((animal) => {
  const sale = itemInfo(animal.product).sell * GOLD_MULT;
  const feedCost = animal.feedQty * feedPrice;
  const margin = sale - feedCost;
  const dailyOne = margin;
  const dailyThree = margin * 3;
  return { ...animal, sale, feedCost, margin, dailyOne, dailyThree,
    paybackDays: dailyThree > 0 ? animal.price / dailyThree : Infinity };
});
const animalRows = animalModels.map((animal) =>
  `| ${animal.name} | ${animal.level} | ${fmt(animal.price)} | ${fmt(animal.produceMs / 60_000)} | ${fmt(animal.feedCost)} | ${fmt(animal.sale)} | ${fmt(animal.dailyOne)} | ${fmt(animal.dailyThree)} | ${Number.isFinite(animal.paybackDays) ? animal.paybackDays.toFixed(1) : 'never'} |`);
const nonpositiveAnimals = animalModels.filter((animal) => animal.margin <= 0);
let orderSeed = 0x4e545656;
const orderRng = () => {
  orderSeed = (Math.imul(orderSeed, 1664525) + 1013904223) >>> 0;
  return orderSeed / 0x100000000;
};
const orderLevels = [...new Set([ORDER_UNLOCK_LEVEL, 10, 20, 40, maxLevel])].sort((a, b) => a - b);
const orderSamples = 1000;
const orderRows = orderLevels.map((level) => {
  let baseSale = 0;
  let rewards = 0;
  let itemCount = 0;
  let zeroValue = 0;
  let cropOnly = 0;
  let freshCropReady = 0;
  for (let i = 0; i < orderSamples; i++) {
    const order = generateOrder(level, orderRng);
    const entries = Object.entries(order.items);
    const sale = Object.entries(order.items).reduce((sum, [id, qty]) => sum + (itemInfo(id)?.sell || 0) * qty * GOLD_MULT, 0);
    baseSale += sale;
    rewards += order.gold;
    itemCount += Object.keys(order.items).length;
    if (sale <= 0) zeroValue++;
    if (entries.every(([id]) => CROPS[id])) {
      cropOnly++;
      if (entries.every(([id, qty]) => CROPS[id].growMs <= ORDER_BOARD_REFRESH_MS && Math.ceil(qty / HARVEST_YIELD) <= START_PLOTS)) freshCropReady++;
    }
  }
  const premium = rewards - baseSale;
  return { level, baseSale, rewards, itemCount, zeroValue, premium, cropOnly, freshCropReady,
    row: `| ${level} | ${fmt(baseSale / orderSamples)} | ${fmt(rewards / orderSamples)} | ${fmt(premium / orderSamples)} | ${(premium / baseSale * 100).toFixed(1)}% | ${(itemCount / orderSamples).toFixed(2)} | ${zeroValue} |` };
});
const orderSupplyRows = orderRows.map((row) => `| ${row.level} | ${fmt(row.cropOnly)} (${(row.cropOnly / orderSamples * 100).toFixed(1)}%) | ${fmt(row.freshCropReady)} (${(row.freshCropReady / orderSamples * 100).toFixed(1)}%) |`);
const lines = [
  '# Farm progression balance report', '',
  'Generated from the live rules in `server/src/game.js` by `npm run balance:report`. This is a deterministic crop, expansion, and recipe opportunity-cost model, not observed player behavior or a complete economy forecast.', '',
  `Crop assumptions: ${START_PLOTS} starting plots; ${START_GOLD} starting gold; ${HARVEST_YIELD} items from an untouched plot; ${GOLD_MULT}× sale-gold multiplier; one seed purchase, harvest, and sale per cycle. A cycle takes the longer of crop growth time or the visit interval. Crop cadence figures exclude action time, saturation, skills, quests, orders, taxes, gifts, upgrades, and offline effects. The expansion section adds land tax explicitly.`, '',
  '## Visit-cadence comparison', '',
  '| Level | XP to next | Best profit at 10-min visits | Best profit at 60-min visits | Best profit at 8-hour visits | Fastest XP at 60-min visits (all starting plots) |',
  '| ---: | ---: | --- | --- | --- | --- |', ...levelRows, '',
  'The level time is a lower bound: it assumes every starting plot runs the best available crop continuously and the player collects on schedule. It does not include any other XP source or time spent interacting.', '',
  '## All regular crop unlocks', '',
  '| Unlock | Crop | Grow min | Seed | Base profit/plot | XP/plot | Profit/h at 60-min visits |',
  '| ---: | --- | ---: | ---: | ---: | ---: | ---: |', ...unlockRows, '',
  '## Expansion and land-tax stress test', '',
  `The ${EXPANSIONS.length} live expansions add four plots each, from ${START_PLOTS} to ${MAX_PLOTS}. Rows below sample early, middle, and late prices; all expansions are included in the checks. Each daily-net figure is for one new plot after seed cost and daily land tax, using the most profitable crop unlocked at the expansion level. One visit means a 24-hour interval; three visits means an 8-hour interval. Payback divides expansion price by the daily net of four new plots at three visits. This assumes every new plot is planted and harvested on schedule and excludes other income and costs.`, '',
  '| Expansion | Level | Plots after | Price | Tax/new plot/day | Best net/plot, 1 visit/day | Best net/plot, 3 visits/day | Payback, 3 visits (days) |',
  '| ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |', ...expansionRows, '',
  `- Expansions with nonpositive new-plot income at either cadence: ${nonpositiveExpansionIncome.length ? nonpositiveExpansionIncome.map((row) => row.index + 1).join(', ') : 'none'}.`,
  `- Longest modeled three-visit payback: expansion ${longestPayback.index + 1}, ${longestPayback.paybackDays.toFixed(1)} days. This is a crop-only warning, not a forecast of total late-game income.`, '',
  '## Processing opportunity cost', '',
  'For each sellable recipe, output sale value minus the sale value forgone by using its inputs gives a per-batch margin. Both sale values use the live gold multiplier; inputs bought from the shop use their purchase price. The table shows the highest margin per machine-hour from the full recipe catalog. It assumes unlimited inputs, no queue gaps, no sale-price saturation, and no prerequisite timing; some recipes need ingredients unlocked later than the machine. It is an upper-bound comparison, not achievable daily income.', '',
  '| Machine | Machine unlock | Recipes | Best catalog recipe | Margin/batch | Margin/machine-hour |',
  '| --- | ---: | ---: | --- | ---: | ---: |', ...machineRows, '',
  `- Sellable recipes with nonpositive opportunity margin: ${nonpositiveCrafts.length ? nonpositiveCrafts.join(', ') : 'none'}.`,
  `- Utility recipes without a sale price excluded from the ranking: ${utilityCrafts.length ? utilityCrafts.join(', ') : 'none'}.`, '',
  '## Field-crop supply for direct recipes', '',
  `This narrower model includes only sellable recipes whose ingredients are all field crops already unlocked when the machine opens. It assigns the ${START_PLOTS} starting plots across those crops, assumes three evenly spaced visits per day, ${HARVEST_YIELD} items per harvest, and continuous machine operation. Fractional plot allocation gives an upper bound. It ignores inventory carried in, expansion plots, growth bonuses, sale saturation, queue gaps, and time or gold to acquire ingredients from animals, trees, fish, or earlier machines. The last column identifies the tighter of crop supply and machine time for the best daily-margin recipe in this narrow set.`, '',
  '| Machine | Unlock | Eligible direct recipes | Best crop-only recipe | Plot-days/batch | Upper-bound batches/day | Margin/day | Tightest limit |',
  '| --- | ---: | ---: | --- | ---: | ---: | ---: | --- |', ...supplyRows, '',
  '## Animal feed and sale model', '',
  `Each animal is fed with shop-bought ${FEED_ITEM} at ${fmt(feedPrice)} gold per unit, then produces one item after its live timer. Sale values use the ${GOLD_MULT}× gold multiplier. A visit collects one ready product and feeds the animal for its next cycle. The one-visit and three-visit cases therefore allow at most one or three sales per day per animal, even when the timer is shorter. The model excludes barn construction, capacity upgrades, order premiums, and time spent acquiring an animal; payback covers only its purchase price.`, '',
  '| Animal | Unlock | Purchase | Produce min | Feed/cycle | Sale/cycle | Net, 1 visit/day | Net, 3 visits/day | Purchase payback, 3 visits (days) |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |', ...animalRows, '',
  `- Animals with nonpositive feed-adjusted sale margin: ${nonpositiveAnimals.length ? nonpositiveAnimals.map((animal) => animal.id).join(', ') : 'none'}.`, '',
  '## Order sale premium', '',
  `The regular order generator used for slots 1–3 was sampled ${fmt(orderSamples)} times at each listed level with a fixed random seed. Slot 0 now guarantees one fast field-crop order. The premium compares the regular order reward with selling the identical requested items directly, using the live sale multiplier. These figures describe generated offers, not completed orders or daily income: ingredient availability, production time, board refreshes, and player choice are excluded.`, '',
  '| Level | Mean direct sale | Mean order gold | Mean extra gold/order | Extra % | Mean item kinds | Zero-value offers |',
  '| ---: | ---: | ---: | ---: | ---: | ---: | ---: |', ...orderRows.map((row) => row.row), '',
  '## Fresh-field order availability', '',
  `The order board refreshes every ${ORDER_BOARD_REFRESH_MS / 60_000} minutes. These same deterministic samples count regular orders composed only of field crops and the subset whose crops can grow from seed before that refresh on the ${START_PLOTS}-plot starter farm. Slot 0 is deliberately generated as a single fast-crop order and is always feasible under these crop assumptions. Each requested quantity is at most one plot's ${HARVEST_YIELD}-item harvest. This is a strict no-stock, crop-only scenario, not an actual completion rate: existing inventory, animals, trees, fish, flour, expansions, watering, and player choice can improve it.`, '',
  '| Level | Crop-only offers / 1,000 | Fresh crop offers within board window / 1,000 |',
  '| ---: | ---: | ---: |', ...orderSupplyRows, '',
  '## Automated viability checks', '',
  `- Nonprofitable regular crops: ${unprofitable.length ? unprofitable.map(name).join(', ') : 'none'}.`,
  `- Starter seeds above starting gold: ${unaffordable.length ? unaffordable.map(name).join(', ') : 'none'}.`,
  `- A full ${START_PLOTS}-plot wheat harvest yields ${fmt(wheat.profit * START_PLOTS)} base profit. The old gameplay specification's level 1–5 daily-income target of 500–1,500 gold is below two such harvests. Reconcile the target with observed play before tuning prices.`, '',
  '## Next balance decisions', '',
  '1. Record actual visit intervals, crop selections, sales, and time to each level before changing constants.',
  '2. Choose target session lengths and daily gold ranges for early, middle, and late play; compare measured results with the cadence rows.',
  '3. Extend the supply model to owned animals, trees, fish, and chained recipes; measure actual order completion before tuning land prices or order generation.', '',
];
const report = `${lines.join('\n')}\n`;
if (process.argv.includes('--write')) writeFileSync(resolve(root, 'docs/balance-report.md'), report);
else process.stdout.write(report);
