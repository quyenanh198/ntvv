import * as THREE from '../vendor/0.149.0/three.module.js';
import { net, serverNow, api } from './net.js';
import { store, refresh, act as doAct, subscribe } from './store.js';
import { itemSprite } from './art.js';
const $ = s => document.querySelector(s);
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;

// ================= Layout constants and crop looks (rules live on the server) =================
let MILL_LEVEL = 10; // đọc lại từ catalog (coixay.level) khi tải xong
const MILL_X = 13, MILL_Z = 2.2;
const ROAD_Z = 12.6, STOP_X = 7.5, FAR = 50; // road lane, where the truck stops (stall), off-screen distance
const PLOT_CAP = 60; // số ô vẽ được trong 3D hiện tại: 12 ô ruộng chính + 4 khối mở rộng
// 36 cây trồng dùng 4 họ mô hình (+ cây ăn quả); mỗi cây có màu quả riêng.
const FAMILY = {
  luami: ['wheat'], gao: ['wheat', 0xe8d98a], me: ['wheat', 0xc9b27a],
  ngo: ['corn'], mia: ['corn', 0x8dbf4a], huongduong: ['corn', 0xf6c21c],
  carot: ['carrot'], khoaitay: ['carrot', 0xd9b26f], hanhtay: ['carrot', 0xd9a0c8], toi: ['carrot', 0xf3efe6], gung: ['carrot', 0xd9b872],
  khoailang: ['carrot', 0xb0486e], dauphong: ['carrot', 0xd9b078], bapcai: ['carrot', 0x9ccf6a], bongcai: ['carrot', 0xf1eedc],
  tra: ['carrot', 0x6fa84a], rauthom: ['carrot', 0x5faa4a], sa: ['carrot', 0x9cc86a], cansa: ['carrot', 0x5a9a3c], hoahong: ['carrot', 0xe0405a],
  bongvai: ['carrot', 0xf6f2ea], nam: ['carrot', 0xe8dcc0],
  bingo: ['pumpkin'], duahau: ['pumpkin', 0x4f9d4a], dualeo: ['pumpkin', 0x6fb84a], cachua: ['pumpkin', 0xe23b2e], catim: ['pumpkin', 0x6a3a8c],
  ot: ['pumpkin', 0xd93a2a], dautay: ['pumpkin', 0xe0405a], nho: ['pumpkin', 0x7a4aa0], caphe: ['pumpkin', 0xc23b3b], cacao: ['pumpkin', 0xb8742e],
  oliu: ['pumpkin', 0x7c8a3c], dauxanh: ['pumpkin', 0x7aa84a], thom: ['pumpkin', 0xe0b030], vani: ['pumpkin', 0xd8d0a0],
};
const TREE_COL = { cam: 0xf28a1c, tao: 0xe0402e, xoai: 0xf2b532, thanhlong: 0xe0405a, chanh: 0xc8d84a, dua: 0x8a6a3a, saurieng: 0xc8b84a,
  quabo: 0x4f7a3a, dao: 0xf4a8a0, anhdao: 0xd93a6a, coc: 0x9cc84a, chuoi: 0xf2d230, quame: 0x8a5a2a };
const cropColor = (id) => (FAMILY[id] && FAMILY[id][1]) ?? TREE_COL[id] ?? 0xf2b532;
const G = { seed: null, holdGold: null }; // seed: hạt đang chọn; holdGold: vàng hiển thị chờ xe tải đi khỏi

// ================= Renderer =================
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 260);

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
scene.background = canvasTex(4, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#5cb6ec'); gr.addColorStop(0.55, '#a6dcf6'); gr.addColorStop(1, '#e4f5fb');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
scene.fog = new THREE.Fog(0xd6eef8, 60, 150);

// Toon shading: three soft bands, like painted light and shade
const grad = new THREE.DataTexture(new Uint8Array([120, 195, 255]), 3, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const matCache = new Map();
function toon(color, extra) {
  if (!extra && matCache.has(color)) return matCache.get(color);
  const m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: grad }, extra || {}));
  if (!extra) matCache.set(color, m);
  return m;
}
function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene, shadow = true) {
  const m = new THREE.Mesh(geo, typeof mat === 'number' ? toon(mat) : mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = shadow; parent.add(m); return m;
}
const box = (w, h, d, mat, x, y, z, parent) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
const toonFlat = c => { const k = 'flat' + c; if (!matCache.has(k)) matCache.set(k, toon(c, { flatShading: true })); return matCache.get(k); };

// ================= Lights =================
scene.add(new THREE.HemisphereLight(0xdcefff, 0x6f7f45, 0.5));
const sun = new THREE.DirectionalLight(0xffeccc, 1.15);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

// ================= Painted textures =================
const roofTex = (base, line) => canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 8; r++) {
    const y = r * 16;
    g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(0, y + 2, w, 5);
    g.strokeStyle = line; g.lineWidth = 2.5;
    for (let c = 0; c < 8; c++) { g.beginPath(); g.arc(c * 16 + (r % 2) * 8 + 8, y + 16, 8, Math.PI, 0); g.stroke(); }
  }
}, [3, 2]);
const terracotta = roofTex('#d4602f', '#9c3f1c');
const slate = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#4a5466'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) {
    const x = c * 22 + (r % 2) * 11, y = r * 16; const v = 70 + Math.random() * 25 | 0;
    g.fillStyle = `rgb(${v},${v + 8},${v + 22})`; g.fillRect(x + 1, y + 1, 20, 14);
  }
}, [3, 2]);
const planks = (base, dark) => canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.strokeStyle = dark; g.lineWidth = 2;
  for (let x = 0; x <= w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(Math.random() * w, Math.random() * h, 1, 10); }
}, [0.6, 0.6]);
const redPlanks = planks('#c23b2a', '#962a1d');
const stoneTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#d9cfbc'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) {
    const v = 205 + Math.random() * 35 | 0;
    g.fillStyle = `rgb(${v},${v - 6},${v - 20})`; g.fillRect(c * 26 + (r % 2) * 13 + 1, r * 16 + 1, 24, 14);
  }
}, [3, 3]);
const plaid = canvasTex(64, 64, (g, w, h) => {
  g.fillStyle = '#c8433a'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(120,20,20,.45)'; for (let i = 0; i < 64; i += 16) { g.fillRect(i, 0, 6, h); g.fillRect(0, i, w, 6); }
  g.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 8; i < 64; i += 16) { g.fillRect(i, 0, 2, h); g.fillRect(0, i, w, 2); }
}, [2, 2]);
const stripes = canvasTex(64, 8, (g, w, h) => {
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#fbf3e3' : '#e0574a'; g.fillRect(i * 16, 0, 16, h); }
}, [2, 1]);
const sailTex = canvasTex(64, 128, (g, w, h) => {
  g.fillStyle = '#f5ecd9'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#a07a4e'; g.lineWidth = 3;
  for (let y = 0; y <= h; y += 21) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke(); g.strokeRect(1, 1, w - 2, h - 2);
});

// ================= Ground (painted map with paths) =================
const GS = 96;
// Stone path network (3D cobbles laid along these lines); w = width
const PATHS = [
  { w: 1.5, pts: [[-8.2, -5.6], [-6.6, -2.4], [-4.9, -0.4], [-4.9, 9.5], [-4.9, ROAD_Z - 1.4]] }, // farmhouse to the road
  { w: 1.3, pts: [[-4.9, 9.5], [STOP_X - 1.6, 9.5]] },                                           // south lane to the stall
  { w: 1.3, pts: [[STOP_X + 1.6, 9.5], [11.0, 8.7], [12.3, 4.6]] },                              // stall to the mill
  { w: 1.3, pts: [[-4.9, -0.4], [-2.4, -2.5], [9.2, -2.5], [13.6, -3.0], [13.2, -10.6]] },       // north lane to the windmill
  { w: 1.1, pts: [[1.8, -2.5], [1.8, -8.3]] },                                                   // barn door
  { w: 1.0, pts: [[1.8, -6.5], [3.3, -6.5]] },                                                   // sheep pen gate
  { w: 1.0, pts: [[13.6, -3.0], [12.7, -4.6]] },                                                 // greenhouse
  { w: 1.1, pts: [[-4.9, 3.9], [-6.4, 3.9]] },                                                   // chicken yard
  { w: 1.0, pts: [[-4.9, 3.2], [-3.6, 3.2]] },                                                   // plot gate
];
const ROAD = { w: 3.2, pts: [[-48, ROAD_Z], [48, ROAD_Z]] };
// Paths bend gently through their points (centripetal Catmull-Rom); bed, stones and grass exclusion all follow the curve
[...PATHS, ROAD].forEach(p => {
  const v = p.pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
  p.curve = v.length > 2 ? new THREE.CatmullRomCurve3(v, false, 'centripetal') : new THREE.LineCurve3(v[0], v[1]);
  if (v.length > 2) p.pts = p.curve.getSpacedPoints(Math.ceil(p.curve.getLength() / 0.5)).map(q => [q.x, q.z]);
});
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const onPath = (x, z) => [...PATHS, ROAD].some(p => p.pts.some((b, i) => i && segDist(x, z, p.pts[i - 1], b) < p.w / 2 + 0.25));
const groundTex = canvasTex(1024, 1024, (g, w, h) => {
  const X = x => (x + GS / 2) / GS * w, Z = z => (z + GS / 2) / GS * h, U = w / GS;
  g.fillStyle = '#6fb144'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { // soft, low-contrast variation (no dark stains)
    const r = rand(10, 40), x = rand(0, w), y = rand(0, h);
    g.fillStyle = pick(['rgba(90,160,60,.12)', 'rgba(140,195,80,.12)', 'rgba(80,150,55,.1)']);
    g.beginPath(); g.ellipse(x, y, r, r * 0.7, rand(0, 3), 0, Math.PI * 2); g.fill();
  }
  g.lineCap = 'round';
  for (let i = 0; i < 34000; i++) { // painted blade strokes: yellow-green tips over darker roots, like a lush lawn
    const x = rand(0, w), y = rand(0, h), a = rand(-0.45, 0.45), l = rand(2.5, 6);
    g.strokeStyle = pick(['rgba(150,210,85,.55)', 'rgba(175,220,95,.45)', 'rgba(85,150,55,.5)', 'rgba(60,120,40,.4)', 'rgba(125,195,70,.5)']);
    g.lineWidth = rand(0.8, 1.4); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); g.stroke();
  }
  // shore toward the lake
  const sh = g.createLinearGradient(0, Z(-22), 0, Z(-18.5));
  sh.addColorStop(0, '#d8c48e'); sh.addColorStop(1, 'rgba(216,196,142,0)');
  g.fillStyle = sh; g.fillRect(0, Z(-22), w, Z(-18.5) - Z(-22));
  const rr = (x0, z0, x1, z1, r, col) => { g.fillStyle = col; g.beginPath(); if (g.roundRect) g.roundRect(X(x0), Z(z0), (x1 - x0) * U, (z1 - z0) * U, r * U); else g.rect(X(x0), Z(z0), (x1 - x0) * U, (z1 - z0) * U); g.fill(); };
  rr(-12.4, 3.4, -5.6, 7.8, 0.6, '#c3a06a');                                   // chicken yard
  rr(-3.7, -1.5, 7.7, 7.3, 0.8, '#a57a4b');                                    // tilled border around plots
  rr(MILL_X - 2.3, MILL_Z - 1.9, MILL_X + 2.3, MILL_Z + 2.5, 0.6, '#b38c5c');  // mill yard
  // dark soil bed under the 3D stones, so the joints read like the reference roads
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#6f604c';
  [...PATHS, ROAD].forEach(p => { g.lineWidth = (p.w + 0.1) * U; g.beginPath(); p.pts.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.stroke(); });
});
const ground = mesh(new THREE.PlaneGeometry(GS, GS), toon(0xffffff, { map: groundTex }), 0, 0, 0, scene, false);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;

// ================= Cobblestone paths and road (one instanced mesh) =================
(function pave() {
  // chamfered square setts: a 4-sided frustum turned 45°, about 1 x 1 footprint before scaling
  const geo = new THREE.CylinderGeometry(0.62, 0.7, 1, 4, 1); geo.rotateY(Math.PI / 4);
  const mats = [], cols = [], UP = new THREE.Vector3(0, 1, 0);
  const put = (x, z, yaw, len, wid, h, palette, y0) => {
    mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y0 + h / 2 - 0.05 + rand(0, 0.015), z),
      new THREE.Quaternion().setFromAxisAngle(UP, yaw + rand(-0.05, 0.05)), new THREE.Vector3(len, h, wid)));
    cols.push(new THREE.Color(pick(palette)).offsetHSL(0, 0, rand(-0.025, 0.025)));
  };
  // rows of stones along the curve with random lengths, so joints stagger like a running bond
  const lay = (p, palette, minL, maxL, rowW, h, y0) => {
    const c = p.curve, L = c.getLength(), rows = Math.max(2, Math.round(p.w / rowW)), cw = p.w / rows;
    for (let j = 0; j < rows; j++) {
      const off = (j - (rows - 1) / 2) * cw;
      for (let s = -rand(0, maxL * 0.6); s < L;) {
        const len = rand(minL, maxL), u = THREE.MathUtils.clamp(s + len / 2, 0, L) / L, pt = c.getPointAt(u), t = c.getTangentAt(u);
        put(pt.x - t.z * off, pt.z + t.x * off, Math.atan2(-t.z, t.x), len - 0.09, cw - 0.09, h, palette, y0);
        s += len;
      }
    }
  };
  const PATH_STONE = [0xb4ab9c, 0xaaa192, 0xbdb3a2, 0xa69c8b, 0xb7aa94]; // narrow range: one stone, not a mosaic
  PATHS.forEach((p, i) => lay(p, PATH_STONE, 0.32, 0.62, 0.34, 0.12, i * 0.004));
  lay(ROAD, [0x8f8c86, 0x98948d, 0x8a8781, 0x9d988f, 0x928c82], 0.4, 0.8, 0.42, 0.14, 0);
  // kerb stones along both road edges, open where the farm paths join
  const openings = [[-5.8, -4.0], [STOP_X - 1.6, STOP_X + 1.6]];
  [-1, 1].forEach(side => {
    for (let x = -48; x < 48;) {
      const len = rand(0.7, 1.0), mid = x + len / 2; x += len;
      if (side < 0 && openings.some(([a, b]) => mid > a && mid < b)) continue;
      put(mid, ROAD_Z + side * (ROAD.w / 2 + 0.14), rand(-0.03, 0.03), len - 0.05, 0.26, 0.22, [0x7d7a73, 0x8a867e, 0x74716b, 0x868077], 0);
    }
  });
  const im = new THREE.InstancedMesh(geo, toon(0xffffff, { flatShading: true }), mats.length);
  mats.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, cols[i]); });
  im.receiveShadow = true; scene.add(im);
})();

// lake and hills on the horizon
const lake = mesh(new THREE.PlaneGeometry(260, 24), toon(0x5cb8e6), 0, 0.04, -33, scene, false);
lake.rotation.x = -Math.PI / 2; lake.receiveShadow = true;
const hillGeo = new THREE.SphereGeometry(1, 14, 8);
[[-60, -66, 26, 0x7fb35a], [-22, -72, 30, 0x6fa64e], [18, -64, 24, 0x86b960], [55, -70, 30, 0x74ab55], [-90, -60, 22, 0x8cc066], [90, -62, 24, 0x80b65c], [0, -86, 34, 0x9cc8a0]].forEach(([x, z, r, c]) => {
  const h = mesh(hillGeo, toon(c, { flatShading: true }), x, -r * 0.15, z, scene, false); h.scale.set(r, r * 0.42, r * 0.7);
});
for (let i = 0; i < 40; i++) {
  const x = rand(-100, 100), z = rand(-62, -48);
  const t = mesh(new THREE.ConeGeometry(1.2, 3.2, 6), toonFlat(pick([0x4f8a3a, 0x5c9a40, 0x467d35])), x, 1.6 + rand(0, 3), z, scene, false);
  t.scale.setScalar(rand(0.8, 1.4));
}

// ================= Geometry helpers =================
function bodyFromProfile(profile, length, mat, parent) {
  const s = new THREE.Shape();
  profile.forEach(([z, y], i) => i ? s.lineTo(z, y) : s.moveTo(z, y));
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
  g.translate(0, 0, -length / 2); g.rotateY(Math.PI / 2);
  return mesh(g, mat, 0, 0, 0, parent);
}
// roof slab from point a to b (in z,y of the profile), length along x
function slab(parent, a, b, len, thick, mat, ext = 0) {
  const dz = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dz, dy), uz = dz / L, uy = dy / L;
  const bz = b[0] + uz * ext, by = b[1] + uy * ext;
  let nz = -uy, ny = uz; if (ny < 0) { nz = -nz; ny = -ny; }
  const m = mesh(new THREE.BoxGeometry(len, thick, L + ext), mat, 0, (a[1] + by) / 2 + ny * thick / 2, (a[0] + bz) / 2 + nz * thick / 2, parent);
  m.rotation.x = -Math.atan2(dy, dz);
  return m;
}
function gableHouse(parent, { w, d, h, rh, wallMat, roofMat, ov = 0.45 }) {
  bodyFromProfile([[-d / 2, 0], [d / 2, 0], [d / 2, h], [0, h + rh], [-d / 2, h]], w, wallMat, parent);
  const top = [0, h + rh];
  slab(parent, top, [d / 2, h], w + ov * 2, 0.2, roofMat, ov);
  slab(parent, top, [-d / 2, h], w + ov * 2, 0.2, roofMat, ov);
  const ridge = mesh(new THREE.CylinderGeometry(0.14, 0.14, w + ov * 2, 8), 0xa8461f, 0, h + rh + 0.16, 0, parent);
  ridge.rotation.z = Math.PI / 2;
}

