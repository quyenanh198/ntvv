// Dynamic land plan for everything built east of the mill and south of the road.
// A fixed grid of lots is paved once at boot (streets between rows), so any arrangement stays connected.
// Items take the nearest free lots in the order they unlock; the player may move them (edit mode).
// Pure logic, no DOM and no three.js, so it can be tested in node.
export const GRID = {
  x0: 15.6, cw: 5.4, cols: 6, cd: 6.9,
  zones: [{ z0: -17.2, rows: 4 }, { z0: 15.4, rows: 3 }], // north of the road, south of the road
};
export const ROWS = GRID.zones.reduce((n, z) => n + z.rows, 0);
const rowTop = (r) => { let rr = r; for (const z of GRID.zones) { if (rr < z.rows) return z.z0 + rr * GRID.cd; rr -= z.rows; } return NaN; };
export const spanCenter = (c, r, w = 1) => [GRID.x0 + (c + w / 2) * GRID.cw, rowTop(r) + GRID.cd / 2];
export const inDistrict = (x, z) => x > GRID.x0 - 1.2 && x < GRID.x0 + GRID.cols * GRID.cw + 0.5
  && GRID.zones.some((zn) => z > zn.z0 - 1.2 && z < zn.z0 + zn.rows * GRID.cd + 1.2);
// streets: one horizontal line on every row edge, plus a connector along the west side that crosses the road
export const STREET_PATHS = (() => {
  const x1 = GRID.x0 + GRID.cols * GRID.cw, out = [];
  for (const zn of GRID.zones) for (let r = 0; r <= zn.rows; r += 1) out.push({ w: 1.2, pts: [[GRID.x0 - 0.6, zn.z0 + r * GRID.cd], [x1, zn.z0 + r * GRID.cd]] });
  const north = GRID.zones[0], south = GRID.zones[GRID.zones.length - 1];
  out.push({ w: 1.1, pts: [[GRID.x0 - 0.6, north.z0], [GRID.x0 - 0.6, south.z0 + south.rows * GRID.cd]] });
  return out;
})();

const KEY_OK = /^(station|block):[a-z0-9]+$/;
export function createLayout(saved, anchor = [13, 2.2]) {
  const items = new Map(); // key -> { c, r, w }
  function inBounds(c, r, w) { return c >= 0 && c + w <= GRID.cols && r >= 0 && r < ROWS; }
  function occupant(c, r, except) { for (const [k, v] of items) if (k !== except && v.r === r && c >= v.c && c < v.c + v.w) return k; return null; }
  function fits(c, r, w, except) { if (!inBounds(c, r, w)) return false; for (let i = 0; i < w; i += 1) if (occupant(c + i, r, except)) return false; return true; }
  if (saved && saved.v === 1 && saved.items && typeof saved.items === 'object') {
    for (const [key, v] of Object.entries(saved.items)) {
      if (!KEY_OK.test(key) || !Array.isArray(v)) continue;
      const [c, r, w] = v;
      if (Number.isInteger(c) && Number.isInteger(r) && (w === 1 || w === 3) && fits(c, r, w, null)) items.set(key, { c, r, w });
    }
  }
  const order = (() => { // lots by distance from the mill: near ones are given out first
    const all = [];
    for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < GRID.cols; c += 1) { const [x, z] = spanCenter(c, r, 1); all.push({ c, r, d: Math.hypot(x - anchor[0], z - anchor[1]) }); }
    return all.sort((a, b) => a.d - b.d || a.r - b.r || a.c - b.c);
  })();
  let dirty = false;
  return {
    items,
    has: (key) => items.has(key),
    at: (key) => items.get(key) || null,
    center: (key) => { const v = items.get(key); return v ? spanCenter(v.c, v.r, v.w) : null; },
    place(key, w = 1) { // idempotent: an item that already has lots keeps them
      if (items.has(key)) return items.get(key);
      for (const o of order) {
        const starts = w === 1 ? [o.c] : [Math.min(o.c, GRID.cols - w), Math.max(0, o.c - 1), Math.max(0, o.c - 2)];
        for (const c of starts) if (fits(c, o.r, w, null)) { const v = { c, r: o.r, w }; items.set(key, v); dirty = true; return v; }
      }
      return null; // district is full
    },
    // move to lot (c, r): into free lots, or swap with a single item of the same width
    move(key, c, r) {
      const me = items.get(key); if (!me) return false;
      if (fits(c, r, me.w, key)) { me.c = c; me.r = r; dirty = true; return true; }
      const other = occupant(c, r, key); const o = other && items.get(other);
      if (o && o.w === me.w && o.c === c && o.r === r) { const t = { c: me.c, r: me.r }; me.c = o.c; me.r = o.r; o.c = t.c; o.r = t.r; dirty = true; return true; }
      return false;
    },
    cellAt(x, z) { // lot under a world point, or null
      const c = Math.floor((x - GRID.x0) / GRID.cw); if (c < 0 || c >= GRID.cols) return null;
      for (let r = 0; r < ROWS; r += 1) { const t = rowTop(r); if (z >= t && z < t + GRID.cd) return { c, r }; }
      return null;
    },
    occupantAt: (c, r) => occupant(c, r, null),
    reset(prefix = '') { for (const k of [...items.keys()]) if (k.startsWith(prefix)) items.delete(k); dirty = true; },
    takeDirty() { const d = dirty; dirty = false; return d; },
    toJSON() { return { v: 1, items: Object.fromEntries([...items].map(([k, v]) => [k, [v.c, v.r, v.w]])) }; },
  };
}
