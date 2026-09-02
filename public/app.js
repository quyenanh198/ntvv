/* Nông trại vui vẻ v2 — client theo đặc tả gameplay 1.0.
   Server là trọng tài; client vẽ, đếm ngược và gửi lệnh. */

(() => {
  const app = document.getElementById('app');

  let DATA = null;   // /state
  let VISIT = null;  // { ownerId, farm, myActs }
  let sheet = null;  // { type: 'seed'|'plotmenu'|'shop'|'inventory'|'quests'|'orders'|'coop'|'mill'|'expand'|'stars', ... }
  let showLb = null;
  let pending = false;
  let familyFilter = '';
  let lastLevel = null;
  let critterTimer = null;

  // ---------- sprite ----------
  const SPRITE_ALIAS = { luami: 'lua', dautay: 'dau' };
  const spriteBase = (id) => SPRITE_ALIAS[id] || id;
  const cropSprite = (id, stage) => `assets/crops/${stage === 1 ? 'seed-1' : `${spriteBase(id)}-${stage}`}.svg`;
  // Cây ăn quả có tranh riêng; loại mới dùng tranh cây chung + emoji quả.
  const TREE_PNG = new Set(['cam', 'tao', 'xoai', 'thanhlong']);
  const treeArt = (id) => (TREE_PNG.has(id) ? `assets/art/trees/${id}.png` : 'assets/art/tree.png');
  // Vật nuôi có tranh: gà/bò/cừu/lợn; loại khác hiện emoji.
  const BARN_ART = { ga: 'assets/art/chicken.png', bo: 'assets/art/cow.png', cuu: 'assets/art/sheep.png', heo: 'assets/art/pig.png' };
  const barnArtImg = (kind) => (BARN_ART[kind]
    ? `<img src="${BARN_ART[kind]}" alt="" />`
    : `<span class="emoji-ic emoji-ic--barn">${DATA?.config.animals[kind]?.emoji || '🐾'}</span>`);
  const ITEM_ICON = {
    trung: 'assets/ui/egg.svg', botmi: 'assets/ui/flour.svg', thucan: 'assets/art/feed.png',
    sua: 'assets/ui/milk.svg', len: 'assets/ui/wool.svg',
    cam: 'assets/art/trees/cam-qua.png', tao: 'assets/art/trees/tao-qua.png', xoai: 'assets/art/trees/xoai-qua.png', thanhlong: 'assets/art/trees/thanhlong-qua.png',
    canho: 'assets/ui/fish-canho.svg', caro: 'assets/ui/fish-caro.svg', cachep: 'assets/ui/fish-cachep.svg', cakoi: 'assets/ui/fish-cakoi.svg',
  };
  const itemIcon = (id) => ITEM_ICON[id] || (DATA?.config.crops[id] ? cropSprite(id, 3) : null);
  const itemImg = (id, cls = '') => {
    const path = itemIcon(id);
    if (path) return `<img class="${cls}" src="${path}" alt="" />`;
    return `<span class="emoji-ic ${cls}">${itemInfo(id)?.emoji || '❔'}</span>`;
  };
  const COIN = '<img class="coin-img" src="assets/ui/coin.svg" alt="vàng" />';
  const GEM = '<img class="coin-img" src="assets/ui/gem.svg" alt="kim cương" />';
  const STAR = '<img class="coin-img" src="assets/ui/star.svg" alt="sao" />';

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
    not_enough_gold: 'Không đủ vàng rồi!',
    not_enough_gems: 'Không đủ kim cương!',
    not_enough_items: 'Trong kho không đủ đồ.',
    not_enough_feed: 'Hết thức ăn — ghé Cửa hàng hoặc xay ngô nhé.',
    level_too_low: 'Chưa đủ cấp, cày thêm chút nữa!',
    plot_busy: 'Ô này đang có cây rồi.',
    not_ready: 'Chưa xong mà, từ từ đã!',
    already_ready: 'Cây chín rồi, khỏi tưới.',
    already_watered: 'Ô này tưới rồi.',
    already_poached: 'Ô này hái ké rồi — chủ chậm thu thêm 1 giờ sẽ mở lượt mới 😏',
    poach_limit: 'Hôm nay hái ké đủ rồi, mai lại nhé!',
    already_claimed: 'Nhận rồi mà!',
    not_enough_quests: 'Xong 3 nhiệm vụ đã rồi mở rương.',
    no_farm: 'Người này chưa mở nông trại.',
    max_plots: 'Đất mở hết cỡ rồi!',
    own_farm: 'Ruộng nhà mình mà!',
    no_empty_plot: 'Không còn ô trống.',
    nothing_ready: 'Chưa có gì sẵn sàng cả.',
    coop_full: 'Chuồng gà đầy rồi.',
    no_hungry_animal: 'Gà nào cũng no cả rồi.',
    mill_busy: 'Cối xay đang chạy.',
    mill_empty: 'Cối xay đang trống.',
    not_growing: 'Ô này không có cây đang lớn.',
    not_processing: 'Máy không chạy.',
    no_order: 'Đơn này không còn.',
    not_enough_stars: 'Chưa đủ sao.',
    no_milestone: 'Hết mốc để nhận rồi!',
    nothing_to_water: 'Không có ô nào cần tưới.',
    not_enough_progress: 'Chưa đạt mốc này, cày thêm nhé!',
    not_enough_energy: 'Hết năng lượng — nghỉ tay chút hoặc mua thêm bằng kim cương.',
    energy_full: 'Năng lượng còn đầy mà!',
    critter_gone: 'Nó chạy mất rồi 😅 — canh lần sau nhé!',
    no_skill_points: 'Chưa đủ điểm kỹ năng — lên cấp để nhận thêm!',
    already_learned: 'Học rồi mà!',
    respec_cooldown: 'Mới hoàn trả gần đây — 7 ngày mới được làm lại.',
    nothing_to_poach: 'Không có gì để cuỗm cả 😅',
    poach_cooldown: 'Nhà này vừa bị cuỗm rồi — mỗi giờ chỉ mất 1 thôi 😅',
    max_level: 'Đã nâng tối đa rồi!',
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
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm ? `${h}g${rm}p` : `${h} giờ`;
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

  function floatGain(x, y, html, xpHtml) {
    let layer = document.querySelector('.toast-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'toast-layer';
      document.body.appendChild(layer);
    }
    const el = document.createElement('div');
    el.className = 'float-gain';
    el.style.left = `${x - 20}px`;
    el.style.top = `${y - 20}px`;
    el.innerHTML = html;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1300);
    if (xpHtml) {
      const xe = document.createElement('div');
      xe.className = 'float-gain float-gain--xp';
      xe.style.left = `${x + 14}px`;
      xe.style.top = `${y + 4}px`;
      xe.innerHTML = xpHtml;
      layer.appendChild(xe);
      setTimeout(() => xe.remove(), 1300);
    }
  }

  function fold(s) {
    return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }

  function updateMe(r) {
    if (!r) return;
    if (r.me) {
      const prev = DATA.me.level;
      DATA.me = r.me;
      if (r.me.level > prev) toast(`🎉 Lên cấp ${r.me.level}!`);
    }
    if (r.farm && VISIT) VISIT = { ownerId: VISIT.ownerId, farm: r.farm, myActs: r.myActs };
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

  // ---------- màn chờ ----------
  function renderGate() {
    app.innerHTML = `
      <div class="gate">
        <div style="font-size:3.5rem">🌾🐔</div>
        <h1>Ăn trộm dzui dzẻ 😋</h1>
        <p>Đăng nhập Chat trước rồi quay lại làm nông dân nhé!</p>
        <a href="/">Mở Chat</a>
      </div>`;
  }
  function renderWaking() {
    app.innerHTML = `
      <div class="gate">
        <div style="font-size:3.5rem">🌱☀️</div>
        <h1>Trại trộm đang thức dậy…</h1>
        <p>Gà đang gáy, đợi vài giây nha!</p>
      </div>`;
  }

  // ---------- data helpers ----------
  const me = () => DATA.me;
  const crops = () => DATA.config.crops;
  const goods = () => DATA.config.goods;
  const trees = () => DATA.config.trees;
  const itemInfo = (id) => crops()[id] || goods()[id] || trees()[id];

  // ---------- render ----------
  function render() {
    if (!DATA) return;
    const searchWasFocused = document.activeElement?.classList?.contains('family-search');
    const m = me();
    const visiting = VISIT && VISIT.ownerId !== m.id ? VISIT : null;
    const xpPct = Math.min(100, Math.round((m.levelInto / m.levelNeed) * 100));

    const meFam = DATA.family.find((u) => u.me) || {};
    const hudAvatar = meFam.avatar_at
      ? `<img src="/farm/api/avatar/${m.id}?v=${meFam.avatar_at}" alt="" onerror="this.remove()" />`
      : esc((m.name || '?').charAt(0).toUpperCase());

    const questsReady = m.daily.done >= m.daily.required && !m.daily.chestClaimed;
    const ordersReady = m.orders.some((o) => canDeliver(o));
    const starReady = m.starNext && m.stars >= m.starNext.stars;
    const festReady = m.festival.milestones.some((ms) => !ms.claimed && ms.progress >= ms.target);

    app.innerHTML = `
      <div class="stage">
        <header class="top-hud">
          <div class="hud-player">
            <span class="hud-avatar">${hudAvatar}</span>
            <span class="hud-info">
              <span class="hud-name">${esc(m.name)}</span>
              <span class="hud-level">
                <span class="hud-lv">Lv ${m.level}</span>
                <i class="hud-xp"><u style="width:${xpPct}%"></u></i>
                <span class="hud-xpnum">${m.levelInto.toLocaleString('vi')}/${m.levelNeed.toLocaleString('vi')}</span>
              </span>
            </span>
          </div>
          <div class="hud-right">
            <button class="coin-pill" data-sheet="inventory" title="Vàng — mở kho để bán đồ">${COIN}<b>${m.gold.toLocaleString('vi')}</b><span class="pill-plus">＋</span></button>
            <button class="coin-pill coin-pill--gem" data-sheet="stars" title="Kim cương — nhận từ mốc sao và rương">${GEM}<b>${m.gems.toLocaleString('vi')}</b><span class="pill-plus">＋</span></button>
            <button class="coin-pill coin-pill--energy" data-sheet="fishing" title="Năng lượng — mở Hồ câu cá">⚡<b>${m.energy.current}</b><span class="pill-plus">＋</span></button>
            <button class="coin-pill coin-pill--star" data-sheet="stars" title="Sao Nông Trại">${STAR}<b>${m.stars.toLocaleString('vi')}</b>${starReady ? '<i class="dot"></i>' : ''}</button>
            <span class="hud-rounds">
              <button class="hud-round" data-sheet="events" title="Bản tin làng">✉️</button>
              <button class="hud-round" id="btn-lb" title="Bảng xếp hạng">🏆</button>
            </span>
          </div>
        </header>

        <div class="side side-left">
          <button class="side-btn" data-sheet="quests">🧾${questsReady ? '<i class="dot"></i>' : ''}<span>Nhiệm vụ</span></button>
          <button class="side-btn" data-sheet="shop">🏪<span>Cửa hàng</span></button>
          <button class="side-btn" data-sheet="inventory">🎒<span>Kho đồ</span></button>
        </div>
        <div class="side side-right">
          <button class="side-btn side-btn--gold" id="btn-harvestall"><img src="assets/art/basket.png" alt="" />${m.plots.some((p) => p.crop && p.ready) ? '<i class="dot"></i>' : ''}<span>Thu hoạch</span></button>
          ${m.level >= DATA.config.orderUnlockLevel ? `<button class="side-btn" data-sheet="orders">🚚${ordersReady ? '<i class="dot"></i>' : ''}<span>Đơn hàng</span></button>` : ''}
          <button class="side-btn" data-sheet="festival">🎪${festReady ? '<i class="dot"></i>' : ''}<span>Sự kiện</span></button>
          ${m.skills.unlocked ? `<button class="side-btn" data-sheet="skills">🎓${m.skills.points > 0 ? '<i class="dot"></i>' : ''}<span>Kỹ năng</span></button>` : ''}
          ${m.level >= DATA.config.animals.vit.level ? `<button class="side-btn" data-sheet="barns">🐾${m.animals.some((x) => x.ready) ? '<i class="dot"></i>' : ''}<span>Chuồng</span></button>` : ''}
        </div>

        <div class="stage-center">
          <div class="scene-banner">
            <div class="sb-hills"></div>
            <img class="sb sb-house" src="assets/pack/farm_house.png" alt="" />
            <img class="sb sb-tree1" src="assets/pack/tree_01.png" alt="" />
            <img class="sb sb-barn" src="assets/pack/red_barn.png" alt="" />
            <img class="sb sb-green" src="assets/pack/greenhouse.png" alt="" />
            <img class="sb sb-tree2" src="assets/pack/tree_02.png" alt="" />
            <span class="sb sb-pen" aria-hidden="true"></span>
            ${m.level >= DATA.config.animals.cuu.level ? `
              <button class="sb sb-btn sb-sheep" data-barn="cuu" title="Chuồng cừu">
                <img src="assets/pack/sheep_adult.png" alt="Chuồng cừu" />
                ${m.animals.some((x) => x.kind === 'cuu' && x.ready) ? '<i class="dot"></i>' : ''}
                <span class="sb-tag">Chuồng cừu</span>
              </button>`
            : `<img class="sb sb-sheep sb--locked" src="assets/pack/sheep_adult.png" alt="" title="Chuồng cừu — cần Lv ${DATA.config.animals.cuu.level}" />`}
            ${m.level >= DATA.config.animals.bo.level ? `
              <button class="sb sb-btn sb-cowbarn" data-barn="bo" title="Chuồng bò">
                <img src="assets/art/cow.png" alt="Chuồng bò" />
                ${m.animals.some((x) => x.kind === 'bo' && x.ready) ? '<i class="dot"></i>' : ''}
                <span class="sb-tag">Chuồng bò</span>
              </button>`
            : `<img class="sb sb-cowbarn sb--locked" src="assets/art/cow.png" alt="" title="Chuồng bò — cần Lv ${DATA.config.animals.bo.level}" />`}
            <img class="sb sb-pig" src="assets/pack/pig_adult.png" alt="" />
            <img class="sb sb-well" src="assets/pack/well.png" alt="" />
            <img class="sb sb-farmer" src="assets/pack/farmer_female_full.png" alt="" />
            <img class="sb sb-dog" src="assets/pack/pet_dogs.png" alt="" />
            ${renderSceneButtons(visiting)}
            <img class="sb sb-logo" src="assets/pack/farm_logo.png" alt="Nông Trại Vui Vẻ" />
          </div>

          <div class="family-block">
            <div class="family-search-wrap">
              <span class="family-search-icon">🔍</span>
              <input class="family-search" type="search" placeholder="Tìm người nhà…" value="${esc(familyFilter)}" />
            </div>
            <div class="family-strip">${familyStripHtml()}</div>
          </div>

          ${visiting ? `
            <div class="visit-bar">
              <span>👀 Ruộng của <b>${esc(visiting.farm.name)}</b> · Lv ${visiting.farm.level}</span>
          ${visiting.farm.loot?.animalsReady ? (Date.now() < (visiting.farm.loot.animalPoachAt || 0)
            ? `<button class="gbtn btn-mini" disabled>⏳ Chuồng (${Math.max(1, Math.ceil((visiting.farm.loot.animalPoachAt - Date.now()) / 60000))}p)</button>`
            : `<button class="gbtn gbtn--green btn-mini" id="btn-poach-animal">😋 Cuỗm chuồng (${visiting.farm.loot.animalsReady})</button>`) : ''}
          ${visiting.farm.loot?.machinesReady ? (Date.now() < (visiting.farm.loot.machinePoachAt || 0)
            ? `<button class="gbtn btn-mini" disabled>⏳ Máy (${Math.max(1, Math.ceil((visiting.farm.loot.machinePoachAt - Date.now()) / 60000))}p)</button>`
            : `<button class="gbtn gbtn--green btn-mini" id="btn-poach-machine">😋 Cuỗm máy (${visiting.farm.loot.machinesReady})</button>`) : ''}
          ${visiting.farm.loot?.emptyPlots ? `<button class="gbtn gbtn--gold btn-mini" id="btn-plant-help">🌱 Trồng giúp (${visiting.farm.loot.emptyPlots})</button>` : ''}
              <button id="btn-home" class="gbtn gbtn--gold">🏡 Về nhà</button>
            </div>` : renderToolbar()}

          <div class="field-wrap">
            <span class="field-decor decor-1">🌻</span>
            <span class="field-decor decor-2">🍄</span>
            <img class="scarecrow-img" src="assets/ui/scarecrow.svg" alt="" />
            <span class="butterfly">🦋</span>
            <div class="farm-grid" id="grid">${renderPlots(visiting)}</div>
          </div>

        </div>

        <div class="welcome-sign" aria-hidden="true">Chào mừng đến với<br /><b>Nông Trại Vui Vẻ!</b></div>
        <button class="pond-img pond-btn" data-sheet="fishing" title="Hồ câu cá"><img src="assets/pack/fish_pond.png" alt="Hồ câu cá" /></button>

        ${!visiting ? renderQuickbar() : ''}
      </div>

      ${sheet ? renderSheet() : ''}
      ${showLb ? renderLb() : ''}
    `;
    bind();
    if (searchWasFocused) {
      const input = document.querySelector('.family-search');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  }

  function canDeliver(o) {
    return Object.entries(o.items).every(([id, q]) => (me().inventory[id] || 0) >= q);
  }

  function familyStripHtml() {
    const q = fold(familyFilter.trim());
    const list = q ? DATA.family.filter((u) => u.me || fold(u.name).includes(q)) : DATA.family;
    if (list.length === 0) return '<span class="family-none">😅 Không thấy ai tên vậy</span>';
    return list.map((u) => {
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
    }).join('');
  }

  function renderToolbar() {
    const m = me();
    const empty = m.plots.filter((p) => !p.crop).length;
    const readyN = m.plots.filter((p) => p.crop && p.ready).length;
    const dryN = m.plots.filter((p) => p.crop && !p.ready && !p.watered).length;
    return `
      <div class="farm-toolbar">
        <span class="ribbon">🏡 Ruộng nhà mình</span>
        ${readyN >= 2 ? `<button class="gbtn gbtn--gold btn-mini" id="btn-harvestall-tb">🧺 Thu hết ${readyN}</button>` : ''}
        ${dryN >= 2 ? `<button class="gbtn gbtn--green btn-mini" id="btn-waterall">💧 Tưới hết ${dryN}</button>` : ''}
        ${empty >= 2 ? `<button class="gbtn gbtn--green btn-mini" id="btn-plantall">🌱 Gieo hết ${empty} ô</button>` : ''}
      </div>`;
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
      if (p.tree) {
        const t = trees()[p.crop];
        const acts = visiting ? visiting.myActs[p.idx] : null;
        const canPoach = visiting && p.ready && acts?.canPoach;
        const left = p.readyAt - now;
        return `<button class="plot plot--tree${p.ready ? ' plot--ready' : ' plot--growing'}" data-idx="${p.idx}" data-kind="${p.ready ? (mine ? 'harvest' : canPoach ? 'poach' : 'ripe') : (mine ? (p.watered ? 'plotmenu' : 'waterplot') : (!p.watered && visiting && !acts?.watered ? 'water' : 'growing'))}" data-ready="${p.readyAt}" data-total="${t.growMs}" data-cropid="${p.crop}">
          <img class="tree-sprite${p.ready ? '' : ' tree-sprite--wait'}" src="${treeArt(p.crop)}" alt="${t.name}" />${TREE_PNG.has(p.crop) ? '' : `<span class="tree-emoji">${t.emoji}</span>`}
          ${p.ready
            ? `<span class="plot-note">${mine ? (p.poached ? 'Bị hái ké 😭' : 'Hái quả!') : canPoach ? 'Hái ké!' : 'Chín rồi'}</span><span class="plot-badge">×${Math.max(1, t.yield - (p.poachedN || 0))}</span>`
            : `<span class="plot-timer">${fmtTime(left)}</span>`}
          ${p.poached && p.ready ? '<span class="plot-act">😋</span>' : ''}
        </button>`;
      }
      const c = crops()[p.crop];
      if (p.ready) {
        const acts = visiting ? visiting.myActs[p.idx] : null;
        const canPoach = visiting && acts?.canPoach;
        return `<button class="plot plot--ready" data-idx="${p.idx}" data-kind="${mine ? 'harvest' : canPoach ? 'poach' : 'ripe'}">
          <img class="crop-sprite crop-sprite--ready" src="${cropSprite(p.crop, 3)}" alt="${c.name}" />
          <span class="plot-note">${mine ? (p.poached ? 'Bị hái ké 😭' : 'Thu hoạch!') : canPoach ? 'Hái ké!' : 'Chín rồi'}</span>
          ${p.poached ? '<span class="plot-badge">😋</span>' : p.watered ? '<span class="plot-badge plot-badge--fresh">💧</span>' : ''}
          ${!mine && canPoach ? '<span class="plot-act">😋</span>' : ''}
        </button>`;
      }
      const total = c.growMs;
      const left = p.readyAt - now;
      const pct = Math.min(100, Math.max(3, Math.round(((total - left) / total) * 100)));
      const acts = visiting ? visiting.myActs[p.idx] : null;
      const canWater = !p.watered && (!visiting || !acts?.watered);
      return `<button class="plot plot--growing" data-idx="${p.idx}" data-kind="${mine ? (p.watered ? 'plotmenu' : 'waterplot') : canWater ? 'water' : 'growing'}" data-ready="${p.readyAt}" data-total="${total}" data-cropid="${p.crop}">
        <img class="crop-sprite" src="${cropSprite(p.crop, pct < 45 ? 1 : 2)}" alt="${c.name}" />
        <span class="plot-timer">${fmtTime(left)}</span>
        <div class="plot-progress"><i style="width:${pct}%"></i></div>
        ${p.watered ? '<span class="plot-badge plot-badge--fresh">💧</span>' : canWater ? '<span class="plot-act">💧</span>' : ''}
      </button>`;
    });

    if (mine && farm.expandNext) {
      const e = farm.expandNext;
      const can = me().level >= e.level && me().gold >= e.gold;
      cells.push(`<button class="plot plot--locked${can ? ' plot--buyable' : ''}" data-kind="expand">
        <span class="plot-main">🔒</span>
        <span class="plot-note">+4 ô · ${e.gold.toLocaleString('vi')} ${COIN}</span>
        <span class="plot-note">Cần Lv ${e.level}</span>
      </button>`);
    }
    return cells.join('');
  }

  // Công trình trong cảnh: chuồng gà, cối xay, sạp chợ — bấm mở sheet tương ứng.
  function renderSceneButtons(visiting) {
    const m = me();
    const coopUnlocked = m.level >= DATA.config.chicken.level;
    const millUnlocked = m.level >= DATA.config.mill.level;
    const eggReady = m.animals.some((a) => a.kind === 'ga' && a.ready);
    const hungry = m.animals.some((a) => a.kind === 'ga' && a.ready_at == null);
    const millDone = m.mill && m.mill.ready;
    if (visiting) {
      return `
        <img class="sb sb-coop" src="assets/pack/tiny_house.png" alt="" />
        <img class="sb sb-hen2" src="assets/pack/chicken_brown.png" alt="" />
        <img class="sb sb-mill" src="assets/pack/windmill.png" alt="" />
        <img class="sb sb-shop" src="assets/pack/market_shop.png" alt="" />`;
    }
    return `
      ${coopUnlocked ? `
        <button class="sb sb-btn sb-coop" data-sheet="coop" title="Chuồng gà">
          <img src="assets/pack/tiny_house.png" alt="Chuồng gà" />
          ${eggReady ? '<i class="dot"></i>' : ''}
          <span class="sb-tag">${eggReady ? '🥚 Trứng!' : hungry ? 'Gà đói' : 'Chuồng gà'}</span>
        </button>
        <img class="sb sb-hen2" src="assets/pack/chicken_brown.png" alt="" />`
      : `<img class="sb sb-coop sb--locked" src="assets/pack/tiny_house.png" alt="" title="Chuồng gà — cần Lv ${DATA.config.chicken.level}" />`}
      ${millUnlocked ? `
        <button class="sb sb-btn sb-mill" data-sheet="mill" title="Cối xay">
          <img src="assets/pack/windmill.png" alt="Cối xay" />
          ${millDone ? '<i class="dot"></i>' : ''}
          <span class="sb-tag">${millDone ? '✅ Xong!' : m.mill ? 'Đang xay…' : 'Cối xay'}</span>
        </button>`
      : `<img class="sb sb-mill sb--locked" src="assets/pack/windmill.png" alt="" title="Cối xay — cần Lv ${DATA.config.mill.level}" />`}
      <button class="sb sb-btn sb-shop" data-sheet="shop" title="Cửa hàng">
        <img src="assets/pack/market_shop.png" alt="Cửa hàng" />
        <span class="sb-tag">Cửa hàng</span>
      </button>`;
  }

  function renderQuickbar() {
    const inv = Object.entries(me().inventory).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (inv.length === 0) return '';
    return `
      <button class="quickbar" data-sheet="inventory">
        ${inv.map(([id, q]) => `<span class="qb-item">${itemImg(id)}<b>${q}</b></span>`).join('')}
        <span class="qb-more">🎒</span>
      </button>`;
  }

  // ---------- sheets ----------
  function sheetShell(title, body, extraClass = '') {
    return `
      <div class="sheet-backdrop" data-close="1"></div>
      <div class="sheet ${extraClass}">
        <h3>${title}</h3>
        ${body}
      </div>`;
  }

  function renderSheet() {
    const m = me();
    const t = sheet.type;

    if (t === 'seed') {
      const rows = Object.values(crops()).map((c) => {
        const lockLevel = m.level < c.level;
        const canAfford = m.gold >= c.seed;
        const count = sheet.all ? Math.min(m.plots.filter((p) => !p.crop).length, Math.floor(m.gold / c.seed)) : 1;
        const locked = lockLevel || !canAfford;
        return `<button class="seed-row${locked ? ' seed-row--locked' : ''}" data-crop="${locked ? '' : c.id}">
          <img class="seed-sprite" src="${cropSprite(c.id, 3)}" alt="" />
          <span class="seed-info">
            <span class="seed-name">${c.name}</span>
            <div class="seed-meta">⏱ ${fmtDuration(c.growMs)} · bán ${c.sell} ${COIN} · +${c.expHarvest} EXP</div>
          </span>
          ${lockLevel ? `<span class="seed-lock">Cần Lv ${c.level}</span>`
            : `<span class="seed-cost">${sheet.all ? `${count} ô · ${(c.seed * count).toLocaleString('vi')}` : c.seed} ${COIN}</span>`}
        </button>`;
      }).join('');
      const treeRows = sheet.all ? '' : Object.values(trees()).map((t) => {
        const lockLevel = m.level < t.level;
        const locked = lockLevel || m.gold < t.price;
        return `<button class="seed-row${locked ? ' seed-row--locked' : ''}" data-tree="${locked ? '' : t.id}">
          <img class="seed-sprite" src="${treeArt(t.id)}" alt="" />
          <span class="seed-info">
            <span class="seed-name">${t.name} ${t.emoji}</span>
            <div class="seed-meta">🌳 trồng 1 lần · ${t.yield} quả mỗi ${fmtDuration(t.growMs)} · bán ${t.sell.toLocaleString('vi')} ${COIN}/quả · +${t.exp} EXP</div>
          </span>
          ${lockLevel ? `<span class="seed-lock">Cần Lv ${t.level}</span>` : `<span class="seed-cost">${t.price.toLocaleString('vi')} ${COIN}</span>`}
        </button>`;
      }).join('');
      return sheetShell(
        sheet.all ? `🧺 Gieo hết ô trống <span class="sheet-coins">${COIN} ${m.gold.toLocaleString('vi')}</span>`
          : `🌱 Chọn hạt giống <span class="sheet-coins">${COIN} ${m.gold.toLocaleString('vi')}</span>`,
        rows + (treeRows ? `<p class="sheet-note" style="margin-top:0.5rem">🌳 Cây ăn quả — chiếm ô lâu dài, tự ra quả lại sau mỗi lần hái:</p>${treeRows}` : ''),
      );
    }

    if (t === 'plotmenu') {
      const p = m.plots[sheet.idx];
      if (!p || !p.crop || p.ready) return '';
      const info = p.tree ? trees()[p.crop] : crops()[p.crop];
      const left = p.readyAt - Date.now();
      const cost = Math.max(1, Math.ceil(left / (5 * 60_000)));
      const icon = p.tree ? `<img class="seed-sprite" src="${treeArt(p.crop)}" alt="" />` : `<img class="seed-sprite" src="${cropSprite(p.crop, 3)}" alt="" />`;
      return sheetShell(
        `${icon} ${info.name}`,
        `<p class="sheet-note">Còn <b>${fmtTime(left)}</b> nữa là ${p.tree ? 'ra quả' : 'chín'}.${p.watered ? ' Đã tưới 💧 (Tươi tốt).' : ''}</p>
         <div class="sheet-actions">
           ${p.watered ? '' : `<button class="btn gbtn gbtn--green" id="btn-water-own">💧 Tưới (+EXP khi thu)</button>`}
           <button class="btn gbtn gbtn--gold" id="btn-speedup-plot">${GEM} ${cost} · ${p.tree ? 'Ra quả ngay' : 'Chín ngay'}</button>
           ${p.tree ? `<button class="btn btn-ghost" id="btn-remove-tree">🪓 Nhổ cây</button>` : ''}
         </div>`,
      );
    }

    if (t === 'inventory') {
      const entries = Object.entries(m.inventory);
      const rows = entries.length === 0
        ? '<p class="sheet-note">Kho trống — thu hoạch gì đó đi!</p>'
        : entries.map(([id, q]) => {
            const info = itemInfo(id);
            return `<div class="inv-row" data-item="${id}">
              ${itemImg(id)}
              <span class="seed-info"><span class="seed-name">${info?.name || id}</span>
                <div class="seed-meta">x${q}${info?.sell ? ` · ${info.sell} ${COIN}/cái` : ' · không bán được'}</div></span>
              ${info?.sell ? `
                <span class="qty-ctl">
                  <button type="button" data-qstep="-1">−</button>
                  <input class="qty-input" type="number" inputmode="numeric" min="1" max="${q}" value="1" />
                  <button type="button" data-qstep="1">＋</button>
                </span>
                <button class="gbtn gbtn--gold btn-mini" data-sell="${id}">Bán 1</button>
                <button class="gbtn gbtn--green btn-mini" data-sell="${id}" data-qty="${q}">Hết</button>` : ''}
            </div>`;
          }).join('');
      return sheetShell(`🎒 Kho đồ <span class="sheet-coins">${COIN} ${m.gold.toLocaleString('vi')}</span>`, rows);
    }

    if (t === 'shop') {
      const feed = goods().thucan;
      const seedRows = Object.values(crops()).filter((c) => m.level >= c.level).slice(-4).reverse()
        .map((c) => `<div class="seed-meta">· ${c.name}: hạt ${c.seed} ${COIN}, bán ${c.sell} ${COIN}</div>`).join('');
      return sheetShell(
        `🏪 Cửa hàng <span class="sheet-coins">${COIN} ${m.gold.toLocaleString('vi')}</span>`,
        `<div class="inv-row">
           <img src="assets/ui/feed.svg" alt="" />
           <span class="seed-info"><span class="seed-name">Thức ăn gia súc</span>
             <div class="seed-meta">${feed.buy} ${COIN}/túi · gà ăn 1 túi cho 1 trứng</div></span>
           <button class="gbtn gbtn--green btn-mini" data-buy="thucan" data-qty="1">Mua 1</button>
           <button class="gbtn gbtn--gold btn-mini" data-buy="thucan" data-qty="10">Mua 10</button>
         </div>
         ${m.level >= DATA.config.chicken.level ? `
         <div class="inv-row">
           <img src="assets/art/chicken.png" alt="" />
           <span class="seed-info"><span class="seed-name">Gà mái</span>
             <div class="seed-meta">${DATA.config.chicken.price} ${COIN} · đẻ trứng ${fmtDuration(DATA.config.chicken.produceMs)}/quả · chuồng ${m.animals.length}/${m.coop.capacity}</div></span>
           <button class="gbtn gbtn--green btn-mini" data-buy-animal="ga" ${m.animals.filter((x) => x.kind === 'ga').length >= m.barns.ga.capacity ? 'disabled' : ''}>Mua gà</button>
         </div>` : ''}
         ${Object.keys(DATA.config.animals).filter((k) => k !== 'ga').sort((x, y) => DATA.config.animals[x].level - DATA.config.animals[y].level).map((k) => {
           const a = DATA.config.animals[k];
           if (m.level < a.level) return `<div class="inv-row">${barnArtImg(k)}<span class="seed-info"><span class="seed-name">${a.name}</span><div class="seed-meta">🔒 Mở ở cấp ${a.level}</div></span></div>`;
           const herd = m.animals.filter((x) => x.kind === k).length;
           const info = itemInfo(a.product);
           return `<div class="inv-row">
             ${barnArtImg(k)}
             <span class="seed-info"><span class="seed-name">${a.name}</span>
               <div class="seed-meta">${a.price.toLocaleString('vi')} ${COIN} · ${info.name} ${info.emoji} mỗi ${fmtDuration(a.produceMs)} · chuồng ${herd}/${m.barns[k].capacity}</div></span>
             <button class="gbtn gbtn--green btn-mini" data-buy-animal="${k}" ${herd >= m.barns[k].capacity ? 'disabled' : ''}>Mua</button>
           </div>`;
         }).join('')}
         <p class="sheet-note" style="margin-top:0.6rem">💡 Hạt giống mua ngay lúc gieo (chạm ô đất trống). Giá mới nhất:</p>
         ${seedRows}`,
      );
    }

    if (t === 'quests') {
      const d = m.daily;
      const rows = d.quests.map((q) => {
        const done = q.progress >= q.target;
        return `<div class="quest-row${done ? ' quest-row--done' : ''}">
          <span class="q-emoji">${q.emoji}</span>
          <span class="seed-info">
            <span class="seed-name">${q.name}</span>
            <div class="q-track"><i style="width:${Math.round((q.progress / q.target) * 100)}%"></i></div>
          </span>
          <span class="q-right">${done ? '✅' : `${q.progress}/${q.target}`}<div class="seed-meta">${q.gold} ${COIN} +${q.exp}EXP${q.stars ? ` ${q.stars}${STAR}` : ''}</div></span>
        </div>`;
      }).join('');
      const canChest = d.done >= d.required && !d.chestClaimed;
      return sheetShell(
        `🧾 Nhiệm vụ ngày <span class="sheet-coins">${d.done}/${d.required} ✅</span>`,
        `${rows}
         <button class="btn gbtn ${canChest ? 'gbtn--gold' : 'gbtn--green'}" id="btn-chest" ${canChest ? '' : 'disabled'} style="width:100%;margin-top:0.5rem">
           ${d.chestClaimed ? 'Mai lại có rương mới 🎁' : canChest ? '🎁 Mở rương ngày!' : `🎁 Xong ${d.required} nhiệm vụ để mở rương`}
         </button>`,
      );
    }

    if (t === 'orders') {
      const rows = m.orders.length === 0
        ? '<p class="sheet-note">Đơn mới đang trên đường tới…</p>'
        : m.orders.map((o) => {
            const ok = canDeliver(o);
            const items = Object.entries(o.items).map(([id, q]) => {
              const have = m.inventory[id] || 0;
              return `<span class="o-item${have >= q ? ' o-item--ok' : ''}">${itemImg(id)}${Math.min(have, q)}/${q}</span>`;
            }).join('');
            return `<div class="order-card">
              <div class="o-items">${items}</div>
              <div class="o-reward">${o.gold.toLocaleString('vi')} ${COIN} · +${o.exp}EXP · ${o.stars}${STAR}</div>
              <div class="sheet-actions">
                <button class="btn-mini gbtn gbtn--green" data-deliver="${o.id}" ${ok ? '' : 'disabled'}>🚚 Giao</button>
                <button class="btn-mini btn-ghost" data-discard="${o.id}">Bỏ</button>
              </div>
            </div>`;
          }).join('');
      return sheetShell(`🚚 Đơn hàng <span class="sheet-coins">${COIN} ${m.gold.toLocaleString('vi')}</span>`, rows);
    }

    if (t === 'barns') {
      const rows = Object.values(DATA.config.animals).sort((x, y) => x.level - y.level).map((a) => {
        const herd = m.animals.filter((x) => x.kind === a.id);
        const readyN = herd.filter((x) => x.ready).length;
        const locked = m.level < a.level;
        const info = itemInfo(a.product);
        return `<div class="inv-row">${barnArtImg(a.id)}
          <span class="seed-info"><span class="seed-name">${a.name}</span>
            <div class="seed-meta">${locked ? `🔒 Mở ở cấp ${a.level}` : `${herd.length}/${m.barns[a.id].capacity} con · ${info.name} ${info.emoji}${readyN ? ` · <b>${readyN} sẵn sàng</b>` : ''}`}</div></span>
          ${locked ? '' : `<button class="gbtn gbtn--green btn-mini" data-barn="${a.id}">Mở</button>`}
        </div>`;
      }).join('');
      return sheetShell('🐾 Chuồng trại', rows);
    }

    if (t === 'coop' || t === 'barn') {
      const kind = t === 'coop' ? 'ga' : sheet.kind;
      const a = DATA.config.animals[kind];
      const barn = m.barns[kind];
      const feedQty = m.inventory.thucan || 0;
      const herd = m.animals.filter((x) => x.kind === kind);
      const readyN = herd.filter((x) => x.ready).length;
      const hungryN = herd.filter((x) => x.ready_at == null).length;
      const productInfo = itemInfo(a.product);
      if (m.level < a.level) {
        return sheetShell(`${a.emoji} Chuồng ${a.name}`, `<p class="sheet-note">🔒 Mở ở <b>cấp ${a.level}</b> — cày thêm chút nữa nhé!</p>`);
      }
      const pens = herd.map((x) => `
        <span class="hen${x.ready ? ' hen--ready' : ''}">
          ${barnArtImg(kind)}
          <small>${x.ready ? `${productInfo.emoji}!` : x.ready_at == null ? 'đói' : fmtTime(x.ready_at - Date.now())}</small>
        </span>`).join('');
      return sheetShell(
        `${a.emoji} Chuồng ${a.name} cấp ${barn.level} · ${herd.length}/${barn.capacity} <span class="sheet-coins"><img class="coin-img" src="assets/art/feed.png" alt=""/> ${feedQty}</span>`,
        `<p class="sheet-note">🤖 Chuồng tự vận hành: tới giờ là sản phẩm TỰ vào kho và tự ăn tiếp — chỉ cần trữ đủ thức ăn. Mỗi ${a.name.toLowerCase()} ăn ${a.feedQty} 🌰 → ${productInfo.name} ${productInfo.emoji} sau ${fmtDuration(a.produceMs)} (bán ${productInfo.sell} ${COIN}, +${a.expCollect} EXP).</p>
         ${herd.length === 0 ? `<p class="sheet-note">Chuồng trống — mua ${a.name.toLowerCase()} đầu tiên đi!</p>` : `<div class="hen-row">${pens}</div>`}
         <div class="sheet-actions">
           ${hungryN ? `<button class="btn gbtn gbtn--green" data-feed-kind="${kind}" ${feedQty >= a.feedQty ? '' : 'disabled'}>🌰 Cho ăn (${hungryN} con đói)</button>` : ''}
           ${readyN ? `<button class="btn gbtn gbtn--gold" data-collect-kind="${kind}">${productInfo.emoji} Thu ${readyN}</button>` : ''}
           ${herd.length < barn.capacity ? `<button class="btn btn-ghost" data-buy-animal="${kind}">＋ Mua ${a.name} (${a.price.toLocaleString('vi')} vàng)</button>` : ''}
           ${barn.next ? `<button class="btn gbtn gbtn--gold" data-upgrade-barn="${kind}" ${m.gold >= barn.next.gold ? '' : 'disabled'}>⬆️ Nâng chuồng cấp ${barn.next.level} (${barn.next.capacity} con) — ${barn.next.gold.toLocaleString('vi')} ${COIN}</button>` : ''}
         </div>
         ${feedQty < a.feedQty && hungryN ? '<p class="sheet-note">Hết thức ăn: mua ở Cửa hàng (12 vàng/túi) hoặc xay 2 ngô ở Cối xay (Lv 10).</p>' : ''}`,
      );
    }

    if (t === 'mill') {
      const blocks = Object.values(DATA.config.machines).map((mc) => {
        if (m.level < mc.level) {
          return `<div class="inv-row"><span class="emoji-ic">${mc.emoji}</span>
            <span class="seed-info"><span class="seed-name">${mc.name}</span><div class="seed-meta">🔒 Mở ở cấp ${mc.level}</div></span></div>`;
        }
        const st = m.machines[mc.id];
        let body = '';
        if (st) {
          const r = mc.recipes[st.recipe];
          const left = st.readyAt - Date.now();
          const qNote = st.queue > 1 ? ` (hàng đợi ${st.queue} mẻ)` : '';
          body = st.ready
            ? `<button class="btn gbtn gbtn--gold" data-machine-collect="${mc.id}" style="width:100%">✅ Lấy ${r.name} ${r.emoji}${qNote}!</button>`
            : `<p class="sheet-note">${mc.emoji} Đang làm <b>${r.name}</b>${qNote} — mẻ kế còn ${fmtTime(left)}.
                 <button class="btn-mini gbtn gbtn--gold" data-machine-speed="${mc.id}">${GEM} ${Math.max(1, Math.ceil(left / 300000))} · Xong ngay</button></p>`;
        } else {
          body = Object.values(mc.recipes).map((r) => {
            const haveAll = Object.entries(r.in).every(([id, q]) => (m.inventory[id] || 0) >= q);
            const ins = Object.entries(r.in).map(([id, q]) => `${q} ${itemInfo(id)?.name || id}`).join(' + ');
            const outQty = Object.values(r.out)[0];
            const outInfo = itemInfo(Object.keys(r.out)[0]);
            const maxBatches = Math.min(10, ...Object.entries(r.in).map(([iid, q]) => Math.floor((m.inventory[iid] || 0) / q)));
            return `<div class="seed-row${haveAll ? '' : ' seed-row--locked'}" style="cursor:default">
              ${itemImg(Object.keys(r.out)[0], 'seed-sprite')}
              <span class="seed-info"><span class="seed-name">${r.name}</span>
                <div class="seed-meta">${ins} → ${outQty} ${outInfo?.name || ''} · ⏱ ${fmtDuration(r.ms)} · bán ${(outInfo?.sell || 0).toLocaleString('vi')} ${COIN} · +${r.exp}EXP</div></span>
              ${haveAll ? `<button class="gbtn gbtn--green btn-mini" data-machine-run="${mc.id}" data-recipe="${r.id}" data-count="1">Nấu 1</button>
                ${maxBatches > 1 ? `<button class="gbtn gbtn--gold btn-mini" data-machine-run="${mc.id}" data-recipe="${r.id}" data-count="${maxBatches}">Hết (${maxBatches})</button>` : ''}`
                : '<span class="seed-lock">Thiếu đồ</span>'}
            </div>`;
          }).join('');
        }
        return `<div class="machine-block"><h4>${mc.emoji} ${mc.name}</h4>${body}</div>`;
      }).join('');
      return sheetShell('🏭 Khu chế biến', `<div class="sheet-scroll"><div class="machine-grid">${blocks}</div></div>`, 'sheet--feed sheet--factory');
    }

    if (t === 'expand') {
      const e = m.expandNext;
      if (!e) return '';
      const can = m.level >= e.level && m.gold >= e.gold;
      return sheetShell('🧱 Mở rộng nông trại', `
        <p class="sheet-note">Thêm <b>4 ô đất</b>: ${e.gold.toLocaleString('vi')} ${COIN}, cần <b>Lv ${e.level}</b>.</p>
        <div class="sheet-actions">
          <button class="btn btn-ghost" data-close="1">Thôi</button>
          <button class="btn gbtn gbtn--green" id="btn-expand" ${can ? '' : 'disabled'}>${can ? 'Mở luôn!' : m.level < e.level ? `Cần Lv ${e.level}` : 'Thiếu vàng'}</button>
        </div>`);
    }

    if (t === 'events') {
      const rows = DATA.events.length
        ? `<div class="sheet-scroll"><ul class="event-list">${DATA.events.map((e) => `<li><time>${timeAgo(e.at)}</time><span>${esc(e.text)}</span></li>`).join('')}</ul></div>`
        : '<p class="sheet-note">Chưa có gì — gieo hạt đầu tiên đi!</p>';
      return sheetShell('📰 Bản tin làng', rows, 'sheet--feed');
    }

    if (t === 'fishing') {
      const cfg = DATA.config.fishing;
      const en = m.energy;
      const locked = m.level < cfg.level;
      const canFish = !locked && en.current >= cfg.energyCost;
      const lootRows = cfg.loot.map((l) => {
        const info = itemInfo(l.id);
        return `<div class="inv-row">
          ${itemImg(l.id)}
          <span class="seed-info"><span class="seed-name">${info.name}</span>
            <div class="seed-meta">tỷ lệ ${l.pct}% · bán ${info.sell} ${COIN} · +${info.expCatch} EXP</div></span>
          <span class="seed-cost">${(m.inventory[l.id] || 0)} con</span>
        </div>`;
      }).join('');
      return sheetShell(
        `🎣 Hồ câu cá cấp ${m.pond.level} <span class="sheet-coins">⚡ ${en.current}/${en.max}${en.current > en.max ? '+' : ''}</span>`,
        `${locked ? `<p class="sheet-note">🔒 Hồ câu mở ở <b>cấp ${cfg.level}</b> — chăm ruộng thêm chút nữa nhé!</p>` : `
          <p class="sheet-note">Mỗi lượt câu tốn <b>${cfg.energyCost}⚡</b> · năng lượng tự hồi 1⚡ mỗi ${DATA.config.fast ? '3 giây' : '3 phút'}${en.nextRegenMs ? ` (tiếp theo sau ${fmtTime(en.nextRegenMs)})` : ''}.</p>
          <button class="btn gbtn gbtn--green" id="btn-fish" ${canFish ? '' : 'disabled'} style="width:100%;margin-bottom:0.55rem">🎣 Quăng cần (${cfg.energyCost}⚡${m.pond.fishPerCast > 1 ? ` · ${m.pond.fishPerCast} cá` : ''})</button>`}
        ${lootRows}
        <button class="btn btn-ghost" id="btn-buy-energy" style="width:100%;margin-top:0.3rem">⚡ Mua ${DATA.config.energy.buyAmount} năng lượng — ${DATA.config.energy.buyGems} ${GEM}</button>
        ${!locked && m.pond.next ? `<button class="btn gbtn gbtn--gold" id="btn-upgrade-pond" ${m.gold >= m.pond.next.gold ? '' : 'disabled'} style="width:100%;margin-top:0.3rem">⬆️ Nâng ao cấp ${m.pond.next.level} (${m.pond.next.fishPerCast} cá/lượt) — ${m.pond.next.gold.toLocaleString('vi')} ${COIN}</button>` : ''}`,
      );
    }

    if (t === 'skills') {
      const sk = m.skills;
      const tree = DATA.config.skillTree;
      const branches = tree.branches.map((b) => {
        const nodes = b.nodes.map((n) => {
          const learned = sk.learned.includes(n.id);
          const can = !learned && sk.points >= n.cost;
          return `<div class="quest-row${learned ? ' quest-row--done' : ''}">
            <span class="q-emoji">${learned ? '✅' : '🎓'}</span>
            <span class="seed-info"><span class="seed-name">${n.name}</span><div class="seed-meta">${n.desc}</div></span>
            <span class="q-right">${learned ? 'Đã học' : can
              ? `<button class="gbtn gbtn--gold btn-mini" data-skill-learn="${n.id}">Học (${n.cost}đ)</button>`
              : `${n.cost} điểm`}</span>
          </div>`;
        }).join('');
        return `<div class="machine-block"><h4>${b.emoji} ${b.name}</h4>${nodes}</div>`;
      }).join('');
      const canRespec = Date.now() >= sk.nextRespecAt;
      return sheetShell(
        `🎓 Kỹ năng <span class="sheet-coins">✨ ${sk.points} điểm</span>`,
        `<p class="sheet-note">Mỗi cấp sau cấp ${tree.unlockLevel} tặng 1 điểm kỹ năng.</p>${branches}
         ${sk.learned.length ? `<button class="btn btn-ghost" id="btn-skill-respec" ${canRespec && m.gems >= tree.respecGems ? '' : 'disabled'} style="width:100%">♻️ Hoàn trả toàn bộ điểm — ${tree.respecGems} ${GEM}${canRespec ? '' : ' (chờ đủ 7 ngày)'}</button>` : ''}`,
      );
    }

    if (t === 'festival') {
      const fest = m.festival;
      const rows = fest.milestones.map((ms) => {
        const done = ms.progress >= ms.target;
        const reward = [ms.gold ? `${ms.gold.toLocaleString('vi')} ${COIN}` : '', ms.gems ? `${ms.gems} ${GEM}` : ''].filter(Boolean).join(' + ');
        return `<div class="quest-row${ms.claimed ? ' quest-row--done' : ''}">
          <span class="q-emoji">${ms.claimed ? '✅' : done ? '🎁' : '🎪'}</span>
          <span class="seed-info">
            <span class="seed-name">${ms.label}</span>
            <div class="q-track"><i style="width:${Math.round((ms.progress / ms.target) * 100)}%"></i></div>
            <div class="seed-meta">${reward}</div>
          </span>
          <span class="q-right">${ms.claimed ? 'Đã nhận' : done
            ? `<button class="gbtn gbtn--gold btn-mini" data-fest-claim="${ms.id}">Nhận!</button>`
            : `${ms.progress}/${ms.target}`}</span>
        </div>`;
      }).join('');
      return sheetShell(
        `${fest.emoji} ${fest.name} <span class="sheet-coins">⏳ còn ${fest.daysLeft} ngày</span>`,
        `<p class="sheet-note">Sự kiện cá nhân — đạt mốc là nhận quà, hết ${fest.daysLeft} ngày mở mùa mới.</p>${rows}`,
      );
    }

    if (t === 'stars') {
      const next = m.starNext;
      const rows = DATA.config.starMilestones.map((ms) => {
        const claimed = !next || ms.stars < next.stars;
        const reward = [ms.gold ? `${ms.gold.toLocaleString('vi')} ${COIN}` : '', ms.gems ? `${ms.gems} ${GEM}` : ''].filter(Boolean).join(' + ');
        return `<div class="quest-row${claimed ? ' quest-row--done' : ''}">
          <span class="q-emoji">${STAR}</span>
          <span class="seed-info"><span class="seed-name">${ms.stars} sao</span><div class="seed-meta">${reward}</div></span>
          <span class="q-right">${claimed ? '✅' : next && ms.stars === next.stars ? `${m.stars}/${ms.stars}` : '🔒'}</span>
        </div>`;
      }).join('');
      const can = next && m.stars >= next.stars;
      return sheetShell(
        `${STAR} Sao Nông Trại — ${m.stars}`,
        `<p class="sheet-note">Giao đơn và làm nhiệm vụ để nhận sao.</p>${rows}
         ${next ? `<button class="btn gbtn gbtn--gold" id="btn-star-claim" ${can ? '' : 'disabled'} style="width:100%;margin-top:0.5rem">
           ${can ? `🎉 Nhận mốc ${next.stars} sao!` : `Mốc kế: ${next.stars} sao`}</button>` : ''}`,
      );
    }

    return '';
  }

  function renderLb() {
    const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r);
    const { lb, tb } = showLb;
    const thiefTab = showLb.tab === 'thief';
    const village = lb.map((f) => `<div class="lb-row">
        <span class="lb-rank">${medal(f.rank)}</span>
        <span class="lb-name">${esc(f.name)}</span>
        <span class="lb-stat">Lv ${f.level} · ${f.stars}${STAR} · ${f.gold.toLocaleString('vi')} ${COIN}</span>
      </div>`).join('');
    const thief = `
      <h4 class="lb-sec">👑 Vinh danh hôm qua (${tb.yesterday.day})</h4>
      ${tb.yesterday.winners.length ? tb.yesterday.winners.map((w) => `<div class="lb-row lb-row--win">
          <span class="lb-rank">${medal(w.rank)}</span>
          <span class="lb-name">${esc(w.name)}</span>
          <span class="lb-stat">${w.count} món · +${w.gems} ${GEM} +${w.gold.toLocaleString('vi')} ${COIN}</span>
        </div>`).join('') : '<p class="sheet-note">Hôm qua làng yên bình, không ai trộm gì 😇</p>'}
      <h4 class="lb-sec">🥷 Hôm nay — bạn đã chôm ${tb.myCount} món</h4>
      ${tb.today.length ? tb.today.map((w) => `<div class="lb-row">
          <span class="lb-rank">${medal(w.rank)}</span>
          <span class="lb-name">${esc(w.name)}</span>
          <span class="lb-stat">${w.count} món</span>
        </div>`).join('') : '<p class="sheet-note">Chưa ai ra tay hôm nay. Cơ hội của bạn đó 😏</p>'}
      <p class="sheet-note">Chốt sổ lúc 0h: ${tb.rewards.map((r, i) => `${medal(i + 1)} ${r.gems} ${GEM} + ${r.gold.toLocaleString('vi')} ${COIN}`).join(' · ')}</p>`;
    return `
      <div class="modal-backdrop" data-close="1">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="lb-tabs">
            <button class="gbtn btn-mini${thiefTab ? '' : ' gbtn--gold'}" data-lb-tab="village">🏆 Làng</button>
            <button class="gbtn btn-mini${thiefTab ? ' gbtn--gold' : ''}" data-lb-tab="thief">🥷 Trộm</button>
          </div>
          ${thiefTab ? thief : village}
        </div>
      </div>`;
  }

  // ---------- events ----------
  function bind() {
    document.querySelectorAll('[data-close]').forEach((el) =>
      el.addEventListener('click', () => { sheet = null; showLb = null; render(); }));

    document.querySelectorAll('[data-sheet]').forEach((el) =>
      el.addEventListener('click', () => { sheet = { type: el.dataset.sheet }; render(); }));

    document.getElementById('btn-lb')?.addEventListener('click', async () => {
      const r = await run(async () => {
        const [lb, tb] = await Promise.all([api('/leaderboard'), api('/thief-board')]);
        return { lb, tb, tab: 'thief' };
      });
      if (r) { showLb = r; render(); }
    });
    document.querySelectorAll('[data-lb-tab]').forEach((el) =>
      el.addEventListener('click', () => { showLb.tab = el.dataset.lbTab; render(); }));

    document.getElementById('btn-home')?.addEventListener('click', () => { VISIT = null; refresh(); });

    document.querySelector('.family-strip')?.addEventListener('click', async (ev) => {
      const el = ev.target.closest('[data-visit]');
      if (!el) return;
      if (el.dataset.me === '1') { VISIT = null; refresh(); return; }
      try {
        const r = await api(`/farm/${Number(el.dataset.visit)}`);
        VISIT = { ownerId: Number(el.dataset.visit), farm: r.farm, myActs: r.myActs };
        render();
      } catch { /* toast lo rồi */ }
    });

    document.querySelector('.family-search')?.addEventListener('input', (ev) => {
      familyFilter = ev.target.value;
      const strip = document.querySelector('.family-strip');
      if (strip) strip.innerHTML = familyStripHtml();
    });

    document.getElementById('btn-plantall')?.addEventListener('click', () => { sheet = { type: 'seed', all: true }; render(); });
    document.getElementById('btn-harvestall')?.addEventListener('click', async (e) => {
      const r = await run(() => api('/harvest-all', {}));
      if (r) { updateMe(r); floatGain(e.clientX || 200, e.clientY || 300, `🧺 +${r.harvested}`); render(); }
    });

    document.querySelectorAll('.seed-row[data-tree]').forEach((el) =>
      el.addEventListener('click', async () => {
        if (!el.dataset.tree) return;
        const r = await run(() => api('/plant-tree', { idx: sheet.idx, tree: el.dataset.tree }));
        if (r) { updateMe(r); sheet = null; toast('🌳 Cây đã bén rễ!'); render(); }
      }));
    document.getElementById('btn-remove-tree')?.addEventListener('click', async () => {
      const r = await run(() => api('/remove-tree', { idx: sheet.idx }));
      if (r) { updateMe(r); sheet = null; toast('🪓 Đã nhổ cây.'); render(); }
    });
    document.querySelectorAll('.seed-row[data-crop]').forEach((el) =>
      el.addEventListener('click', async () => {
        const cropId = el.dataset.crop;
        if (!cropId) return;
        const wasAll = sheet.all;
        const r = await run(() => wasAll ? api('/plant-all', { crop: cropId }) : api('/plant', { idx: sheet.idx, crop: cropId }));
        if (r) { updateMe(r); sheet = null; if (wasAll) toast(`🌱 Đã gieo ${r.planted} ô!`); render(); }
      }));

    document.querySelectorAll('[data-machine-run]').forEach((el) =>
      el.addEventListener('click', async () => {
        if (!el.dataset.recipe) return;
        const r = await run(() => api('/machine-run', { machine: el.dataset.machineRun, recipe: el.dataset.recipe, count: Number(el.dataset.count) || 1 }));
        if (r) { updateMe(r); if (r.queued > 1) toast(`🏭 Đã xếp ${r.queued} mẻ!`); render(); }
      }));
    document.querySelectorAll('[data-machine-collect]').forEach((el) =>
      el.addEventListener('click', async (e) => {
        const r = await run(() => api('/machine-collect', { machine: el.dataset.machineCollect }));
        if (r) { updateMe(r); floatGain(e.clientX || 200, e.clientY || 300, `${itemImg(r.product, 'coin-img')} +1`); render(); }
      }));
    document.querySelectorAll('[data-machine-speed]').forEach((el) =>
      el.addEventListener('click', async () => {
        const r = await run(() => api('/speedup', { target: 'machine', kind: el.dataset.machineSpeed }));
        if (r) { updateMe(r); toast(`💎 -${r.cost} kim cương!`); render(); }
      }));

    const simple = (id, path, after) => document.getElementById(id)?.addEventListener('click', async (e) => {
      const r = await run(() => api(path, {}));
      if (r) { updateMe(r); if (after) after(r, e); render(); }
    });
    document.querySelectorAll('[data-barn]').forEach((el) =>
      el.addEventListener('click', () => { sheet = { type: 'barn', kind: el.dataset.barn }; render(); }));
    document.querySelectorAll('[data-feed-kind]').forEach((el) =>
      el.addEventListener('click', async () => {
        const r = await run(() => api('/feed', { kind: el.dataset.feedKind }));
        if (r) { updateMe(r); toast(`🌰 Đã cho ${r.fed} con ăn`); render(); }
      }));
    document.querySelectorAll('[data-collect-kind]').forEach((el) =>
      el.addEventListener('click', async (e) => {
        const r = await run(() => api('/collect', { kind: el.dataset.collectKind }));
        if (r) { updateMe(r); floatGain(e.clientX || 200, e.clientY || 300, `${itemImg(r.product, 'coin-img')} +${r.collected}`); render(); }
      }));
    document.querySelectorAll('[data-buy-animal]').forEach((el) =>
      el.addEventListener('click', async () => {
        const r = await run(() => api('/buy-animal', { kind: el.dataset.buyAnimal }));
        if (r) { updateMe(r); toast('🎉 Thành viên mới về chuồng!'); render(); }
      }));
    document.querySelectorAll('[data-upgrade-barn]').forEach((el) =>
      el.addEventListener('click', async () => {
        const k = el.dataset.upgradeBarn;
        const r = await run(() => api('/upgrade-barn', { kind: k }));
        if (r) { updateMe(r); toast(`⬆️ Chuồng lên cấp ${r.me.barns[k].level} — chứa ${r.me.barns[k].capacity} con!`); render(); }
      }));
    simple('btn-collect', '/collect', (r, e) => floatGain(e.clientX || 200, e.clientY || 300, `🥚 +${r.collected}`, `+${r.collected * DATA.config.chicken.expCollect} EXP`));
    simple('btn-buy-chicken', '/buy-chicken', () => toast('🐔 Gà mới về chuồng!'));
    simple('btn-mill-collect', '/mill-collect', () => toast('⚙️ Xong một mẻ!'));
    simple('btn-expand', '/expand', () => { sheet = null; toast('🎉 Đất rộng thêm 4 ô!'); });
    simple('btn-chest', '/quest-chest', (r) => toast(r.gem ? '🎁 Rương ngày + 1 kim cương! 💎' : '🎁 Đã mở rương ngày!'));
    simple('btn-star-claim', '/star-claim', (r) => toast(`🌟 Nhận thưởng mốc ${r.claimed.stars} sao!`));
    simple('btn-waterall', '/water-all', (r) => toast(`💧 Đã tưới ${r.watered} ô!`));
    simple('btn-buy-energy', '/buy-energy', () => toast('⚡ +30 năng lượng!'));
    simple('btn-skill-respec', '/skill-respec', () => toast('♻️ Đã hoàn trả toàn bộ điểm kỹ năng!'));
    document.querySelectorAll('[data-skill-learn]').forEach((el) =>
      el.addEventListener('click', async () => {
        const r = await run(() => api('/skill-learn', { id: el.dataset.skillLearn }));
        if (r) { updateMe(r); toast('🎓 Đã học kỹ năng mới!'); render(); }
      }));
    document.getElementById('btn-poach-animal')?.addEventListener('click', async (e) => {
      const r = await run(() => api('/poach-animal', { ownerId: VISIT.ownerId }));
      if (r) { updateMe(r); floatGain(e.clientX, e.clientY, `😋 +${r.got || 1}`); render(); }
    });
    document.getElementById('btn-poach-machine')?.addEventListener('click', async (e) => {
      const r = await run(() => api('/poach-machine', { ownerId: VISIT.ownerId }));
      if (r) { updateMe(r); floatGain(e.clientX, e.clientY, `😋 +${r.got || 1}`); render(); }
    });
    document.getElementById('btn-plant-help')?.addEventListener('click', async () => {
      const r = await run(() => api('/plant-help', { ownerId: VISIT.ownerId }));
      if (r) { updateMe(r); toast(`🌱 Đã trồng giúp ${r.helped} ô (−${r.cost.toLocaleString('vi')} vàng)!`); render(); }
    });
    simple('btn-upgrade-coop', '/upgrade-coop', (r) => toast(`🐔 Chuồng lên cấp ${r.me.coop.level} — chứa ${r.me.coop.capacity} gà!`));
    simple('btn-upgrade-pond', '/upgrade-pond', (r) => toast(`🎣 Ao lên cấp ${r.me.pond.level} — ${r.me.pond.fishPerCast} cá mỗi lượt!`));
    document.getElementById('btn-fish')?.addEventListener('click', async (e) => {
      const r = await run(() => api('/fish', {}));
      if (r) {
        updateMe(r);
        const names = r.caught.map((id) => `${itemInfo(id).name} ${itemInfo(id).emoji}`).join(', ');
        floatGain(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2,
          r.caught.map((id) => itemImg(id, 'coin-img')).join('') + ` +${r.caught.length}`,
          `+${r.exp} EXP`);
        toast(`${r.caught.includes('cakoi') ? '🎉 HIẾM! ' : ''}Câu được ${names}!`);
        render();
      }
    });
    simple('btn-harvestall-tb', '/harvest-all', (r, e) => floatGain(e.clientX || 200, e.clientY || 300, `🧺 +${r.harvested}`));

    document.querySelectorAll('[data-fest-claim]').forEach((el) =>
      el.addEventListener('click', async () => {
        const r = await run(() => api('/fest-claim', { id: Number(el.dataset.festClaim) }));
        if (r) { updateMe(r); toast(`🎪 Nhận thưởng: ${r.claimed.label}!`); render(); }
      }));

    document.getElementById('btn-water-own')?.addEventListener('click', async (e) => {
      const r = await run(() => api('/water', { idx: sheet.idx }));
      if (r) { updateMe(r); sheet = null; floatGain(e.clientX || 200, e.clientY || 300, '💧'); render(); }
    });
    document.getElementById('btn-speedup-plot')?.addEventListener('click', async () => {
      const r = await run(() => api('/speedup', { target: 'plot', idx: sheet.idx }));
      if (r) { updateMe(r); sheet = null; toast(`💎 -${r.cost} kim cương — chín ngay!`); render(); }
    });
    document.getElementById('btn-speedup-mill')?.addEventListener('click', async () => {
      const r = await run(() => api('/speedup', { target: 'mill' }));
      if (r) { updateMe(r); toast(`💎 -${r.cost} kim cương!`); render(); }
    });

    function rowQty(el) {
      const input = el.closest('.inv-row')?.querySelector('.qty-input');
      if (!input) return 1;
      const max = Number(input.max) || 999;
      return Math.max(1, Math.min(max, Math.round(Number(input.value) || 1)));
    }
    document.querySelectorAll('[data-qstep]').forEach((el) =>
      el.addEventListener('click', () => {
        const row = el.closest('.inv-row');
        const input = row.querySelector('.qty-input');
        const max = Number(input.max) || 999;
        input.value = Math.max(1, Math.min(max, (Number(input.value) || 1) + Number(el.dataset.qstep)));
        const btn = row.querySelector('[data-sell]:not([data-qty])');
        if (btn) btn.textContent = `Bán ${input.value}`;
      }));
    document.querySelectorAll('.qty-input').forEach((el) =>
      el.addEventListener('input', () => {
        const btn = el.closest('.inv-row').querySelector('[data-sell]:not([data-qty])');
        if (btn) btn.textContent = `Bán ${Math.max(1, Math.min(Number(el.max) || 999, Math.round(Number(el.value) || 1)))}`;
      }));
    document.querySelectorAll('[data-sell]').forEach((el) =>
      el.addEventListener('click', async (e) => {
        const qty = el.dataset.qty ? Number(el.dataset.qty) : rowQty(el);
        const r = await run(() => api('/sell', { item: el.dataset.sell, qty }));
        if (r) { updateMe(r); floatGain(e.clientX, e.clientY, `+${r.gained} ${COIN}`); render(); }
      }));
    document.querySelectorAll('[data-buy]').forEach((el) =>
      el.addEventListener('click', async () => {
        const r = await run(() => api('/buy', { item: el.dataset.buy, qty: Number(el.dataset.qty) }));
        if (r) { updateMe(r); render(); }
      }));
    document.querySelectorAll('[data-deliver]').forEach((el) =>
      el.addEventListener('click', async (e) => {
        const r = await run(() => api('/order-deliver', { id: Number(el.dataset.deliver) }));
        if (r) { updateMe(r); floatGain(e.clientX, e.clientY, `🚚 +${r.gained} ${COIN}`); render(); }
      }));
    document.querySelectorAll('[data-discard]').forEach((el) =>
      el.addEventListener('click', async () => {
        const r = await run(() => api('/order-discard', { id: Number(el.dataset.discard) }));
        if (r) { updateMe(r); render(); }
      }));

    document.getElementById('grid')?.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('.plot');
      if (!btn) return;
      const kind = btn.dataset.kind;
      const idx = Number(btn.dataset.idx);
      const { clientX: x, clientY: y } = ev;

      if (kind === 'empty') { sheet = { type: 'seed', idx }; render(); }
      else if (kind === 'waterplot') {
        const r = await run(() => api('/water', { idx }));
        if (r) { updateMe(r); floatGain(x, y, '💧'); render(); }
      }
      else if (kind === 'expand') { sheet = { type: 'expand' }; render(); }
      else if (kind === 'plotmenu') { sheet = { type: 'plotmenu', idx }; render(); }
      else if (kind === 'harvest') {
        const p = me().plots[idx];
        const c = p?.crop ? crops()[p.crop] : null;
        const r = await run(() => api('/harvest', { idx }));
        if (r) {
          updateMe(r);
          if (c) floatGain(x, y, `${itemImg(c.id, 'coin-img')} +1`, `+${c.expHarvest} EXP`);
          render();
        }
      } else if (kind === 'water') {
        const r = await run(() => api('/water', { ownerId: VISIT.ownerId, idx }));
        if (r) { updateMe(r); floatGain(x, y, '💧', `+2 ${COIN}`); render(); }
      } else if (kind === 'poach') {
        const r = await run(() => api('/poach', { ownerId: VISIT.ownerId, idx }));
        if (r) { updateMe(r); floatGain(x, y, '😋 +2'); render(); }
      } else if (kind === 'growing' || kind === 'ripe') {
        const farm = VISIT ? VISIT.farm : me();
        const p = farm.plots[idx];
        if (p?.crop) {
          const c = crops()[p.crop];
          toast(p.ready ? `${c.name} chín rồi!` : `${c.name} — còn ${fmtTime(p.readyAt - Date.now())}`);
        }
      }
    });
  }

  // ---------- vòng lặp ----------
  async function refresh() {
    try {
      DATA = await api('/state');
      if (lastLevel && DATA.me.level > lastLevel) toast(`🎉 Lên cấp ${DATA.me.level}!`);
      lastLevel = DATA.me.level;
      if (VISIT) {
        const r = await api(`/farm/${VISIT.ownerId}`);
        VISIT = { ownerId: VISIT.ownerId, farm: r.farm, myActs: r.myActs };
      }
      render();
      scheduleCritter();
    } catch { /* gate/waking đã render */ }
  }

  setInterval(() => {
    if (!DATA) return;
    const farm = VISIT ? VISIT.farm : me();
    const now = Date.now();
    let flip = false;
    for (const p of farm.plots) {
      if (p.crop && !p.ready && now >= p.readyAt) { p.ready = true; flip = true; }
    }
    for (const a of me().animals || []) {
      if (a.ready_at != null && !a.ready && now >= a.ready_at) { a.ready = true; flip = true; }
    }
    if (me().mill && !me().mill.ready && now >= me().mill.readyAt) { me().mill.ready = true; flip = true; }
    if (flip && !sheet && !showLb) { render(); return; }

    document.querySelectorAll('.plot--growing').forEach((el) => {
      const left = Number(el.dataset.ready) - now;
      const total = Number(el.dataset.total);
      const timer = el.querySelector('.plot-timer');
      if (timer) timer.textContent = fmtTime(left);
      const pct = ((total - left) / total) * 100;
      const bar = el.querySelector('.plot-progress i');
      if (bar) bar.style.width = `${Math.min(100, Math.max(3, Math.round(pct)))}%`;
      const img = el.querySelector('.crop-sprite');
      if (img && crops()[el.dataset.cropid]) {
        const want = cropSprite(el.dataset.cropid, pct < 45 ? 1 : 2);
        if (img.getAttribute('src') !== want) img.setAttribute('src', want);
      }
    });
  }, 1000);

  // ---------- con vật may mắn ----------
  function scheduleCritter() {
    if (critterTimer) { clearTimeout(critterTimer); critterTimer = null; }
    const c = DATA?.me?.critter;
    if (!c) return;
    const now = Date.now();
    if (now > c.at + c.windowMs) return;
    const delay = Math.max(0, c.at - now);
    critterTimer = setTimeout(() => spawnCritter(c), delay);
  }
  function spawnCritter(c) {
    if (document.querySelector('.critter')) return;
    const runMs = Math.min(c.windowMs, 5000 + Math.random() * 5000);
    const el = document.createElement('button');
    el.className = 'critter';
    el.textContent = c.kind;
    el.style.animationDuration = `${runMs}ms`;
    el.title = 'Tóm lấy!';
    el.addEventListener('click', async (e) => {
      el.disabled = true;
      const r = await run(() => api('/critter-catch', {}));
      el.remove();
      if (r) {
        updateMe(r);
        floatGain(e.clientX, e.clientY, `💎 +${r.gems}`, '✨');
        toast(`✨ Tóm được ${r.kind} — +${r.gems} kim cương!`);
        render();
      }
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), runMs + 400);
  }

  setInterval(() => {
    if (document.visibilityState === 'visible' && !sheet && !showLb) refresh();
  }, 20_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });

  refresh();
})();