// ================= Buildings =================
const solids = []; // circles the farmer and animals avoid {x,z,r}
function farmhouse(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  box(5.6, 0.35, 4.4, toon(0xffffff, { map: stoneTex }), 0, 0.17, 0, g);
  const H = new THREE.Group(); H.position.y = 0.33; g.add(H);
  gableHouse(H, { w: 5.2, d: 4, h: 2.7, rh: 1.7, wallMat: 0xf3e3c3, roofMat: toon(0xffffff, { map: terracotta }) });
  const beam = 0x7a4a26, f = 2.03;
  [-2.55, 2.55].forEach(px => box(0.16, 2.7, 0.12, beam, px, 1.35, f, H));
  [1.3, 2.62].forEach(py => box(5.2, 0.14, 0.12, beam, 0, py, f, H));
  [-0.9, 1.45].forEach(px => box(0.12, 1.2, 0.1, beam, px, 0.65, f, H));
  box(0.95, 1.55, 0.1, 0x2e6e5e, 0.4, 0.78, f + 0.02, H); // door
  box(0.08, 0.08, 0.08, 0xd8b04a, 0.72, 0.8, f + 0.09, H);
  [[-1.75, 1.9], [1.85, 1.9], [-1.75, 0.75]].forEach(([wx, wy]) => {
    box(0.86, 0.72, 0.08, beam, wx, wy, f + 0.01, H);
    box(0.66, 0.54, 0.08, 0x3d7480, wx, wy, f + 0.04, H);
    box(0.06, 0.54, 0.06, 0xf3e3c3, wx, wy, f + 0.08, H);
    box(0.9, 0.16, 0.22, 0x7a4a26, wx, wy - 0.44, f + 0.12, H);
    for (let i = 0; i < 4; i++) mesh(new THREE.SphereGeometry(0.1, 6, 4), pick([0xf06d8c, 0xffd25a, 0xffffff, 0xe0463e]), wx - 0.3 + i * 0.2, wy - 0.3, f + 0.16, H);
  });
  // gable window and chimney
  box(0.6, 0.5, 0.08, beam, 2.63, 3.25, 0, H).rotation.y = Math.PI / 2;
  box(0.6, 1.5, 0.6, toon(0xffffff, { map: stoneTex }), -1.4, 4.0, -0.7, H);
  box(0.75, 0.15, 0.75, 0x8f8778, -1.4, 4.78, -0.7, H);
  // porch steps & pots
  box(1.5, 0.2, 0.6, 0xbfb5a2, 0.4, 0.1, 2.45, g);
  [[-0.7, 2.55], [1.5, 2.55]].forEach(([px, pz]) => {
    mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8), 0xb35a32, px, 0.15, pz, g);
    mesh(new THREE.IcosahedronGeometry(0.28, 0), toon(0x5ea43a, { flatShading: true }), px, 0.45, pz, g);
  });
  solids.push({ x, z, r: 3.4 });
}
function barn(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -Math.PI / 2; scene.add(g);
  const L = 5.6, d = 5.2, wallMat = toon(0xffffff, { map: redPlanks }), roof = toon(0xffffff, { map: slate });
  bodyFromProfile([[-d / 2, 0], [d / 2, 0], [d / 2, 2.9], [1.65, 4.4], [0, 5.1], [-1.65, 4.4], [-d / 2, 2.9]], L, wallMat, g);
  [[[0, 5.1], [1.65, 4.4], 0], [[1.65, 4.4], [d / 2, 2.9], 0.45], [[0, 5.1], [-1.65, 4.4], 0], [[-1.65, 4.4], [-d / 2, 2.9], 0.45]].forEach(([a, b, e]) => slab(g, a, b, L + 0.7, 0.22, roof, e));
  const fx = L / 2 + 0.04, white = 0xf6f1e6;
  [-d / 2, d / 2].forEach(pz => { box(0.16, 2.9, 0.16, white, fx, 1.45, pz, g); box(0.16, 2.9, 0.16, white, -fx, 1.45, pz, g); });
  box(0.12, 2.5, 2.8, white, fx, 1.25, 0, g);
  [-0.65, 0.65].forEach(pz => {
    box(0.13, 2.25, 1.2, 0xb7362a, fx + 0.02, 1.15, pz, g);
    [0.85, -0.85].forEach(r => { const b = box(0.08, 0.12, 1.55, white, fx + 0.09, 1.15, pz, g); b.rotation.x = r; });
    box(0.08, 0.12, 1.2, white, fx + 0.09, 2.2, pz, g); box(0.08, 0.12, 1.2, white, fx + 0.09, 0.1, pz, g);
  });
  box(0.12, 1.15, 1.4, white, fx, 3.75, 0, g);
  box(0.14, 0.8, 1.1, 0xe9c35a, fx + 0.02, 3.7, 0, g);
  // hay bales and barrel in front
  [[3.6, 1.8], [3.4, -2.2]].forEach(([px, pz]) => { const h = mesh(new THREE.CylinderGeometry(0.55, 0.55, 1, 12), 0xe6c25c, px, 0.55, pz, g); h.rotation.x = Math.PI / 2; });
  mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 10), 0x8a5a32, 3.3, 0.4, 2.9, g);
  solids.push({ x, z, r: 3.6 });
}
function coop(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  [[-1, -0.7], [1, -0.7], [-1, 0.7], [1, 0.7]].forEach(([px, pz]) => box(0.14, 0.6, 0.14, 0x6b4423, px, 0.3, pz, g));
  const H = new THREE.Group(); H.position.y = 0.55; g.add(H);
  gableHouse(H, { w: 2.5, d: 1.8, h: 1.25, rh: 0.85, wallMat: toon(0xffffff, { map: planks('#b07a46', '#8a5a32') }), roofMat: toon(0xffffff, { map: terracotta }), ov: 0.3 });
  box(0.9, 0.6, 0.06, 0x5b4632, -0.5, 0.7, 0.93, H);
  for (let i = 0; i < 4; i++) box(0.04, 0.6, 0.07, 0xd9c7a0, -0.84 + i * 0.22, 0.7, 0.95, H);
  box(0.5, 0.7, 0.06, 0x3a2a1c, 0.65, 0.4, 0.93, H);
  const ramp = box(0.5, 0.06, 1.1, 0x9a6a3e, 0.65, 0.3, 1.35, g); ramp.rotation.x = 0.55;
  const hay = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.8, 12), 0xe6c25c, 1.9, 0.45, 1.2, g); hay.rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.25, 10), 0x9aa3a8, -1.6, 0.13, 1.4, g);
  solids.push({ x, z, r: 1.8 });
}
let sails;
function windmill(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -0.35; scene.add(g);
  mesh(new THREE.CylinderGeometry(1.15, 1.7, 6.6, 12), toon(0xffffff, { map: stoneTex }), 0, 3.3, 0, g);
  const cap = mesh(new THREE.ConeGeometry(1.55, 2.1, 12), toon(0xffffff, { map: terracotta }), 0, 7.6, 0, g); cap.rotation.y = 0.2;
  box(0.8, 1.3, 0.2, 0x5c3a1e, 0, 0.65, 1.62, g);
  [[2.6, 0.8], [4.4, -0.8]].forEach(([wy, wx]) => box(0.45, 0.55, 0.15, 0x3d7480, wx, wy, 1.42, g));
  const hub = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.6, 10), 0x6b4423, 0, 6.6, 1.35, g); hub.rotation.x = Math.PI / 2;
  sails = new THREE.Group(); sails.position.set(0, 6.6, 1.7); g.add(sails);
  const cloth = toon(0xffffff, { map: sailTex, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; sails.add(arm);
    box(0.14, 4.4, 0.12, 0x7a4a26, 0, 2.2, 0, arm);
    box(0.95, 3.3, 0.04, cloth, 0.55, 2.6, 0.02, arm);
  }
  solids.push({ x, z, r: 2 });
}
function greenhouse(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  box(4.4, 0.45, 2.7, 0x9a6a3e, 0, 0.22, 0, g);
  const glass = toon(0xe3f6ff, { transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  const shell = mesh(new THREE.CylinderGeometry(1.35, 1.35, 4.3, 18, 1, true, 0, Math.PI), glass, 0, 0.45, 0, g, false); shell.rotation.z = Math.PI / 2;
  [-2.15, 2.15].forEach(px => { const e = mesh(new THREE.CircleGeometry(1.35, 18, 0, Math.PI), glass, px, 0.45, 0, g, false); e.rotation.y = Math.PI / 2; });
  for (let i = 0; i < 5; i++) { const r = mesh(new THREE.TorusGeometry(1.35, 0.05, 5, 18, Math.PI), 0x8a5a32, -2.15 + i * 1.075, 0.45, 0, g); r.rotation.y = Math.PI / 2; }
  const ridge = box(4.3, 0.07, 0.07, 0x8a5a32, 0, 1.8, 0, g);
  for (let i = 0; i < 4; i++) for (const pz of [-0.5, 0.5]) {
    const px = -1.5 + i;
    mesh(new THREE.ConeGeometry(0.32, 1, 6), toon(0x4f9a35, { flatShading: true }), px, 0.95, pz, g);
    for (let k = 0; k < 3; k++) mesh(new THREE.SphereGeometry(0.09, 8, 6), 0xe23b2e, px + rand(-0.2, 0.2), rand(0.7, 1.15), pz + rand(-0.2, 0.2), g);
  }
  solids.push({ x, z, r: 2.6 });
}
let stallHit;
function stall(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  const wood = 0x9a6a3e;
  box(2.8, 1, 1.2, toon(0xffffff, { map: planks('#a8743f', '#7d5228') }), 0, 0.5, 0, g);
  [[-1.35, -0.55], [1.35, -0.55], [-1.35, 0.65], [1.35, 0.65]].forEach(([px, pz]) => box(0.12, pz < 0 ? 2.6 : 2.15, 0.12, wood, px, pz < 0 ? 1.3 : 1.07, pz, g));
  const aw = box(3.2, 0.08, 1.8, toon(0xffffff, { map: stripes }), 0, 2.4, 0.15, g); aw.rotation.x = 0.32;
  for (let i = 0; i < 8; i++) { const fl = box(0.4, 0.25, 0.05, i % 2 ? 0xfbf3e3 : 0xe0574a, -1.4 + i * 0.4, 2.0, 1.02, g); fl.rotation.x = 0.1; }
  [[-0.85, 0xe23b2e], [0, 0xf28c1c], [0.85, 0x6db33f]].forEach(([px, c]) => {
    box(0.75, 0.25, 0.6, 0x7d5228, px, 1.12, 0.1, g);
    for (let i = 0; i < 5; i++) mesh(new THREE.SphereGeometry(0.12, 8, 6), c, px + rand(-0.25, 0.25), 1.3, 0.1 + rand(-0.18, 0.18), g);
  });
  const sack = mesh(new THREE.SphereGeometry(0.4, 10, 8), 0xe8d9b5, 1.8, 0.35, 0.6, g); sack.scale.y = 1.2;
  stallHit = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3, 2.4), new THREE.MeshBasicMaterial({ visible: false }));
  stallHit.position.set(0, 1.5, 0.2); stallHit.userData.stall = true; g.add(stallHit);
  solids.push({ x, z, r: 2 });
  return g;
}
// Vertex-coloured toon material that sways above `base` height (trees, grass)
function swayMat(amp, base, tipShade = false) {
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = windU;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wq = modelMatrix * vec4(position, 1.0);
      #ifdef USE_INSTANCING
        wq = modelMatrix * instanceMatrix * vec4(position, 1.0);
      #endif
      float sw = sin(uTime * 1.4 + wq.x * 0.45 + wq.z * 0.3) * ${amp.toFixed(3)} * max(position.y - ${base.toFixed(2)}, 0.0);
      transformed.x += sw; transformed.z += sw * 0.5;`);
    // grass: darker at the root, lighter at the tip
    if (tipShade) sh.vertexShader = sh.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n  vColor.rgb *= mix(0.52, 1.32, clamp(position.y * 2.2, 0.0, 1.0));');
  };
  m.customProgramCacheKey = () => `sway-${amp}-${base}-${tipShade}`; // otherwise tree and grass share one compiled shader
  return m;
}
const vcPlain = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
const APPLE = new THREE.SphereGeometry(1, 8, 6);
const SPH = new THREE.SphereGeometry(1, 12, 8), SPH_LO = new THREE.SphereGeometry(1, 6, 4), CONE10 = new THREE.ConeGeometry(1, 1, 10), CYL8 = new THREE.CylinderGeometry(1, 1, 1, 8);
const treeMat = swayMat(0.03, 1.6);
// Broadleaf tree: soft layered crown, darker underneath and lighter where the sun hits
function tree(x, z, s = 1, apples = false) {
  const p = [];
  part(p, CYL8, 0x7a5230, 0, 1.1, 0, 0.26, 2.2, 0.26);
  part(p, SPH, 0x6b4628, 0, 0.04, 0, 0.45, 0.12, 0.45);
  limb(p, CYL8, 0x7a5230, 0, 1.5, 0, 0.09, 0.9, 0.8, 0.6); limb(p, CYL8, 0x7a5230, 0, 1.7, 0, 0.08, 0.8, 0.7, 3.5);
  const blobs = [[0, 2.85, 0, 1.3, 0x5a9e36], [0.95, 2.45, 0.25, 0.92, 0x4f9431], [-0.9, 2.5, -0.15, 0.95, 0x4f9431], [0.15, 2.4, 0.9, 0.85, 0x5a9e36],
   [-0.2, 2.45, -0.95, 0.85, 0x4a8c2e], [0.45, 3.55, 0.1, 0.85, 0x6db542], [-0.5, 3.4, 0.35, 0.7, 0x78bf4b], [-0.35, 3.75, -0.3, 0.55, 0x86c955]];
  blobs.forEach(([bx, by, bz, r, c]) => part(p, SPH, vary(c, 0.01, 0.03), bx, by, bz, r, r * 0.9, r));
  if (apples) for (let i = 0; i < 10; i++) { // apples sit on the surface of an outer blob, never in mid-air
    const [bx, by, bz, r] = blobs[1 + (i % 7)], a = rand(0, 6.28), e = rand(-0.25, 0.6);
    const d = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
    part(p, APPLE, 0xd8392a, bx + d.x * r * 0.97, by + d.y * r * 0.87, bz + d.z * r * 0.97, 0.11, 0.11, 0.11);
  }
  mesh(merge(p), treeMat, x, 0, z).scale.setScalar(s);
  solids.push({ x, z, r: 1.2 * s });
}
function pine(x, z, s = 1) {
  const p = [];
  part(p, CYL8, 0x6b4628, 0, 0.7, 0, 0.2, 1.4, 0.2);
  [[1.5, 1.6, 1.25, 0x2f6b3a], [2.4, 1.4, 1.0, 0x387a40], [3.2, 1.2, 0.72, 0x438a49], [3.85, 0.9, 0.45, 0x4f9852]]
    .forEach(([y, h, r, c]) => part(p, CONE10, vary(c, 0.01, 0.03), 0, y, 0, r, h, r));
  mesh(merge(p), treeMat, x, 0, z).scale.setScalar(s);
  solids.push({ x, z, r: s });
}

farmhouse(-9.5, -8.6, 0.25);
barn(1.8, -11);
windmill(13.5, -12.5);
greenhouse(10.5, -5.2, -0.25);
coop(-10.6, 1.8, 0.35);
const stallGroup = stall(STOP_X, 10.1, 0);
// trees, grass and flowers are built in buildFlora() once the merge helpers below exist
const TREES = [[-16, -3, 1.2, true], [-15.5, 8.5, 1.1, false], [-4.5, -14.5, 1.3, true], [7.5, -16, 1.2, false], [18, -3, 1.2, true], [17.5, 9.5, 1, false], [-19.5, 9.5, 1.1, true], [-19, -12, 1.4, false], [21, -14, 1.3, false], [-3.5, -9.5, 0.8, false]];
const PINES = [[-17.5, 1.5, 1.1], [-13, -14.5, 1.2], [16.5, -9.5, 1.1], [20, 3.5, 1.2], [-22, -6, 1.3], [22, -8, 1.2]];

// ================= Delivery truck =================
const truck = (() => {
  const g = new THREE.Group(); g.position.set(-FAR, 0.06, ROAD_Z); g.visible = false; scene.add(g); // rides on top of the cobbles
  const body = new THREE.Group(); g.add(body);
  const cab = 0x5aa9c9, white = 0xf6f1e6, wood = 0xa8743f, glass = 0x2f5466, steel = 0x8a9096;
  box(4.4, 0.25, 1.4, 0x3a3f47, 0.5, 0.55, 0, body);
  box(2.7, 0.15, 1.75, wood, -0.65, 0.75, 0, body);
  [-0.86, 0.86].forEach(z => box(2.7, 0.42, 0.08, wood, -0.65, 1.02, z, body));
  box(0.08, 0.42, 1.75, wood, -1.98, 1.02, 0, body);
  box(1.25, 1.1, 1.65, cab, 1.35, 1.3, 0, body);
  box(1.35, 0.12, 1.72, white, 1.35, 1.9, 0, body);
  box(0.95, 0.62, 1.55, cab, 2.42, 1.0, 0, body);
  box(0.05, 0.46, 1.32, glass, 1.99, 1.52, 0, body);
  [-0.83, 0.83].forEach(z => box(0.72, 0.42, 0.05, glass, 1.4, 1.5, z, body));
  box(0.06, 0.36, 1.1, steel, 2.91, 0.98, 0, body);
  box(0.16, 0.16, 1.7, steel, 2.95, 0.58, 0, body);
  [-0.55, 0.55].forEach(z => mesh(new THREE.SphereGeometry(0.11, 8, 6), 0xfff2b0, 2.92, 1.12, z, body));
  const wheels = [];
  [-1.15, 2.2].forEach(x => [-0.82, 0.82].forEach(z => {
    const pv = new THREE.Group(); pv.position.set(x, 0.4, z); g.add(pv);
    mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 14), 0x2b2b2b, 0, 0, 0, pv).rotation.x = Math.PI / 2;
    box(0.36, 0.08, 0.32, 0xd9d9d9, 0, 0, 0, pv); // hub bar makes the spin visible
    wheels.push(pv);
  }));
  const hit = new THREE.Mesh(new THREE.BoxGeometry(5, 2.2, 2), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0.5, 1.1, 0); hit.userData.truck = true; g.add(hit);
  return { g, body, wheels, state: 'away', t: 0, pay: 0, cargo: [], crates: [], bounce: 0 };
})();
const crateGeo = new THREE.BoxGeometry(0.5, 0.42, 0.5), crateTopGeo = new THREE.BoxGeometry(0.42, 0.06, 0.42);
function makeCrate(k) { const c = new THREE.Group(); mesh(crateGeo, 0x9a6a3e, 0, 0, 0, c); mesh(crateTopGeo, cropColor(k), 0, 0.22, 0, c); scene.add(c); return c; }

// ================= Flour mill (unlocks at MILL_LEVEL) =================
const MILL_POS = new THREE.Vector3(MILL_X, 0, MILL_Z);
const mill = (() => {
  const g = new THREE.Group(); g.position.copy(MILL_POS); g.rotation.y = -0.45; scene.add(g);
  const wood = 0x9a6a3e, dark = 0x6b4423;
  const frame = new THREE.Group(); g.add(frame);
  [[-0.9, -0.7], [0.9, -0.7], [-0.9, 0.7], [0.9, 0.7]].forEach(([x, z]) => box(0.22, 1.6, 0.22, wood, x, 0.8, z, frame));
  [-0.7, 0.7].forEach(z => box(2, 0.14, 0.14, dark, 0, 0.5, z, frame));
  box(2.3, 0.2, 1.9, toon(0xffffff, { map: planks('#a8743f', '#7d5228') }), 0, 1.68, 0, frame);
  [[-1.5, 1.1], [-1.75, 0.5]].forEach(([x, z]) => { mesh(new THREE.ConeGeometry(0.28, 0.9, 7), toon(0xe2b13c, { flatShading: true }), x, 0.45, z, frame); });
  const stones = new THREE.Group(); stones.position.y = 1.78; g.add(stones);
  mesh(new THREE.CylinderGeometry(0.88, 0.92, 0.32, 22), toon(0xb3ad9f, { flatShading: true }), 0, 0.16, 0, stones);
  const stone = new THREE.Group(); stone.position.y = 0.32; stones.add(stone);
  mesh(new THREE.CylinderGeometry(0.82, 0.84, 0.3, 22), toon(0xcbc5b7, { flatShading: true }), 0, 0.15, 0, stone);
  mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 10), 0x5c564c, 0, 0.17, 0, stone);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; box(0.5, 0.04, 0.06, 0x9a9488, Math.cos(a) * 0.47, 0.31, Math.sin(a) * 0.47, stone).rotation.y = -a; }
  const hopper = new THREE.Group(); hopper.position.y = 2.75; g.add(hopper);
  [-0.7, 0.7].forEach(x => box(0.14, 1.3, 0.14, dark, x, -0.3, -0.55, hopper));
  const hop = mesh(new THREE.CylinderGeometry(0.85, 0.3, 0.85, 4, 1, true), toon(0xffffff, { map: planks('#b07a46', '#8a5a32'), side: THREE.DoubleSide }), 0, 0.45, 0, hopper);
  hop.rotation.y = Math.PI / 4;
  const grain = mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.06, 4), toon(0xf2b532, {}), 0, 0.1, 0, hopper);
  grain.rotation.y = Math.PI / 4; grain.visible = false;
  box(0.16, 0.4, 0.16, dark, 0, -0.1, 0, hopper);
  const crank = new THREE.Group(); crank.position.set(1.0, 2.25, 0); g.add(crank);
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), dark, 0.2, 0, 0, crank).rotation.z = Math.PI / 2;
  box(0.08, 0.6, 0.1, wood, 0.42, 0.25, 0, crank);
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 8), 0x7a4a26, 0.55, 0.52, 0, crank).rotation.z = Math.PI / 2;
  const gear = new THREE.Group(); gear.position.set(0, 1.0, 0.98); g.add(gear);
  mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 18), 0x8a6a40, 0, 0, 0, gear).rotation.x = Math.PI / 2;
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; box(0.14, 0.16, 0.12, 0x7a5a34, Math.cos(a) * 0.47, Math.sin(a) * 0.47, 0, gear).rotation.z = a; }
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 8), 0x5c3a1e, 0, 0, 0, gear).rotation.x = Math.PI / 2;
  const chute = new THREE.Group(); g.add(chute);
  box(0.34, 0.08, 0.8, wood, 0, 1.75, 1.15, chute).rotation.x = 0.55;
  const sack = new THREE.Group(); sack.position.set(0, 0, 1.75); g.add(sack);
  mesh(new THREE.SphereGeometry(0.42, 14, 10), 0xefe3c4, 0, 0.45, 0, sack).scale.set(1, 1.15, 0.95);
  mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.18, 10), 0xd8c8a0, 0, 0.95, 0, sack);
  sack.scale.setScalar(0.001);
  const groups = [frame, stones, hopper, gear, crank, chute];
  groups.forEach(o => { o.visible = false; o.scale.setScalar(0.001); });
  // construction site shown while locked: staked-out plot, lumber, stone blocks, wheelbarrow, painted sign
  const site = new THREE.Group(); site.position.copy(MILL_POS); scene.add(site);
  const stakes = [];
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; stakes.push([Math.cos(a) * 2.0, Math.sin(a) * 1.7]); }
  stakes.forEach(([x, z], i) => {
    box(0.09, 0.75, 0.09, wood, x, 0.37, z, site); box(0.11, 0.1, 0.11, 0xd9473b, x, 0.78, z, site);
    const [nx, nz] = stakes[(i + 1) % stakes.length];
    box(Math.hypot(nx - x, nz - z), 0.07, 0.02, i % 2 ? 0xf6f1e6 : 0xd9473b, (x + nx) / 2, 0.6, (z + nz) / 2, site).rotation.y = -Math.atan2(nz - z, nx - x);
  });
  [-0.25, 0, 0.25].forEach(dz => box(1.6, 0.1, 0.22, wood, -0.7, 0.06, -0.4 + dz, site));
  [-0.45, -0.7, -0.95].forEach(dx => box(0.22, 0.1, 1.2, 0xb07a46, dx, 0.17, -0.4, site));
  [[0.75, 0.24, -0.55], [1.2, 0.24, -0.25], [0.95, 0.7, -0.4]].forEach(([x, y, z]) => box(0.46, 0.46, 0.46, 0xc9c2b2, x, y, z, site));
  const wb = new THREE.Group(); wb.position.set(0.55, 0, 0.7); wb.rotation.y = 0.6; site.add(wb);
  box(0.8, 0.28, 0.55, 0x4f8a6a, 0, 0.42, 0, wb);
  mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 12), 0x3a3a3a, 0.48, 0.17, 0, wb).rotation.x = Math.PI / 2;
  [-0.2, 0.2].forEach(z => box(0.75, 0.05, 0.05, wood, -0.55, 0.36, z, wb));
  mesh(new THREE.SphereGeometry(0.24, 10, 8), 0xa47c4c, 0.02, 0.56, 0, wb).scale.y = 0.45;
  [[-1.3, 0.85], [1.45, 0.6]].forEach(([x, z]) => mesh(new THREE.SphereGeometry(0.5, 12, 8), 0xa47c4c, x, 0, z, site).scale.set(1, 0.45, 0.8));
  const signTex = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#d2ad74'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8a5a32'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
    c.fillStyle = '#4a2f1a'; c.textAlign = 'center'; c.font = 'bold 34px sans-serif'; c.fillText('CỐI XAY BỘT', w / 2, 56);
    c.fillStyle = '#9c3f1c'; c.font = 'bold 26px sans-serif'; c.fillText('Mở ở cấp 2', w / 2, 96);
  });
  [-0.55, 0.55].forEach(x => box(0.1, 1.3, 0.1, dark, x, 0.65, 1.25, site));
  box(1.36, 0.7, 0.08, 0x8a5a32, 0, 1.15, 1.25, site);
  mesh(new THREE.PlaneGeometry(1.3, 0.65), toon(0xffffff, { map: signTex }), 0, 1.15, 1.295, site);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(3, 3.8, 3.4), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(MILL_X, 1.9, MILL_Z + 0.4); hit.userData.mill = true; scene.add(hit);
  solids.push({ x: MILL_X, z: MILL_Z, r: 1.8 });
  return { g, site, groups, stone, crank, gear, grain, hopper, sack, hit, state: 'locked', buildT: -1, job: null, t: 0, loadN: 0, grindT: 0 };
})();

// ================= Fences, flowers, decoration (instanced) =================
const fenceSegs = [];
function fence(pts) { for (let i = 0; i < pts.length - 1; i++) fenceSegs.push([pts[i], pts[i + 1]]); }
fence([[-3.9, 2.2], [-3.9, -1.7], [7.9, -1.7], [7.9, 7.6], [-3.9, 7.6], [-3.9, 4.2]]); // plots, gap on the left
fence([[-12.2, 3.6], [-12.2, 7.6], [-5.8, 7.6], [-5.8, 4.4]]);                       // chicken yard
fence([[3.4, -7.4], [8, -7.4], [8, -3.2], [3.4, -3.2], [3.4, -5.6]]);                 // sheep pen
const posts = [], rails = [];
fenceSegs.forEach(([[ax, az], [bx, bz]]) => {
  const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 1.3));
  for (let i = 0; i <= n; i++) posts.push([ax + (bx - ax) * i / n, az + (bz - az) * i / n]);
  rails.push([(ax + bx) / 2, (az + bz) / 2, L, -Math.atan2(bz - az, bx - ax)]);
});
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler();
const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 1, 0.18), toon(0x9a6a3e), posts.length);
posts.forEach(([x, z], i) => { M4.compose(V.set(x, 0.5, z), Q.identity(), S.set(1, 1, 1)); postMesh.setMatrixAt(i, M4); });
postMesh.castShadow = postMesh.receiveShadow = true; scene.add(postMesh);
const railMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.12, 0.08), toon(0xa8743f), rails.length * 2);
rails.forEach(([x, z, L, ry], i) => {
  Q.setFromEuler(E.set(0, ry, 0));
  [0.42, 0.8].forEach((y, k) => { M4.compose(V.set(x, y, z), Q, S.set(L, 1, 1)); railMesh.setMatrixAt(i * 2 + k, M4); });
});
railMesh.castShadow = railMesh.receiveShadow = true; scene.add(railMesh);

const blocked = (x, z) => (x > -4.4 && x < 8.4 && z > -2.2 && z < 8.1) || solids.some(s => Math.hypot(x - s.x, z - s.z) < s.r + 0.6) || (x > -12.6 && x < -5.4 && z > 3.2 && z < 8) || (x > 3 && x < 8.4 && z > -7.8 && z < -2.8) || z < -19 || Math.abs(z - ROAD_Z) < 2 || onPath(x, z) || (Math.abs(x - MILL_X) < 2.5 && Math.abs(z - MILL_Z) < 2.4);
function scatter(geo, mat, count, colors, sy = [0.8, 1.2], area = 26) {
  const im = new THREE.InstancedMesh(geo, mat, count); const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    let x, z, t = 0; do { x = rand(-area, area); z = rand(-19, 16); t++; } while (blocked(x, z) && t < 40);
    const s = rand(...sy); M4.compose(V.set(x, 0, z), Q.setFromEuler(E.set(0, rand(0, 6), 0)), S.set(s, s, s)); im.setMatrixAt(i, M4);
    im.setColorAt(i, c.set(pick(colors)));
  }
  scene.add(im); return im;
}
function buildFlora() {
  TREES.forEach(a => tree(...a)); PINES.forEach(a => pine(...a)); SUNFLOWERS.forEach(a => sunflower(...a));
  // grass: dense clumps of short blades, darker at the root, growing in patches like a real lawn
  const bp = [];
  const BLADE = new THREE.ConeGeometry(1, 1, 3, 1, true); // 3 triangles per blade keeps ~850 clumps cheap on phone GPUs
  for (let i = 0; i < 12; i++) limb(bp, BLADE, 0xffffff, rand(-0.1, 0.1), 0, rand(-0.1, 0.1), 0.045, rand(0.26, 0.5), rand(0.05, 0.45), i / 12 * 6.28 + rand(-0.3, 0.3), 0.3);
  patchScatter(merge(bp), swayMat(0.3, 0, true), 200, 7, 1.1, [0x86c94f, 0x93d158, 0x76bb45, 0xa2d963, 0x6aae3d], [0.8, 1.3]);
  // flowers: five petals around a golden centre, in small drifts
  const fp = [];
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; part(fp, SPH_LO, 0xffffff, Math.cos(a) * 0.075, 0.15, Math.sin(a) * 0.075, 0.06, 0.02, 0.04, 0, -a); }
  part(fp, SPH_LO, 0xffd23f, 0, 0.16, 0, 0.04, 0.03, 0.04);
  patchScatter(merge(fp), vcPlain, 34, 4, 0.7, [0xffffff, 0xf7a8c4, 0xffe27a, 0xf59a7a, 0xd4b8f5], [0.9, 1.3]);
  // garden borders: lavender (purple spikes on arching leaves) along the paths,
  // reed plumes (cỏ lau) behind the road kerb and along the lake shore
  const STEM3 = new THREE.CylinderGeometry(1, 1, 1, 3, 1, true), PLUME = new THREE.SphereGeometry(1, 4, 3), SPIKE = new THREE.ConeGeometry(1, 1, 5);
  const arch = (p, col, w, l1, l2, t0, bend, yaw) => {
    const tip = limb(p, BLADE, vary(col, 0.02, 0.05), rand(-0.06, 0.06), 0, rand(-0.06, 0.06), w, l1, t0, yaw, 0.3);
    limb(p, BLADE, vary(col, 0.02, 0.05), tip.x, tip.y, tip.z, w * 0.75, l2, t0 + bend, yaw, 0.3);
  };
  const dirOf = (tilt, yaw) => { _e.set(tilt, yaw, 0, 'YXZ'); return new THREE.Vector3(0, 1, 0).applyEuler(_e); };
  const lav = [];
  for (let i = 0; i < 14; i++) arch(lav, i % 3 ? 0x3f7a3a : 0x54914a, 0.035, rand(0.22, 0.3), rand(0.18, 0.26), rand(0.25, 0.55), rand(0.5, 0.8), i / 14 * 6.28 + rand(-0.2, 0.2));
  for (let i = 0; i < 6; i++) {
    const tilt = rand(0.05, 0.3), yaw = rand(0, 6.28), top = limb(lav, STEM3, 0x5d7f3e, rand(-0.06, 0.06), 0, rand(-0.06, 0.06), 0.012, rand(0.32, 0.45), tilt, yaw), d = dirOf(tilt, yaw);
    part(lav, SPIKE, vary(0x8a5cc8, 0.02, 0.06), top.x + d.x * 0.11, top.y + d.y * 0.11, top.z + d.z * 0.11, 0.045, 0.24, 0.045, tilt, yaw);
  }
  const reed = [];
  for (let i = 0; i < 22; i++) arch(reed, Math.random() < 0.2 ? 0xb58a4a : 0x5f8f3e, 0.03, rand(0.3, 0.42), rand(0.22, 0.32), rand(0.1, 0.4), rand(0.5, 0.9), rand(0, 6.28));
  for (let i = 0; i < 6; i++) {
    const tilt = rand(0.25, 0.6), yaw = i / 6 * 6.28 + rand(-0.3, 0.3), top = limb(reed, STEM3, 0x9a9a5a, 0, 0, 0, 0.012, rand(0.55, 0.75), tilt, yaw), d = dirOf(tilt + 0.25, yaw);
    part(reed, PLUME, vary(0xefe4c6, 0.01, 0.04), top.x + d.x * 0.14, top.y + d.y * 0.14, top.z + d.z * 0.14, 0.065, 0.2, 0.065, tilt + 0.25, yaw);
  }
  const lavPts = [], reedPts = [];
  PATHS.forEach(p => {
    const L = p.curve.getLength();
    for (let s = 0.4; s < L - 0.4; s += 0.55) { // close enough to read as one continuous border
      const u = s / L, pt = p.curve.getPointAt(u), t = p.curve.getTangentAt(u), o = p.w / 2 + 0.42;
      [-1, 1].forEach(side => { const x = pt.x - t.z * o * side, z = pt.z + t.x * o * side; if (!blocked(x, z)) lavPts.push([x + rand(-0.08, 0.08), z + rand(-0.08, 0.08)]); });
    }
  });
  const nearLav = (x, z) => lavPts.some(([a, b]) => Math.hypot(a - x, b - z) < 0.8);
  for (let x = -40; x < 40; x += rand(1.0, 1.5)) {
    const z = ROAD_Z - ROAD.w / 2 - 0.75;
    if (x > -6.2 && x < -3.6 || x > STOP_X - 1.9 && x < STOP_X + 1.9 || onPath(x, z) || nearLav(x, z) || solids.some(s => Math.hypot(x - s.x, z - s.z) < s.r + 0.3)) continue;
    reedPts.push([x, z + rand(-0.15, 0.15)]);
  }
  for (let x = -45; x < 45; x += rand(1.2, 2.2)) reedPts.push([x, -20.2 + rand(-0.4, 0.3)]); // lake shore
  const bordMat = swayMat(0.12, 0);
  [[merge(lav), lavPts, [0xffffff, 0xf2eefa, 0xfbf8ff]], [merge(reed), reedPts, [0xffffff, 0xf7f2e6]]].forEach(([geo, pts, cols]) => {
    const im = new THREE.InstancedMesh(geo, bordMat, pts.length), c = new THREE.Color();
    pts.forEach(([x, z], i) => { const s = rand(1.1, 1.5); M4.compose(V.set(x, 0, z), Q.setFromEuler(E.set(0, rand(0, 6.28), 0)), S.set(s, s, s)); im.setMatrixAt(i, M4); im.setColorAt(i, c.set(pick(cols))); });
    im.castShadow = true; scene.add(im);
  });
  // boulders: a faceted main stone with a moss cap and a couple of smaller stones
  const rockMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad, flatShading: true });
  for (let i = 0; i < 9; i++) {
    let x, z, t = 0; do { x = rand(-24, 24); z = rand(-18, 15); t++; } while (blocked(x, z) && t < 40);
    const p = [], n = 1 + (Math.random() * 3 | 0);
    for (let k = 0; k < n; k++) {
      const r = k ? rand(0.18, 0.3) : rand(0.35, 0.5), a = rand(0, 6.28), d = k ? rand(0.35, 0.6) : 0;
      part(p, SPH_LO, vary(0xa8a196, 0.01, 0.05), Math.cos(a) * d, r * 0.35, Math.sin(a) * d, r, r * 0.75, r * 0.9, 0, rand(0, 6));
      if (!k) part(p, SPH_LO, 0x6f9a45, 0, r * 0.78, 0, r * 0.6, r * 0.16, r * 0.5, 0, rand(0, 6));
    }
    mesh(merge(p), rockMat, x, 0, z);
  }
}
function patchScatter(geo, mat, patches, per, rad, colors, sy) {
  const pts = [];
  for (let k = 0; k < patches; k++) {
    let cx, cz, t = 0; do { cx = rand(-26, 26); cz = rand(-19, 16); t++; } while (blocked(cx, cz) && t < 40);
    const n = Math.round(per * rand(0.5, 1.5));
    for (let i = 0; i < n; i++) { const a = rand(0, 6.28), r = Math.sqrt(Math.random()) * rad, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (!blocked(x, z)) pts.push([x, z]); }
  }
  const im = new THREE.InstancedMesh(geo, mat, pts.length), c = new THREE.Color();
  pts.forEach(([x, z], i) => { const s = rand(...sy); M4.compose(V.set(x, 0, z), Q.setFromEuler(E.set(0, rand(0, 6), 0)), S.set(s, s, s)); im.setMatrixAt(i, M4); im.setColorAt(i, c.set(pick(colors))); });
  scene.add(im); return im;
}
// Sunflower: sturdy stem with two leaves, a ring of petals around a seed disc, face tipped up toward the camera
function sunflower(x, z, h = 1.6) {
  const p = [];
  part(p, CYL8, 0x4f8f2e, 0, h / 2, 0, 0.06, h, 0.06);
  [[0.45, 0.8], [0.68, -2.3]].forEach(([fy, yaw]) => part(p, SPH, 0x5e9a35, Math.sin(yaw) * 0.22, h * fy, Math.cos(yaw) * 0.22, 0.26, 0.05, 0.13, 0.35, yaw));
  mesh(merge(p), vcPlain, x, 0, z);
  const hp = [];
  part(hp, CYL8, 0x6b3f1c, 0, 0, 0.02, 0.17, 0.08, 0.17, Math.PI / 2);
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; part(hp, SPH, i % 2 ? 0xffd23f : 0xf6b91c, Math.cos(a) * 0.27, Math.sin(a) * 0.27, 0, 0.15, 0.06, 0.025, 0, 0, a); }
  mesh(merge(hp), vcPlain, x, h, z + 0.04).rotation.x = -0.6;
}
const SUNFLOWERS = [[-6.4, 8.6, 1.7], [-7, 8, 1.4], [-2.4, 8.5, 1.5], [10.2, 8.6, 1.6], [-12.6, 8.4, 1.5]];
[[-2, -3.4], [6.5, 9], [-13.6, -2.5]].forEach(([x, z]) => { const h = mesh(new THREE.CylinderGeometry(0.55, 0.55, 1, 12), 0xe6c25c, x, 0.55, z); h.rotation.z = Math.PI / 2; h.rotation.y = rand(0, 3); });
mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 10), 0x8a5a32, 9.6, 0.4, 1.6);
box(0.8, 0.5, 0.8, 0x9a6a3e, 10.4, 0.25, 1.2);
box(1.6, 0.35, 0.5, 0x8a5a32, 5.6, 0.18, -6.6); // trough
box(1.4, 0.06, 0.4, 0x7fc4e8, 5.6, 0.37, -6.6);

// clouds
const clouds = [];
for (let i = 0; i < 7; i++) {
  const g = new THREE.Group(); g.position.set(rand(-60, 60), rand(16, 24), rand(-60, -25)); scene.add(g);
  for (let k = 0; k < 5; k++) mesh(new THREE.IcosahedronGeometry(rand(1.6, 2.8), 1), toon(0xffffff, { flatShading: true }), k * 2 - 4, rand(-0.5, 0.8), rand(-1, 1), g, false);
  g.userData.speed = rand(0.4, 0.9); clouds.push(g);
}

// ================= Crops: merged low-poly models =================
const UG = { cyl: new THREE.CylinderGeometry(1, 1, 1, 6), cone: new THREE.ConeGeometry(1, 1, 5), sph: new THREE.SphereGeometry(1, 7, 5), ico: new THREE.IcosahedronGeometry(1, 0) };
const flatCache = new Map();
const flat = g => { if (!flatCache.has(g)) flatCache.set(g, g.index ? g.toNonIndexed() : g); return flatCache.get(g); };
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
function part(parts, geo, color, x, y, z, sx, sy, sz, tilt = 0, yaw = 0, roll = 0) {
  _e.set(tilt, yaw, roll, 'YXZ'); _q.setFromEuler(_e); _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
  parts.push([geo, _m.clone(), color]);
}
// a stalk/leaf from a base point, tilted and turned; returns its tip
function limb(parts, geo, color, x, y, z, w, len, tilt, yaw, thin = 1) {
  _e.set(tilt, yaw, 0, 'YXZ'); const d = new THREE.Vector3(0, 1, 0).applyEuler(_e);
  part(parts, geo, color, x + d.x * len / 2, y + d.y * len / 2, z + d.z * len / 2, w, len, w * thin, tilt, yaw);
  return new THREE.Vector3(x + d.x * len, y + d.y * len, z + d.z * len);
}
function merge(parts) {
  let n = 0; for (const [g] of parts) n += flat(g).attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const v = new THREE.Vector3(), nm = new THREE.Matrix3(), c = new THREE.Color(); let o = 0;
  for (const [g0, m, color] of parts) {
    const g = flat(g0), P = g.attributes.position, N = g.attributes.normal; nm.getNormalMatrix(m); c.set(color);
    for (let i = 0; i < P.count; i++, o++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m); pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[o * 3] = v.x; nor[o * 3 + 1] = v.y; nor[o * 3 + 2] = v.z;
      col[o * 3] = c.r; col[o * 3 + 1] = c.g; col[o * 3 + 2] = c.b;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingSphere(); return geo;
}
const vary = (hex, h = 0.02, l = 0.05) => new THREE.Color(hex).offsetHSL(rand(-h, h), 0, rand(-l, l));
function grid(cols, rows, sx, sz, fn) {
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++)
    fn((i - (cols - 1) / 2) * sx + rand(-0.06, 0.06), (j - (rows - 1) / 2) * sz + rand(-0.06, 0.06), i, j);
}
const BUILD = {
  seed() {
    const p = [];
    grid(3, 4, 0.62, 0.5, (x, z) => {
      limb(p, UG.cyl, 0x6aa83a, x, 0, z, 0.02, 0.16, 0, 0);
      const y = rand(0, 3);
      [0, Math.PI].forEach(a => part(p, UG.sph, vary(0x9ad04a), x + Math.sin(y + a) * 0.08, 0.17, z + Math.cos(y + a) * 0.08, 0.1, 0.03, 0.055, 0.2, y + a));
    });
    return merge(p);
  },
  wheat(ripe) {
    const p = [];
    grid(4, 4, 0.5, 0.48, (x, z) => {
      const n = ripe ? 4 : 5;
      for (let k = 0; k < n; k++) {
        const yaw = k / n * Math.PI * 2 + rand(-0.3, 0.3), tilt = rand(0.08, 0.24);
        if (ripe) {
          const tip = limb(p, UG.cyl, vary(0xc99a2e), x, 0, z, 0.022, rand(0.75, 0.98), tilt, yaw);
          _e.set(tilt, yaw, 0, 'YXZ'); const d = new THREE.Vector3(0, 1, 0).applyEuler(_e);
          part(p, UG.sph, vary(0xf2b532, 0.02, 0.06), tip.x + d.x * 0.12, tip.y + d.y * 0.12, tip.z + d.z * 0.12, 0.075, 0.17, 0.075, tilt, yaw);
          if (k % 2) limb(p, UG.cone, vary(0x86a83a), x, 0.1, z, 0.06, 0.5, tilt + 0.45, yaw + 1.2, 0.25);
        } else limb(p, UG.cone, vary(0x8cc63f), x, 0, z, 0.045, rand(0.42, 0.6), tilt + 0.1, yaw, 0.4);
      }
    });
    return merge(p);
  },
  corn(ripe) {
    const p = [];
    grid(3, 3, 0.68, 0.66, (x, z) => {
      const h = ripe ? rand(1.45, 1.7) : rand(0.7, 0.9);
      limb(p, UG.cyl, vary(0x6ea83a), x, 0, z, 0.05, h, rand(0, 0.06), rand(0, 6));
      const nl = ripe ? 6 : 4;
      for (let k = 0; k < nl; k++) {
        const y = 0.15 + k / nl * h * 0.75;
        limb(p, UG.cone, vary(0x5f9e34), x, y, z, 0.08, (ripe ? 0.85 : 0.5) * (1 - k / nl * 0.4), rand(0.85, 1.15), k * 2.4 + rand(-0.3, 0.3), 0.22);
      }
      if (ripe) {
        const yaw = rand(0, 6), y = h * 0.55;
        const sx = x + Math.sin(yaw) * 0.08, sz = z + Math.cos(yaw) * 0.08;
        part(p, UG.sph, vary(0xf7c844), sx + Math.sin(yaw) * 0.06, y + 0.12, sz + Math.cos(yaw) * 0.06, 0.09, 0.2, 0.09, 0.35, yaw);
        limb(p, UG.cone, 0x7fb34a, sx, y - 0.06, sz, 0.1, 0.32, 0.4, yaw + 0.3, 0.6);
        for (let k = 0; k < 3; k++) limb(p, UG.cone, 0xd8b56a, x, h, z, 0.03, 0.22, 0.5, k * 2.1, 1);
      }
    });
    return merge(p);
  },
  carrot(ripe) {
    const p = [];
    grid(3, 4, 0.62, 0.5, (x, z) => {
      if (ripe) part(p, UG.cone, vary(0xf07c1e, 0.015, 0.05), x, 0.02, z, 0.13, 0.36, 0.13, Math.PI, 0);
      const n = ripe ? 6 : 4, base = ripe ? 0.14 : 0.02;
      for (let k = 0; k < n; k++) {
        const tip = limb(p, UG.cone, vary(0x4f9d2f), x, base, z, 0.035, ripe ? rand(0.4, 0.55) : rand(0.22, 0.3), rand(0.25, 0.6), k / n * 6.28 + rand(-0.2, 0.2), 0.4);
        part(p, UG.ico, vary(0x5aae35), tip.x, tip.y, tip.z, ripe ? 0.09 : 0.06, ripe ? 0.07 : 0.05, ripe ? 0.09 : 0.06, 0, rand(0, 3));
      }
    });
    return merge(p);
  },
  pumpkin(ripe) {
    const p = [];
    const leaf = (x, z, s) => part(p, UG.ico, vary(0x5f9e3c), x, 0.12, z, 0.42 * s, 0.07, 0.34 * s, rand(-0.15, 0.15), rand(0, 6));
    [[-0.75, -0.7], [0.75, -0.65], [-0.8, 0.7], [0.8, 0.75], [0, -0.85], [0.05, 0.85]].forEach(([x, z]) => leaf(x, z, ripe ? 1 : 0.75));
    limb(p, UG.cyl, 0x6c9a3a, -0.8, 0.05, -0.6, 0.03, 1.6, Math.PI / 2, 1.7);
    const pk = (x, z, r, col) => {
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2;
        part(p, UG.sph, vary(col, 0.01, 0.04), x + Math.cos(a) * r * 0.42, r * 0.62, z + Math.sin(a) * r * 0.42, r * 0.56, r * 0.6, r * 0.56, 0, -a);
      }
      limb(p, UG.cyl, 0x6b6a2a, x, r * 1.1, z, r * 0.09, r * 0.4, 0.4, rand(0, 6));
    };
    if (ripe) { pk(0.15, 0.1, 0.62, 0xf28a1c); pk(-0.6, -0.45, 0.36, 0xee7e16); }
    else pk(0.1, 0.05, 0.3, 0x9cc24a);
    return merge(p);
  },
};
BUILD.tree = function (ripe) {
  const p = [];
  part(p, UG.cyl, 0x7a5230, 0, 0.45, 0, 0.1, 0.9, 0.1);
  [[0, 1.15, 0, 0.6, 0x5a9e36], [0.35, 0.95, 0.1, 0.4, 0x4f9431], [-0.35, 1.0, -0.1, 0.42, 0x4f9431], [0, 1.5, 0, 0.4, 0x6db542]]
    .forEach(([x, y, z, r, c]) => part(p, UG.sph, vary(c, 0.01, 0.03), x, y, z, r, r * 0.9, r));
  if (ripe) for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; part(p, UG.ico, 0xe0402e, Math.cos(a) * 0.5, 1.1 + 0.25 * Math.sin(i * 2.1), Math.sin(a) * 0.5, 0.1, 0.1, 0.1); }
  return merge(p);
};
// Quả/củ (màu ấm) được nhuộm theo từng loại cây; lá giữ nguyên màu xanh.
function recolor(geo, tint) {
  const col = geo.attributes.color, t = new THREE.Color(tint), tl = t.r * 0.3 + t.g * 0.59 + t.b * 0.11;
  for (let i = 0; i < col.count; i++) {
    const r = col.getX(i), g = col.getY(i), b = col.getZ(i);
    if (r <= g * 1.05) continue;
    const k = (r * 0.3 + g * 0.59 + b * 0.11) / Math.max(tl, 0.05);
    col.setXYZ(i, Math.min(1, t.r * k), Math.min(1, t.g * k), Math.min(1, t.b * k));
  }
  col.needsUpdate = true;
}
const templates = {};
function template(id, stage) {
  const key = stage === 'seed' ? 'seed' : id + stage;
  if (!templates[key]) {
    if (stage === 'seed') templates[key] = BUILD.seed();
    else {
      const [fam, tint] = FAMILY[id] || (TREE_COL[id] !== undefined ? ['tree', TREE_COL[id]] : ['wheat']);
      const g = BUILD[fam](stage === 'ripe');
      if (tint != null && stage === 'ripe') recolor(g, tint);
      templates[key] = g;
    }
  }
  return templates[key];
}
const windU = { value: 0 };
const cropMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad, flatShading: true });
cropMat.onBeforeCompile = sh => {
  sh.uniforms.uTime = windU;
  sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
    `#include <begin_vertex>
     vec4 wp = modelMatrix * vec4(position, 1.0);
     float sway = sin(uTime * 1.7 + wp.x * 0.55 + wp.z * 0.35) * 0.07 * max(position.y, 0.0);
     transformed.x += sway; transformed.z += sway * 0.35;`);
};

// ================= Plots (built on demand as the server grants land) =================
const plots = [];
const soilGeo = (() => { // one merged mesh per plot: bed + 4 furrows
  const p = [];
  part(p, new THREE.BoxGeometry(2.3, 0.28, 2.3), 0xffffff, 0, 0.12, 0, 1, 1, 1);
  const f = new THREE.CylinderGeometry(0.13, 0.13, 2.05, 8); f.rotateZ(Math.PI / 2);
  [-0.75, -0.25, 0.25, 0.75].forEach(fz => part(p, f, 0xffffff, 0, 0.27, fz, 1, 0.55, 1));
  return merge(p);
})();
const markerGeo = new THREE.ConeGeometry(0.22, 0.45, 4); markerGeo.rotateX(Math.PI);
const tagsEl = $('#tags');
function plotPos(i) {
  if (i < 12) return [2 + ((i % 4) - 1.5) * 2.75, 3 + (Math.floor(i / 4) - 1) * 2.75];
  const j = i - 12, b = Math.floor(j / 12), k = j % 12; // khối mở rộng ở phía đông, mỗi khối 12 ô
  const bx = 25 + 13 * (b % 2), bz = 3 - Math.floor(b / 2) * 11.5;
  return [bx + ((k % 4) - 1.5) * 2.75, bz + (Math.floor(k / 4) - 1) * 2.75];
}
const hitTargets = [];
function makePlot(i) {
  const [x, z] = plotPos(i);
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, color: 0x7d4d2b, gradientMap: grad });
  const soil = new THREE.Mesh(soilGeo, mat); soil.position.set(x, 0, z); soil.castShadow = soil.receiveShadow = true; scene.add(soil);
  const crop = new THREE.Mesh(template('luami', 'seed'), cropMat); crop.position.set(x, 0.3, z); crop.visible = false; crop.castShadow = true; scene.add(crop);
  const marker = mesh(markerGeo, toon(0xff9a2e, {}), x, 2.2, z); marker.visible = false;
  const tag = document.createElement('div'); tag.className = 'tag'; tag.hidden = true; tagsEl.appendChild(tag);
  const plot = { i, x, z, soil, mat, crop, marker, tag, state: 'empty', stage: null, cropKey: null, isTree: false, serverReady: false, watered: false, plantedAt: 0, readyAt: 0, dur: 1, pending: null, busy: false, pop: 1, out: 0, birth: 1 };
  soil.userData.plot = plot; plots.push(plot); hitTargets.push(soil);
  return plot;
}
const stallTag = document.createElement('div'); stallTag.className = 'tag sign'; stallTag.textContent = 'Chợ · bán hàng'; tagsEl.appendChild(stallTag);

// ================= Characters =================
const skin = 0xf7d3b0;
function makeFarmer() {
  const root = new THREE.Group(); scene.add(root);
  const blue = 0x3f6fb5, boot = 0x6b4423;
  const legs = [-0.13, 0.13].map(lx => {
    const pv = new THREE.Group(); pv.position.set(lx, 0.55, 0); root.add(pv);
    mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.42, 8), blue, 0, -0.22, 0, pv);
    box(0.17, 0.14, 0.26, boot, 0, -0.48, 0.04, pv);
    return pv;
  });
  const upper = new THREE.Group(); upper.position.y = 0.6; root.add(upper);
  mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.26, 12), blue, 0, 0.06, 0, upper);
  mesh(new THREE.CylinderGeometry(0.26, 0.29, 0.46, 12), toon(0xffffff, { map: plaid }), 0, 0.38, 0, upper);
  box(0.34, 0.3, 0.06, blue, 0, 0.3, 0.27, upper);
  [-0.12, 0.12].forEach(sx => box(0.06, 0.34, 0.05, blue, sx, 0.47, 0.25, upper));
  [-0.12, 0.12].forEach(sx => mesh(new THREE.SphereGeometry(0.035, 6, 4), 0xf2d27a, sx, 0.42, 0.29, upper));
  const arms = [-1, 1].map(sx => {
    const pv = new THREE.Group(); pv.position.set(sx * 0.33, 0.56, 0); upper.add(pv);
    mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.42, 8), toon(0xffffff, { map: plaid }), 0, -0.2, 0, pv);
    mesh(new THREE.SphereGeometry(0.085, 8, 6), skin, 0, -0.44, 0, pv);
    return pv;
  });
  const head = new THREE.Group(); head.position.y = 1.02; head.scale.setScalar(1.3); upper.add(head); // chibi: big head reads at phone size
  mesh(new THREE.SphereGeometry(0.36, 18, 14), skin, 0, 0, 0, head);
  const hair = mesh(new THREE.SphereGeometry(0.385, 18, 14), 0x3b2416, 0, 0.05, -0.07, head); hair.scale.set(1, 0.98, 0.95);
  const bang = mesh(new THREE.SphereGeometry(0.3, 12, 8), 0x3b2416, 0, 0.2, 0.15, head); bang.scale.set(1.15, 0.45, 0.8);
  const tail = new THREE.Group(); tail.position.set(0, -0.05, -0.36); head.add(tail);
  mesh(new THREE.SphereGeometry(0.13, 10, 8), 0x3b2416, 0, -0.08, -0.02, tail).scale.set(1, 1.7, 1);
  mesh(new THREE.SphereGeometry(0.05, 6, 4), 0xd9473b, 0, 0.12, 0, tail);
  const eyes = [], glints = [];
  [-0.13, 0.13].forEach(ex => {
    const e = mesh(new THREE.SphereGeometry(0.05, 8, 6), 0x2a1a10, ex, -0.02, 0.33, head); e.scale.set(1, 1.3, 0.6); eyes.push(e);
    glints.push(mesh(new THREE.SphereGeometry(0.018, 4, 4), 0xffffff, ex + 0.015, 0.01, 0.36, head));
    mesh(new THREE.SphereGeometry(0.055, 8, 6), 0xf3a1a1, ex * 1.5, -0.12, 0.29, head).scale.set(1, 0.6, 0.4);
  });
  const mouth = mesh(new THREE.TorusGeometry(0.055, 0.014, 4, 10, Math.PI), 0x8a3b2a, 0, -0.14, 0.335, head, false); mouth.rotation.z = Math.PI;
  const hat = new THREE.Group(); hat.position.set(0, 0.38, -0.08); hat.rotation.x = -0.4; hat.scale.setScalar(0.82); head.add(hat); // tipped back so the face shows from above
  mesh(new THREE.ConeGeometry(0.78, 0.46, 28), 0xe9c77b, 0, 0.12, 0, hat);
  const rim = mesh(new THREE.TorusGeometry(0.76, 0.025, 4, 28), 0xc9a75a, 0, -0.1, 0, hat); rim.rotation.x = Math.PI / 2;
  [0.3, 0.6].forEach(f => { const l = mesh(new THREE.TorusGeometry(0.78 * (1 - f) + 0.006, 0.012, 3, 24), 0xc9a75a, 0, -0.11 + f * 0.46, 0, hat); l.rotation.x = Math.PI / 2; });
  // tools held in the right hand
  const hoe = new THREE.Group(); hoe.position.set(0, -0.44, 0); arms[1].add(hoe);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), 0x9a6a3e, 0, 0, 0.3, hoe).rotation.x = Math.PI / 2;
  box(0.26, 0.04, 0.2, 0x9aa3a8, 0, -0.08, 0.88, hoe).rotation.x = 0.9;
  const can = new THREE.Group(); can.position.set(0, -0.5, 0.05); arms[1].add(can);
  mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.3, 12), 0x4fa36a, 0, -0.06, 0.08, can);
  const spout = mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.4, 6), 0x4fa36a, 0, 0.0, 0.3, can); spout.rotation.x = 1.1;
  const spoutTip = new THREE.Object3D(); spoutTip.position.set(0, 0.08, 0.48); can.add(spoutTip);
  const basket = new THREE.Group(); basket.position.set(0, -0.5, 0.06); arms[0].add(basket);
  mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.2, 10), 0xc99a5c, 0, -0.05, 0, basket);
  const handle = mesh(new THREE.TorusGeometry(0.17, 0.02, 4, 12, Math.PI), 0xa8743f, 0, 0.05, 0, basket);
  hoe.visible = can.visible = false;
  root.position.set(-4.8, 0, 1.2); root.scale.setScalar(1.15);
  return { root, upper, legs, arms, head, tail, hoe, can, spoutTip, basket, eyes, glints, phase: 0, state: 'idle', t: 0, task: null, facing: 0, lookT: 0, blinkT: 2, blink: 0 };
}
const farmer = makeFarmer(); farmer.queue = [];

const animals = [];
function chicken(x, z, brown) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const body = brown ? 0xc8742e : 0xfafafa;
  const b = mesh(new THREE.SphereGeometry(0.28, 12, 10), body, 0, 0.36, 0, g); b.scale.set(0.9, 0.85, 1.15);
  const tail = mesh(new THREE.ConeGeometry(0.15, 0.3, 6), body, 0, 0.52, -0.3, g); tail.rotation.x = -0.9;
  const head = new THREE.Group(); head.position.set(0, 0.64, 0.24); head.scale.setScalar(1.35); g.add(head); g.scale.setScalar(1.15);
  mesh(new THREE.SphereGeometry(0.15, 10, 8), body, 0, 0, 0, head);
  mesh(new THREE.ConeGeometry(0.045, 0.13, 5), 0xf0a020, 0, -0.02, 0.17, head).rotation.x = Math.PI / 2;
  box(0.04, 0.12, 0.14, 0xe0402e, 0, 0.15, 0.02, head);
  mesh(new THREE.SphereGeometry(0.035, 5, 4), 0xe0402e, 0, -0.1, 0.12, head);
  [-0.07, 0.07].forEach(ex => mesh(new THREE.SphereGeometry(0.022, 5, 4), 0x1a1a1a, ex, 0.03, 0.12, head));
  [-0.1, 0.1].forEach(lx => mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4), 0xf0a020, lx, 0.1, 0, g));
  const a = { g, head, kind: 'hen', speed: 1.1, area: [-11.6, 4.1, -6.4, 7.2], tx: x, tz: z, wait: rand(0, 2), peck: 0, hop: 0, vy: 0 };
  g.userData.animal = a; animals.push(a); return a;
}
function chick(mom, ox, oz) {
  const g = new THREE.Group(); scene.add(g);
  mesh(new THREE.SphereGeometry(0.12, 10, 8), 0xffd84a, 0, 0.13, 0, g);
  const head = new THREE.Group(); head.position.set(0, 0.26, 0.06); head.scale.setScalar(1.3); g.add(head); g.scale.setScalar(1.15);
  mesh(new THREE.SphereGeometry(0.08, 8, 6), 0xffd84a, 0, 0, 0, head);
  mesh(new THREE.ConeGeometry(0.025, 0.06, 4), 0xf0a020, 0, 0, 0.09, head).rotation.x = Math.PI / 2;
  g.position.set(mom.g.position.x + ox, 0, mom.g.position.z + oz);
  const a = { g, head, kind: 'chick', follow: mom, ox, oz, speed: 1.6, hop: 0, vy: 0, peck: 0 };
  g.userData.animal = a; animals.push(a);
}
function sheep(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const wool = toon(0xf6f2ea, { flatShading: true });
  [[0, 0.62, 0, 0.36], [0.2, 0.68, 0.18, 0.28], [-0.2, 0.68, 0.18, 0.28], [0.2, 0.66, -0.2, 0.28], [-0.2, 0.66, -0.2, 0.28], [0, 0.82, 0, 0.3]].forEach(([px, py, pz, r]) => mesh(new THREE.IcosahedronGeometry(r, 1), wool, px, py, pz, g));
  const head = new THREE.Group(); head.position.set(0, 0.8, 0.47); head.scale.setScalar(1.3); g.add(head); g.scale.setScalar(1.1);
  const h = mesh(new THREE.SphereGeometry(0.19, 10, 8), 0x3d3431, 0, 0, 0, head); h.scale.set(0.85, 1, 1.15);
  mesh(new THREE.IcosahedronGeometry(0.13, 1), wool, 0, 0.14, -0.02, head);
  [-1, 1].forEach(s => { const e = mesh(new THREE.SphereGeometry(0.08, 6, 4), 0x3d3431, s * 0.2, 0.04, -0.02, head); e.scale.set(1, 0.4, 0.6); });
  [-0.06, 0.06].forEach(ex => mesh(new THREE.SphereGeometry(0.025, 5, 4), 0xffffff, ex, 0.05, 0.2, head));
  [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.2], [0.18, 0.2]].forEach(([lx, lz]) => mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 5), 0x3d3431, lx, 0.2, lz, g));
  const a = { g, head, kind: 'sheep', speed: 0.7, area: [3.9, -6.9, 7.5, -3.7], tx: x, tz: z, wait: rand(0, 3), peck: 0, hop: 0, vy: 0 };
  g.userData.animal = a; animals.push(a);
}
function pig(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const pink = 0xf4a7a3;
  const b = mesh(new THREE.SphereGeometry(0.42, 14, 10), pink, 0, 0.5, 0, g); b.scale.set(0.95, 0.85, 1.25);
  const head = new THREE.Group(); head.position.set(0, 0.62, 0.5); head.scale.setScalar(1.2); g.add(head); g.scale.setScalar(1.1);
  mesh(new THREE.SphereGeometry(0.27, 12, 10), pink, 0, 0, 0, head);
  mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10), 0xe58f8b, 0, -0.04, 0.26, head).rotation.x = Math.PI / 2;
  [-0.04, 0.04].forEach(nx => mesh(new THREE.SphereGeometry(0.02, 4, 4), 0x9a4a4a, nx, -0.04, 0.32, head));
  [-1, 1].forEach(s => { const e = mesh(new THREE.ConeGeometry(0.08, 0.16, 4), pink, s * 0.15, 0.22, 0.02, head); e.rotation.z = -s * 0.4; });
  [-0.09, 0.09].forEach(ex => mesh(new THREE.SphereGeometry(0.03, 5, 4), 0x2a1a10, ex, 0.07, 0.22, head));
  [[-0.2, -0.25], [0.2, -0.25], [-0.2, 0.25], [0.2, 0.25]].forEach(([lx, lz]) => mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 6), pink, lx, 0.13, lz, g));
  const tl = mesh(new THREE.TorusGeometry(0.06, 0.02, 4, 10, 4.5), pink, 0, 0.6, -0.52, g); tl.rotation.y = Math.PI / 2;
  const a = { g, head, kind: 'pig', speed: 0.6, area: [3.9, -6.9, 7.5, -3.7], tx: x, tz: z, wait: rand(0, 3), peck: 0, hop: 0, vy: 0 };
  g.userData.animal = a; animals.push(a);
}
const hen1 = chicken(-9, 5.5, false), hen2 = chicken(-7.5, 6.3, true); chicken(-10.5, 6.5, false);
chick(hen1, 0.5, -0.4); chick(hen1, -0.5, -0.5); chick(hen2, 0.4, -0.5); chick(hen2, -0.3, -0.6);
sheep(5, -5.8); sheep(6.8, -4.4); pig(4.6, -4.3);

// butterflies
const flies = [];
for (let i = 0; i < 4; i++) {
  const g = new THREE.Group(); scene.add(g);
  const col = pick([0xffffff, 0xffd94a, 0xf7a8c4, 0x9fd3ff]);
  const wings = [-1, 1].map(s => { const w = mesh(new THREE.CircleGeometry(0.13, 6), toon(col, { side: THREE.DoubleSide }), 0, 0, 0, g, false); w.geometry.translate(s * 0.13, 0, 0); return w; });
  flies.push({ g, wings, cx: rand(-8, 10), cz: rand(-2, 10), r: rand(1.5, 3), sp: rand(0.4, 0.8), ph: rand(0, 6) });
}

// ================= Particles =================
const PMAX = 1200;
const pPos = new Float32Array(PMAX * 3), pVel = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 4), pSize = new Float32Array(PMAX);
const pLife = new Float32Array(PMAX), pMax = new Float32Array(PMAX), pGrav = new Float32Array(PMAX), pBase = new Float32Array(PMAX);
for (let i = 0; i < PMAX; i++) pPos[i * 3 + 1] = -999;
let pNext = 0;
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('aColor', new THREE.BufferAttribute(pCol, 4));
pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
const pScale = { value: 400 };
const pMat = new THREE.ShaderMaterial({
  uniforms: { uScale: pScale }, transparent: true, depthWrite: false,
  vertexShader: `attribute vec4 aColor; attribute float aSize; uniform float uScale; varying vec4 vC;
    void main(){ vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying vec4 vC; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(vC.rgb, vC.a * smoothstep(0.5, 0.32, d)); }`,
});
const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; scene.add(points);
function emit(x, y, z, hex, n, { speed = 2, up = 3, life = 0.8, grav = 9, size = 0.18, spread = 0.2, dir = null } = {}) {
  const r = (hex >> 16 & 255) / 255, g = (hex >> 8 & 255) / 255, b = (hex & 255) / 255;
  for (let k = 0; k < n; k++) {
    const i = pNext; pNext = (pNext + 1) % PMAX;
    const a = rand(0, Math.PI * 2), s = speed * rand(0.3, 1);
    pPos[i * 3] = x + rand(-spread, spread); pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z + rand(-spread, spread);
    if (dir) { pVel[i * 3] = dir.x + rand(-0.4, 0.4); pVel[i * 3 + 1] = dir.y + rand(-0.3, 0.3); pVel[i * 3 + 2] = dir.z + rand(-0.4, 0.4); }
    else { pVel[i * 3] = Math.cos(a) * s; pVel[i * 3 + 1] = up * rand(0.5, 1.1); pVel[i * 3 + 2] = Math.sin(a) * s; }
    pCol[i * 4] = r; pCol[i * 4 + 1] = g; pCol[i * 4 + 2] = b; pCol[i * 4 + 3] = 1;
    pLife[i] = pMax[i] = life * rand(0.6, 1.2); pGrav[i] = grav; pSize[i] = pBase[i] = size * rand(0.7, 1.3);
  }
}
function updateParticles(dt) {
  for (let i = 0; i < PMAX; i++) {
    if (pLife[i] <= 0) continue;
    pLife[i] -= dt; const j = i * 3;
    if (pLife[i] <= 0) { pPos[j + 1] = -999; continue; }
    pVel[j + 1] -= pGrav[i] * dt;
    pPos[j] += pVel[j] * dt; pPos[j + 1] += pVel[j + 1] * dt; pPos[j + 2] += pVel[j + 2] * dt;
    if (pPos[j + 1] < 0.3 && pVel[j + 1] < 0) { pPos[j + 1] = 0.3; pVel[j] *= 0.5; pVel[j + 2] *= 0.5; pVel[j + 1] = 0; }
    const f = pLife[i] / pMax[i];
    pCol[i * 4 + 3] = Math.min(1, f * 2.2); pSize[i] = pBase[i] * (0.4 + 0.6 * f);
  }
  pGeo.attributes.position.needsUpdate = pGeo.attributes.aColor.needsUpdate = pGeo.attributes.aSize.needsUpdate = true;
}

// ================= Audio (synthesized, in the style of NTVV's audio.js) =================
let ac = null, master = null, muted = false;
function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.6; master.connect(ac.destination); } catch (e) { ac = null; }
}
function tone(f, dur, type = 'sine', vol = 0.15, slide, delay = 0) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
let nbuf = null;
function noise(dur, vol, freq, q = 1, delay = 0) {
  if (!ac || muted) return;
  if (!nbuf) { nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = nbuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur);
}
const sfx = {
  plant: () => { noise(0.12, 0.35, 400, 1.2); tone(160, 0.12, 'sine', 0.15, 90); },
  water: () => { for (let i = 0; i < 6; i++) tone(rand(700, 1300), 0.07, 'sine', 0.06, rand(1400, 2000), i * 0.07); },
  harvest: () => { noise(0.08, 0.3, 2500, 0.8); tone(520, 0.1, 'triangle', 0.12, 780, 0.03); tone(780, 0.14, 'triangle', 0.1, 1040, 0.1); },
  ripe: () => { tone(1320, 0.12, 'sine', 0.05); tone(1760, 0.16, 'sine', 0.04, null, 0.08); },
  coin: () => { [1568, 2093, 2637].forEach((f, i) => tone(f, 0.18, 'square', 0.035, null, i * 0.06)); },
  level: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, null, i * 0.1)),
  error: () => tone(220, 0.18, 'square', 0.06, 160),
  cluck: () => { tone(900, 0.06, 'square', 0.04, 600); tone(1000, 0.08, 'square', 0.04, 650, 0.09); },
  peep: () => { tone(2200, 0.06, 'sine', 0.05, 2800); tone(2300, 0.06, 'sine', 0.05, 2900, 0.1); },
  baa: () => { if (!ac || muted) return; const t = ac.currentTime, o = ac.createOscillator(), l = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.value = 330; l.frequency.value = 18; lg.gain.value = 25; l.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g); g.connect(master); o.start(t); l.start(t); o.stop(t + 0.65); l.stop(t + 0.65); },
  oink: () => { tone(180, 0.12, 'sawtooth', 0.07, 120); tone(170, 0.14, 'sawtooth', 0.07, 110, 0.16); },
  horn: () => { tone(440, 0.16, 'square', 0.05); tone(349, 0.24, 'square', 0.05, null, 0.2); },
  engine: () => { tone(60, 1.4, 'sawtooth', 0.05, 110); noise(1.2, 0.08, 180, 0.7); },
  grind: () => { noise(0.35, 0.07, 220, 0.8); tone(70, 0.3, 'triangle', 0.04, 60); },
  thunk: () => { noise(0.08, 0.3, 300, 1.5); tone(140, 0.08, 'sine', 0.1, 90); },
  bird: () => { const f = rand(2400, 3400); tone(f, 0.08, 'sine', 0.025, f * 1.3); tone(f * 1.1, 0.1, 'sine', 0.025, f * 0.9, 0.12); },
};

// ================= UI, driven by the server state =================
const now = () => serverNow() / 1000;
const fmtDur = (ms) => { const s = Math.round(ms / 1000); return s >= 3600 ? `${Math.round(s / 360) / 10} giờ` : s >= 60 ? `${Math.round(s / 60)} phút` : `${s} giây`; };
const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
const nf = new Intl.NumberFormat('vi-VN');
const cat = () => store.catalog;
const info = (id) => cat().crops[id] || cat().trees?.[id] || cat().goods[id] || null;
const announce = (text) => { $('#farm-announcer').textContent = text; };
const seedsEl = $('#seeds');
function tweenText(el, to) {
  const from = el._v ?? to; el._v = to;
  if (from === to) { el.textContent = to; return; }
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / 550); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1 && el._v === to) requestAnimationFrame(step); };
  requestAnimationFrame(step);
  const box = el.parentElement; box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
}
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1600); }
const tmpV = new THREE.Vector3();
function toScreen(x, y, z) { tmpV.set(x, y, z).project(camera); return { x: (tmpV.x + 1) / 2 * innerWidth, y: (1 - tmpV.y) / 2 * innerHeight, behind: tmpV.z > 1 }; }
function floater(text, x, y, z, color) {
  const s = toScreen(x, y, z), el = document.createElement('div'); el.className = 'floater'; el.textContent = text; if (color) el.style.color = color;
  document.body.appendChild(el);
  el.animate([{ transform: `translate(${s.x}px, ${s.y}px) translate(-50%, 0) scale(.7)`, opacity: 0 }, { transform: `translate(${s.x}px, ${s.y - 30}px) translate(-50%, 0) scale(1.1)`, opacity: 1, offset: 0.2 }, { transform: `translate(${s.x}px, ${s.y - 70}px) translate(-50%, 0)`, opacity: 0 }], { duration: 1300, easing: 'ease-out' }).onfinish = () => el.remove();
}
function flyTo(fromX, fromY, target, make, delay = 0) {
  const r = target.getBoundingClientRect();
  flyBetween(fromX, fromY, r.left + r.width / 2, r.top + r.height / 2, make, delay, () => target.animate([{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 200 }));
}
function flyBetween(fromX, fromY, tx, ty, make, delay = 0, done) {
  const el = make(); document.body.appendChild(el);
  const midX = (fromX + tx) / 2 + rand(-60, 60), midY = Math.min(fromY, ty) - 80;
  el.animate([
    { transform: `translate(${fromX}px, ${fromY}px) translate(-50%, -50%) scale(.4)`, opacity: 0 },
    { transform: `translate(${fromX}px, ${fromY - 40}px) translate(-50%, -50%) scale(1.1)`, opacity: 1, offset: 0.2 },
    { transform: `translate(${midX}px, ${midY}px) translate(-50%, -50%) scale(.9)`, opacity: 1, offset: 0.6 },
    { transform: `translate(${tx}px, ${ty}px) translate(-50%, -50%) scale(.5)`, opacity: 0.6 },
  ], { duration: 900, delay, easing: 'ease-in-out', fill: 'backwards' }).onfinish = () => { el.remove(); if (done) done(); };
}

function renderHUD() {
  const me = store.me; if (!me) return;
  const gold = G.holdGold ?? me.gold, ge = $('#gold'); if (ge._v !== gold) tweenText(ge, gold);
  $('#lvl').textContent = $('#lvl2').textContent = me.level;
  $('#ring').style.setProperty('--p', Math.min(100, me.levelInto / Math.max(1, me.levelNeed) * 100));
  $('#xptext').textContent = `${nf.format(me.levelInto)} / ${nf.format(me.levelNeed)} EXP`;
  const n = Object.values(me.inventory).reduce((a, b) => a + b, 0);
  const bd = $('#khoBadge'); bd.hidden = n === 0; bd.textContent = n > 99 ? '99+' : n;
  renderBulk();
}
let seedsKey = '';
function renderSeeds() {
  const me = store.me, crops = Object.values(cat().crops).sort((a, b) => a.level - b.level || a.seed - b.seed);
  if (!G.seed || !crops.some(c => c.id === G.seed && c.level <= me.level)) G.seed = (crops.find(c => c.level <= me.level) || crops[0]).id;
  const key = me.level + '|' + G.seed + '|' + crops.length;
  if (key === seedsKey) return; seedsKey = key;
  seedsEl.innerHTML = '';
  crops.forEach(c => {
    const locked = c.level > me.level, sprite = itemSprite(c.id);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'seed' + (locked ? ' locked' : '');
    b.dataset.crop = c.id; b.setAttribute('aria-pressed', String(c.id === G.seed));
    b.setAttribute('aria-label', `${c.name}, ${locked ? 'cần cấp ' + c.level : c.seed + ' vàng, ' + fmtDur(c.growMs)}`);
    b.innerHTML = (sprite ? `<img src="${sprite}" alt="" loading="lazy" decoding="async">` : `<span class="emo">${c.emoji}</span>`)
      + `<span><b>${c.name}</b>${locked ? `<span class="lock">Cấp ${c.level}</span>` : `<span class="meta"><span><i></i>${c.seed}</span><span><i class="clock"></i>${fmtDur(c.growMs)}</span></span>`}</span>`;
    b.addEventListener('click', () => {
      initAudio();
      if (locked) { toast(`${c.name} mở ở cấp ${c.level}`); return; }
      G.seed = c.id; seedsKey = ''; renderSeeds(); toast(`Đã chọn hạt ${c.name}`);
    });
    seedsEl.appendChild(b);
  });
  seedsEl.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
}
let busyBulk = false;
function renderBulk() {
  const me = store.me, ps = me.plots;
  const ripe = ps.some(p => p.crop && p.ready), dry = ps.some(p => p.crop && !p.ready && !p.watered && !p.tree), empty = ps.some(p => !p.crop);
  $('#bHarvest').disabled = !ripe || busyBulk; $('#bWater').disabled = !dry || busyBulk; $('#bPlant').disabled = !empty || busyBulk;
  const nx = me.expandNext, bx = $('#bExpand');
  bx.hidden = !nx;
  if (nx) { bx.textContent = `Mở rộng +${nx.plots} ô · ${nf.format(nx.gold)}`; bx.disabled = busyBulk || me.level < nx.level || me.gold < nx.gold; bx.title = me.level < nx.level ? `Cần cấp ${nx.level}` : ''; }
}

const ERR = {
  not_enough_gold: 'Không đủ vàng', level_too_low: 'Chưa đủ cấp để làm việc này', tax_due: 'Cần trả thuế đất trước khi gieo trồng',
  plot_busy: 'Ô đất đang có cây', not_ready: 'Cây chưa chín', already_ready: 'Cây đã chín, không cần tưới', already_watered: 'Ô này đã tưới rồi',
  no_plot: 'Không có cây ở ô này', nothing_ready: 'Chưa có cây nào chín', nothing_to_water: 'Không có ô nào cần tưới', no_empty_plot: 'Không còn ô trống',
  not_enough_items: 'Kho không đủ hàng', rate_limited: 'Bạn thao tác nhanh quá, đợi một chút nhé', max_plots: 'Đã mở hết đất',
  state_changed: 'Trang trại vừa thay đổi, đang cập nhật', not_logged_in: 'Bạn chưa đăng nhập. Hãy mở trang trại từ Chat.', offline: 'Mất kết nối, thử lại sau',
};
function fail(e) {
  const msg = ERR[e.code] || 'Có lỗi xảy ra, thử lại nhé';
  toast(msg); sfx.error(); announce(msg);
  if (['state_changed', 'no_plot', 'not_ready', 'already_ready'].includes(e.code)) refresh().catch(() => {});
}

// ---- server state -> scene ----
let lastMe = null;
function ensurePlots(n, first) {
  for (let i = plots.length; i < Math.min(n, PLOT_CAP); i += 1) {
    const p = makePlot(i);
    if (!first) { p.birth = 0; p.soil.scale.setScalar(0.01); }
  }
}
function applyView(p, v, first) {
  const hadCrop = p.cropKey, wasWatered = p.watered;
  if (v.crop) {
    p.cropKey = v.crop; p.isTree = !!v.tree; p.plantedAt = v.plantedAt / 1000;
    p.readyAt = (v.readyAt ?? v.plantedAt) / 1000; p.dur = Math.max(1, p.readyAt - p.plantedAt);
    p.serverReady = !!v.ready; p.watered = !!v.watered;
    if (p.state === 'empty') { p.state = 'growing'; p.stage = null; p.out = 0; p.crop.position.y = 0.3; }
    else if (p.state === 'ripe' && !p.serverReady && p.isTree) { p.state = 'growing'; p.stage = null; }
    p.mat.color.set(p.watered ? 0x55331c : 0x7d4d2b);
    if (!first && !hadCrop) { emit(p.x, 0.4, p.z, 0x8a5a32, 22, { speed: 2.2, up: 3, size: 0.16, spread: 0.8 }); sfx.plant(); }
    if (!first && hadCrop && !wasWatered && p.watered) { emit(p.x, 0.6, p.z, 0x9fe0ff, 20, { speed: 1.2, up: 2.5, grav: -1, life: 1, size: 0.14, spread: 0.9 }); sfx.water(); }
  } else if (hadCrop) {
    if (!first) {
      emit(p.x, 0.8, p.z, cropColor(hadCrop), 26, { speed: 2.5, up: 4, size: 0.18, spread: 0.7 });
      emit(p.x, 0.8, p.z, 0x7fc44a, 14, { speed: 2, up: 3, size: 0.14, spread: 0.7 });
      p.out = 1; sfx.harvest();
    } else p.crop.visible = false;
    Object.assign(p, { state: 'empty', stage: null, cropKey: null, watered: false, isTree: false, serverReady: false });
    p.mat.color.set(0x7d4d2b);
  }
}
function onState() {
  const me = store.me, first = !lastMe;
  MILL_LEVEL = cat().machines?.coixay?.level ?? MILL_LEVEL;
  if (!VISIT) { // đang đi thăm: cảnh hiện nhà người khác, trạng thái của mình chỉ cập nhật HUD
    ensurePlots(me.plotsCount, first);
    for (const v of me.plots) if (v.idx < plots.length) applyView(plots[v.idx], v, first);
  }
  if (!first && me.level > lastMe.level) {
    const el = $('#lvlup'); el.textContent = `Lên cấp ${me.level}!`; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    sfx.level(); announce(`Lên cấp ${me.level}`);
    const fp = farmer.root.position;
    [0xff5d73, 0xffd23f, 0x5fd0ff, 0x7fe07a, 0xc58bff].forEach(c => emit(fp.x, 2.2, fp.z, c, 14, { speed: 3.5, up: 6, grav: 6, life: 1.4, size: 0.16 }));
  }
  if (me.level >= MILL_LEVEL && mill.state === 'locked') {
    if (first) { mill.state = 'idle'; mill.site.visible = false; mill.groups.forEach(o => { o.visible = true; o.scale.setScalar(1); }); }
    else if (lastMe.level < MILL_LEVEL) { mill.state = 'pending'; setTimeout(unlockMill, 1700); }
  }
  lastMe = me;
  renderSeeds(); renderHUD();
}
subscribe(onState);

// ---- plot actions: animate at once, let the server decide ----
const ACT_COL = { plant: 0x7cc84a, water: 0x4aa3df, harvest: 0xffc23a };
const ripples = [];
const rippleGeo = new THREE.RingGeometry(0.55, 0.72, 40); rippleGeo.rotateX(-Math.PI / 2);
function ripple(x, y, z, color = 0xffffff) {
  const m = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
  m.position.set(x, y, z); scene.add(m); ripples.push({ m, t: 0 });
}
function plotAction(p) {
  if (p.pending || p.busy) return null;
  if (p.state === 'empty') return 'plant';
  if (p.state === 'ripe') return 'harvest';
  if (p.state === 'growing' && !p.watered && !p.isTree) return 'water';
  return null;
}
function tapPlot(p) {
  initAudio();
  if (VISIT) { visitTap(p); return; }
  const a = plotAction(p);
  ripple(p.x, 0.34, p.z, a ? ACT_COL[a] : 0xffffff);
  if (!a) {
    if (p.state === 'growing' && !p.busy && !p.pending) toast(`${info(p.cropKey)?.name || 'Cây'} chín sau ${fmtClock(Math.max(0, Math.ceil(p.readyAt - now())))}${p.watered ? ', đã tưới rồi' : ''}`);
    return;
  }
  if (a === 'plant') {
    const c = cat().crops[G.seed], me = store.me;
    if (me.level < c.level) { toast(`${c.name} mở ở cấp ${c.level}`); sfx.error(); return; }
    if (me.gold < c.seed) { toast(`Cần ${c.seed} vàng để gieo ${c.name}. Bán nông sản ở sạp chợ nhé.`); sfx.error(); return; }
    p.pendingCrop = G.seed;
  }
  p.pending = a; p.marker.material.color.set(ACT_COL[a]); p.marker.visible = true; farmer.queue.push(p);
}
const flyImg = (id) => () => { const sp = itemSprite(id), el = document.createElement(sp ? 'img' : 'div'); el.className = 'fly'; if (sp) { el.src = sp; el.alt = ''; } else el.textContent = info(id)?.emoji || '•'; return el; };
function flyToKho(id, n, fromX, fromY) {
  for (let i = 0; i < Math.min(n, 6); i++) flyTo(fromX + rand(-25, 25), fromY, $('#khoBtn'), flyImg(id), i * 120);
}
async function applyAction(p) {
  const a = p.pending, crop = p.pendingCrop;
  p.pending = null; p.marker.visible = false; p.busy = true;
  try {
    if (a === 'plant') {
      const c = cat().crops[crop];
      await doAct('/plant', { idx: p.i, crop });
      floater(`-${c.seed} vàng`, p.x, 1.4, p.z, '#ffe27a'); announce(`Đã gieo ${c.name}`);
    } else if (a === 'water') {
      await doAct('/water', { idx: p.i });
      floater('Tươi tốt', p.x, 1.4, p.z, '#bff0ff'); announce('Đã tưới nước');
    } else if (a === 'harvest') {
      const r = await doAct('/harvest', { idx: p.i }), q = r.reward || {}, s = toScreen(p.x, 1, p.z), name = info(q.item)?.name || 'nông sản';
      flyToKho(q.item, q.quantity || 1, s.x, s.y);
      floater(`+${q.quantity} ${name}${q.xp ? '  +' + q.xp + ' EXP' : ''}`, p.x, 1.6, p.z); announce(`Thu ${q.quantity} ${name}`);
    }
  } catch (e) { fail(e); } finally { p.busy = false; }
}

// ---- bulk actions ----
async function bulk(path, body, okText) {
  if (busyBulk) return; busyBulk = true; renderBulk(); initAudio();
  try { const r = await doAct(path, body); if (okText) { toast(okText(r)); announce(okText(r)); } return r; }
  catch (e) { fail(e); } finally { busyBulk = false; if (store.me) renderBulk(); }
}
$('#bHarvest').addEventListener('click', async () => {
  const r = await bulk('/harvest-all', {}, (x) => `Thu ${x.harvested} ô${x.reward?.xp ? ', +' + x.reward.xp + ' EXP' : ''}`);
  if (r?.reward?.items) { const s = toScreen(plots[0].x, 1, plots[0].z); Object.entries(r.reward.items).forEach(([id, q], i) => setTimeout(() => flyToKho(id, Math.min(q, 4), s.x, s.y), i * 150)); }
});
$('#bWater').addEventListener('click', () => bulk('/water-all', {}, (x) => `Đã tưới ${x.watered} ô`));
$('#bPlant').addEventListener('click', () => { const c = cat().crops[G.seed]; bulk('/plant-all', { crop: G.seed }, (x) => `Đã gieo ${x.planted} ô ${c.name}`); });
$('#bExpand').addEventListener('click', () => bulk('/expand', {}, () => 'Đã mở rộng thêm đất'));

// ---- storage + sell (the truck collects) ----
function openStore() {
  initAudio();
  const me = store.me, rows = $('#storeRows'); rows.innerHTML = ''; let total = 0, any = false;
  Object.entries(me.inventory).forEach(([id, n]) => {
    const it = info(id); if (!n) return; any = true;
    const price = it?.sell || 0; total += n * price;
    const sp = itemSprite(id), r = document.createElement('div'); r.className = 'row';
    r.innerHTML = (sp ? `<img src="${sp}" alt="" loading="lazy">` : `<span class="emo">${it?.emoji || '📦'}</span>`)
      + `<div><b>${it?.name || id}</b><small>${price ? 'khoảng ' + nf.format(price) + ' vàng mỗi cái' : 'không bán được'}</small></div><div class="qty">×${nf.format(n)}</div>`;
    rows.appendChild(r);
  });
  if (!any) rows.innerHTML = '<div class="empty">Kho đang trống. Thu hoạch cây chín để có hàng bán.</div>';
  const sb = $('#sellAll'); sb.disabled = !total; sb.textContent = total ? `Bán hết · khoảng ${nf.format(total)} vàng` : 'Bán hết';
  if (truck.state !== 'away') { sb.disabled = true; sb.textContent = 'Xe tải đang chở hàng…'; }
  $('#store').hidden = false; (sb.disabled ? $('#storeClose') : sb).focus();
}
$('#khoBtn').addEventListener('click', openStore);
$('#storeClose').addEventListener('click', () => { $('#store').hidden = true; });
$('#store').addEventListener('click', e => { if (e.target.id === 'store') $('#store').hidden = true; });
$('#sellAll').addEventListener('click', async () => {
  if (truck.state !== 'away') return;
  const items = Object.entries(store.me.inventory).filter(([id, n]) => n > 0 && (info(id)?.sell || 0) > 0);
  if (!items.length) return;
  $('#store').hidden = true;
  G.holdGold = store.me.gold; // vàng chỉ nhảy lên khi xe tải rời đi
  let total = 0; const kinds = []; let units = 0;
  for (const [id, n] of items) {
    try { const r = await doAct('/sell', { item: id, qty: n }); total += r.gained || 0; kinds.push(id); units += n; }
    catch (e) { fail(e); if (e.code === 'rate_limited') break; }
  }
  if (!total) { G.holdGold = null; renderHUD(); return; }
  truck.pay = total; truck.cargo = Array.from({ length: Math.min(6, Math.ceil(units / 3)) }, (_, i) => kinds[i % kinds.length]);
  truck.state = 'arrive'; truck.t = 0; truck.g.position.x = -FAR; truck.g.visible = true;
  toast('Đã gọi xe tải tới chở hàng'); sfx.engine(); announce(`Đã bán hàng, nhận ${nf.format(total)} vàng`); renderHUD();
});
$('#muteBtn').addEventListener('click', () => {
  muted = !muted; $('#muteBtn').classList.toggle('muted', muted);
  $('#muteBtn').setAttribute('aria-label', muted ? 'Bật âm thanh' : 'Tắt âm thanh');
  if (master) master.gain.value = muted ? 0 : 0.6;
});
window.addEventListener('keydown', e => { if (e.key === 'Escape') $('#store').hidden = true; });

// ================= Mill: building animation only (work comes with the machines phase) =================
let camFocus = null;
const millTag = document.createElement('div'); millTag.className = 'tag sign'; tagsEl.appendChild(millTag);
function unlockMill() {
  mill.state = 'building'; mill.buildT = 0;
  camFocus = { v: new THREE.Vector3(MILL_X - 3, 0, MILL_Z + 2.5), t: 2.6 };
  const el = $('#lvlup'); el.textContent = 'Mở khoá Cối xay bột!'; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function tapMill() {
  initAudio();
  if (mill.state === 'locked' || mill.state === 'pending') { toast(`Cối xay bột mở khoá ở cấp ${MILL_LEVEL}`); return; }
  if (mill.state === 'building') return;
  openProd('machines', 'coixay');
}
const setGrain = lv => { mill.grain.visible = lv > 0.02; const s = 0.35 + 0.65 * lv; mill.grain.scale.set(s, 1, s); mill.grain.position.y = 0.1 + 0.7 * lv; };
const millV = new THREE.Vector3();
function updateMill(dt, time) {
  const M = mill;
  if (M.state === 'building') {
    M.buildT += dt;
    M.site.scale.setScalar(Math.max(0.001, 1 - M.buildT / 0.3)); if (M.buildT > 0.3) M.site.visible = false;
    M.groups.forEach((o, i) => {
      const k = (M.buildT - 0.35 - i * 0.2) / 0.45; if (k <= 0) return;
      if (!o.visible) { o.visible = true; sfx.thunk(); emit(MILL_X, 0.5 + i * 0.4, MILL_Z, 0xd8c8a8, 14, { speed: 2, up: 2, size: 0.22, spread: 0.8 }); }
      o.scale.setScalar(Math.max(0.001, easeOutBack(Math.min(1, k))));
    });
    if (M.buildT > 0.35 + M.groups.length * 0.2 + 0.6) {
      M.state = 'idle'; sfx.level();
      [0xffd23f, 0x7fe07a, 0x5fd0ff].forEach(c => emit(MILL_X, 3, MILL_Z, c, 16, { speed: 3, up: 5, grav: 6, life: 1.3, size: 0.16 }));
    }
  } else if (M.state === 'working') {
    const cur = Object.values(store.me.machines?.coixay || {}).find(j => !j.ready);
    const cyc = cur ? (cat().machines.coixay.recipes[cur.recipe]?.ms || 1) : 1;
    if (cur && M.grainFor !== cur.recipe) { M.grainFor = cur.recipe; M.grain.material.color.set(cropColor(Object.keys(cat().machines.coixay.recipes[cur.recipe].in)[0])); }
    const k = cur ? THREE.MathUtils.clamp(1 - ((cur.currentReadyAt || cur.readyAt) - serverNow()) / cyc, 0, 1) : 1;
    M.stone.rotation.y += dt * 3.2; M.crank.rotation.x += dt * 3.2; M.gear.rotation.z -= dt * 2.4;
    M.g.position.x = MILL_X + Math.sin(time * 45) * 0.012;
    setGrain(1 - k); M.sack.scale.setScalar(Math.max(0.001, 0.2 + 0.8 * k));
    if (Math.random() < dt * 14) { const a = rand(0, 6.28); millV.set(Math.cos(a) * 0.9, 2.15, Math.sin(a) * 0.9); M.g.localToWorld(millV); emit(millV.x, millV.y, millV.z, 0xfaf6ea, 1, { speed: 0.5, up: 0.8, grav: -0.4, life: 1.1, size: 0.22, spread: 0.05 }); }
    M.grindT -= dt; if (M.grindT <= 0) { M.grindT = 0.55; sfx.grind(); }
    if (k >= 1) { M.state = 'done'; M.g.position.x = MILL_X; sfx.ripe(); M.sack.getWorldPosition(millV); emit(millV.x, 1.4, millV.z, 0xfff6b0, 16, { speed: 1, up: 2, grav: -0.5, life: 1.2, size: 0.15 }); }
  } else if (M.state === 'done') {
    const b = Math.sin(time * 5) * 0.05; M.sack.scale.set(1 + b, 1 - b, 1 + b);
    if (Math.random() < dt * 2) { M.sack.getWorldPosition(millV); emit(millV.x + rand(-0.5, 0.5), rand(1, 1.6), millV.z + rand(-0.5, 0.5), 0xfff6b0, 1, { speed: 0.1, up: 0.6, grav: -0.3, life: 1, size: 0.13, spread: 0 }); }
  } else if (M.state === 'collect') {
    M.t += dt; const k = Math.min(1, M.t / 0.5);
    M.sack.position.y = Math.sin(k * Math.PI) * 0.8; M.sack.scale.setScalar(Math.max(0.001, 1 - k));
    if (k >= 1) { M.state = 'idle'; M.sack.position.y = 0; setGrain(0); }
  }
  // label over the mill
  let txt = 'Cối xay bột', cls = 'tag sign';
  if (M.state === 'locked' || M.state === 'pending') txt = `Cối xay bột · cấp ${MILL_LEVEL}`;
  else if (M.state === 'working') {
    const cur = Object.values(store.me.machines?.coixay || {}).find(j => !j.ready);
    const left = cur ? Math.max(0, Math.ceil(((cur.currentReadyAt || cur.readyAt) - serverNow()) / 1000)) : 0;
    txt = `Đang xay · ${fmtClock(left)}`; cls = 'tag';
  }
  else if (M.state === 'done') { txt = 'Xong! Chạm để lấy'; cls = 'tag ready'; }
  if (millTag.dataset.t !== txt) { millTag.textContent = txt; millTag.className = cls; millTag.dataset.t = txt; }
  place(millTag, toScreen(MILL_X, 4.3, MILL_Z), 70);
}

// ================= Farmer behaviour =================
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const angLerp = (a, b, t) => { const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
const ACT_DUR = { plant: 0.72, water: 0.95, harvest: 0.64 }, IMPACT = { plant: 0.42, water: 0.42, harvest: 0.34 };
const spoutW = new THREE.Vector3();
function updateFarmer(dt, time) {
  const F = farmer, pos = F.root.position;
  if (!F.task && F.queue.length) {
    // take the closest queued plot next
    let bi = 0, bd = 1e9; F.queue.forEach((p, i) => { const d = Math.hypot(p.x - pos.x, p.z + 1.35 - pos.z); if (d < bd) { bd = d; bi = i; } });
    F.task = F.queue.splice(bi, 1)[0]; F.act = F.task.pending; F.state = 'walk'; F.applied = false;
  }
  let walking = false;
  if (F.state === 'walk' && F.task) {
    const tx = F.task.x, tz = F.task.z + 1.35, dx = tx - pos.x, dz = tz - pos.z, d = Math.hypot(dx, dz);
    if (d < 0.06) { F.state = 'act'; F.t = 0; F.facing = Math.PI; }
    else { const sp = Math.min(d, 6.5 * dt); pos.x += dx / d * sp; pos.z += dz / d * sp; F.facing = Math.atan2(dx, dz); walking = true; }
  }
  F.root.rotation.y = angLerp(F.root.rotation.y, F.facing, 1 - Math.exp(-12 * dt));
  // legs and arms
  if (walking) F.phase += dt * 14;
  const sw = walking ? Math.sin(F.phase) : 0;
  F.legs[0].rotation.x = sw * 0.7; F.legs[1].rotation.x = -sw * 0.7;
  pos.y = walking ? Math.abs(Math.sin(F.phase)) * 0.07 : 0;
  F.tail.rotation.x = walking ? Math.sin(F.phase * 2) * 0.25 : Math.sin(time * 2) * 0.05;
  let armL = -sw * 0.6, armR = sw * 0.6, bend = 0;
  F.hoe.visible = F.can.visible = false; F.basket.visible = true;
  if (F.state === 'act' && F.task) {
    const p = F.task, act = F.act, T = ACT_DUR[act]; F.t += dt; const t = F.t / T;
    if (act === 'plant') {
      F.hoe.visible = true;
      const k = t < 0.5 ? t / 0.5 : 1 - (t - 0.5) / 0.5;
      armR = t < 0.5 ? -2.6 * Math.sin(k * Math.PI / 2) : -2.6 + (t - 0.5) / 0.15 * 2.2; armR = Math.max(-2.6, Math.min(armR, -0.4));
      armL = armR * 0.8; bend = t > 0.5 ? 0.3 * Math.sin(Math.min(1, (t - 0.5) / 0.5) * Math.PI) : 0;
    } else if (act === 'water') {
      F.can.visible = true; armR = -1.15; armL = -0.5; bend = 0.12;
      F.can.rotation.x = t > 0.15 && t < 0.85 ? 0.7 : 0;
      if (t > 0.18 && t < 0.85) {
        F.spoutTip.getWorldPosition(spoutW);
        _e.set(0, F.root.rotation.y, 0); const d = new THREE.Vector3(0, -0.5, 1.4).applyEuler(_e);
        emit(spoutW.x, spoutW.y, spoutW.z, 0x6cc4f5, 2, { dir: d, grav: 9, life: 0.5, size: 0.11, spread: 0.02 });
      }
    } else if (act === 'harvest') {
      bend = 0.55 * Math.sin(Math.min(1, t) * Math.PI); armL = armR = -1.3 * Math.sin(Math.min(1, t) * Math.PI);
    }
    if (!F.applied && F.t >= IMPACT[act]) { F.applied = true; applyAction(p); }
    if (F.t >= T) { if (!F.applied) applyAction(p); F.task = null; F.state = 'idle'; F.can.rotation.x = 0; }
  } else if (!walking) {
    armL = Math.sin(time * 1.6) * 0.05; armR = -armL;
    F.lookT -= dt; if (F.lookT <= 0) { F.lookT = rand(2, 5); F.lookTo = rand(-0.6, 0.6); }
    F.head.rotation.y += ((F.lookTo || 0) - F.head.rotation.y) * (1 - Math.exp(-4 * dt));
  }
  if (walking || F.state === 'act') F.head.rotation.y += (0 - F.head.rotation.y) * (1 - Math.exp(-8 * dt));
  F.arms[0].rotation.x += (armL - F.arms[0].rotation.x) * (1 - Math.exp(-18 * dt));
  F.arms[1].rotation.x += (armR - F.arms[1].rotation.x) * (1 - Math.exp(-18 * dt));
  F.upper.rotation.x += (bend - F.upper.rotation.x) * (1 - Math.exp(-14 * dt));
  F.upper.position.y = 0.6 + (F.state === 'act' ? 0 : Math.sin(time * 2.2) * 0.012);
  F.blinkT -= dt; if (F.blinkT <= 0) { F.blinkT = rand(2.2, 5); F.blink = 0.13; }
  F.blink -= dt; const shut = F.blink > 0;
  F.eyes.forEach(e => { e.scale.y = shut ? 0.2 : 1.3; }); F.glints.forEach(g => { g.visible = !shut; });
}

// ================= Truck behaviour =================
const coinEl = () => { const d = document.createElement('div'); d.className = 'flycoin'; return d; };
function updateTruck(dt, time) {
  const T = truck, g = T.g, x0 = g.position.x;
  if (T.state === 'away') return;
  T.t += dt;
  if (T.state === 'arrive') {
    const k = Math.min(1, T.t / 3.2); g.position.x = -FAR + (STOP_X + FAR) * (1 - Math.pow(1 - k, 3));
    if (k >= 1) {
      T.state = 'load'; T.t = 0; sfx.horn();
      T.crates = T.cargo.map((kind, i) => {
        const slot = new THREE.Vector3(-1.35 + (i % 3) * 0.62, 1.04, i < 3 ? -0.38 : 0.38);
        const c = { m: makeCrate(kind), start: 0.5 + i * 0.3, landed: false,
          from: new THREE.Vector3(STOP_X - 0.8 + (i % 3) * 0.8, 1.35, 10.2), to: slot.add(g.position) };
        c.m.visible = false; return c;
      });
    }
  } else if (T.state === 'load') {
    let done = true;
    for (const c of T.crates) {
      if (c.landed) continue; done = false;
      const q = (T.t - c.start) / 0.55; if (q < 0) continue;
      const qq = Math.min(1, q); c.m.visible = true;
      c.m.position.lerpVectors(c.from, c.to, qq); c.m.position.y += Math.sin(qq * Math.PI) * 1.4; c.m.rotation.y = qq * Math.PI;
      if (q >= 1) { c.landed = true; g.attach(c.m); T.bounce = 1; sfx.thunk(); emit(c.to.x, c.to.y, c.to.z, 0xd8c8a8, 6, { speed: 1, up: 1.5, size: 0.12 }); }
    }
    if (done && T.t > T.crates[T.crates.length - 1].start + 1) {
      T.state = 'leave'; T.t = 0; sfx.engine();
      const s = toScreen(g.position.x, 2, ROAD_Z), goldEl = $('#gold').parentElement, pay = T.pay;
      for (let i = 0; i < Math.min(10, 3 + pay / 20 | 0); i++) flyTo(s.x + rand(-20, 20), s.y, goldEl, coinEl, i * 70);
      setTimeout(() => { G.holdGold = null; renderHUD(); sfx.coin(); }, 700);
      floater(`+${pay} vàng`, g.position.x, 3, ROAD_Z, '#ffe27a');
    }
  } else if (T.state === 'leave') {
    const k = Math.min(1, T.t / 2.8); g.position.x = STOP_X + (FAR - STOP_X) * k * k;
    if (k >= 1) { T.state = 'away'; g.visible = false; T.crates.forEach(c => g.remove(c.m)); T.crates = []; }
  }
  const dx = g.position.x - x0, moving = Math.abs(dx) > 1e-3;
  T.wheels.forEach(w => { w.rotation.z -= dx / 0.4; });
  T.bounce *= Math.exp(-7 * dt);
  T.body.position.y = (moving ? Math.sin(time * 38) * 0.018 : Math.sin(time * 20) * 0.006) - T.bounce * 0.07;
  if (Math.random() < dt * (moving ? 22 : 8)) emit(g.position.x - 2.1, 0.5, ROAD_Z + 0.5, 0xcfcac2, 1, { speed: 0.3, up: 0.8, grav: -0.6, life: 1.2, size: 0.3, spread: 0.05 });
  if (moving && Math.abs(dx / dt) > 3 && Math.random() < dt * 30) emit(g.position.x - 1.2, 0.35, ROAD_Z + rand(-0.8, 0.8), 0xc9b896, 1, { speed: 0.6, up: 0.6, grav: 1, life: 0.8, size: 0.25 });
}

// ================= Animals =================
function updateAnimals(dt, time) {
  for (const a of animals) {
    const g = a.g, pos = g.position;
    let moving = false;
    if (a.kind === 'chick') {
      const m = a.follow.g.position, ry = a.follow.g.rotation.y;
      const tx = m.x + a.ox * Math.cos(ry) + a.oz * Math.sin(ry), tz = m.z - a.ox * Math.sin(ry) + a.oz * Math.cos(ry);
      const dx = tx - pos.x, dz = tz - pos.z, d = Math.hypot(dx, dz);
      if (d > 0.15) { const sp = Math.min(d, a.speed * (d > 1 ? 1.6 : 1) * dt); pos.x += dx / d * sp; pos.z += dz / d * sp; g.rotation.y = angLerp(g.rotation.y, Math.atan2(dx, dz), 0.2); moving = true; }
      if (!moving && Math.random() < dt * 0.6) a.peck = 0.4;
    } else {
      const dx = a.tx - pos.x, dz = a.tz - pos.z, d = Math.hypot(dx, dz);
      if (a.wait > 0) {
        a.wait -= dt;
        if (a.wait <= 0) { const [x0, z0, x1, z1] = a.area; a.tx = rand(x0, x1); a.tz = rand(z0, z1); }
        else if (a.kind !== 'pig' && Math.random() < dt * (a.kind === 'hen' ? 1.2 : 0.3)) a.peck = a.kind === 'hen' ? 0.35 : 1.4;
      } else if (d < 0.1) a.wait = rand(1, 4);
      else { const sp = Math.min(d, a.speed * dt); pos.x += dx / d * sp; pos.z += dz / d * sp; g.rotation.y = angLerp(g.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-6 * dt)); moving = true; }
    }
    // head: peck/graze
    if (a.peck > 0) { a.peck -= dt; a.head.rotation.x = a.kind === 'sheep' ? 0.7 : Math.abs(Math.sin(a.peck * 18)) * 0.9; }
    else a.head.rotation.x *= 0.85;
    // hop when tapped, waddle when walking
    if (a.vy !== 0 || a.hop > 0) { a.vy -= 20 * dt; a.hop = Math.max(0, a.hop + a.vy * dt); if (a.hop === 0) a.vy = 0; }
    pos.y = a.hop + (moving ? Math.abs(Math.sin(time * (a.kind === 'chick' ? 22 : 12) + pos.x)) * (a.kind === 'sheep' || a.kind === 'pig' ? 0.04 : 0.06) : 0);
    g.rotation.z = moving ? Math.sin(time * 12 + pos.x) * 0.06 : 0;
  }
  // grown animals keep a body's width apart, and stay inside their pen or yard
  for (let i = 0; i < animals.length; i++) for (let j = i + 1; j < animals.length; j++) {
    const a = animals[i], b = animals[j]; if (a.kind === 'chick' || b.kind === 'chick') continue;
    const dx = b.g.position.x - a.g.position.x, dz = b.g.position.z - a.g.position.z, d = Math.hypot(dx, dz), min = 1.15;
    if (d < min && d > 1e-4) { const k = (min - d) / 2 / d; a.g.position.x -= dx * k; a.g.position.z -= dz * k; b.g.position.x += dx * k; b.g.position.z += dz * k; }
  }
  for (const a of animals) if (a.area) {
    const [x0, z0, x1, z1] = a.area, p = a.g.position;
    p.x = THREE.MathUtils.clamp(p.x, x0, x1); p.z = THREE.MathUtils.clamp(p.z, z0, z1);
  }
}
function tapAnimal(a) {
  initAudio();
  if (a.hop > 0) return;
  a.vy = 5.5; a.hop = 0.001;
  ({ hen: sfx.cluck, chick: sfx.peep, sheep: sfx.baa, pig: sfx.oink })[a.kind]();
  emit(a.g.position.x, 1, a.g.position.z, 0xff7aa2, 8, { speed: 1, up: 2.5, grav: -0.5, life: 1, size: 0.16 });
}

// ================= Camera & input =================
const camTarget = new THREE.Vector3(2.5, 0, 4.2), panVel = new THREE.Vector3();
const EL = 0.84; // camera pitch (radians above horizon)
function clampCam() { camTarget.x = THREE.MathUtils.clamp(camTarget.x, -14, 40); camTarget.z = THREE.MathUtils.clamp(camTarget.z, -16, 14); }
let zoom = 1, zoomGoal = 1, intro = 1.7;
function baseDist() { return innerWidth < innerHeight ? 40 : 27; }
function placeCamera() {
  const d = baseDist() * zoom * intro;
  camera.position.set(camTarget.x, camTarget.y + Math.sin(EL) * d, camTarget.z + Math.cos(EL) * d);
  camera.lookAt(camTarget);
  sun.position.set(camTarget.x - 16, 28, camTarget.z + 14); sun.target.position.copy(camTarget);
}
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  pScale.value = innerHeight * renderer.getPixelRatio() / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
}
window.addEventListener('resize', resize); resize();

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
hitTargets.push(stallHit, truck.g, mill.hit, ...animals.map(a => a.g)); // ô đất tự thêm vào khi được tạo
function pickAt(cx, cy) {
  ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(hitTargets, true);
  for (const h of hits) { let o = h.object; while (o) { if (o.userData.plot || o.userData.stall || o.userData.animal || o.userData.truck || o.userData.mill) return o.userData; o = o.parent; } }
  return null;
}
function groundAt(cx, cy, out) {
  ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(groundPlane, out);
}
const pointers = new Map(); let drag = null, pinch = null, hovered = null;
const anchor = new THREE.Vector3(), cur = new THREE.Vector3();
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  camFocus = null;
  if (pointers.size === 1) { drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false }; panVel.set(0, 0, 0); groundAt(e.clientX, e.clientY, anchor); }
  else if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoomGoal }; drag = null; }
});
canvas.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) {
    if (e.pointerType === 'mouse') { const h = pickAt(e.clientX, e.clientY); setHover(h && h.plot ? h.plot : null); canvas.classList.toggle('hoverable', !!h); }
    return;
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
    zoomGoal = zoom = THREE.MathUtils.clamp(pinch.z * pinch.d / Math.max(d, 1), 0.5, 1.45); placeCamera();
  } else if (drag) {
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 7) { drag.moved = true; canvas.classList.add('dragging'); }
    if (drag.moved && groundAt(e.clientX, e.clientY, cur)) {
      const d = anchor.clone().sub(cur), tn = performance.now(), secs = Math.max(8, tn - (drag.lt || tn - 16)) / 1000; drag.lt = tn;
      panVel.copy(d).divideScalar(secs).clampLength(0, 40);
      camTarget.add(d); clampCam(); placeCamera();
    }
  }
});
function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId); canvas.classList.remove('dragging');
  if (!drag || !drag.lt || performance.now() - drag.lt > 80) panVel.set(0, 0, 0); // a pause before release means no fling
  if (drag && !drag.moved && performance.now() - drag.t < 600 && pointers.size === 0) {
    const h = pickAt(e.clientX, e.clientY);
    if (h && h.plot) tapPlot(h.plot); else if (h && h.stall) openStore(); else if (h && h.animal) tapAnimal(h.animal); else if (h && h.truck) { initAudio(); sfx.horn(); truck.bounce = 1; } else if (h && h.mill) tapMill();
  }
  if (pointers.size < 2) pinch = null;
  if (pointers.size === 0) drag = null;
}
canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', e => { e.preventDefault(); zoomGoal = THREE.MathUtils.clamp(zoomGoal * Math.exp(e.deltaY * 0.0012), 0.5, 1.45); }, { passive: false });
function setHover(p) {
  if (hovered === p) return;
  if (hovered) hovered.mat.emissive.set(0x000000);
  hovered = p; if (p) p.mat.emissive.set(0x2a1a08);
  const act = p ? plotAction(p) : null, sc = G.seed && store.catalog ? store.catalog.crops[G.seed] : null;
  $('#hint').textContent = act === 'plant' && sc ? `Gieo ${sc.name} (${sc.seed} vàng)` : act === 'water' ? 'Tưới nước: cây Tươi tốt, thêm 50% EXP khi thu' : act === 'harvest' ? 'Thu hoạch vào kho' : 'Chạm ô đất trống để gieo hạt đang chọn';
}

// ================= Main loop =================
// ================= Static batching (phones are CPU-bound on draw calls) =================
// Every static mesh that shares a material becomes one mesh; moving things are left alone.
function mergeStatic(skip) {
  scene.updateMatrixWorld(true);
  const byMat = new Map();
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.plot || !o.material.visible || o.material.transparent) return;
    for (let p = o; p; p = p.parent) if (skip.has(p)) return;
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(o);
  });
  for (const [mat, list] of byMat) {
    if (list.length < 2) continue;
    const geos = list.map(o => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); return g; });
    const names = ['position', 'normal', 'uv', 'color'].filter(n => geos.every(g => g.attributes[n]));
    const merged = new THREE.BufferGeometry();
    names.forEach(n => {
      const size = geos[0].attributes[n].itemSize, arr = new Float32Array(geos.reduce((s, g) => s + g.attributes[n].count * size, 0));
      let o = 0; geos.forEach(g => { arr.set(g.attributes[n].array, o); o += g.attributes[n].array.length; });
      merged.setAttribute(n, new THREE.BufferAttribute(arr, size));
    });
    merged.computeBoundingSphere();
    const m = new THREE.Mesh(merged, mat); m.castShadow = m.receiveShadow = list.some(o => o.castShadow);
    m.matrixAutoUpdate = false; scene.add(m);
    list.forEach(o => o.parent.remove(o)); geos.forEach(g => g.dispose());
  }
  scene.traverse(o => { // whatever stayed and never moves skips per-frame matrix work
    for (let p = o; p; p = p.parent) if (skip.has(p)) return;
    o.updateMatrix(); o.matrixAutoUpdate = false;
  });
}
buildFlora();

// Bake the rigid, untextured parts of a moving object into one vertex-coloured mesh;
// parts listed in keep (and their children) still animate on their own.
const vcMats = {};
const vcMat = flat => vcMats[flat] || (vcMats[flat] = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad, flatShading: flat }));
function bakeVC(root, keep = []) {
  const skip = new Set(keep); root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), buckets = { false: [], true: [] }, gone = [];
  root.traverse(o => {
    if (o === root || !o.isMesh) return;
    for (let p = o; p && p !== root; p = p.parent) if (skip.has(p)) return;
    const m = o.material; if (!m.isMeshToonMaterial || m.map || m.transparent) return;
    buckets[!!m.flatShading].push([o.geometry, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), m.color]); gone.push(o);
  });
  if (gone.length < 2) return;
  gone.forEach(o => o.parent.remove(o));
  for (const f of [false, true]) if (buckets[f].length) { const me = new THREE.Mesh(merge(buckets[f]), vcMat(f)); me.castShadow = me.receiveShadow = true; root.add(me); }
}
animals.forEach(a => { bakeVC(a.head); bakeVC(a.g, [a.head]); });
farmer.legs.forEach(l => bakeVC(l));
farmer.arms.forEach(a => bakeVC(a, [farmer.hoe, farmer.can, farmer.basket]));
[farmer.hoe, farmer.can, farmer.basket].forEach(t => bakeVC(t));
bakeVC(farmer.head, [...farmer.eyes, ...farmer.glints, farmer.tail]);
bakeVC(farmer.upper, [...farmer.arms, farmer.head]);
mill.groups.forEach(gp => bakeVC(gp, [mill.stone, mill.grain]));
[mill.stone, mill.sack, mill.site, truck.body, ...truck.wheels].forEach(o => bakeVC(o));

// tiny parts (eyes, buttons, beaks) cast shadows nobody sees but cost a draw call each
scene.traverse(o => { if (o.isMesh && !o.isInstancedMesh) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const s = new THREE.Vector3(); o.getWorldScale(s); if (o.geometry.boundingSphere.radius * Math.max(s.x, s.y, s.z) < 0.16) o.castShadow = false; } });
mergeStatic(new Set([sun, sun.target, farmer.root, truck.g, mill.g, mill.site, mill.hit, sails, ...animals.map(a => a.g), ...clouds, ...flies.map(f => f.g), ...plots.flatMap(p => [p.crop, p.marker])]));

// Drop resolution, then shadow detail, when frames stay slow (weak phones)
let qualT = 0;
function adaptQuality(gap) {
  qualT += gap; if (qualT < 2000 || perf.gap.length < 90) return; qualT = 0;
  const median = perf.gap.slice(-90).sort((a, b) => a - b)[45];
  if (median <= 22) return;
  const pr = renderer.getPixelRatio();
  if (pr > 1) { renderer.setPixelRatio(Math.max(1, pr - 0.5)); resize(); }
  else if (sun.shadow.mapSize.x > 1024) { sun.shadow.mapSize.set(1024, 1024); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  else if (sun.castShadow) sun.castShadow = false; // last resort on low-end phones: no shadow pass at all
}

// keep world labels fully on screen
const place = (el, s, m = 40) => {
  const tf = `translate(${Math.round(THREE.MathUtils.clamp(s.x, m, innerWidth - m))}px, ${Math.round(s.y)}px) translate(-50%, -100%)`;
  if (el._tf !== tf) { el._tf = tf; el.style.transform = tf; } // no style work while the camera is still
};
// shadows redraw every other frame: half the shadow-pass draw calls, lag not visible at walking speed
sun.shadow.autoUpdate = false; let shadowTick = 0;
let last = performance.now(), time = 0, birdT = 4;
const perf = { gap: [], work: [] };
function frame(t) {
  requestAnimationFrame(frame);
  const w0 = performance.now(), gap = t - last;
  const dt = Math.min(gap / 1000, 0.05); last = t; time += dt;
  windU.value = time;
  zoom += (zoomGoal - zoom) * (1 - Math.exp(-8 * dt));
  if (intro > 1) intro = Math.max(1, intro - dt * 0.9 * (intro - 0.95));
  if (!$('#boot').hidden) intro = Math.max(intro, 1.25);
  if (!pointers.size && panVel.lengthSq() > 1e-4) { camTarget.addScaledVector(panVel, dt); panVel.multiplyScalar(Math.exp(-6 * dt)); clampCam(); }
  if (camFocus) { camTarget.lerp(camFocus.v, 1 - Math.exp(-2.5 * dt)); camFocus.t -= dt; if (camFocus.t <= 0) camFocus = null; }
  placeCamera();
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i]; r.t += dt; const k = r.t / 0.5;
    r.m.scale.setScalar(1 + k * 1.6); r.m.material.opacity = 0.9 * (1 - k);
    if (k >= 1) { scene.remove(r.m); r.m.material.dispose(); ripples.splice(i, 1); }
  }

  // crops grow
  const n = now();
  for (const p of plots) {
    if (p.state === 'growing' || p.state === 'ripe') {
      const prog = (n - p.plantedAt) / p.dur;
      // Cây thường chín khi đồng hồ tới readyAt; cây ăn quả chỉ chín khi server báo còn quả.
      const ripeNow = p.serverReady || (!p.isTree && n >= p.readyAt);
      const stage = ripeNow ? 'ripe' : prog < 0.3 ? 'seed' : 'grow';
      if (stage !== p.stage) {
        p.stage = stage; p.crop.geometry = template(p.cropKey, stage); p.crop.visible = true; p.pop = 0;
        if (stage === 'ripe') { p.state = 'ripe'; sfx.ripe(); emit(p.x, 1, p.z, 0xfff2a0, 14, { speed: 1, up: 2, grav: -0.5, life: 1.2, size: 0.15, spread: 0.8 }); if (hovered === p) { hovered = null; setHover(p); } }
      }
      p.pop = Math.min(1, p.pop + dt * 2.6);
      const s = 0.55 + 0.45 * easeOutBack(p.pop);
      p.crop.scale.set(s, s * (p.state === 'ripe' ? 1 + Math.sin(time * 3.2 + p.i) * 0.035 : 1), s);
      if (p.state === 'ripe' && Math.random() < dt * 1.6) emit(p.x + rand(-0.9, 0.9), rand(0.8, 1.5), p.z + rand(-0.9, 0.9), 0xfff6b0, 1, { speed: 0.1, up: 0.6, grav: -0.3, life: 1, size: 0.13, spread: 0 });
      // label
      const sc = toScreen(p.x, p.state === 'ripe' ? 2.2 : 1.6, p.z);
      if (p.state === 'growing') {
        const left = Math.max(0, Math.ceil(p.readyAt - n));
        p.tag.hidden = sc.behind; p.tag.className = 'tag' + (p.watered ? ' wet' : '');
        const txt = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
        if (p.tag.dataset.t !== txt + p.watered) { p.tag.innerHTML = `<span class="drop"></span>${txt}`; p.tag.dataset.t = txt + p.watered; }
      } else if (!p.tag.hidden) { p.tag.hidden = true; p.tag.dataset.t = ''; } // ô chín: cây nảy và lấp lánh, không cần nhãn
      if (!p.tag.hidden) place(p.tag, sc);
    } else {
      if (!p.tag.hidden) { p.tag.hidden = true; p.tag.dataset.t = ''; }
      if (p.out > 0) { // harvested crop pops up and shrinks away
        p.out -= dt * 4.5; const s = Math.max(0.01, p.out);
        p.crop.scale.set(s, s * 1.2, s); p.crop.position.y = 0.3 + (1 - s) * 0.7;
        if (p.out <= 0) { p.crop.visible = false; p.crop.position.y = 0.3; }
      }
    }
    if (p.marker.visible) { p.marker.position.y = 2.1 + Math.abs(Math.sin(time * 5)) * 0.3; p.marker.rotation.y += dt * 3; }
  }
  for (const p of plots) if (p.birth < 1) { p.birth = Math.min(1, p.birth + dt * 2); p.soil.scale.setScalar(Math.max(0.01, easeOutBack(p.birth))); }
  const ss = toScreen(stallGroup.position.x, 3.4, stallGroup.position.z);
  place(stallTag, ss, 64);

  updateFarmer(dt, time);
  updateAnimals(dt, time);
  updateTruck(dt, time);
  updateMill(dt, time);
  sails.rotation.z -= dt * 0.7;
  clouds.forEach(c => { c.position.x += c.userData.speed * dt; if (c.position.x > 75) c.position.x = -75; });
  flies.forEach(f => {
    const a = time * f.sp + f.ph;
    f.g.position.set(f.cx + Math.cos(a) * f.r, 1 + Math.sin(a * 2.3) * 0.4, f.cz + Math.sin(a * 1.3) * f.r);
    f.g.rotation.y = -a; const flap = Math.sin(time * 22 + f.ph) * 0.9;
    f.wings[0].rotation.y = flap; f.wings[1].rotation.y = -flap;
  });
  birdT -= dt; if (birdT <= 0) { birdT = rand(5, 11); sfx.bird(); }
  updateParticles(dt);
  if ((shadowTick++ & 1) === 0) sun.shadow.needsUpdate = true;
  renderer.render(scene, camera);
  perf.gap.push(gap); perf.work.push(performance.now() - w0);
  if (perf.gap.length > 600) { perf.gap.shift(); perf.work.shift(); }
  if (!document.hidden) adaptQuality(gap);
}
requestAnimationFrame(frame);
if (location.hash === '#debug') window.__farm = { visitFarm, leaveVisit, G, store, plots, tapPlot, truck, farmer, openStore, camTarget, mill, tapMill, refresh, setZoom: z => { zoomGoal = zoom = z; }, perf, renderer };

// ================= Production: machines and barns, every outcome decided by the server =================
const prodSheet = $('#prodSheet');
let prodMode = null, prodMachine = 'coixay', prodBusy = false;
const iconHtml = (id) => { const sp = itemSprite(id); return sp ? `<img src="${sp}" alt="" loading="lazy">` : `<span class="emo">${info(id)?.emoji || '📦'}</span>`; };
const itemName = (id) => info(id)?.name || id;
const itemsText = (m) => Object.entries(m || {}).map(([id, n]) => `${n} ${itemName(id)}`).join(', ');
function renderProd() {
  const me = store.me, rows = $('#prodRows'), tabs = $('#prodTabs');
  rows.innerHTML = ''; tabs.innerHTML = '';
  if (prodMode === 'machines') {
    $('#prodTitle').textContent = 'Chế biến';
    const ms = Object.values(cat().machines).sort((a, b) => a.level - b.level);
    if (!cat().machines[prodMachine] || cat().machines[prodMachine].level > me.level) prodMachine = ms.find(m => m.level <= me.level)?.id || null;
    ms.forEach(m => {
      const locked = m.level > me.level, t = document.createElement('button');
      t.type = 'button'; t.className = 'tab'; t.disabled = locked; t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', String(m.id === prodMachine));
      t.textContent = locked ? `${m.name} · cấp ${m.level}` : m.name;
      t.addEventListener('click', () => { prodMachine = m.id; renderProd(); });
      tabs.appendChild(t);
    });
    const m = prodMachine && cat().machines[prodMachine];
    if (!m) { rows.innerHTML = '<div class="empty">Chưa mở máy nào. Lên cấp để mở máy chế biến.</div>'; return; }
    const jobs = me.machines?.[m.id] || {}, MAXQ = cat().machineQueueMax || 50;
    Object.values(m.recipes).forEach(r => {
      const j = jobs[r.id], row = document.createElement('div'); row.className = 'row job';
      const maxN = Math.min(MAXQ, ...Object.entries(r.in).map(([id, n]) => Math.floor((me.inventory[id] || 0) / n)));
      const need = Object.entries(r.in).map(([id, n]) => { const have = me.inventory[id] || 0; return `<span class="${have >= n ? '' : 'short'}">${iconHtml(id)} ${nf.format(have)}/${n}</span>`; }).join('');
      const left = j && !j.ready ? Math.max(0, Math.ceil(((j.currentReadyAt || j.readyAt) - serverNow()) / 1000)) : 0;
      const chip = j ? (j.ready ? `<span class="state-chip done">Xong ${j.completed || 1} mẻ</span>` : `<span class="state-chip run">Đang chạy, còn ${fmtClock(left)}</span>`) + (j.queue > 1 ? ` <span class="state-chip">${j.queue} mẻ</span>` : '') : '';
      row.innerHTML = `${iconHtml(Object.keys(r.out)[0])}<div><b>${r.name}</b> ${chip}<small>${itemsText(r.out)} · ${fmtDur(r.ms)} · +${r.exp} EXP</small></div><div class="need">${need}</div><div class="acts"></div>`;
      const acts = row.querySelector('.acts');
      const add = (label, on, disabled) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cta small'; b.textContent = label; b.disabled = disabled || prodBusy; b.addEventListener('click', on); acts.appendChild(b); };
      add('Chế 1 mẻ', () => runRecipe(m.id, r, 1), maxN < 1);
      if (maxN > 1) add(`Chế ${maxN} mẻ`, () => runRecipe(m.id, r, maxN), false);
      if (j && j.ready) add('Lấy thành phẩm', () => collectRecipe(m.id, r), false);
      rows.appendChild(row);
    });
  } else if (prodMode === 'quests') {
    $('#prodTitle').textContent = 'Nhiệm vụ ngày';
    const d = me.daily, head = document.createElement('p');
    head.textContent = `Xong ${d.done}/${d.required} nhiệm vụ để mở rương ngày. Nhiệm vụ làm mới lúc 9 giờ sáng giờ Los Angeles.`; rows.appendChild(head);
    d.quests.forEach(q => {
      const row = document.createElement('div'); row.className = 'row job'; const done = q.progress >= q.target;
      row.innerHTML = `<span class="emo">${q.emoji}</span><div><b>${q.name}</b> ${done ? '<span class="state-chip done">Xong</span>' : ''}<small>${q.progress}/${q.target} · +${nf.format(q.gold)} vàng · +${q.exp} EXP${q.stars ? ' · +' + q.stars + ' sao' : ''}</small></div>`;
      rows.appendChild(row);
    });
    const chest = document.createElement('div'); chest.className = 'row job'; chest.innerHTML = '<span class="emo">🎁</span><div><b>Rương ngày</b><small>Vàng, EXP và cơ hội nhận kim cương</small></div><div class="acts"></div>';
    const cb = document.createElement('button'); cb.type = 'button'; cb.className = 'cta small'; cb.textContent = d.chestClaimed ? 'Đã nhận' : 'Mở rương';
    cb.disabled = d.chestClaimed || d.done < d.required || prodBusy;
    cb.addEventListener('click', () => prodAct('/quest-chest', {}, r => toast(r.gem ? 'Rương ngày: nhận cả kim cương!' : 'Đã mở rương ngày')));
    chest.querySelector('.acts').appendChild(cb); rows.appendChild(chest);
  } else if (prodMode === 'board') {
    $('#prodTitle').textContent = 'Bảng xếp hạng';
    rows.innerHTML = '<div class="empty">Đang tải…</div>';
    api('/leaderboard').then(list => {
      if (prodMode !== 'board') return; rows.innerHTML = '';
      list.forEach(u => {
        const row = document.createElement('div'); row.className = 'row job';
        row.innerHTML = `<span class="emo">${u.rank <= 3 ? ['🥇', '🥈', '🥉'][u.rank - 1] : u.rank}</span><div><b>${u.name}${u.id === me.id ? ' (bạn)' : ''}</b><small>Cấp ${u.level}${u.title ? ' · ' + u.title : ''} · ${nf.format(u.stars)} sao</small></div>`;
        rows.appendChild(row);
      });
      if (!list.length) rows.innerHTML = '<div class="empty">Chưa có ai trên bảng.</div>';
    }).catch(fail);
  } else if (prodMode === 'family') {
    $('#prodTitle').textContent = 'Hàng xóm';
    const others = store.family.filter(u => !u.me);
    const head = document.createElement('p'); head.textContent = 'Ghé thăm trang trại hàng xóm: tưới giúp được tiền công, ô chín thì hái ké (chủ ruộng không mất gì), nhưng coi chừng chó canh vườn.'; rows.appendChild(head);
    if (!others.length) rows.innerHTML += '<div class="empty">Chưa có hàng xóm nào.</div>';
    others.forEach(u => {
      const row = document.createElement('div'); row.className = 'row job';
      row.innerHTML = `<span class="emo">🏡</span><div><b>${u.name}</b><small>${u.level != null ? 'Cấp ' + u.level : 'Chưa chơi'}${u.title ? ' · ' + u.title : ''}</small></div><div class="acts"></div>`;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cta small'; b.textContent = 'Ghé thăm'; b.disabled = u.level == null || prodBusy;
      b.addEventListener('click', () => visitFarm(u.id)); row.querySelector('.acts').appendChild(b); rows.appendChild(row);
    });
  } else if (prodMode === 'orders') {
    $('#prodTitle').textContent = 'Đơn hàng';
    if (me.level < (cat().orderUnlockLevel || 5)) { rows.innerHTML = `<div class="empty">Đơn hàng mở ở cấp ${cat().orderUnlockLevel || 5}.</div>`; return; }
    const head = document.createElement('p'); head.textContent = `Giao đủ hàng trong kho để nhận vàng, EXP và sao. Sao hiện có: ${nf.format(me.stars)}.`; rows.appendChild(head);
    if (!me.orders.length) rows.innerHTML += '<div class="empty">Chưa có đơn nào. Đơn mới sẽ tới sau ít phút.</div>';
    me.orders.forEach(o => {
      const row = document.createElement('div'); row.className = 'row job';
      const ok = Object.entries(o.items).every(([id, n]) => (me.inventory[id] || 0) >= n);
      const need = Object.entries(o.items).map(([id, n]) => { const have = me.inventory[id] || 0; return `<span class="${have >= n ? '' : 'short'}">${iconHtml(id)} ${nf.format(have)}/${n}</span>`; }).join('');
      row.innerHTML = `<span class="emo">📦</span><div><b>Đơn #${o.slot + 1}</b><small>+${nf.format(o.gold)} vàng · +${o.exp} EXP · +${o.stars} sao</small></div><div class="need">${need}</div><div class="acts"></div>`;
      const acts = row.querySelector('.acts');
      const add = (label, on, disabled) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cta small'; b.textContent = label; b.disabled = disabled || prodBusy; b.addEventListener('click', on); acts.appendChild(b); };
      add('Giao hàng', () => prodAct('/order-deliver', { id: o.id }, r => { toast(`Giao xong, +${nf.format(r.gained)} vàng`); announce(`Giao đơn hàng, nhận ${nf.format(r.gained)} vàng`); }), !ok);
      add('Bỏ đơn', () => prodAct('/order-discard', { id: o.id }, () => toast('Đã bỏ đơn')), false);
      rows.appendChild(row);
    });
  } else {
    $('#prodTitle').textContent = 'Chuồng trại';
    const feed = me.inventory.thucan || 0, kinds = {};
    (me.animals || []).forEach(a => { const k = kinds[a.kind] || (kinds[a.kind] = { n: 0, hungry: 0, ready: 0 }); k.n += 1; if (a.ready_at == null) k.hungry += 1; else if (a.ready) k.ready += 1; });
    const head = document.createElement('p'); head.textContent = `Thức ăn gia súc trong kho: ${nf.format(feed)}. Còn thức ăn thì chuồng tự cho ăn và tự thu; hết thì bấm tay ở đây. Xay ngô ở Cối xay bột để có thêm.`; rows.appendChild(head);
    Object.entries(kinds).forEach(([kind, k]) => {
      const a = cat().animals[kind], row = document.createElement('div'); row.className = 'row job';
      row.innerHTML = `<span class="emo">${a.emoji}</span><div><b>${a.name} ×${k.n}</b> ${k.hungry ? `<span class="state-chip">${k.hungry} đói</span>` : ''} ${k.ready ? `<span class="state-chip done">${k.ready} có ${itemName(a.product)}</span>` : ''}<small>Cho ăn ${a.feedQty} thức ăn mỗi con · ra ${itemName(a.product)} sau ${fmtDur(a.produceMs)}</small></div><div class="acts"></div>`;
      const acts = row.querySelector('.acts');
      const add = (label, on, disabled) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cta small'; b.textContent = label; b.disabled = disabled || prodBusy; b.addEventListener('click', on); acts.appendChild(b); };
      add('Cho ăn', () => prodAct('/feed', { kind }, r => toast(`Đã cho ${r.fed} con ăn`)), k.hungry < 1 || feed < a.feedQty);
      add('Thu sản phẩm', () => prodAct('/collect', { kind }, r => { toast(`Thu ${r.collected} ${itemName(r.product)}`); announce(`Thu ${r.collected} ${itemName(r.product)}`); }), k.ready < 1);
      rows.appendChild(row);
    });
    const buyHead = document.createElement('p'); buyHead.textContent = 'Mua vật nuôi'; buyHead.style.fontWeight = '800'; rows.appendChild(buyHead);
    Object.values(cat().animals).sort((a, b) => a.level - b.level).forEach(a => {
      const locked = a.level > me.level, row = document.createElement('div'); row.className = 'row job';
      row.innerHTML = `<span class="emo">${a.emoji}</span><div><b>${a.name}</b><small>${locked ? `Mở ở cấp ${a.level}` : `${nf.format(a.price)} vàng`}</small></div><div class="acts"></div>`;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cta small'; b.textContent = 'Mua';
      b.disabled = locked || me.gold < a.price || prodBusy; b.addEventListener('click', () => prodAct('/buy-animal', { kind: a.id }, () => toast(`Đã mua ${a.name}`)));
      row.querySelector('.acts').appendChild(b); rows.appendChild(row);
    });
  }
}
async function prodAct(path, body, ok) {
  if (prodBusy) return; prodBusy = true; initAudio(); renderProd();
  try { const r = await doAct(path, body); ok?.(r); sfx.harvest(); }
  catch (e) { fail(e); } finally { prodBusy = false; if (!prodSheet.hidden) renderProd(); }
}
const _hw = new THREE.Vector3();
function runRecipe(machine, r, count) {
  prodAct('/machine-run', { machine, recipe: r.id, count }, (res) => {
    toast(`Đã xếp ${res.queued} mẻ ${r.name}`); announce(`Đã xếp ${res.queued} mẻ ${r.name}`);
    if (machine === 'coixay') {
      mill.hopper.getWorldPosition(_hw); const hs = toScreen(_hw.x, _hw.y + 0.8, _hw.z), kb = $('#khoBtn').getBoundingClientRect();
      Object.keys(r.in).forEach((id, i) => flyBetween(kb.left + kb.width / 2, kb.top + kb.height / 2, hs.x, hs.y, flyImg(id), i * 140, () => sfx.thunk()));
    }
  });
}
function collectRecipe(machine, r) {
  prodAct('/machine-collect', { machine, recipe: r.id }, (res) => {
    toast(`Lấy ${itemsText(res.items)}`); announce(`Lấy ${itemsText(res.items)}`);
    const s = machine === 'coixay' ? toScreen(MILL_X, 1.5, MILL_Z + 1.7) : { x: innerWidth / 2, y: innerHeight / 2 };
    Object.entries(res.items || {}).forEach(([id, n]) => flyToKho(id, Math.min(n, 4), s.x, s.y));
  });
}
function openProd(mode, machine) {
  initAudio(); prodMode = mode; if (machine) prodMachine = machine;
  renderProd(); prodSheet.hidden = false; (prodSheet.querySelector('.tab:not(:disabled), .cta:not(:disabled)') || $('#prodClose')).focus();
}
$('#bMachines').addEventListener('click', () => openProd('machines'));
$('#bBarn').addEventListener('click', () => openProd('barn'));
$('#bOrders').addEventListener('click', () => openProd('orders'));
$('#prodClose').addEventListener('click', () => { prodSheet.hidden = true; });
prodSheet.addEventListener('click', e => { if (e.target === prodSheet) prodSheet.hidden = true; });
window.addEventListener('keydown', e => { if (e.key === 'Escape') prodSheet.hidden = true; });
subscribe(() => { if (!prodSheet.hidden) renderProd(); });

