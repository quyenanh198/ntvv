import assert from 'node:assert/strict';
import test from 'node:test';
import { GRID, ROWS, createLayout, inDistrict, spanCenter } from '../public/3d/layout.js';

const lots = (layout) => { const seen = new Set(); for (const [, v] of layout.items) for (let i = 0; i < v.w; i += 1) { const k = `${v.c + i},${v.r}`; assert.ok(!seen.has(k), 'two items share lot ' + k); seen.add(k); } return seen.size; };

test('the whole roadmap fits: seven farm blocks and eleven workshops, no shared lot', () => {
  const l = createLayout(null);
  for (let b = 0; b < 7; b += 1) assert.ok(l.place('block:' + b, 3), 'block ' + b);
  for (let i = 0; i < 11; i += 1) assert.ok(l.place('station:m' + i, 1), 'station ' + i);
  assert.equal(lots(l), 7 * 3 + 11);
  assert.ok(21 + 11 <= GRID.cols * ROWS);
});

test('items take the nearest free lots in unlock order and keep them', () => {
  const l = createLayout(null);
  const first = { ...l.place('station:a') }, second = { ...l.place('station:b') };
  assert.notDeepEqual(first, second);
  assert.deepEqual(l.place('station:a'), first, 'placing again changes nothing');
  const d = (v) => Math.hypot(...spanCenter(v.c, v.r, v.w).map((n, i) => n - [13, 2.2][i]));
  assert.ok(d(first) <= d(second));
});

test('moving: free lots accept it, equal-width items swap, anything else is refused', () => {
  const l = createLayout(null);
  l.place('station:a'); l.place('station:b'); l.place('block:0', 3);
  const b = { ...l.at('station:b') };
  assert.equal(l.move('station:a', 5, 3), true);
  assert.equal(l.at('station:a').c, 5);
  assert.equal(l.move('station:a', b.c, b.r), true, 'swap');
  assert.deepEqual({ c: l.at('station:a').c, r: l.at('station:a').r }, { c: b.c, r: b.r });
  const blk = l.at('block:0');
  assert.equal(l.move('station:a', blk.c, blk.r), false, 'a station cannot take part of a farm block');
  assert.equal(l.move('station:a', 99, 0), false);
  lots(l);
});

test('saved layouts round-trip; invalid or overlapping entries are dropped', () => {
  const l = createLayout(null); l.place('block:0', 3); l.place('station:a');
  const again = createLayout(JSON.parse(JSON.stringify(l.toJSON())));
  assert.deepEqual(again.toJSON(), l.toJSON());
  const bad = createLayout({ v: 1, items: { 'station:a': [0, 0, 1], 'station:b': [0, 0, 1], 'evil:x': [1, 1, 1], 'station:c': [9, 9, 1], 'block:1': [4, 0, 3] } });
  assert.deepEqual([...bad.items.keys()], ['station:a'], 'only the first valid item survives');
  assert.equal(createLayout({ v: 2, items: {} }).items.size, 0);
});

test('lots are found from world points and the district test matches the grid', () => {
  const l = createLayout(null);
  const [x, z] = spanCenter(2, 1);
  assert.deepEqual(l.cellAt(x, z), { c: 2, r: 1 });
  assert.equal(l.cellAt(0, 0), null);
  assert.ok(inDistrict(...spanCenter(0, 0)) && !inDistrict(0, 0));
});
