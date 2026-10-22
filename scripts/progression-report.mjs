import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CROPS, EXPANSIONS, GOLD_MULT, HARVEST_YIELD, LAND_TAX_UNLOCK_LEVEL, MARKET_SAT, START_GOLD, START_PLOTS, TAX_PER_PLOT, levelFor } from '../server/src/game.js';

const regularCrops = Object.values(CROPS).filter(crop => !crop.risky && crop.sell > 0);
export const progressionTarget = Math.max(...EXPANSIONS.map(entry => entry.level), ...regularCrops.map(entry => entry.level));

// One visit: accrue/pay tax, harvest and sell ready crops, pay outstanding tax,
// then make one affordable bulk planting decision. No fractional crop cycles.
export function simulateCropProgression({ cadenceMinutes = 480, policy = 'xp', priceMultiplier = 1,
  targetLevel = progressionTarget, maxVisits = 20000, startingGold = START_GOLD } = {}) {
  if (!Number.isSafeInteger(cadenceMinutes) || cadenceMinutes < 1 || cadenceMinutes > 1440
    || !['xp', 'gold'].includes(policy) || !Number.isFinite(priceMultiplier)
    || priceMultiplier < MARKET_SAT.floor || priceMultiplier > 1
    || !Number.isSafeInteger(targetLevel) || targetLevel < 2 || targetLevel > progressionTarget
    || !Number.isSafeInteger(maxVisits) || maxVisits < 1 || maxVisits > 100000
    || !Number.isSafeInteger(startingGold) || startingGold < 0) throw new Error('Invalid progression scenario');
  let gold = startingGold, xp = 0, seedSpent = 0, saleGold = 0, taxPaid = 0, taxOwed = 0;
  let plots = [], taxDay = -1, now = 0, visits = 0, status = 'horizon';
  const levels = [{ level: 1, minutes: 0, visits: 0, gold, xp, seedSpent, saleGold, taxPaid, crop: 'starter' }];
  const payTax = () => {
    if (taxOwed && gold >= taxOwed) { gold -= taxOwed; taxPaid += taxOwed; taxOwed = 0; }
  };
  const recordLevels = (crop) => {
    while (levels.length < Math.min(levelFor(xp), targetLevel)) {
      levels.push({ level: levels.length + 1, minutes: now, visits, gold, xp, seedSpent, saleGold, taxPaid, crop });
    }
  };
  for (let visit = 0; visit < maxVisits; visit += 1) {
    now = visit * cadenceMinutes;
    visits = visit + 1;
    const day = Math.floor(now / 1440);
    if (levelFor(xp) < LAND_TAX_UNLOCK_LEVEL) taxOwed = 0;
    else if (taxDay !== day) taxOwed += START_PLOTS * TAX_PER_PLOT;
    taxDay = day;
    payTax();
    const ready = plots.filter(plot => plot.readyMinutes <= now);
    plots = plots.filter(plot => plot.readyMinutes > now);
    for (const plot of ready) {
      const proceeds = Math.round(plot.crop.sell * GOLD_MULT * HARVEST_YIELD * priceMultiplier);
      saleGold += proceeds;
      gold += proceeds;
      xp += plot.crop.expHarvest;
    }
    payTax();
    recordLevels(ready.map(plot => plot.crop.id).filter((id, index, ids) => ids.indexOf(id) === index).join(', ') || 'waiting');
    if (levelFor(xp) >= targetLevel) { status = 'reached'; break; }
    const free = START_PLOTS - plots.length;
    const candidates = taxOwed ? [] : regularCrops.filter(crop => crop.level <= levelFor(xp) && crop.seed <= gold).map(crop => {
      const count = Math.min(free, Math.floor(gold / crop.seed));
      const cycleVisits = Math.ceil(crop.growMs / (cadenceMinutes * 60000));
      const profit = Math.round(crop.sell * GOLD_MULT * HARVEST_YIELD * priceMultiplier) - crop.seed;
      return { crop, count, score: count * (policy === 'xp' ? crop.expSow + crop.expHarvest : profit) / cycleVisits };
    }).filter(choice => choice.count > 0);
    candidates.sort((a, b) => b.score - a.score || a.crop.id.localeCompare(b.crop.id));
    const choice = candidates[0];
    if (choice) {
      const { crop, count } = choice;
      gold -= crop.seed * count;
      seedSpent += crop.seed * count;
      xp += crop.expSow * count;
      for (let i = 0; i < count; i += 1) plots.push({ crop, readyMinutes: now + crop.growMs / 60000 });
      recordLevels(crop.id);
      if (levelFor(xp) >= targetLevel) { status = 'reached'; break; }
    }
    if (!plots.length && !choice) { status = 'stalled'; break; }
  }
  return { cadenceMinutes, policy, priceMultiplier, targetLevel, status, levels, minutes: now, visits,
    gold, xp, seedSpent, saleGold, taxPaid, taxOwed, occupiedPlots: plots.length };
}