// ---- the mill in the scene mirrors the server's coixay jobs ----
function syncMill(me) {
  if (!['idle', 'working', 'done'].includes(mill.state)) return;
  const jobs = Object.values(me.machines?.coixay || {});
  const next = jobs.some(j => j.ready) ? 'done' : jobs.length ? 'working' : 'idle';
  if (next !== mill.state) {
    if (mill.state === 'working' && next === 'idle') setGrain(0);
    mill.state = next; if (next === 'idle') mill.g.position.x = MILL_X;
  }
}
subscribe(() => { if (store.me && lastMe) syncMill(store.me); });

// ================= Visiting a neighbour: same scene, their land, server-decided actions =================
var VISIT = null; // { ownerId, farm, myActs }
const visitBar = $('#visitBar');
ERR.own_farm = 'Đây là nhà bạn'; ERR.already_poached = 'Bạn đã hái ô này rồi'; ERR.water_cooldown = 'Ô này vừa được tưới, đợi một lát'; ERR.no_farm = 'Không tìm thấy trang trại';
ERR.caught_by_dog = 'Chó canh vườn bắt được bạn!'; ERR.not_ready = 'Cây chưa chín';
function showVisit() {
  const f = VISIT.farm;
  ensurePlots(f.plotsCount, true);
  const byIdx = new Map(f.plots.map(v => [v.idx, v]));
  for (const p of plots) {
    const v = byIdx.get(p.i), acts = VISIT.myActs[p.i] || {};
    applyView(p, v || { idx: p.i, crop: null }, true);
    p.mat.color.set(0x7d4d2b); // tưới của người khác không đổi màu đất của nhà này
    p.marker.visible = !!(v && v.crop && (acts.canPoach || (acts.canWater && !v.ready)));
    if (p.marker.visible) p.marker.material.color.set(acts.canPoach ? ACT_COL.harvest : ACT_COL.water);
  }
  visitBar.hidden = false; $('#visitName').textContent = `Đang thăm ${f.name} · cấp ${f.level}`;
  document.body.classList.add('visiting');
}
async function visitFarm(id) {
  if (prodBusy) return; prodBusy = true; initAudio();
  try {
    const r = await api(`/farm/${id}`);
    if (r.me) { store.me = r.me; }
    VISIT = { ownerId: id, farm: r.farm, myActs: r.myActs || {} };
    prodSheet.hidden = true; showVisit(); announce(`Đang thăm ${r.farm.name}`);
  } catch (e) { fail(e); } finally { prodBusy = false; }
}
function leaveVisit() {
  VISIT = null; visitBar.hidden = true; document.body.classList.remove('visiting');
  for (const p of plots) { p.marker.visible = false; p.pending = null; }
  const me = store.me; ensurePlots(me.plotsCount, true);
  const byIdx = new Map(me.plots.map(v => [v.idx, v]));
  for (const p of plots) applyView(p, byIdx.get(p.i) || { idx: p.i, crop: null }, true);
  announce('Đã về nhà');
}
async function visitTap(p) {
  const acts = VISIT.myActs[p.i] || {}, id = VISIT.ownerId;
  ripple(p.x, 0.34, p.z, p.state === 'ripe' ? ACT_COL.harvest : ACT_COL.water);
  if (p.busy) return;
  let path = null;
  if (p.state === 'ripe' && acts.canPoach) path = '/poach';
  else if (p.state === 'growing' && acts.canWater) path = '/water';
  else if (p.state === 'ripe') { toast(acts.poached ? 'Bạn đã hái ô này rồi' : 'Không hái ké được ô này'); return; }
  else if (p.state === 'growing') { toast(acts.watered ? 'Ô này bạn đã tưới rồi' : 'Cây chưa chín'); return; }
  else return;
  p.busy = true;
  try {
    const r = await doAct(path, { ownerId: id, idx: p.i });
    if (r.farm) { VISIT.farm = r.farm; VISIT.myActs = r.myActs || VISIT.myActs; showVisit(); }
    const s = toScreen(p.x, 1, p.z);
    if (path === '/poach') {
      const item = r.cropId || r.item, name = itemName(item);
      emit(p.x, 0.8, p.z, cropColor(item), 20, { speed: 2.5, up: 4, size: 0.18, spread: 0.7 }); sfx.harvest();
      if (item) flyToKho(item, 2, s.x, s.y);
      floater(`Hái ké ${name}`, p.x, 1.6, p.z); toast(`Đã hái ké ${name} của ${VISIT.farm.name}`); announce(`Hái ké ${name}`);
    } else {
      emit(p.x, 0.6, p.z, 0x9fe0ff, 20, { speed: 1.2, up: 2.5, grav: -1, life: 1, size: 0.14, spread: 0.9 }); sfx.water();
      floater(r.gained ? `+${r.gained} vàng` : 'Đã tưới giúp', p.x, 1.6, p.z, '#bff0ff'); toast('Đã tưới giúp'); announce('Đã tưới giúp');
    }
  } catch (e) {
    if (e.code === 'caught_by_dog') { toast(e.data?.message || ERR.caught_by_dog); sfx.error(); announce(ERR.caught_by_dog); store.me && refresh().catch(() => {}); }
    else fail(e);
  } finally { p.busy = false; }
}
$('#bFamily').addEventListener('click', () => openProd('family'));
$('#bQuests').addEventListener('click', () => openProd('quests'));
$('#bBoard').addEventListener('click', () => openProd('board'));
$('#visitHome').addEventListener('click', leaveVisit);

// ================= Boot: load the state once, then keep it fresh =================
const bootEl = $('#boot');
net.onWaking = () => { $('#bootTitle').textContent = 'Trại đang thức dậy…'; $('#bootMsg').textContent = 'Vài giây nữa là xong, bạn giữ nguyên trang nhé.'; };
net.onStale = () => { if (!sessionStorage.getItem('ntvv3d-reloaded')) { sessionStorage.setItem('ntvv3d-reloaded', '1'); location.reload(); } };
async function start() {
  $('#bootRetry').hidden = true;
  try {
    await refresh();
    sessionStorage.removeItem('ntvv3d-reloaded');
    bootEl.hidden = true;
  } catch (e) {
    $('#bootTitle').textContent = e.code === 'not_logged_in' ? 'Chưa đăng nhập' : 'Chưa vào được trang trại';
    $('#bootMsg').textContent = ERR[e.code] || 'Có lỗi xảy ra, thử lại nhé.';
    $('#bootRetry').hidden = false;
  }
}
$('#bootRetry').addEventListener('click', start);
setInterval(() => { if (document.visibilityState === 'visible' && bootEl.hidden) refresh().catch(() => {}); }, 20_000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && bootEl.hidden) refresh().catch(() => {}); });
start();
