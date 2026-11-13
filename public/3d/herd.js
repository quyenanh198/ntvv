// The herd in the scene follows store.me.animals: how many of each kind the server says you own,
// which are hungry (no feed yet) and which have a product ready. Nothing here changes any state.
export const PASTURE = [-28.2, 3.8, -15, 10.0]; // west pasture for the kinds without a dedicated pen
export const PASTURE_FENCE = [[-14.2, 8.4], [-14.2, 3], [-29, 3], [-29, 10.8], [-14.2, 10.8], [-14.2, 10.6]];
export const PASTURE_PATH = { w: 1.2, pts: [[-4.9, 9.5], [-14.5, 9.5], [-17, 9.5]] };
const CAP = { ga: 6, cuu: 3, heo: 3 }, DEFAULT_CAP = 2;
// kind: [shape, body, accent, size, extras]
const LOOK = {
  bo: ['quad', 0xf4f1ea, 0x2b2b2b, 1.35, { patches: true, horns: 0xe8dcc0 }],
  vit: ['bird', 0xf6f0d8, 0xf0a020, 0.85, {}],
  ong: ['static-hive'], cut: ['bird', 0xa8805a, 0xd9a050, 0.6, {}],
  ngong: ['bird', 0xffffff, 0xf08a20, 1.1, { neck: true }], tho: ['quad', 0xf6f6f6, 0xf3b9c4, 0.6, { ears: 0.35 }],
  gatay: ['bird', 0x6b4a2b, 0xd94a3a, 1.25, { fan: 0x3f2a1a }], de: ['quad', 0xe8e4dc, 0x8a8478, 0.9, { horns: 0x8a8478, beard: true }],
  tam: ['static-tray'], trau: ['quad', 0x5a5650, 0x2a2824, 1.55, { horns: 0xd8ceb0, wide: true }],
  alpaca: ['quad', 0xf2e6cf, 0x8a6a4a, 1.2, { neck: true, ears: 0.2 }], huou: ['quad', 0xb98457, 0x6b4423, 1.25, { antlers: true, tall: true }],
};

