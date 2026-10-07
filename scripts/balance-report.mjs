import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { CROPS, GOLD_MULT, HARVEST_YIELD, START_GOLD, START_PLOTS, xpNeedFor } from '../server/src/game.js';

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
const lines = [
  '# Crop progression balance report', '',
  'Generated from the live rules in `server/src/game.js` by `npm run balance:report`. This is a deterministic crop-only baseline, not observed player behavior or a complete economy forecast.', '',
  `Assumptions: ${START_PLOTS} starting plots; ${START_GOLD} starting gold; ${HARVEST_YIELD} items from an untouched plot; ${GOLD_MULT}× sale-gold multiplier; one seed purchase, harvest, and sale per cycle. A cycle takes the longer of crop growth time or the visit interval. This excludes action time, saturation, skills, quests, orders, taxes, gifts, upgrades, and offline effects.`, '',
  '## Visit-cadence comparison', '',
  '| Level | XP to next | Best profit at 10-min visits | Best profit at 60-min visits | Best profit at 8-hour visits | Fastest XP at 60-min visits (all starting plots) |',
  '| ---: | ---: | --- | --- | --- | --- |', ...levelRows, '',
  'The level time is a lower bound: it assumes every starting plot runs the best available crop continuously and the player collects on schedule. It does not include any other XP source or time spent interacting.', '',
  '## All regular crop unlocks', '',
  '| Unlock | Crop | Grow min | Seed | Base profit/plot | XP/plot | Profit/h at 60-min visits |',
  '| ---: | --- | ---: | ---: | ---: | ---: | ---: |', ...unlockRows, '',
  '## Automated viability checks', '',
  `- Nonprofitable regular crops: ${unprofitable.length ? unprofitable.map(name).join(', ') : 'none'}.`,
  `- Starter seeds above starting gold: ${unaffordable.length ? unaffordable.map(name).join(', ') : 'none'}.`,
  `- A full ${START_PLOTS}-plot wheat harvest yields ${fmt(wheat.profit * START_PLOTS)} base profit. The old gameplay specification's level 1–5 daily-income target of 500–1,500 gold is below two such harvests. Reconcile the target with observed play before tuning prices.`, '',
  '## Next balance decisions', '',
  '1. Record actual visit intervals, crop selections, sales, and time to each level before changing constants.',
  '2. Choose target session lengths and daily gold ranges for early, middle, and late play; compare measured results with the cadence rows.',
  '3. Model expansion, animals, machines, orders, and taxes alongside crops; rerun this report after any rule change.', '',
];
const report = `${lines.join('\n')}\n`;
if (process.argv.includes('--write')) writeFileSync(resolve(root, 'docs/balance-report.md'), report);
else process.stdout.write(report);
