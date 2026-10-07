import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { CROPS, GOLD_MULT, HARVEST_YIELD, START_GOLD, START_PLOTS, xpNeedFor } from '../server/src/game.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const regular = Object.values(CROPS).filter((crop) => !crop.risky && crop.sell > 0);
const model = (crop) => ({
  ...crop,
  minutes: crop.growMs / 60_000,
  gross: crop.sell * GOLD_MULT * HARVEST_YIELD,
  profit: crop.sell * GOLD_MULT * HARVEST_YIELD - crop.seed,
  xp: crop.expSow + crop.expHarvest,
});
const rank = (crops, score) => [...crops].sort((a, b) => score(b) - score(a) || a.level - b.level)[0];
const name = (crop) => `${crop.name} (${crop.id})`;
const fmt = (value) => Math.round(value).toLocaleString('en-US');

const levels = Array.from({ length: 10 }, (_, index) => index + 1).map((level) => {
  const available = regular.filter((crop) => crop.level <= level).map(model);
  const fastGold = rank(available, (crop) => crop.profit / crop.minutes);
  const fastXp = rank(available, (crop) => crop.xp / crop.minutes);
  const oneVisit = rank(available, (crop) => crop.profit);
  const cycles = Math.ceil(xpNeedFor(level) / (fastXp.xp * START_PLOTS));
  return `| ${level} | ${fmt(xpNeedFor(level))} | ${name(fastGold)} (${fmt(fastGold.profit / fastGold.minutes)} gold/min/plot) | ${name(fastXp)} (${(fastXp.xp / fastXp.minutes).toFixed(1)} XP/min/plot) | ${name(oneVisit)} (${fmt(oneVisit.profit)} gold/harvest/plot) | ${cycles} |`;
});

const wheat = model(CROPS.luami);
const carrot = model(CROPS.carot);
const lines = [
  '# Early crop balance report', '',
  'Generated from the live rules in `server/src/game.js` by `npm run balance:report`. This is a baseline model, not observed player behavior.', '',
  `Assumptions: ${START_PLOTS} starting plots; ${START_GOLD} starting gold; ${HARVEST_YIELD} items from an untouched plot; ${GOLD_MULT}× sale-gold multiplier; one seed purchase, one harvest, and one sale per cycle. The model excludes market saturation, skill bonuses, quests, orders, taxes, gifts, offline time, and human interaction time.`, '',
  '| Level | XP to next | Fastest base gold | Fastest base XP | Best single visit | Cycles to next if all plots use fastest XP crop |',
  '| ---: | ---: | --- | --- | --- | ---: |', ...levels, '',
  '## First-session comparison', '',
  '| Crop | Grow time | Seed | Gross sale per plot | Base profit per plot | XP per plot |',
  '| --- | ---: | ---: | ---: | ---: | ---: |',
  ...[wheat, carrot].map((crop) => `| ${name(crop)} | ${crop.minutes} min | ${crop.seed} | ${crop.gross} | ${crop.profit} | ${crop.xp} |`), '',
  `A full ${START_PLOTS}-plot wheat harvest has ${fmt(wheat.profit * START_PLOTS)} base profit after ${wheat.minutes} minute. The existing gameplay spec's level 1–5 daily income target of 500–1,500 gold is lower than two such harvests. That target should be revised or the economy retuned after player testing.`, '',
  'Across levels 1–10, wheat leads this model in both gold and XP per timer minute. Longer crops still lead in profit per harvest visit. This is a modeling result, not evidence that players prefer either loop; planting, watering, and selling each take time that the model excludes.', '',
  '## Next balance decisions', '',
  '1. Measure actual crop choice, sale frequency, and time between visits before changing prices or timers.',
  '2. Decide whether “fastest gold while continuously active” or “best profit per visit” should drive each level band; both are shown above.',
  '3. Recalculate this report after any changes to yield, sale multiplier, seed cost, crop time, or XP.', '',
];
const report = `${lines.join('\n')}\n`;
if (process.argv.includes('--write')) writeFileSync(resolve(root, 'docs/balance-report.md'), report);
else process.stdout.write(report);
