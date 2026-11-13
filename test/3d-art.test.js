import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { GOODS, CROPS, TREES, ANIMALS, LUXURY } from '../server/src/game.js';
import { itemSprite, animalSprite, luxurySprite } from '../public/3d/art.js';

test('3D client uses existing art for every catalog item, animal, decoration, and pet', () => {
  for (const [catalog, ids, sprite] of [
    ['goods', Object.keys(GOODS), itemSprite],
    ['crops', Object.keys(CROPS), itemSprite],
    ['trees', Object.keys(TREES), itemSprite],
    ['animals', Object.keys(ANIMALS), animalSprite],
    ['luxury', Object.values(LUXURY).filter(x => x.kind === 'decor' || x.kind === 'pet').map(x => x.id), luxurySprite],
  ]) {
    for (const id of ids) {
      const path = sprite(id);
      assert.ok(path, `${catalog}.${id} has no sprite`);
      assert.ok(existsSync(new URL(`../public/${path}`, import.meta.url)), `${catalog}.${id} sprite is missing: ${path}`);
    }
  }
});