export function createHerd(c) {
  const { THREE, scene, mesh, box, animals, hitTargets, bakeVC, makeHen, makeSheep, makePig, rand, easeOutBack } = c;
  const ents = new Map(); // server animal id -> { a, base scale }

  function quad(kind, [, body, accent, size, ex]) {
    const g = new THREE.Group(), s = ex.wide ? 1.15 : 1, tall = ex.tall ? 0.18 : 0;
    const b = mesh(new THREE.SphereGeometry(0.42, 12, 10), body, 0, 0.62 + tall, 0, g); b.scale.set(0.85 * s, 0.8, 1.3);
    if (ex.patches) [[-0.2, 0.9, 0.1], [0.22, 0.75, -0.25]].forEach(([x, y, z]) => mesh(new THREE.SphereGeometry(0.2, 8, 6), accent, x, y + tall, z, g).scale.set(1, 0.5, 1.2));
    const head = new THREE.Group(); head.position.set(0, (ex.neck ? 1.15 : 0.78) + tall, 0.55); g.add(head);
    if (ex.neck) box(0.2, 0.55, 0.22, body, 0, 0.92, 0.5, g);
    mesh(new THREE.SphereGeometry(0.22, 10, 8), body, 0, 0, 0, head).scale.set(0.9, 0.95, 1.15);
    mesh(new THREE.SphereGeometry(0.12, 8, 6), accent, 0, -0.06, 0.2, head);
    [-0.07, 0.07].forEach(x => mesh(new THREE.SphereGeometry(0.03, 5, 4), 0x1a1a1a, x, 0.06, 0.17, head));
    if (ex.ears) [-1, 1].forEach(sd => { const e = box(0.08, ex.ears, 0.05, body, sd * 0.09, 0.2 + ex.ears / 2, -0.02, head); e.rotation.z = -sd * 0.15; });
    else [-1, 1].forEach(sd => { const e = mesh(new THREE.SphereGeometry(0.08, 6, 4), body, sd * 0.2, 0.12, -0.02, head); e.scale.set(1, 0.45, 0.7); });
    if (ex.horns) [-1, 1].forEach(sd => { const h = mesh(new THREE.ConeGeometry(0.05, 0.28, 5), ex.horns, sd * 0.16, 0.26, 0, head); h.rotation.z = -sd * (ex.wide ? 1.0 : 0.5); });
    if (ex.antlers) [-1, 1].forEach(sd => { const h = box(0.05, 0.5, 0.05, 0x6b4423, sd * 0.12, 0.42, 0, head); h.rotation.z = -sd * 0.35; const t = box(0.04, 0.26, 0.04, 0x6b4423, sd * 0.24, 0.55, 0, head); t.rotation.z = sd * 0.4; });
    if (ex.beard) box(0.06, 0.16, 0.06, accent, 0, -0.2, 0.18, head);
    const legH = 0.42 + tall * 2;
    [[-0.2, -0.3], [0.2, -0.3], [-0.2, 0.3], [0.2, 0.3]].forEach(([x, z]) => mesh(new THREE.CylinderGeometry(0.05, 0.05, legH, 5), accent, x * s, legH / 2, z, g));
    mesh(new THREE.SphereGeometry(0.08, 6, 4), accent, 0, 0.7 + tall, -0.58, g);
    g.scale.setScalar(size); return { g, head };
  }
  function bird(kind, [, body, accent, size, ex]) {
    const g = new THREE.Group();
    mesh(new THREE.SphereGeometry(0.28, 12, 10), body, 0, 0.38, 0, g).scale.set(0.9, 0.85, 1.2);
    if (ex.fan) { for (let i = -2; i <= 2; i++) { const f = box(0.08, 0.6, 0.03, ex.fan, i * 0.12, 0.62, -0.42, g); f.rotation.z = -i * 0.28; } }
    else mesh(new THREE.ConeGeometry(0.14, 0.3, 6), body, 0, 0.5, -0.32, g).rotation.x = -0.9;
    const head = new THREE.Group(); head.position.set(0, ex.neck ? 0.95 : 0.66, 0.25); g.add(head);
    if (ex.neck) box(0.12, 0.5, 0.14, body, 0, 0.7, 0.22, g).rotation.x = 0.15;
    mesh(new THREE.SphereGeometry(0.14, 10, 8), body, 0, 0, 0, head);
    mesh(new THREE.ConeGeometry(0.05, 0.14, 5), accent, 0, -0.02, 0.17, head).rotation.x = Math.PI / 2;
    [-0.06, 0.06].forEach(x => mesh(new THREE.SphereGeometry(0.02, 5, 4), 0x1a1a1a, x, 0.04, 0.11, head));
    [-0.1, 0.1].forEach(x => mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4), accent, x, 0.1, 0, g));
    g.scale.setScalar(size * 1.15); return { g, head };
  }
  function staticProp(kind) {
    const g = new THREE.Group(), head = new THREE.Group(); g.add(head);
    if (kind === 'ong') {
      [0, 1, 2, 3].forEach(i => mesh(new THREE.CylinderGeometry(0.42 - i * 0.06, 0.46 - i * 0.06, 0.22, 10), i % 2 ? 0xd9a82f : 0xf0c64a, 0, 0.12 + i * 0.21, 0, g));
      box(0.2, 0.08, 0.04, 0x3a2a14, 0, 0.2, 0.44, g); box(0.5, 0.06, 0.6, 0x8a5a32, 0, 0.02, 0.1, g);
    } else {
      box(0.9, 0.12, 0.6, 0x9a6a3e, 0, 0.3, 0, g); [-0.4, 0.4].forEach(x => [-0.25, 0.25].forEach(z => box(0.06, 0.3, 0.06, 0x6b4423, x, 0.15, z, g)));
      box(0.8, 0.05, 0.5, 0x6fb04a, 0, 0.38, 0, g); [[-0.2, 0.1], [0.1, -0.1], [0.25, 0.12], [-0.05, -0.15]].forEach(([x, z]) => mesh(new THREE.SphereGeometry(0.06, 6, 4), 0xfaf6ea, x, 0.43, z, g).scale.set(1.8, 0.8, 0.8));
    }
    g.scale.setScalar(1.2); return { g, head };
  }
  const marker = () => { const m = new THREE.Group(); box(0.28, 0.24, 0.28, 0xf2b532, 0, 0, 0, m); box(0.24, 0.05, 0.24, 0xfff2b0, 0, 0.14, 0, m); m.visible = false; return m; };

  function spawn(kind, index) {
    let a;
    const look = LOOK[kind];
    if (kind === 'ga') { a = makeHen(rand(-11, -7), rand(4.4, 7), index % 2 === 1); }
    else if (kind === 'cuu') { makeSheep(rand(4.2, 7.2), rand(-6.5, -4)); a = animals[animals.length - 1]; }
    else if (kind === 'heo') { makePig(rand(4.2, 7.2), rand(-6.5, -4)); a = animals[animals.length - 1]; }
    else {
      const built = look[0] === 'quad' ? quad(kind, look) : look[0] === 'bird' ? bird(kind, look) : staticProp(kind);
      const [x0, z0, x1, z1] = PASTURE, x = rand(x0, x1), z = rand(z0, z1), still = look[0].startsWith('static');
      built.g.position.set(x, 0, z); scene.add(built.g);
      a = { g: built.g, head: built.head, kind: still ? 'prop' : (look[0] === 'bird' ? 'hen' : 'sheep'), speed: still ? 0 : look[0] === 'bird' ? 0.9 : 0.6, area: still ? null : PASTURE, tx: x, tz: z, wait: rand(0, 3), peck: 0, hop: 0, vy: 0 };
      built.g.userData.animal = a; animals.push(a);
    }
    hitTargets.push(a.g); bakeVC(a.head); bakeVC(a.g, [a.head]);
    a.serverKind = kind;
    a.flag = marker(); a.flag.position.y = 2.1; a.g.add(a.flag);
    a.g.userData.animal = a; return a;
  }

  function sync(me) {
    const want = new Map(), seen = {}; // per-kind cap keeps a huge herd cheap to draw
    for (const an of me.animals || []) { seen[an.kind] = (seen[an.kind] || 0) + 1; if (seen[an.kind] <= (CAP[an.kind] ?? DEFAULT_CAP)) want.set(an.id, an); }
    for (const [id, e] of ents) if (!want.has(id)) { scene.remove(e.a.g); const i = animals.indexOf(e.a); if (i >= 0) animals.splice(i, 1); const h = hitTargets.indexOf(e.a.g); if (h >= 0) hitTargets.splice(h, 1); ents.delete(id); }
    const idx = {};
    for (const [id, an] of want) {
      if (!ents.has(id)) { idx[an.kind] = (idx[an.kind] || 0) + 1; const a = spawn(an.kind, idx[an.kind]); const base = a.g.scale.clone(); a.g.scale.multiplyScalar(0.01); a.grow = 0; ents.set(id, { a, base }); }
      const e = ents.get(id); e.a.status = an.ready_at == null ? 'hungry' : an.ready ? 'ready' : 'fed'; e.a.flag.visible = e.a.status === 'ready';
    }
  }
  function update(dt, time) {
    for (const e of ents.values()) {
      const a = e.a;
      if (a.grow < 1) { a.grow = Math.min(1, a.grow + dt * 1.6); a.g.scale.copy(e.base).multiplyScalar(Math.max(0.01, easeOutBack(a.grow))); }
      if (a.status === 'hungry') a.head.rotation.x = Math.max(a.head.rotation.x, 0.55 + Math.sin(time * 2 + a.tx) * 0.05);
      if (a.flag.visible) { a.flag.position.y = 2.1 + Math.sin(time * 4 + a.tx) * 0.1; a.flag.rotation.y += dt * 2; }
    }
  }
  return { sync, update, ents };
}
