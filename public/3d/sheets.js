// Secondary systems as sheets: stars, festival, skills, decorations, lottery, collections, energy, dog, tax.
// Every number shown comes from the server state; every button is one server call whose result replaces the state.
const medal = (n) => ['🥇', '🥈', '🥉'][n] || String(n + 1);

export const MORE_ENTRIES = [
  ['stars', '⭐', 'Sao và cột mốc'], ['festival', '🎪', 'Lễ hội'], ['skills', '🧠', 'Kỹ năng'], ['luxury', '👑', 'Danh hiệu và trang trí'],
  ['lottery', '🎟️', 'Xổ số làng'], ['collections', '📚', 'Bộ sưu tập'], ['energy', '⚡', 'Năng lượng và kim cương'], ['dog', '🐕', 'Chó canh vườn'],
  ['barn', '🐄', 'Chuồng trại'], ['quests', '📜', 'Nhiệm vụ ngày'], ['board', '🏆', 'Bảng xếp hạng'], ['thief', '🥷', 'Bảng kẻ trộm'], ['gold', '💝', 'Xin/Cho vàng'],
];

export function renderExtra(mode, c) {
  const { rows, me, cat, nf, api, prodAct, toast, fail, open, setTitle, busy, serverNow, fmtDur } = c;
  const el = (html, cls = 'row job') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; rows.appendChild(d); return d; };
  const para = (t, bold) => { const p = document.createElement('p'); p.textContent = t; if (bold) p.style.fontWeight = '800'; rows.appendChild(p); };
  const btn = (parent, label, on, off) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cta small'; b.textContent = label; b.disabled = !!off || busy(); b.addEventListener('click', on); parent.appendChild(b); return b; };
  const acts = (row) => row.querySelector('.acts');
  const reward = (m) => [m.gold ? `${nf.format(m.gold)} vàng` : '', m.gems ? `${m.gems} kim cương` : ''].filter(Boolean).join(' + ');

  if (mode === 'more') {
    setTitle('Thêm');
    const t = me.tax, d = me.debts;
    para(`Thuế đất mỗi ngày: ${nf.format(t.today)} vàng${t.unlockLevel > me.level ? ` (bắt đầu ở cấp ${t.unlockLevel})` : ' — tự trừ khi sang ngày mới'}.${d && d.owe ? ` Nợ phạt chó: ${nf.format(d.owe)} vàng, tự trừ dần từ vàng của bạn.` : ''}`);
    for (const [id, emoji, label] of MORE_ENTRIES) { const r = el(`<span class="emo">${emoji}</span><div><b>${label}</b></div><div class="acts"></div>`); btn(acts(r), 'Mở', () => open(id)); }
    return true;
  }
  if (mode === 'stars') {
    setTitle('Sao và cột mốc');
    para(`Sao hiện có: ${nf.format(me.stars)}. Sao có từ giao đơn hàng và nhiệm vụ.`);
    for (const m of cat().starMilestones) {
      const claimed = !me.starNext || m.stars < me.starNext.stars, isNext = me.starNext && m.stars === me.starNext.stars;
      const r = el(`<span class="emo">⭐</span><div><b>${nf.format(m.stars)} sao</b> ${claimed ? '<span class="state-chip done">Đã nhận</span>' : ''}<small>${reward(m)}</small></div><div class="acts"></div>`);
      if (!claimed) btn(acts(r), 'Nhận', () => prodAct('/star-claim', {}, () => toast(`Đã nhận cột mốc ${m.stars} sao`)), !isNext || me.stars < m.stars);
    }
    return true;
  }
  if (mode === 'festival') {
    const f = me.festival; setTitle(f.name);
    para(`${f.emoji} Còn ${f.daysLeft} ngày. Làm đủ mục tiêu để nhận thưởng.`);
    for (const m of f.milestones) {
      const done = m.progress >= m.target;
      const r = el(`<span class="emo">${f.emoji}</span><div><b>${m.label}</b> ${m.claimed ? '<span class="state-chip done">Đã nhận</span>' : ''}<small>${m.progress}/${m.target} · ${reward(m)}</small></div><div class="acts"></div>`);
      if (!m.claimed) btn(acts(r), 'Nhận', () => prodAct('/fest-claim', { id: m.id }, () => toast('Đã nhận thưởng lễ hội')), !done);
    }
    return true;
  }
  if (mode === 'skills') {
    const s = me.skills, tree = cat().skillTree; setTitle('Kỹ năng');
    if (!s.unlocked) { para(`Kỹ năng mở ở cấp ${tree.unlockLevel}.`); return true; }
    para(`Điểm kỹ năng còn lại: ${s.points}. Mỗi kỹ năng tối đa ${s.maxRank} bậc.`);
    for (const b of tree.branches) {
      para(`${b.emoji} ${b.name}`, true);
      for (const n of b.nodes) {
        const rank = (s.learned && s.learned[n.id]) || 0;
        const r = el(`<span class="emo">${b.emoji}</span><div><b>${n.name}</b> <span class="state-chip">Bậc ${rank}/${s.maxRank}</span><small>${n.desc} · tốn ${n.cost} điểm</small></div><div class="acts"></div>`);
        btn(acts(r), 'Học', () => prodAct('/skill-learn', { id: n.id }, () => toast(`Đã học ${n.name}`)), rank >= s.maxRank || s.points < n.cost);
      }
    }
    const wait = s.nextRespecAt - serverNow();
    const r = el(`<span class="emo">🔄</span><div><b>Đặt lại kỹ năng</b><small>${tree.respecGems} kim cương${wait > 0 ? ` · chờ ${fmtDur(wait)}` : ''}</small></div><div class="acts"></div>`);
    btn(acts(r), 'Đặt lại', () => prodAct('/skill-respec', {}, () => toast('Đã đặt lại kỹ năng')), wait > 0 || me.gems < tree.respecGems);
    return true;
  }
  if (mode === 'luxury') {
    const lx = me.luxury, items = Object.values(cat().luxury); setTitle('Danh hiệu và trang trí');
    para(`Chỉ để khoe, không tăng sức mạnh. Danh hiệu và khung tên chọn một, trang trí hiện hết trong cảnh. Vàng: ${nf.format(me.gold)}.`);
    for (const kind of ['title', 'frame', 'decor', 'pet']) {
      const list = items.filter((x) => x.kind === kind); if (!list.length) continue;
      para({ title: 'Danh hiệu', frame: 'Khung tên', decor: 'Trang trí', pet: 'Thú cưng' }[kind], true);
      for (const x of list) {
        const owned = lx.owned.includes(x.id), worn = lx.title === x.id || lx.frame === x.id;
        const r = el(`<span class="emo">${x.emoji}</span><div><b>${x.name}</b> ${worn ? '<span class="state-chip done">Đang dùng</span>' : ''}<small>${x.desc} · ${nf.format(x.price)} vàng</small></div><div class="acts"></div>`);
        if (!owned) btn(acts(r), 'Mua', () => prodAct('/luxury-buy', { item: x.id }, () => toast(`Đã mua ${x.name}`)), me.gold < x.price);
        else if (kind === 'title' || kind === 'frame') btn(acts(r), worn ? 'Bỏ' : 'Dùng', () => prodAct('/luxury-equip', { item: worn ? '' : x.id, kind }, () => toast(worn ? 'Đã bỏ' : `Đang dùng ${x.name}`)));
        else btn(acts(r), 'Đã có', () => {}, true);
      }
    }
    return true;
  }
  if (mode === 'lottery') {
    setTitle('Xổ số làng'); rows.innerHTML = '<div class="empty">Đang tải…</div>';
    api('/lottery').then((l) => {
      if (c.mode() !== 'lottery') return; rows.innerHTML = '';
      para(`Hũ hôm nay: ${nf.format(l.pot)} vàng · ${l.tickets} vé · ${l.players} người chơi. Vé ${nf.format(l.ticket)} vàng, tối đa ${l.maxPerDay} vé mỗi ngày. Ba người may mắn chia 70/20/10 khi chốt ngày.`);
      const box = document.createElement('div'); box.className = 'amounts';
      [1, 5, 10].forEach((q) => btn(box, `Mua ${q} vé`, () => prodAct('/lottery-buy', { qty: q }, () => toast(`Đã mua ${q} vé`)), me.gold < q * l.ticket));
      rows.appendChild(box);
      if (l.last) { para(`Kỳ trước (${l.last.day}): hũ ${nf.format(l.last.pot)} vàng`, true); l.last.winners.forEach((w, i) => el(`<span class="emo">${medal(i)}</span><div><b>${w.name}</b><small>+${nf.format(w.gold)} vàng</small></div>`)); }
    }).catch(fail);
    return true;
  }
  if (mode === 'collections') {
    setTitle('Bộ sưu tập'); para('Thu thập đủ các món trong bộ để nhận thưởng.');
    for (const col of me.collections) {
      const have = col.items.filter((i) => i.found).length, full = have === col.items.length;
      const r = el(`<span class="emo">${col.emoji || '📚'}</span><div><b>${col.name}</b> ${col.claimed ? '<span class="state-chip done">Đã nhận</span>' : ''}<small>${have}/${col.items.length} · ${reward(col)}</small></div><div class="acts"></div>`);
      if (!col.claimed) btn(acts(r), 'Nhận', () => prodAct('/collection-claim', { id: col.id }, () => toast(`Đã nhận bộ ${col.name}`)), !full);
    }
    return true;
  }
  if (mode === 'energy') {
    const e = me.energy; setTitle('Năng lượng và kim cương');
    para(`Năng lượng: ${e.current}/${e.max}${e.nextRegenMs ? ` · +1 sau ${fmtDur(e.nextRegenMs)}` : ''}. Kim cương: ${me.gems}.`);
    let r = el(`<span class="emo">⚡</span><div><b>+${e.buyAmount} năng lượng</b><small>${e.buyGems} kim cương</small></div><div class="acts"></div>`);
    btn(acts(r), 'Mua', () => prodAct('/buy-energy', {}, () => toast(`Đã mua ${e.buyAmount} năng lượng`)), me.gems < e.buyGems);
    para('Đổi vàng lấy kim cương', true);
    for (const p of cat().gemPacks) { r = el(`<span class="emo">💎</span><div><b>${p.gems} kim cương</b><small>${nf.format(p.gold)} vàng</small></div><div class="acts"></div>`); btn(acts(r), 'Đổi', () => prodAct('/buy-gems', { pack: p.id }, () => toast(`Đã đổi ${p.gems} kim cương`)), me.gold < p.gold); }
    return true;
  }
  if (mode === 'dog') {
    const d = cat().dog, left = me.dog.until - serverNow(); setTitle('Chó canh vườn');
    para(`Chó canh vườn có cơ hội tóm người hái ké nhà bạn, người bị tóm nộp phạt. ${me.dog.active ? `Đang canh, còn ${fmtDur(left)}.` : 'Chưa thuê.'}`);
    for (const h of d.hoursOptions) { const r = el(`<span class="emo">🐕</span><div><b>Thuê ${h} giờ</b><small>${nf.format(d.pricePerHour * h)} vàng</small></div><div class="acts"></div>`); btn(acts(r), 'Thuê', () => prodAct('/dog-hire', { hours: h }, () => toast(`Đã thuê chó ${h} giờ`)), me.gold < d.pricePerHour * h); }
    return true;
  }
  return false;
}
