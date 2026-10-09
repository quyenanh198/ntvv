import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { CROPS, EXPANSIONS, GOLD_MULT, HARVEST_YIELD, LAND_TAX_UNLOCK_LEVEL, MACHINES, MAX_PLOTS, START_GOLD, START_PLOTS, TAX_PER_PLOT, itemInfo, xpNeedFor } from '../server/src/game.js';

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
const nonpositiveCrafts = machineModels.flatMap((machine) => machine.recipes.filter((recipe) => recipe.sellable && recipe.margin <= 0).map((recipe) => `${machine.id}/${recipe.id}`));
const utilityCrafts = machineModels.flatMap((machine) => machine.recipes.filter((recipe) => !recipe.sellable).map((recipe) => `${machine.id}/${recipe.id}`));
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
  '## Automated viability checks', '',
  `- Nonprofitable regular crops: ${unprofitable.length ? unprofitable.map(name).join(', ') : 'none'}.`,
  `- Starter seeds above starting gold: ${unaffordable.length ? unaffordable.map(name).join(', ') : 'none'}.`,
  `- A full ${START_PLOTS}-plot wheat harvest yields ${fmt(wheat.profit * START_PLOTS)} base profit. The old gameplay specification's level 1–5 daily-income target of 500–1,500 gold is below two such harvests. Reconcile the target with observed play before tuning prices.`, '',
  '## Next balance decisions', '',
  '1. Record actual visit intervals, crop selections, sales, and time to each level before changing constants.',
  '2. Choose target session lengths and daily gold ranges for early, middle, and late play; compare measured results with the cadence rows.',
  '3. Add ingredient supply, animals, and orders to the machine model; compare achievable income with the late-expansion payback warning before tuning land prices.', '',
];
const report = `${lines.join('\n')}\n`;
if (process.argv.includes('--write')) writeFileSync(resolve(root, 'docs/balance-report.md'), report);
else process.stdout.write(report);
