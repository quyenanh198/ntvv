/* Nông trại vui vẻ — client. Server là trọng tài (thời gian, tiền, trộm);
   client chỉ vẽ và đếm ngược. */

(() => {
  const app = document.getElementById('app');

  let DATA = null; // /state: { me, family, config, events }
  let VISIT = null; // { ownerId, farm, myActs }
  let sheet = null; // { type: 'shop'|'buyplot', idx }
  let showLb = null; // mảng leaderboard khi mở modal
  let pending = false;

  // ---------- helpers ----------
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  async function api(path, body) {
    const res = await fetch(`/farm/api${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      renderGate();
      throw new Error('not_logged_in');
    }
    const type = res.headers.get('content-type') || '';
    if (!type.includes('application/json')) {
      // Sablier đang đánh thức container — chờ chút rồi tải lại.
      renderWaking();
      setTimeout(() => location.reload(), 2500);
      throw new Error('waking');
    }
    const data = await res.json();
    if (!res.ok) {
      toast(ERRORS[data.error] || 'Có lỗi rồi, thử lại nhé!');
      throw new Error(data.error || 'error');
    }
    return data;
  }

  const ERRORS = {
    not_enough_coins: 'Không đủ xu rồi! 🪙',
    level_too_low: 'Chưa đủ level, chăm cày thêm nhé!',
    plot_busy: 'Ô này đang có cây rồi.',
    not_ready: 'Cây chưa chín mà!',
    already_ready: 'Cây chín rồi, khỏi tưới nữa.',
    already_watered: 'Bạn tưới ô này rồi.',
    already_stolen: 'Ô này bạn trộm rồi, tham thế! 😤',
    steal_capped: 'Ô này bị trộm đủ rồi, chừa cho chủ với.',
    already_claimed: 'Hôm nay nhận quà rồi, mai quay lại nhé!',
    no_farm: 'Người này chưa mở nông trại.',
    max_plots: 'Đất đã mở hết rồi!',
    own_farm: 'Ruộng nhà mình mà!',
  };

  function fmtTime(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}g${String(m).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function fmtDuration(ms) {
    const m = Math.round(ms / 60000);
    if (m < 1) return `${Math.round(ms / 1000)} giây`;
    if (m < 60) return `${m} phút`;
    return `${Math.round(m / 60)} giờ`;
  }

  function timeAgo(at) {
    const s = Math.floor((Date.now() - at) / 1000);
    if (s < 60) return 'vừa xong';
    if (s < 3600) return `${Math.floor(s / 60)} phút`;
    if (s < 86400) return `${Math.floor(s / 3600)} giờ`;
    return `${Math.floor(s / 86400)} ngày`;
  }

  function toast(msg) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  function floatGain(x, y, text, xpText) {
    const layer = document.querySelector('.toast-layer') || (() => {
      const l = document.createElement('div');
      l.className = 'toast-layer';
      document.body.appendChild(l);
      return l;
    })();
    const el = document.createElement('div');
    el.className = 'float-gain';
    el.style.left = `${x - 20}px`;
    el.style.top = `${y - 20}px`;
    el.textContent = text;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1300);
    if (xpText) {
      const xe = document.createElement('div');
      xe.className = 'float-gain float-gain--xp';
      xe.style.left = `${x + 14}px`;
      xe.style.top = `${y + 4}px`;
      xe.textContent = xpText;
      layer.appendChild(xe);
      setTimeout(() => xe.remove(), 1300);
    }
  }

  // ---------- màn chờ / màn đăng nhập ----------
  function renderGate() {
    app.innerHTML = `
      <div class="gate">
        <div style="font-size:3.5rem">🌾🐔</div>
        <h1>Nông trại vui vẻ</h1>
        <p>Đăng nhập Chat trước rồi quay lại làm nông dân nhé!</p>
        <a href="/">Mở Chat</a>
      </div>`;
  }

  function renderWaking() {
    app.innerHTML = `
      <div class="gate">
        <div style="font-size:3.5rem">🌱☀️</div>
        <h1>Nông trại đang thức dậy…</h1>
        <p>Gà đang gáy, đợi vài giây nha!</p>
      </div>`;
  }

  // ---------- render chính ----------
  function crops() { return DATA.config.crops; }
  function me() { return DATA.me; }

  function render() {
    if (!DATA) return;
    const m = me();
    const visiting = VISIT && VISIT.ownerId !== m.id ? VISIT : null;
    const xpSpan = m.nextLevelXp - m.levelXp;
    const xpPct = Math.min(100, Math.round(((m.xp - m.levelXp) / xpSpan) * 100));

    app.innerHTML = `
      <header class="farm-header">
        <div class="farm-logo">🌾 Nông trại<small>VUI VẺ</small></div>
        <div class="header-spacer"></div>
        <span class="stat-pill">🪙 ${m.coins.toLocaleString('vi')}</span>
        <button class="header-btn" id="btn-daily" title="Quà mỗi ngày">🎁${m.dailyAvailable ? '<span class="dot"></span>' : ''}</button>
        <button class="header-btn" id="btn-lb" title="Bảng xếp hạng">🏆</button>
      </header>

      <div class="level-bar">
        <span class="level-badge">Lv ${m.level}</span>
        <div class="xp-track"><div class="xp-fill" style="width:${xpPct}%"></div></div>
        <span class="xp-num">${m.xp - m.levelXp}/${xpSpan} XP</span>
      </div>

      <div class="family-strip">${DATA.family.map(familyBtn).join('')}</div>

      ${visiting ? `
        <div class="visit-bar">
          <span>👀 Đang thăm ruộng của <b>${esc(visiting.farm.name)}</b></span>
          <button id="btn-home">🏡 Về nhà</button>
        </div>` : ''}

      <div class="farm-grid" id="grid">${renderPlots(visiting)}</div>

      <div class="events">
        <h3>📰 Bản tin làng</h3>
        ${DATA.events.length
          ? `<ul>${DATA.events.map((e) => `<li><time>${timeAgo(e.at)}</time><span>${esc(e.text)}</span></li>`).join('')}</ul>`
          : '<p class="empty">Chưa có gì — trồng cây đầu tiên đi!</p>'}
      </div>

      ${sheet ? renderSheet() : ''}
      ${showLb ? renderLb() : ''}
    `;
    bind();
  }

  function familyBtn(u) {
    const active = VISIT ? VISIT.ownerId === u.id : u.me;
    const av = u.avatar_at
      ? `<img src="/farm/api/avatar/${u.id}?v=${u.avatar_at}" alt="" onerror="this.remove()" />`
      : esc((u.name || '?').charAt(0).toUpperCase());
    return `
      <button class="family-member${active ? ' family-member--active' : ''}" data-visit="${u.id}" data-me="${u.me ? 1 : 0}">
        <span class="family-avatar">${av}</span>
        <span class="family-name">${u.me ? 'Nhà mình' : esc(u.name)}</span>
        <span class="family-level">${u.level ? `Lv ${u.level}` : '🌱 mới'}</span>
      </button>`;
  }

  function renderPlots(visiting) {
    const farm = visiting ? visiting.farm : me();
    const mine = !visiting;
    const now = Date.now();
    const cells = farm.plots.map((p) => {
      if (!p.crop) {
        return `<button class="plot plot--empty" data-idx="${p.idx}" data-kind="empty" ${mine ? '' : 'disabled'}>
          <span class="plot-main">${mine ? '➕' : '🟫'}</span>
          ${mine ? '<span class="plot-note">Gieo hạt</span>' : ''}
        </button>`;
      }
      const c = crops()[p.crop];
      if (p.ready) {
        const acts = visiting ? visiting.myActs[p.idx] : null;
        const canSteal = visiting && !acts?.stolenByMe && p.stolen < p.stealCap;
        return `<button class="plot plot--ready" data-idx="${p.idx}" data-kind="${mine ? 'harvest' : canSteal ? 'steal' : 'ripe'}">
          <span class="plot-main">${c.emoji}</span>
          <span class="plot-note">${mine ? 'Thu hoạch!' : canSteal ? 'Trộm được!' : 'Chín rồi'}</span>
          <span class="plot-badge">×${p.yieldLeft}</span>
          ${!mine && canSteal ? '<span class="plot-act">😈</span>' : ''}
        </button>`;
      }
      const total = c.growMs;
      const left = p.readyAt - now;
      const pct = Math.min(100, Math.max(3, Math.round(((total - left) / total) * 100)));
      const stage = pct < 50 ? '🌱' : '🌿';
      const acts = visiting ? visiting.myActs[p.idx] : null;
      const canWater = visiting && !acts?.watered;
      return `<button class="plot plot--growing" data-idx="${p.idx}" data-kind="${canWater ? 'water' : 'growing'}" data-ready="${p.readyAt}" data-total="${total}">
        <span class="plot-main">${stage}</span>
        <span class="plot-timer">${fmtTime(left)}</span>
        <div class="plot-progress"><i style="width:${pct}%"></i></div>
        ${canWater ? '<span class="plot-act">💧</span>' : ''}
      </button>`;
    });

    if (mine && farm.nextPlot) {
      const s = farm.nextPlot;
      const affordable = me().level >= s.level && me().coins >= s.price;
      cells.push(`<button class="plot plot--locked${affordable ? ' plot--buyable' : ''}" data-kind="buyplot">
        <span class="plot-main">🔒</span>
        <span class="plot-note">${s.price.toLocaleString('vi')} 🪙 · Lv ${s.level}</span>
      </button>`);
    }
    return cells.join('');
  }

  function renderSheet() {
    const m = me();
    if (sheet.type === 'shop') {
      const rows = Object.values(crops())
        .map((c) => {
          const lockLevel = m.level < c.level;
          const lockCoin = m.coins < c.cost;
          const locked = lockLevel || lockCoin;
          const profit = c.yield * c.sell - c.cost;
          return `<button class="seed-row${locked ? ' seed-row--locked' : ''}" data-crop="${locked ? '' : c.id}">
            <span class="seed-emoji">${c.emoji}</span>
            <span class="seed-info">
              <span class="seed-name">${c.name}</span>
              <div class="seed-meta">⏱ ${fmtDuration(c.growMs)} · bán ${c.yield}×${c.sell} 🪙 · lãi +${profit}</div>
            </span>
            ${lockLevel ? `<span class="seed-lock">Cần Lv ${c.level}</span>` : `<span class="seed-cost">${c.cost} 🪙</span>`}
          </button>`;
        })
        .join('');
      return `
        <div class="sheet-backdrop" data-close="1"></div>
        <div class="sheet">
          <h3>🛒 Chợ hạt giống <span style="margin-left:auto;font-size:0.85rem;color:var(--muted)">🪙 ${m.coins.toLocaleString('vi')}</span></h3>
          ${rows}
        </div>`;
    }
    if (sheet.type === 'buyplot') {
      const s = m.nextPlot;
      const can = m.level >= s.level && m.coins >= s.price;
      return `
        <div class="sheet-backdrop" data-close="1"></div>
        <div class="sheet">
          <h3>🧱 Mở rộng đất</h3>
          <p class="sheet-note">Ô đất thứ ${s.idx + 1}: giá <b>${s.price.toLocaleString('vi')} 🪙</b>, cần <b>Lv ${s.level}</b>.</p>
          <div class="sheet-actions">
            <button class="btn btn-ghost" data-close="1">Thôi</button>
            <button class="btn btn-primary" id="btn-buyplot" ${can ? '' : 'disabled'}>${can ? 'Mua luôn!' : m.level < s.level ? `Cần Lv ${s.level}` : 'Thiếu xu'}</button>
          </div>
        </div>`;
    }
    return '';
  }

  function renderLb() {
    const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r);
    return `
      <div class="modal-backdrop" data-close="1">
        <div class="modal" onclick="event.stopPropagation()">
          <h3>🏆 Bảng xếp hạng làng</h3>
          ${showLb
            .map(
              (f) => `<div class="lb-row">
                <span class="lb-rank">${medal(f.rank)}</span>
                <span class="lb-name">${esc(f.name)}</span>
                <span class="lb-stat">Lv ${f.level} · ${f.xp} XP · ${f.coins.toLocaleString('vi')} 🪙</span>
              </div>`,
            )
            .join('')}
        </div>
      </div>`;
  }

  // ---------- sự kiện ----------
  function bind() {
    document.getElementById('btn-daily')?.addEventListener('click', async (e) => {
      if (!me().dailyAvailable) return toast(ERRORS.already_claimed);
      const r = await run(() => api('/daily', {}));
      if (r) {
        DATA.me = r.me;
        floatGain(e.clientX || innerWidth / 2, e.clientY || 100, `+${r.gain} 🪙`, `+${DATA.config.daily.xp} XP`);
        render();
      }
    });

    document.getElementById('btn-lb')?.addEventListener('click', async () => {
      showLb = await run(() => api('/leaderboard'));
      if (showLb) render();
    });

    document.getElementById('btn-home')?.addEventListener('click', () => {
      VISIT = null;
      refresh();
    });

    document.getElementById('btn-buyplot')?.addEventListener('click', async () => {
      const r = await run(() => api('/buy-plot', {}));
      if (r) {
        DATA.me = r.me;
        sheet = null;
        toast('🎉 Có thêm đất mới!');
        render();
      }
    });

    document.querySelectorAll('[data-close]').forEach((el) =>
      el.addEventListener('click', () => {
        sheet = null;
        showLb = null;
        render();
      }),
    );

    document.querySelectorAll('[data-visit]').forEach((el) =>
      el.addEventListener('click', async () => {
        const id = Number(el.dataset.visit);
        if (el.dataset.me === '1') {
          VISIT = null;
          refresh();
          return;
        }
        try {
          const r = await api(`/farm/${id}`);
          VISIT = { ownerId: id, ...r };
          render();
        } catch { /* toast đã lo */ }
      }),
    );

    document.querySelectorAll('.seed-row[data-crop]').forEach((el) =>
      el.addEventListener('click', async () => {
        const cropId = el.dataset.crop;
        if (!cropId) return;
        const r = await run(() => api('/plant', { idx: sheet.idx, crop: cropId }));
        if (r) {
          DATA.me = r.me;
          sheet = null;
          render();
        }
      }),
    );

    document.getElementById('grid')?.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('.plot');
      if (!btn) return;
      const kind = btn.dataset.kind;
      const idx = Number(btn.dataset.idx);
      const { clientX: x, clientY: y } = ev;

      if (kind === 'empty') {
        sheet = { type: 'shop', idx };
        render();
      } else if (kind === 'buyplot') {
        sheet = { type: 'buyplot' };
        render();
      } else if (kind === 'harvest') {
        const r = await run(() => api('/harvest', { idx }));
        if (r) {
          DATA.me = r.me;
          floatGain(x, y, `+${r.gain} 🪙`);
          render();
        }
      } else if (kind === 'water') {
        const r = await run(() => api('/water', { ownerId: VISIT.ownerId, idx }));
        if (r) {
          VISIT = { ownerId: VISIT.ownerId, farm: r.farm, myActs: r.myActs };
          DATA.me = r.me;
          floatGain(x, y, '💧', '+2 🪙');
          render();
        }
      } else if (kind === 'steal') {
        const r = await run(() => api('/steal', { ownerId: VISIT.ownerId, idx }));
        if (r) {
          VISIT = { ownerId: VISIT.ownerId, farm: r.farm, myActs: r.myActs };
          DATA.me = r.me;
          floatGain(x, y, '😈 +🪙');
          render();
        }
      } else if (kind === 'growing' || kind === 'ripe') {
        const p = (VISIT ? VISIT.farm : me()).plots[idx];
        if (p?.crop) {
          const c = crops()[p.crop];
          toast(p.ready ? `${c.emoji} ${c.name} chín rồi!` : `${c.emoji} ${c.name} — còn ${fmtTime(p.readyAt - Date.now())}`);
        }
      }
    });
  }

  async function run(fn) {
    if (pending) return null;
    pending = true;
    try {
      return await fn();
    } catch {
      return null;
    } finally {
      pending = false;
    }
  }

  // ---------- vòng lặp ----------
  async function refresh() {
    try {
      DATA = await api('/state');
      if (VISIT) {
        const r = await api(`/farm/${VISIT.ownerId}`);
        VISIT = { ownerId: VISIT.ownerId, ...r };
      }
      render();
    } catch { /* gate/waking đã render */ }
  }

  // Đếm ngược mỗi giây: cây nào tới giờ chín thì vẽ lại cả vườn.
  setInterval(() => {
    if (!DATA || sheet || showLb) return;
    const farm = VISIT ? VISIT.farm : me();
    const now = Date.now();
    let flip = false;
    for (const p of farm.plots) {
      if (p.crop && !p.ready && now >= p.readyAt) {
        p.ready = true;
        flip = true;
      }
    }
    if (flip) {
      render();
      return;
    }
    document.querySelectorAll('.plot--growing').forEach((el) => {
      const left = Number(el.dataset.ready) - now;
      const total = Number(el.dataset.total);
      const timer = el.querySelector('.plot-timer');
      if (timer) timer.textContent = fmtTime(left);
      const bar = el.querySelector('.plot-progress i');
      if (bar) bar.style.width = `${Math.min(100, Math.max(3, Math.round(((total - left) / total) * 100)))}%`;
      const main = el.querySelector('.plot-main');
      const pct = (total - left) / total;
      if (main) main.textContent = pct < 0.5 ? '🌱' : '🌿';
    });
  }, 1000);

  // Poll 20s khi tab đang nhìn thấy — tab ẩn thì im để nông trại được ngủ.
  setInterval(() => {
    if (document.visibilityState === 'visible' && !sheet && !showLb) refresh();
  }, 20_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });

  refresh();
})();
