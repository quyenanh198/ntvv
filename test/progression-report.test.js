import test from 'node:test';
import assert from 'node:assert/strict';
import { START_GOLD, START_PLOTS, TAX_PER_PLOT, levelFor } from '../server/src/game.js';
import { progressionTarget, simulateCropProgression } from '../scripts/progression-report.mjs';

test('discrete visits carry harvest XP, cash and sowing unlocks separately', () => {
  // At eight-hour visits, twelve carrots give 12 sow XP and 48 harvest XP.
  // Two harvests reach the 120-XP level-2 threshold before another sow.
  const carrots = simulateCropProgression({ cadenceMinutes: 480, targetLevel: 2 });
  assert.equal(carrots.status, 'reached');
  assert.equal(carrots.minutes, 960);
  assert.equal(carrots.visits, 3);
  assert.equal(carrots.xp, 120);
  assert.equal(carrots.seedSpent, 96);
  assert.equal(carrots.saleGold, 4224);
  assert.equal(carrots.gold, 4628);
  assert.equal(carrots.occupiedPlots, 0);
  // At one-minute visits, wheat reaches level 2 by sowing the fourth batch.
  const wheat = simulateCropProgression({ cadenceMinutes: 1, targetLevel: 2 });
  assert.equal(wheat.minutes, 3);
  assert.equal(wheat.xp, 120);
  assert.equal(wheat.occupiedPlots, 12);
  assert.equal(wheat.seedSpent, 96);
  assert.equal(wheat.saleGold, 3456);
  assert.equal(wheat.gold, 3860);
});

test('visit-aligned deadlines, partial affordability, stalls and horizon are explicit', () => {
  // A three-minute carrot needs two two-minute visits, so wheat wins XP rate.
  const rounded = simulateCropProgression({ cadenceMinutes: 2, maxVisits: 1 });
  assert.equal(rounded.xp, 12);
  assert.equal(rounded.seedSpent, 24);
  assert.equal(rounded.status, 'horizon');
  const partial = simulateCropProgression({ startingGold: 3, maxVisits: 1 });
  assert.equal(partial.occupiedPlots, 1);
  assert.equal(partial.gold, 1);
  assert.equal(partial.xp, 1);
  const broke = simulateCropProgression({ startingGold: 0 });
  assert.equal(broke.status, 'stalled');
  assert.equal(broke.visits, 1);
  assert.equal(broke.taxOwed, 0);
  assert.throws(() => simulateCropProgression({ cadenceMinutes: 0 }));
  assert.throws(() => simulateCropProgression({ priceMultiplier: 0.1 }));
});

test('all scenarios preserve the cash ledger and every reached level', () => {
  for (const cadenceMinutes of [10, 60, 480, 1440]) {
    for (const policy of ['xp', 'gold']) {
      for (const priceMultiplier of [1, 0.4]) {
        const result = simulateCropProgression({ cadenceMinutes, policy, priceMultiplier });
        assert.equal(result.status, 'reached');
        assert.equal(result.levels.length, progressionTarget);
        assert.equal(result.gold, START_GOLD + result.saleGold - result.seedSpent - result.taxPaid);
        assert.equal(result.taxPaid % (START_PLOTS * TAX_PER_PLOT), 0);
        assert.ok(result.taxPaid > 0);
        assert.equal(result.taxOwed, 0);
        result.levels.forEach((row, index) => {
          assert.equal(row.level, index + 1);
          assert.ok(levelFor(row.xp) >= row.level);
          assert.equal(row.gold, START_GOLD + row.saleGold - row.seedSpent - row.taxPaid);
          assert.ok(row.gold >= 0);
          if (index) assert.ok(row.minutes >= result.levels[index - 1].minutes);
        });
      }
    }
  }
});