export function progressionReport() {
  const scenarios = [10, 60, 480, 1440].flatMap(cadenceMinutes => ['xp', 'gold'].flatMap(policy =>
    [1, MARKET_SAT.floor].map(priceMultiplier => simulateCropProgression({ cadenceMinutes, policy, priceMultiplier }))));
  const n = value => Math.round(value).toLocaleString('en-US');
  const label = scenario => `${scenario.cadenceMinutes} min / ${scenario.policy} / price ${scenario.priceMultiplier}`;
  const summary = scenarios.map(scenario => `| ${label(scenario)} | ${scenario.status} | ${scenario.levels.at(-1).level} | ${(scenario.minutes / 1440).toFixed(2)} | ${n(scenario.visits)} | ${n(scenario.gold)} | ${n(scenario.taxPaid)} | ${n(scenario.taxOwed)} |`).join('\n');
  const details = scenarios.map(scenario => {
    let previousMinutes = 0;
    const rows = scenario.levels.map(row => {
      const elapsed = row.minutes - previousMinutes;
      previousMinutes = row.minutes;
      return `| ${row.level} | ${(row.minutes / 1440).toFixed(2)} | ${(elapsed / 60).toFixed(2)} | ${n(row.visits)} | ${n(row.gold)} | ${n(row.seedSpent)} | ${n(row.saleGold)} | ${n(row.taxPaid)} | ${row.crop} |`;
    });
    return `### ${label(scenario)}\n\n| Level reached | Elapsed days | Hours since prior level | Visits | Cash | Seeds spent | Sales | Tax paid | Action crop |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\nResult: **${scenario.status}** at level ${scenario.levels.at(-1).level}; ${scenario.occupiedPlots} planted plots remain. Missing higher levels were not reached in this scenario.`;
  }).join('\n\n');
  return `# Discrete crop progression scenarios\n\nGenerated by \`npm run balance:progression\` from the current game catalog. This complements the steady-state balance report; it is not observed player pacing.\n\n## Assumptions and limits\n\n- Starts at level 1 with ${START_PLOTS} plots and ${START_GOLD} gold. Follows every level through ${progressionTarget}, the highest crop/expansion unlock level; game levels continue beyond it.\n- Visits occur at fixed intervals, including minute zero. Crops mature between visits but are harvested only on a visit. Each visit harvests and sells everything ready, then makes one bulk planting decision. Planting and harvest XP remain separate, carry across levels, and can unlock several levels on one visit.\n- The xp policy maximizes the next affordable batch's sow-plus-harvest XP per visit cycle; gold maximizes its net proceeds. Both are greedy choices, not globally optimal strategies. Partial batches respect available cash and free plots; unready crops remain planted across unlocks.\n- No expansions, skills, watering bonus, quests, orders, collection rewards, animals, trees, machines, gifts, theft, gem spending or manual action time. These are crop-only paths, not total-game forecasts or claims that every player stalls when a scenario stalls.\n- Price 1 uses unsaturated base proceeds; price ${MARKET_SAT.floor} holds the market floor throughout as a sensitivity bound. Neither simulates shared market demand or saturation decay. Each plot's four-item harvest is sold separately, matching per-sale integer rounding.\n- Tax uses ${TAX_PER_PLOT} gold per plot from level ${LAND_TAX_UNLOCK_LEVEL}. A new day charges once on the next visit and unpaid debt blocks planting, while harvest and sale can repay it. Days are fixed 24-hour intervals anchored at the initial visit, not calendar dates; daylight-saving transitions and a different first-visit offset are excluded.\n- A scenario stops when it reaches the target, cannot plant with no crops left to sell, or hits 20,000 visits. Cash and cumulative spending/sales are recorded when each level is first observed after the visit's harvest/sale/tax settlement or bulk sowing. Several levels may share a timestamp.\n- Do not tune prices from these scenarios alone. Compare slow levels, cash reserves and stalls with five observed sessions and deployed economy totals.\n\n## Scenario summary\n\n| Interval / policy / price | Result | Last level | Elapsed days | Visits | Cash | Tax paid | Tax owed |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${summary}\n\n## Every-level records\n\n${details}\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = progressionReport();
  if (process.argv.includes('--write')) writeFileSync(new URL('../docs/progression-report.md', import.meta.url), report);
  else process.stdout.write(report);
}
