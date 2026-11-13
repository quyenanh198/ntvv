// The eleven processing buildings besides the mill. Each one mirrors the server's jobs for its machine:
// locked (construction site) -> building -> idle -> working -> done. The scene never decides anything;
// it only draws what store.me.machines[id] says and opens the production sheet on tap.
const LOOK = { // wall, roof, trim
  bepan: [0xf2d9a8, 0xc8553d, 0x8a5a32], lonuong: [0xb9b2a3, 0x7a6f60, 0x4a3a2a], xuongcaocap: [0xe9e2d0, 0xd9a82f, 0x6b4423],
  quanvat: [0xf6e6c4, 0xe0553f, 0x8a5a32], quanoc: [0x9fd0e8, 0x2f7fa8, 0x6b4423], mayep: [0xd9b46c, 0x7fb04a, 0x6b4423],
  noimut: [0xe6c9a0, 0xb25a3a, 0x6b4423], nhamaysua: [0xf4f4ef, 0x5a8ec9, 0x7a8a99], lobanh: [0xc9744a, 0x7a3b25, 0x4a2f1a],
  mayrang: [0x8a6a50, 0x3f3a36, 0x2a2420], xuongdet: [0xd8c7e6, 0x7d5fa8, 0x6b4423],
};

export function createStations(c) {
  const { THREE, scene, mesh, box, toon, canvasTex, emit, easeOutBack, bakeVC, hitTargets, sfx, tagsEl, toScreen, place, cat, fmtClock, serverNow, camPos, layout } = c;
  const list = [];

  function house(g, w, d, h, wall, roof, trim) {
    box(w, h, d, wall, 0, h / 2, 0, g);
    const rise = h * 0.6, ang = Math.atan2(rise, w / 2), len = Math.hypot(w / 2, rise) + 0.3;
    [-1, 1].forEach(s => { const r = box(len, 0.16, d + 0.5, roof, s * w / 4, h + rise / 2, 0, g); r.rotation.z = -s * ang; });
    const tri = new THREE.Shape(); tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, rise);
    const geo = new THREE.ShapeGeometry(tri);
    mesh(geo, wall, 0, h, d / 2 + 0.01, g); mesh(geo, wall, 0, h, -d / 2 - 0.01, g).rotation.y = Math.PI;
    box(0.65, 1.1, 0.1, trim, 0, 0.55, d / 2 + 0.03, g);
    [-1, 1].forEach(s => box(0.55, 0.5, 0.1, 0xcfe9f5, s * w / 3, h * 0.62, d / 2 + 0.03, g));
  }
  const cyl = (rt, rb, h, col, x, y, z, p, seg = 14) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), col, x, y, z, p);
  const rotor = (parent, x, y, z) => { const r = new THREE.Group(); r.position.set(x, y, z); parent.add(r); return r; };

  // each builder fills g with static parts and returns { rotors: [{o, axis, speed}], fx: [x,y,z] }
  const BUILD = {
    bepan(g, [wall, roof, trim]) {
      house(g, 3.2, 2.4, 1.6, wall, roof, trim); box(0.45, 1.4, 0.45, 0x8a5a32, 1.1, 2.3, -0.6, g);
      cyl(0.4, 0.34, 0.4, 0x4a4a4a, -2.0, 0.45, 1.0, g); const lid = rotor(g, -2.0, 0.72, 1.0); mesh(new THREE.SphereGeometry(0.22, 8, 6), 0xd9d9d9, 0, 0.05, 0, lid);
      return { rotors: [{ o: lid, axis: 'y', speed: 4 }], fx: [1.1, 3.1, -0.6] };
    },
    lonuong(g, [wall, roof, trim]) {
      mesh(new THREE.SphereGeometry(1.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(wall, { flatShading: true }), 0, 0, 0, g);
      box(1.0, 0.9, 0.5, 0x2a1a10, 0, 0.55, 1.35, g); const fire = rotor(g, 0, 0.5, 1.45); mesh(new THREE.SphereGeometry(0.28, 8, 6), 0xff8a2a, 0, 0, 0, fire);
      cyl(0.28, 0.34, 1.2, roof, 0.7, 2.0, -0.6, g, 8); box(1.8, 0.12, 0.5, trim, 0, 0.12, 1.9, g);
      return { rotors: [{ o: fire, axis: 'pulse', speed: 9 }], fx: [0.7, 2.7, -0.6] };
    },
    xuongcaocap(g, [wall, roof, trim]) {
      house(g, 3.8, 2.8, 2.0, wall, roof, trim);
      const gA = rotor(g, -1.2, 1.4, 1.52), gB = rotor(g, 0.5, 1.15, 1.52);
      [[gA, 0.55], [gB, 0.4]].forEach(([r, rad]) => { cyl(rad, rad, 0.14, 0xb89a3f, 0, 0, 0, r, 16).rotation.x = Math.PI / 2; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; box(0.16, 0.2, 0.14, 0x8a7430, Math.cos(a) * (rad + 0.08), Math.sin(a) * (rad + 0.08), 0, r).rotation.z = a; } });
      cyl(0.25, 0.3, 1.5, 0x6b4423, 1.4, 2.8, -0.8, g, 8);
      return { rotors: [{ o: gA, axis: 'z', speed: 1.6 }, { o: gB, axis: 'z', speed: -2.2 }], fx: [1.4, 3.6, -0.8] };
    },
    quanvat(g, [wall, roof, trim]) {
      [[-1.5, -0.9], [1.5, -0.9], [-1.5, 1.0], [1.5, 1.0]].forEach(([x, z]) => box(0.14, 2.1, 0.14, trim, x, 1.05, z, g));
      for (let i = 0; i < 8; i++) box(0.4, 0.1, 2.2, i % 2 ? 0xf6f1e6 : roof, -1.4 + i * 0.4, 2.15 - (i % 2 ? 0.02 : 0), 0.05, g).rotation.x = 0.08;
      box(3.0, 0.9, 0.7, wall, 0, 0.45, 0.8, g); box(3.1, 0.1, 0.8, trim, 0, 0.93, 0.8, g);
      const rack = rotor(g, 0, 1.3, -0.1); cyl(0.07, 0.07, 1.4, 0x6b4423, 0, 0, 0, rack, 6).rotation.z = Math.PI / 2;
      [-0.5, 0, 0.5].forEach(x => mesh(new THREE.SphereGeometry(0.17, 8, 6), 0xd9944a, x, -0.12, 0, rack));
      return { rotors: [{ o: rack, axis: 'x', speed: 3 }], fx: [0, 2.0, -0.4] };
    },
    quanoc(g, [wall, roof, trim]) {
      house(g, 3.0, 2.2, 1.5, wall, roof, trim);
      const shell = rotor(g, 0, 2.6, 1.3); mesh(new THREE.SphereGeometry(0.55, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xf3b9c4, 0, 0, 0, shell).rotation.x = -Math.PI / 2 + 0.3;
      cyl(0.5, 0.42, 0.55, 0x3a3a3a, 1.9, 0.3, 1.0, g); const lid = rotor(g, 1.9, 0.62, 1.0); mesh(new THREE.SphereGeometry(0.25, 8, 6), 0xd9d9d9, 0, 0, 0, lid);
      return { rotors: [{ o: lid, axis: 'bob', speed: 7 }, { o: shell, axis: 'sway', speed: 2 }], fx: [1.9, 1.2, 1.0] };
    },
    mayep(g, [wall, roof, trim]) {
      box(2.6, 0.3, 2.0, trim, 0, 0.15, 0, g); [-1, 1].forEach(s => box(0.2, 2.4, 0.2, wall, s * 0.9, 1.5, -0.2, g)); box(2.1, 0.2, 0.3, wall, 0, 2.6, -0.2, g);
      const screw = rotor(g, 0, 1.6, -0.2); cyl(0.16, 0.16, 1.9, 0xb8b8b8, 0, 0, 0, screw, 8); for (let i = 0; i < 6; i++) box(0.5, 0.06, 0.1, 0x8a8a8a, 0, -0.8 + i * 0.32, 0, screw);
      cyl(0.62, 0.62, 0.9, trim, 0, 0.75, 0.2, g); mesh(new THREE.ConeGeometry(0.7, 0.6, 12, 1, true), 0xe0e0e0, 0, 2.2, -0.2, g);
      cyl(0.5, 0.5, 0.8, roof, 1.5, 0.7, 0.9, g); mesh(new THREE.SphereGeometry(0.3, 8, 6), 0xffa43a, 1.5, 1.2, 0.9, g);
      return { rotors: [{ o: screw, axis: 'y', speed: 5 }], fx: [0, 3.0, -0.2] };
    },
    noimut(g, [wall, roof, trim]) {
      cyl(1.3, 1.5, 0.7, 0x8a4a35, 0, 0.35, 0, g, 12);
      mesh(new THREE.SphereGeometry(1.15, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0xb87333, 0, 1.55, 0, g).scale.y = 0.9;
      mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.08, 18), 0xe0556a, 0, 1.55, 0, g);
      const pad = rotor(g, 0, 1.6, 0); box(1.9, 0.1, 0.16, 0x6b4423, 0, 0, 0, pad); cyl(0.07, 0.07, 1.1, 0x6b4423, 0, 0.55, 0, pad, 6);
      box(0.18, 1.8, 0.18, trim, -1.7, 0.9, -0.8, g); box(0.7, 0.5, 0.5, 0xe0556a, 1.7, 0.25, 0.9, g);
      return { rotors: [{ o: pad, axis: 'y', speed: 2.4 }], fx: [0, 2.4, 0] };
    },
    nhamaysua(g, [wall, roof, trim]) {
      box(2.6, 1.8, 2.2, wall, -0.6, 0.9, 0, g); box(2.8, 0.18, 2.4, roof, -0.6, 1.9, 0, g);
      cyl(0.8, 0.8, 3.0, 0xe2e6ea, 1.5, 1.5, -0.4, g, 16); mesh(new THREE.SphereGeometry(0.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), roof, 1.5, 3.0, -0.4, g);
      const fan = rotor(g, 1.5, 2.2, 0.42); for (let i = 0; i < 4; i++) { const b = box(0.12, 0.7, 0.05, 0x7a8a99, -Math.sin(i * Math.PI / 2) * 0.35, Math.cos(i * Math.PI / 2) * 0.35, 0, fan); b.rotation.z = i * Math.PI / 2; }
      box(0.7, 1.0, 0.1, trim, -0.6, 0.5, 1.13, g); box(1.2, 0.5, 0.1, 0x6fb7e8, -1.0, 1.3, 1.13, g);
      cyl(0.35, 0.35, 0.9, 0xd0d6dc, -2.3, 0.45, 1.0, g);
      return { rotors: [{ o: fan, axis: 'z', speed: 4 }], fx: [-1.4, 2.4, 0] };
    },
    lobanh(g, [wall, roof, trim]) {
      house(g, 3.2, 2.4, 1.6, wall, roof, trim); box(0.55, 1.8, 0.55, 0x8a3a25, -1.2, 2.5, -0.6, g);
      const wheel = rotor(g, 1.85, 0.9, 0.9); cyl(0.5, 0.5, 0.08, 0x6b4423, 0, 0, 0, wheel, 12).rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; mesh(new THREE.SphereGeometry(0.15, 8, 6), 0xe0a050, Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0, wheel).scale.set(1.3, 0.8, 1); }
      return { rotors: [{ o: wheel, axis: 'z', speed: 2.2 }], fx: [-1.2, 3.6, -0.6] };
    },
    mayrang(g, [wall, roof, trim]) {
      box(0.2, 1.7, 0.2, trim, -1.1, 0.85, 0, g); box(0.2, 1.7, 0.2, trim, 1.1, 0.85, 0, g); box(2.6, 0.2, 1.4, wall, 0, 0.1, 0, g);
      const drum = rotor(g, 0, 1.55, 0); cyl(0.7, 0.7, 1.8, 0x7a5a3a, 0, 0, 0, drum, 16).rotation.z = Math.PI / 2;
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; box(1.7, 0.08, 0.12, 0x3f2a1a, 0, Math.sin(a) * 0.66, Math.cos(a) * 0.66, drum); }
      mesh(new THREE.ConeGeometry(0.6, 0.8, 4, 1, true), 0xcfcfcf, 0, 2.7, 0, g).rotation.y = Math.PI / 4; cyl(0.2, 0.25, 1.4, roof, 1.6, 1.0, -0.4, g, 8);
      box(0.9, 0.7, 0.6, 0x4a3a2a, -1.8, 0.35, 0.8, g);
      return { rotors: [{ o: drum, axis: 'x', speed: 3.4 }], fx: [1.6, 1.9, -0.4] };
    },
    xuongdet(g, [wall, roof, trim]) {
      [-1.4, 1.4].forEach(x => box(0.18, 2.4, 0.18, trim, x, 1.2, 0, g)); box(3.1, 0.18, 0.3, trim, 0, 2.4, 0, g); box(3.1, 0.18, 0.3, trim, 0, 0.3, 0, g);
      for (let i = 0; i < 12; i++) box(0.03, 1.9, 0.03, i % 2 ? 0xe8e0f0 : 0xb89ad8, -1.25 + i * 0.23, 1.35, 0, g);
      box(2.6, 0.5, 0.06, wall, 0, 0.7, 0.05, g); const shuttle = rotor(g, 0, 1.3, 0.12); box(0.5, 0.12, 0.12, roof, 0, 0, 0, shuttle);
      const roll = rotor(g, 0, 2.55, 0.3); cyl(0.16, 0.16, 3.0, 0xe6dcef, 0, 0, 0, roll, 8).rotation.z = Math.PI / 2;
      box(1.0, 0.7, 0.6, 0x9a7ac0, 2.0, 0.35, 0.9, g);
      return { rotors: [{ o: shuttle, axis: 'slide', speed: 3, amp: 1.0 }, { o: roll, axis: 'x', speed: 1.2 }], fx: [0, 2.9, 0] };
    },
  };

  function siteFor(name, level) {
    const s = new THREE.Group();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, x = Math.cos(a) * 1.9, z = Math.sin(a) * 1.5; box(0.09, 0.7, 0.09, 0x9a6a3e, x, 0.35, z, s); box(0.11, 0.1, 0.11, 0xd9473b, x, 0.75, z, s); }
    [-0.2, 0.05, 0.3].forEach(dz => box(1.5, 0.1, 0.2, 0x9a6a3e, -0.5, 0.06, -0.4 + dz, s));
    [[0.7, 0.23, -0.4], [1.15, 0.23, -0.1], [0.9, 0.67, -0.25]].forEach(([x, y, z]) => box(0.44, 0.44, 0.44, 0xc9c2b2, x, y, z, s));
    const tex = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = '#d2ad74'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a5a32'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = '#4a2f1a'; g.textAlign = 'center'; g.font = 'bold 30px sans-serif'; g.fillText(name.toUpperCase(), w / 2, 56, w - 24);
      g.fillStyle = '#9c3f1c'; g.font = 'bold 26px sans-serif'; g.fillText('Mở ở cấp ' + level, w / 2, 98);
    });
    [-0.55, 0.55].forEach(x => box(0.1, 1.2, 0.1, 0x6b4423, x, 0.6, 1.35, s)); box(1.36, 0.7, 0.08, 0x8a5a32, 0, 1.05, 1.35, s);
    mesh(new THREE.PlaneGeometry(1.3, 0.65), toon(0xffffff, { map: tex }), 0, 1.05, 1.395, s);
    return s;
  }

  for (const id of Object.keys(BUILD)) {
    const m = cat().machines[id]; if (!m) continue;
    const x = 0, z = 0; // set from the layout once the building has a lot; parked far below ground until then (its hit box must not catch taps)
    const root = new THREE.Group(); root.position.set(0, -200, 0); root.visible = false; scene.add(root);
    const body = new THREE.Group(); root.add(body); body.visible = false;
    box(4.4, 0.12, 3.8, 0xb9ae98, 0, 0.04, 0, body);
    const built = BUILD[id](body, LOOK[id]);
    const site = siteFor(m.name, m.level); root.add(site);
    const badge = new THREE.Group(); badge.position.set(0, 4.3, 0); badge.visible = false; root.add(badge);
    box(0.6, 0.5, 0.6, 0xf2b532, 0, 0, 0, badge); box(0.5, 0.08, 0.5, 0xfff2b0, 0, 0.28, 0, badge);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.8, 3.8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 1.9, 0); hit.userData.station = id; root.add(hit); hitTargets.push(hit);
    built.rotors.forEach(r => { r.base = r.o.position.clone(); });
    bakeVC(body, built.rotors.map(r => r.o)); bakeVC(site);
    const tag = document.createElement('div'); tag.className = 'tag sign'; tagsEl.appendChild(tag);
    list.push({ id, x, z, placed: false, root, body, site, badge, hit, tag, rotors: built.rotors, fx: built.fx, state: 'locked', level: m.level, name: m.name, buildT: -1, steamT: 0 });
  }

  const wp = new THREE.Vector3();
  function update(dt, time, me, first) {
    for (const s of list) {
      const cell = layout.center('station:' + s.id);
      if (!cell) { if (s.placed) { s.placed = false; s.root.visible = false; s.root.position.y = -200; } if (s.tag.style.display !== 'none') s.tag.style.display = 'none'; continue; }
      if (!s.placed) { s.placed = true; s.root.visible = true; s.x = cell[0]; s.z = cell[1]; s.root.position.set(cell[0], 0, cell[1]); }
      else if (Math.abs(s.x - cell[0]) + Math.abs(s.z - cell[1]) > 0.01) { const k = 1 - Math.exp(-8 * dt); s.x += (cell[0] - s.x) * k; s.z += (cell[1] - s.z) * k; s.root.position.set(s.x, 0, s.z); }
      const m = cat().machines[s.id], open = me.level >= m.level;
      const jobs = Object.values(me.machines?.[s.id] || {});
      const next = !open ? 'locked' : jobs.some(j => j.ready) ? 'done' : jobs.length ? 'working' : 'idle';
      if (s.state === 'building') {
        s.buildT += dt; s.site.scale.setScalar(Math.max(0.001, 1 - s.buildT / 0.3)); if (s.buildT > 0.3) s.site.visible = false;
        const k = (s.buildT - 0.35) / 0.8;
        if (k > 0) { if (!s.body.visible) { s.body.visible = true; sfx.thunk(); emit(s.x, 0.6, s.z, 0xd8c8a8, 18, { speed: 2, up: 2, size: 0.24, spread: 1.4 }); } s.body.scale.setScalar(Math.max(0.001, easeOutBack(Math.min(1, k)))); }
        if (s.buildT > 1.3) { s.state = next === 'locked' ? 'idle' : next; s.body.scale.setScalar(1); sfx.level(); [0xffd23f, 0x7fe07a, 0x5fd0ff].forEach(col => emit(s.x, 3.2, s.z, col, 14, { speed: 3, up: 5, grav: 6, life: 1.3, size: 0.16 })); }
      } else if (s.state === 'locked' && next !== 'locked') {
        if (first) { s.state = next; s.site.visible = false; s.body.visible = true; s.body.scale.setScalar(1); }
        else { s.state = 'building'; s.buildT = 0; if (c.onUnlock) c.onUnlock(s); }
      } else if (s.state !== 'locked') s.state = next === 'locked' ? s.state : next;
      if (s.state === 'locked') { s.site.visible = true; s.body.visible = false; }
      const near = Math.hypot(s.x - camPos.x, s.z - camPos.z) < 34;
      if (s.state === 'working' && near) {
        for (const r of s.rotors) {
          if (r.axis === 'y') r.o.rotation.y += dt * r.speed; else if (r.axis === 'x') r.o.rotation.x += dt * r.speed; else if (r.axis === 'z') r.o.rotation.z += dt * r.speed;
          else if (r.axis === 'pulse') r.o.scale.setScalar(1 + Math.sin(time * r.speed) * 0.25);
          else if (r.axis === 'bob') r.o.position.y = r.base.y + Math.abs(Math.sin(time * r.speed)) * 0.12;
          else if (r.axis === 'sway') r.o.rotation.z = Math.sin(time * r.speed) * 0.15;
          else if (r.axis === 'slide') r.o.position.x = r.base.x + Math.sin(time * r.speed) * r.amp;
        }
        s.steamT -= dt;
        if (s.steamT <= 0) { s.steamT = 0.22; wp.set(s.fx[0], s.fx[1], s.fx[2]); s.root.localToWorld(wp); emit(wp.x, wp.y, wp.z, 0xf4f4f0, 1, { speed: 0.35, up: 1.3, grav: -0.5, life: 1.4, size: 0.34, spread: 0.2 }); }
      }
      s.badge.visible = s.state === 'done';
      if (s.badge.visible) { s.badge.position.y = 4.3 + Math.sin(time * 4) * 0.15; s.badge.rotation.y += dt * 1.5; }
      // labels only where they help: busy, finished or locked buildings, or any building the camera is close to
      const show = s.state !== 'idle' ? near : Math.hypot(s.x - camPos.x, s.z - camPos.z) < 6;
      if (!show) { if (s.tag.style.display !== 'none') s.tag.style.display = 'none'; continue; }
      const left = Math.max(0, ...jobs.filter(j => !j.ready).map(j => Math.ceil(((j.currentReadyAt || j.readyAt) - serverNow()) / 1000)));
      let txt = s.name, cls = 'tag sign';
      if (s.state === 'locked' || (s.state === 'building' && !s.body.visible)) txt = `${s.name} · cấp ${s.level}`;
      else if (s.state === 'working') { txt = `${s.name} · ${fmtClock(left)}`; cls = 'tag'; } else if (s.state === 'done') { txt = 'Xong! Chạm để lấy'; cls = 'tag ready'; }
      if (s.tag.dataset.t !== txt) { s.tag.textContent = txt; s.tag.className = cls; s.tag.dataset.t = txt; }
      const p = toScreen(s.x, 4.6, s.z);
      if (p.behind) s.tag.style.display = 'none'; else { s.tag.style.display = ''; place(s.tag, p, 70); }
    }
  }
  return { list, update, byId: id => list.find(s => s.id === id) };
}
