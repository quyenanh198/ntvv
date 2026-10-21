/* Nông trại vui vẻ v2 — client theo đặc tả gameplay 1.0.
   Server là trọng tài; client vẽ, đếm ngược và gửi lệnh. */

(() => {
  const app = document.getElementById('app');

  let DATA = null;   // /state
  // ?v= của app.js đang chạy = phiên bản server lúc tải trang. Phải khai báo TRƯỚC
  // helper A() vì COIN/GEM gọi A() ngay lúc nạp script (TDZ → app không chạy).
  const MY_BOOT = (() => {
    try { return new URL(document.querySelector('script[src*="app.js"]').src).searchParams.get('v'); } catch { return null; }
  })();
  let VISIT = null;  // { ownerId, farm, myActs }
  let INSPECT = false; // chế độ khám xét khi thăm ruộng: bấm ô = khám
  let MARKET = null; // { mine, others } — tin thu mua, nạp khi mở sheet
  let sheet = null;  // { type: 'seed'|'plotmenu'|'shop'|'inventory'|'quests'|'orders'|'coop'|'mill'|'expand'|'stars', ... }
  let lastRenderedSheetType = null;
  let sheetNavigationEpoch = 0;
  let sheetLoadSequence = 0;
  let sheetReturnFocus = null;
  let showLb = null;
  let lastRenderedModalType = null;
  let modalReturnFocus = null;
  let modalReturnFocusId = null;
  const pendingResources = new Set();
  const openDecorOwners = new Set();
  let familyFilter = '';
  let lastLevel = null;
  let critterTimer = null;
  let mutationEpoch = 0;
  let refreshSequence = 0;
  let machineRefreshPending = false;

  // ---------- sprite ----------
  const SPRITE_ALIAS = { luami: 'lua', dautay: 'dau' };
  const GROWING_CROP_ART = { luami: 'assets/crops-v3/wheat-growing.png', carot: 'assets/crops-v3/carrot-growing.png', ngo: 'assets/crops-v3/corn-growing.png', khoaitay: 'assets/crops-v3/potato-growing.png', toi: 'assets/crops-v3/garlic-growing.png', rauthom: 'assets/crops-v3/herbs-growing.png', dualeo: 'assets/crops-v3/cucumber-growing.png', sa: 'assets/crops-v3/lemongrass-growing.png', bapcai: 'assets/crops-v3/cabbage-growing.png', dauphong: 'assets/crops-v3/peanut-growing.png', cachua: 'assets/crops-v3/tomato-growing.png', khoailang: 'assets/crops-v3/sweet-potato-growing.png', ot: 'assets/crops-v3/chili-growing.png', me: 'assets/crops-v3/sesame-growing.png', hanhtay: 'assets/crops-v3/onion-growing.png', dauxanh: 'assets/crops-v3/mung-bean-growing.png', mia: 'assets/crops-v3/sugarcane-growing.png', dautay: 'assets/crops-v3/strawberry-growing.png', gung: 'assets/crops-v3/ginger-growing.png', catim: 'assets/crops-v3/eggplant-growing.png', huongduong: 'assets/crops-v3/sunflower-growing.png', gao: 'assets/crops-v3/rice-growing.png', bongcai: 'assets/crops-v3/cauliflower-growing.png', bingo: 'assets/crops-v3/pumpkin-growing.png', tra: 'assets/crops-v3/tea-growing.png', thom: 'assets/crops-v3/pineapple-growing.png', bongvai: 'assets/crops-v3/cotton-growing.png', duahau: 'assets/crops-v3/watermelon-growing.png', nho: 'assets/crops-v3/grape-growing.png', caphe: 'assets/crops-v3/coffee-growing.png', cansa: 'assets/crops-v3/cannabis-growing.png', hoahong: 'assets/crops-v3/rose-growing.png', oliu: 'assets/crops-v3/olive-growing.png', nam: 'assets/crops-v3/mushroom-growing.png', cacao: 'assets/crops-v3/cacao-growing.png', vani: 'assets/crops-v3/vanilla-growing.png' };
  const RIPE_CROP_ART = { luami: 'assets/crops-v3/wheat-ripe.png', carot: 'assets/crops-v3/carrot-ripe.png', ngo: 'assets/crops-v3/corn-ripe.png', khoaitay: 'assets/crops-v3/potato-ripe.png', toi: 'assets/crops-v3/garlic-ripe.png', rauthom: 'assets/crops-v3/herbs-ripe.png', dualeo: 'assets/crops-v3/cucumber-ripe.png', sa: 'assets/crops-v3/lemongrass-ripe.png', bapcai: 'assets/crops-v3/cabbage-ripe.png', dauphong: 'assets/crops-v3/peanut-ripe.png', cachua: 'assets/crops-v3/tomato-ripe.png', khoailang: 'assets/crops-v3/sweet-potato-ripe.png', ot: 'assets/crops-v3/chili-ripe.png', me: 'assets/crops-v3/sesame-ripe.png', hanhtay: 'assets/crops-v3/onion-ripe.png', dauxanh: 'assets/crops-v3/mung-bean-ripe.png', mia: 'assets/crops-v3/sugarcane-ripe.png', dautay: 'assets/crops-v3/strawberry-ripe.png', gung: 'assets/crops-v3/ginger-ripe.png', catim: 'assets/crops-v3/eggplant-ripe.png', huongduong: 'assets/crops-v3/sunflower-ripe.png', gao: 'assets/crops-v3/rice-ripe.png', bongcai: 'assets/crops-v3/cauliflower-ripe.png', bingo: 'assets/crops-v3/pumpkin-ripe.png', tra: 'assets/crops-v3/tea-ripe.png', thom: 'assets/crops-v3/pineapple-ripe.png', bongvai: 'assets/crops-v3/cotton-ripe.png', duahau: 'assets/crops-v3/watermelon-ripe.png', nho: 'assets/crops-v3/grape-ripe.png', caphe: 'assets/crops-v3/coffee-ripe.png', cansa: 'assets/crops-v3/cannabis-ripe.png', hoahong: 'assets/crops-v3/rose-ripe.png', oliu: 'assets/crops-v3/olive-ripe.png', nam: 'assets/crops-v3/mushroom-ripe.png', cacao: 'assets/crops-v3/cacao-ripe.png', vani: 'assets/crops-v3/vanilla-ripe.png' };
  const MACHINE_ART = { lonuong: 'assets/machines-v3/fish-oven.png', quanoc: 'assets/machines-v3/snail-stall.png', bepan: 'assets/machines-v3/family-kitchen.png', coixay: 'assets/machines-v3/flour-mill.png', quanvat: 'assets/machines-v3/snack-stall.png', mayep: 'assets/machines-v3/juice-press.png', noimut: 'assets/machines-v3/jam-kettle.png', nhamaysua: 'assets/machines-v3/dairy-workshop.png', lobanh: 'assets/machines-v3/bakery-oven.png', mayrang: 'assets/machines-v3/coffee-roaster.png', xuongdet: 'assets/machines-v3/weaving-workshop.png', xuongcaocap: 'assets/machines-v3/premium-workshop.png' };
  // Mọi URL tài nguyên tĩnh kèm ?v=<boot>: mỗi lần deploy đổi URL nên không dính
  // bản Cloudflare/trình duyệt cache nhầm (đã có vụ trang chờ HTML nằm ở URL ảnh).
  const A = (path) => `${path}?v=${MY_BOOT || '1'}`;
  const machineIcon = (machine) => MACHINE_ART[machine.id]
    ? `<img class="machine-icon" src="${A(MACHINE_ART[machine.id])}" alt="" loading="lazy" decoding="async" />`
    : `<span class="machine-emoji" aria-hidden="true">${machine.emoji}</span>`;
  const spriteBase = (id) => SPRITE_ALIAS[id] || id;
  const cropSprite = (id, stage) => A((stage === 1 && 'assets/crops-v3/seedling.png')
    || (stage === 3 && RIPE_CROP_ART[id]) || (stage === 2 && GROWING_CROP_ART[id])
    || `assets/crops/${spriteBase(id)}-${stage}.svg`);
  // Mỗi cây ăn quả có tranh riêng để người chơi nhận ra vườn bằng hình dáng và quả.
  const TREE_PNG = new Set(['cam', 'tao', 'xoai', 'thanhlong', 'chuoi', 'chanh', 'dua', 'dao', 'anhdao', 'quame', 'coc', 'quabo', 'saurieng']);
  const treeArt = (id) => A(TREE_PNG.has(id) ? `assets/art/trees/${id}.png` : 'assets/art/tree.png');
  // Mỗi loài vật nuôi có tranh riêng để giữ nét nhất quán trong chuồng.
  const BARN_ART = { ga: 'assets/art/chicken_v3.png', cut: 'assets/art/quail_v3.png', vit: 'assets/art/duck_v3.png', bo: 'assets/art/cow.png', ngong: 'assets/art/goose_v3.png', tho: 'assets/art/rabbit_v3.png', ong: 'assets/art/bee_v3.png', cuu: 'assets/art/sheep.png', gatay: 'assets/art/turkey_v3.png', de: 'assets/art/goat_v3.png', tam: 'assets/art/silkworm_v3.png', heo: 'assets/art/pig.png', trau: 'assets/art/buffalo_v3.png', alpaca: 'assets/art/alpaca_v3.png', huou: 'assets/art/deer_v3.png' };
  const barnArtImg = (kind) => (BARN_ART[kind]
    ? `<img src="${A(BARN_ART[kind])}" alt="" />`
    : `<span class="emoji-ic emoji-ic--barn">${DATA?.config.animals[kind]?.emoji || '🐾'}</span>`);
  const ITEM_ICON = {
    trung: 'assets/ui/egg.svg', botmi: 'assets/products-v3/wheat-flour.png',
    botbap: 'assets/products-v3/corn-flour.png', botcacao: 'assets/products-v3/cocoa-powder.png',
    thucan: 'assets/art/feed.png',
    sua: 'assets/products-v3/cow-milk.png', len: 'assets/ui/wool.svg', matong: 'assets/products-v3/honey.png',
    suade: 'assets/products-v3/goat-milk.png', thit: 'assets/products-v3/pork.png',
    canuong: 'assets/products-v3/grilled-fish.png', bo: 'assets/products-v3/butter.png',
    chaca: 'assets/products-v3/fish-cakes.png', cakho: 'assets/products-v3/pepper-braised-fish.png',
    sushi: 'assets/products-v3/fish-sushi.png', lauca: 'assets/products-v3/fish-hotpot.png',
    goicuon: 'assets/products-v3/fish-spring-rolls.png', tomnuong: 'assets/products-v3/grilled-shrimp.png',
    catrakho: 'assets/products-v3/braised-pangasius.png', calocnuong: 'assets/products-v3/grilled-snakehead-fish.png',
    cadieuhongchien: 'assets/products-v3/fried-red-tilapia.png', luonxao: 'assets/products-v3/lemongrass-chili-eel.png',
    cuahap: 'assets/products-v3/steamed-lemongrass-crab.png', mucnuong: 'assets/products-v3/satay-grilled-squid.png',
    banhcarot: 'assets/products-v3/carrot-cake.png',
    chuoichien: 'assets/products-v3/banana-fritters.png', banhtom: 'assets/products-v3/shrimp-fritters.png',
    bapxao: 'assets/products-v3/buttered-corn.png', botchien: 'assets/products-v3/fried-rice-cakes.png',
    cavienchien: 'assets/products-v3/fried-fish-balls.png',
    banhtrangtron: 'assets/products-v3/rice-paper-salad.png', chedauxanh: 'assets/products-v3/mung-bean-dessert.png',
    keodauphong: 'assets/products-v3/peanut-brittle.png', khoailangken: 'assets/products-v3/sweet-potato-fritters.png',
    merim: 'assets/products-v3/chili-tamarind.png', nemchua: 'assets/products-v3/cured-pork-rolls.png',
    ocluoc: 'assets/products-v3/lemongrass-snails.png', trasa: 'assets/products-v3/honey-lemongrass-tea.png',
    xoidauphong: 'assets/products-v3/peanut-sticky-rice.png',
    banhxeo: 'assets/products-v3/crispy-pancake.png', cocdam: 'assets/products-v3/chili-ambarella.png',
    khoailangnuong: 'assets/products-v3/roasted-sweet-potatoes.png', saurienchien: 'assets/products-v3/durian-fritters.png',
    trasua: 'assets/products-v3/milk-tea.png', trungmuoi: 'assets/products-v3/salted-eggs.png', xucxich: 'assets/products-v3/pork-sausages.png',
    tom: 'assets/products-v3/fresh-shrimp.png', cua: 'assets/products-v3/freshwater-crab.png', luon: 'assets/products-v3/farm-eel.png',
    ech: 'assets/products-v3/farm-frog.png', muc: 'assets/products-v3/fresh-squid.png', lauech: 'assets/products-v3/frog-hotpot.png',
    khoaichien: 'assets/products-v3/potato-fries.png', salad: 'assets/products-v3/garden-salad.png',
    comchien: 'assets/products-v3/fried-rice.png', supbi: 'assets/products-v3/pumpkin-soup.png',
    nuoccarot: 'assets/products-v3/carrot-juice.png', nuocduahau: 'assets/products-v3/watermelon-juice.png', mutdau: 'assets/products-v3/strawberry-jam.png',
    mutcam: 'assets/products-v3/orange-marmalade.png', mutgung: 'assets/products-v3/ginger-preserve.png',
    mutsaurieng: 'assets/products-v3/durian-jam.png', siro: 'assets/products-v3/dragon-fruit-syrup.png',
    sinhtoxoai: 'assets/products-v3/mango-smoothie.png', nuocchanh: 'assets/products-v3/lemonade.png', nuocthom: 'assets/products-v3/pineapple-juice.png',
    dauoliu: 'assets/products-v3/olive-oil.png', nuoccoc: 'assets/products-v3/ambarella-juice.png',
    sotcachua: 'assets/products-v3/tomato-sauce.png', phomai: 'assets/products-v3/farm-cheese.png',
    phomaide: 'assets/products-v3/goat-cheese.png', phomaitrau: 'assets/products-v3/buffalo-cheese.png',
    suachua: 'assets/products-v3/strawberry-yogurt.png', kem: 'assets/products-v3/watermelon-ice-cream.png',
    kemvani: 'assets/products-v3/vanilla-ice-cream.png', kemsaurieng: 'assets/products-v3/durian-ice-cream.png',
    nuoccam: 'assets/products-v3/orange-juice.png', banhmi: 'assets/products-v3/egg-bread.png',
    banhbi: 'assets/products-v3/pumpkin-pie.png', cuonlen: 'assets/products-v3/wool-roll.png',
    vai: 'assets/products-v3/cotton-fabric.png', lua: 'assets/products-v3/silk-fabric.png',
    khanlen: 'assets/products-v3/wool-scarf.png', khanalpaca: 'assets/products-v3/alpaca-scarf.png',
    aolen: 'assets/products-v3/wool-sweater.png', mulen: 'assets/products-v3/rabbit-wool-hat.png',
    banhtao: 'assets/products-v3/apple-pie.png', pizza: 'assets/products-v3/farm-pizza.png',
    banhkem: 'assets/products-v3/strawberry-cake.png', banhmatong: 'assets/products-v3/honey-cake.png',
    banhdua: 'assets/products-v3/pineapple-cake.png', banhgung: 'assets/products-v3/ginger-cake.png',
    botgao: 'assets/products-v3/rice-flour.png', duongmia: 'assets/products-v3/cane-sugar.png', capherang: 'assets/products-v3/roasted-coffee.png',
    caphesua: 'assets/products-v3/iced-milk-coffee.png', socola: 'assets/products-v3/milk-chocolate.png',
    tratui: 'assets/products-v3/tea-bags.png',
    trungcut: 'assets/products-v3/quail-eggs.png', trungvit: 'assets/products-v3/duck-eggs.png',
    trungngong: 'assets/products-v3/goose-egg.png', longtho: 'assets/products-v3/rabbit-fur.png',
    trunggatay: 'assets/products-v3/turkey-eggs.png', totam: 'assets/products-v3/silkworm-silk.png',
    suatrau: 'assets/products-v3/buffalo-milk.png', longalpaca: 'assets/products-v3/alpaca-fleece.png',
    nhunghuou: 'assets/products-v3/deer-velvet.png',
    ruouvang: 'assets/products-v3/aged-grape-wine.png', caonhung: 'assets/products-v3/deer-antler-paste.png',
    nuochoa: 'assets/products-v3/rose-perfume.png', hopphomai: 'assets/products-v3/premium-cheese-box.png',
    aodai: 'assets/products-v3/silk-ao-dai.png', buatiec: 'assets/products-v3/family-feast.png',
    hopqua: 'assets/products-v3/farm-gift-box.png', caphehaohang: 'assets/products-v3/premium-coffee.png',
    oc: 'assets/products-v3/apple-snail.png', ochuong: 'assets/products-v3/spotted-babylon-snail.png',
    ocbantay: 'assets/products-v3/spider-conch-shell.png', ocvunang: 'assets/products-v3/limpet-shell.png',
    octuva: 'assets/products-v3/trumpet-snail-shell.png', ocmongtay: 'assets/products-v3/razor-clam-shell.png',
    ocgai: 'assets/products-v3/spiny-snail-shell.png', ocgiac: 'assets/products-v3/conch-shell.png',
    ocbong: 'assets/products-v3/flower-snail-shell.png', occana: 'assets/products-v3/olive-snail-shell.png',
    ocdua: 'assets/products-v3/coconut-snail-shell.png', ocda: 'assets/products-v3/stone-snail-shell.png',
    ocgao: 'assets/products-v3/rice-snail-shell.png', oclac: 'assets/products-v3/striped-snail-shell.png',
    ocmit: 'assets/products-v3/jackfruit-snail-shell.png', ocnhay: 'assets/products-v3/jumping-snail-shell.png',
    octoi: 'assets/products-v3/garlic-snail-shell.png',
    ocluocsa: 'assets/products-v3/boiled-apple-snails.png', ocrangmuoiot: 'assets/products-v3/chili-salt-apple-snails.png',
    ochuongxaotoi: 'assets/products-v3/garlic-babylon-snails.png', ochuongxaosate: 'assets/products-v3/satay-babylon-snails.png',
    ocnhoixaome: 'assets/products-v3/tamarind-pond-snails.png', ocnhoixaotoi: 'assets/products-v3/garlic-pond-snails.png',
    oclenxaobo: 'assets/products-v3/butter-mud-creeper-snails.png', oclennuongmohanh: 'assets/products-v3/scallion-grilled-mud-creeper-snails.png',
    ocdangnuongmohanh: 'assets/products-v3/scallion-grilled-bitter-snails.png', ocdanghapsa: 'assets/products-v3/lemongrass-steamed-bitter-snails.png',
    ocmorangmuoiot: 'assets/products-v3/chili-salt-moon-snails.png', ocmoluocsa: 'assets/products-v3/lemongrass-moon-snails.png',
    ocgaoxaodua: 'assets/products-v3/coconut-rice-snails.png', ocgaoxaobo: 'assets/products-v3/butter-rice-snails.png',
    ocduahapsa: 'assets/products-v3/lemongrass-coconut-snails.png', ocduaxaodua: 'assets/products-v3/coconut-sauce-snails.png',
    ocmitxaosate: 'assets/products-v3/satay-jackfruit-snails.png', ocmitnuongphomai: 'assets/products-v3/cheese-jackfruit-snails.png',
    oclacnuongphomai: 'assets/products-v3/cheese-striped-snails.png', oclacxaome: 'assets/products-v3/tamarind-striped-snails.png',
    ocbongluocsa: 'assets/products-v3/lemongrass-flower-snails.png', ocbongrangmuoiot: 'assets/products-v3/chili-salt-flower-snails.png',
    ocdaxaotoi: 'assets/products-v3/garlic-stone-snails.png', ocdaxaosate: 'assets/products-v3/satay-stone-snails.png',
    ocgaixaome: 'assets/products-v3/tamarind-spiny-snails.png', ocgaixaotoi: 'assets/products-v3/garlic-spiny-snails.png',
    ocmongtayxaobo: 'assets/products-v3/butter-razor-clams.png', ocmongtaynuongmohanh: 'assets/products-v3/scallion-grilled-razor-clams.png',
    ocgiacnuongmohanh: 'assets/products-v3/scallion-grilled-conch.png', ocgiachapsa: 'assets/products-v3/lemongrass-steamed-conch.png',
    octoirangmuoiot: 'assets/products-v3/chili-salt-garlic-snails.png', octoiluocsa: 'assets/products-v3/lemongrass-garlic-snails.png',
    ocnhayxaodua: 'assets/products-v3/coconut-jumping-snails.png', ocnhayxaobo: 'assets/products-v3/butter-jumping-snails.png',
    occanahapsa: 'assets/products-v3/lemongrass-olive-snails.png', occanaxaodua: 'assets/products-v3/coconut-olive-snails.png',
    ocbantayxaosate: 'assets/products-v3/satay-spider-conch.png', ocbantaynuongphomai: 'assets/products-v3/cheese-spider-conch.png',
    ocvunangnuongphomai: 'assets/products-v3/cheese-limpets.png', ocvunangxaome: 'assets/products-v3/tamarind-limpets.png',
    octuvaluocsa: 'assets/products-v3/lemongrass-trumpet-snails.png', octuvarangmuoiot: 'assets/products-v3/chili-salt-trumpet-snails.png',
    ocnhoi: 'assets/products-v3/pond-snail.png', oclen: 'assets/products-v3/mud-creeper-snail.png',
    ocdang: 'assets/products-v3/bitter-snail.png', ocmo: 'assets/products-v3/moon-snail.png',
    cam: 'assets/art/trees/cam-qua.png', tao: 'assets/art/trees/tao-qua.png', xoai: 'assets/art/trees/xoai-qua.png', thanhlong: 'assets/art/trees/thanhlong-qua.png',
    chuoi: 'assets/art/trees/chuoi-qua.png', chanh: 'assets/art/trees/chanh-qua.png', dua: 'assets/art/trees/dua-qua.png', dao: 'assets/art/trees/dao-qua.png', anhdao: 'assets/art/trees/anhdao-qua.png',
    quame: 'assets/art/trees/quame-qua.png', coc: 'assets/art/trees/coc-qua.png',
    quabo: 'assets/art/trees/quabo-qua.png', saurieng: 'assets/art/trees/saurieng-qua.png',
    canho: 'assets/ui/fish-canho.svg', caro: 'assets/ui/fish-caro.svg', cachep: 'assets/ui/fish-cachep.svg', cakoi: 'assets/ui/fish-cakoi.svg',
    catra: 'assets/ui/fish-catra.svg', dieuhong: 'assets/ui/fish-dieuhong.svg', caloc: 'assets/ui/fish-caloc.svg', cachim: 'assets/ui/fish-cachim.svg',
  };
  const itemIcon = (id) => ITEM_ICON[id] ? A(ITEM_ICON[id]) : (DATA?.config.crops[id] ? cropSprite(id, 3) : null);
  const itemImg = (id, cls = '') => {
    const path = itemIcon(id);
    if (path) return `<img class="${cls}" src="${path}" alt="" />`;
    return `<span class="emoji-ic ${cls}">${itemInfo(id)?.emoji || '❔'}</span>`;
  };
  const COIN = '<img class="coin-img" src="' + A('assets/ui/coin.svg') + '" alt="vàng" />';
  const GEM = '<img class="coin-img" src="' + A('assets/ui/gem.svg') + '" alt="kim cương" />';
  const STAR = '<img class="coin-img" src="' + A('assets/ui/star.svg') + '" alt="sao" />';

  // ---------- helpers ----------
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const normalizeSearch = (value) => String(value || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').replace(/[đĐ]/g, 'd');

  // Trại ngủ (trang chờ sablier) hoặc đang khởi động (502/503): request chưa
  // tới server, nên cứ thử lại tại chỗ mỗi 2s thay vì reload cả trang — người
  // chơi giữ nguyên màn hình đang mở. Chỉ reload khi chờ quá lâu.
  const WAKE_RETRIES = 20;
  const REPLAY_SAFE_POSTS = new Set(['/plant', '/plant-all', '/plant-tree', '/remove-tree', '/harvest', '/harvest-all', '/harvest-help', '/plant-help', '/water', '/water-all', '/water-help-all', '/inspect', '/feed', '/collect', '/machine-run', '/machine-run-all', '/machine-collect', '/machine-collect-all', '/mill', '/mill-collect', '/sell', '/buy', '/buy-animal', '/buy-chicken', '/lottery-buy', '/want-create', '/want-cancel', '/want-fill', '/gold-give', '/gold-ask', '/gold-request-act', '/quest-chest', '/collection-claim', '/star-claim', '/fest-claim', '/order-deliver', '/order-discard', '/machine-upgrade', '/expand', '/speedup', '/skill-learn', '/skill-respec', '/dog-hire', '/away-ack', '/critter-catch', '/poach', '/poach-all', '/poach-animal', '/poach-machine', '/upgrade-barn', '/upgrade-coop', '/upgrade-pond', '/fish', '/fish-stock', '/fish-harvest', '/buy-gems', '/buy-energy', '/luxury-buy', '/luxury-equip']);
  let reloading = false;
  function checkServerBoot(state) {
    if (reloading || !MY_BOOT || !state?.boot || state.boot === MY_BOOT) return false;
    reloading = true;
    toast('🔄 Có bản mới — đang tải lại…');
    setTimeout(() => location.reload(), 800);
    return true;
  }

  async function api(path, body, attempt = 0, requestKey = body !== undefined && REPLAY_SAFE_POSTS.has(path) ? crypto.randomUUID() : null) {
    const isMutation = body !== undefined;
    let res;
    try {
      res = await fetch(`/farm/api${path}`, {
        method: isMutation ? 'POST' : 'GET',
        headers: isMutation ? { 'content-type': 'application/json', ...(requestKey ? { 'idempotency-key': requestKey } : {}) } : undefined,
        body: isMutation ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      if (attempt < WAKE_RETRIES && (!isMutation || requestKey)) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return api(path, body, attempt + 1, requestKey);
      }
      if (isMutation) {
        toast('⚠️ Chưa xác nhận được thao tác — đang đồng bộ lại…');
        setTimeout(refresh, 300);
        throw new Error('mutation_outcome_unknown');
      }
      throw err;
    }
    if (res.status === 401) {
      renderGate();
      throw new Error('not_logged_in');
    }
    if (checkServerBoot({ boot: res.headers.get('x-farm-boot') })) throw new Error('reloading');
    const type = res.headers.get('content-type') || '';
    if (!type.includes('application/json') || res.status === 502 || res.status === 503 || res.status === 504) {
      // Chỉ mutation có nhật ký idempotency mới được gửi lại cùng request key.
      if (isMutation && !requestKey) {
        toast('⚠️ Chưa xác nhận được thao tác — đang đồng bộ lại…');
        setTimeout(refresh, 300);
        throw new Error('mutation_outcome_unknown');
      }
      if (attempt >= WAKE_RETRIES) {
        if (isMutation) {
          toast('⚠️ Chưa xác nhận được thao tác — đang đồng bộ lại…');
          setTimeout(refresh, 300);
          throw new Error('mutation_outcome_unknown');
        }
        renderWaking();
        setTimeout(() => location.reload(), 2500);
        throw new Error('waking');
      }
      if (attempt === 0) {
        if (DATA) toast('🌅 Trại đang thức dậy… đợi vài giây nha');
        else renderWaking();
      }
      await new Promise((r) => setTimeout(r, 2000));
      return api(path, body, attempt + 1, requestKey);
    }
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 404 && /^Route /.test(data.message || '')) {
        toast('🔄 App đang chạy bản cũ — đang tải lại…');
        setTimeout(() => location.reload(), 900);
        throw new Error('stale_client');
      }
      if (data.error === 'state_changed') setTimeout(refresh, 0);
      toast(data.message || ERRORS[data.error] || 'Có lỗi rồi, thử lại nhé!');
      // Đang thăm ruộng mà server bảo hết/chưa tới lượt: ruộng đã đổi (chủ vừa thu,
      // người khác vừa hái ké…) → tải lại ruộng ngay cho nút bấm khớp thực tế.
      if (VISIT && ['nothing_to_poach', 'already_poached', 'not_ready', 'nothing_ready', 'no_plot'].includes(data.error)) setTimeout(refresh, 300);
      throw new Error(data.error || 'error');
    }
    return data;
  }

  const ERRORS = {
    not_enough_gold: 'Không đủ vàng rồi!',
    not_enough_gems: 'Không đủ kim cương!',
    state_changed: 'Trại đã thay đổi. Mở lại ô đất để xem cây hiện tại trước khi nhổ.',
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
    collection_incomplete: 'Thu hoạch đủ các giống trong bộ sưu tập trước nhé.',
    not_enough_quests: 'Xong 3 nhiệm vụ đã rồi mở rương.',
    no_farm: 'Người này chưa mở nông trại.',
    max_plots: 'Đất mở hết cỡ rồi!',
    own_farm: 'Ruộng nhà mình mà!',
    no_empty_plot: 'Không còn ô trống.',
    nothing_ready: 'Chưa có gì sẵn sàng cả.',
    inspect_limit: 'Hôm nay bạn khám nhà này đủ 5 lần rồi.',
    already_inspected: 'Ô này bạn khám rồi.',
    bad_amount: 'Số vàng không hợp lệ.',
    too_many_requests: 'Bạn đang có 5 lời xin chưa được trả lời — chờ đã nhé.',
    request_closed: 'Lời xin này đã đóng rồi.',
    tax_due: 'Còn nợ thuế đất — bán hàng lấy vàng, trả thuế xong mới gieo được.',
    already_owned: 'Bạn đã có món này rồi.',
    not_owned: 'Chưa mua món này.',
    max_level: 'Đã tối đa cấp rồi.',
    lottery_max: 'Đã mua tối đa vé hôm nay.',
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
    queue_full: 'Hàng đợi máy đầy rồi.',
    too_many_wants: 'Tối đa 5 tin đang cần — huỷ bớt hoặc chờ đủ hàng.',
    no_want: 'Tin này đã đóng rồi.',
    own_want: 'Tin của bạn mà 😅',
    water_cooldown: 'Ô này bạn vừa tưới giúp — 15 phút nữa tưới tiếp nhé 💧',
    pond_full: 'Ao đã đầy — thu hoạch hoặc nâng cấp ao.',
    nothing_ready: 'Chưa có gì chín để thu.',
    max_rank: 'Kỹ năng này đã tối đa rồi!',
    respec_cooldown: 'Mới hoàn trả gần đây — 7 ngày mới được làm lại.',
    nothing_to_poach: 'Không còn gì để cuỗm — chủ vừa thu hoạch hoặc có người hái trước rồi 😅',
    poach_cooldown: 'Nhà này vừa bị cuỗm rồi — mỗi giờ chỉ mất 1 thôi 😅',
    max_level: 'Đã nâng tối đa rồi!',
    rate_limited: 'Bạn thao tác hơi nhanh — đợi một chút rồi thử lại nhé.',
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
  function preciseDuration(duration) {
    const seconds = Math.round(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return seconds < 60 ? `${seconds} giây` : remainder ? `${minutes} phút ${remainder} giây` : fmtDuration(duration);
  }
  function animalDuration(ms) {
    const duration = Math.round(ms * (1 - 0.05 * (me().skills?.learned?.nguoibannho || 0)));
    return `<time data-animal-duration-ms="${duration}" datetime="PT${duration / 1000}S" title="Đã tính kỹ năng chăm nuôi">${preciseDuration(duration)}</time>`;
  }
  function cropDurationMs(ms) {
    return Math.round(ms * (1 - 0.05 * (me().skills?.learned?.bantayxanh || 0)));
  }
  function cropDuration(ms, minimum = 0) {
    const duration = Math.max(minimum, cropDurationMs(ms));
    return `<time data-crop-duration-ms="${duration}" datetime="PT${duration / 1000}S" title="Đã tính kỹ năng trồng trọt">${preciseDuration(duration)}</time>`;
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

  function sfx(name) {
    try { window.NTVVAudio?.[name]?.(); } catch {}
  }

  function updateMe(r) {
    if (!r) return;
    if (r.me) {
      if ((r.me.mutationVersion ?? 0) < (DATA.me.mutationVersion ?? 0)) {
        refresh();
        return;
      }
      mutationEpoch += 1;
      const prev = DATA.me.level;
      DATA.me = r.me;
      if (r.me.level > prev) {
        toast(`🎉 Lên cấp ${r.me.level}!`);
        sfx('playLevelUp');
      }
    }
    if (r.farm && VISIT) VISIT = { ownerId: VISIT.ownerId, farm: r.farm, myActs: r.myActs };
  }

  async function run(fn, resource = 'global', control = null) {
    if (pendingResources.has('global') || pendingResources.has(resource)
      || (resource === 'global' && pendingResources.size > 0)) return null;
    pendingResources.add(resource);
    const wasDisabled = control?.disabled;
    if (control) {
      control.disabled = true;
      control.setAttribute('aria-busy', 'true');
    }
    try {
      return await fn();
    } catch {
      return null;
    } finally {
      pendingResources.delete(resource);
      if (control?.isConnected) {
        control.disabled = wasDisabled;
        control.removeAttribute('aria-busy');
      }
    }
  }
  const plotResource = (ownerId, idx) => `plot:${ownerId}:${idx}`;
  const closeSheetAfterAction = (startedSheet) => { if (sheet === startedSheet) sheet = null; };

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
  // Giữ vị trí cuộn của ruộng, sidebar gia đình và thân sheet khi cập nhật DOM
  // tại chỗ (và làm fallback cho vùng động vừa được thay cấu trúc).
  const SCROLL_KEEP = ['.stage-center', '.family-strip', '.sheet-scroll', '.modal'];
  function captureScroll() {
    const out = { sheetKey: sheet ? `${sheet.type}:${sheet.kind || ''}` : '' };
    for (const sel of SCROLL_KEEP) {
      const el = document.querySelector(sel);
      if (el && el.scrollTop > 0) out[sel] = el.scrollTop;
    }
    return out;
  }
  function restoreScroll(saved) {
    const sameSheet = saved.sheetKey === (sheet ? `${sheet.type}:${sheet.kind || ''}` : '');
    for (const sel of SCROLL_KEEP) {
      if (!(sel in saved)) continue;
      if (sel === '.sheet-scroll' && !sameSheet) continue;
      const el = document.querySelector(sel);
      if (el) el.scrollTop = saved[sel];
    }
  }

  // Cập nhật DOM tại chỗ để ảnh, focus và animation không bị khởi tạo lại sau
  // mỗi thao tác. Cây hiện có được tái sử dụng khi node type/tag còn khớp.
  function patchNode(current, next) {
    if (!current || current.nodeType !== next.nodeType
      || (current.nodeType === Node.ELEMENT_NODE && current.tagName !== next.tagName)) {
      current?.replaceWith(next.cloneNode(true));
      return;
    }
    if (current.nodeType === Node.TEXT_NODE) {
      if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
      return;
    }
    if (current.nodeType !== Node.ELEMENT_NODE) return;

    for (const attr of [...current.attributes]) {
      if (!next.hasAttribute(attr.name)) current.removeAttribute(attr.name);
    }
    for (const attr of [...next.attributes]) {
      if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value);
    }
    if (current !== document.activeElement) {
      if (current instanceof HTMLInputElement || current instanceof HTMLTextAreaElement) current.value = next.value;
      if (current instanceof HTMLInputElement) current.checked = next.checked;
      if (current instanceof HTMLSelectElement) current.value = next.value;
    }

    const oldChildren = [...current.childNodes];
    const newChildren = [...next.childNodes];
    const common = Math.min(oldChildren.length, newChildren.length);
    for (let i = 0; i < common; i += 1) patchNode(oldChildren[i], newChildren[i]);
    for (let i = oldChildren.length - 1; i >= newChildren.length; i -= 1) oldChildren[i].remove();
    for (let i = common; i < newChildren.length; i += 1) current.appendChild(newChildren[i].cloneNode(true));
  }

  function patchHtml(root, html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const current = [...root.childNodes];
    const next = [...template.content.childNodes];
    const common = Math.min(current.length, next.length);
    for (let i = 0; i < common; i += 1) patchNode(current[i], next[i]);
    for (let i = current.length - 1; i >= next.length; i -= 1) current[i].remove();
    for (let i = common; i < next.length; i += 1) root.appendChild(next[i].cloneNode(true));
  }

  function render() {
    if (!DATA) return;
    const previousSheetType = lastRenderedSheetType;
    const previousModalType = lastRenderedModalType;
    const modalType = showLb ? 'leaderboard' : DATA.me?.awayReport && !VISIT && !sheet ? 'away' : null;
    if (modalType && !previousModalType) {
      const active = document.activeElement;
      modalReturnFocus = active instanceof HTMLElement && active !== document.body
        ? active.closest('.sheet') ? document.querySelector('[data-sheet="more"]') : active
        : document.getElementById('btn-dock-farm');
      modalReturnFocusId = modalReturnFocus?.id || null;
    }
    const openingSheet = !!sheet && sheet.type !== previousSheetType;
    if (openingSheet && !previousSheetType) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body) sheetReturnFocus = active;
    }
    const savedScroll = captureScroll();
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
    const hasDebts = (m.tax?.owed > 0) || (m.debts?.owe > 0) || (m.debts?.owedToMe > 0);

    const nextHtml = `
      <div class="stage">
        <header class="top-hud">
          <div class="hud-player">
            <span class="hud-avatar">${hudAvatar}</span>
            <span class="hud-info">
              <span class="hud-name${frameCls(m.luxury?.frame)}">${esc(m.name)}</span>${luxLine(m.luxury)}
              <span class="hud-level">
                <span class="hud-lv">Lv ${m.level}</span>
                <i class="hud-xp"><u style="width:${xpPct}%"></u></i>
                <span class="hud-xpnum">${m.levelInto.toLocaleString('vi')}/${m.levelNeed.toLocaleString('vi')}</span>
              </span>
            </span>
          </div>
          <div class="hud-right" role="group" aria-label="Tài nguyên và công cụ">
            <button class="coin-pill" data-sheet="inventory" aria-label="${m.gold.toLocaleString('vi')} vàng, mở kho đồ" title="Vàng ${m.gold.toLocaleString('vi')} · Tài sản ước tính (vàng + kho) ${(m.netWorth ?? m.gold).toLocaleString('vi')} — mở kho để bán đồ">${COIN}<b>${m.gold.toLocaleString('vi')}</b><span class="pill-plus">＋</span></button>
            <button class="coin-pill coin-pill--gem" data-sheet="stars" aria-label="${m.gems.toLocaleString('vi')} kim cương, mở mốc sao" title="Kim cương — nhận từ mốc sao và rương">${GEM}<b>${m.gems.toLocaleString('vi')}</b><span class="pill-plus">＋</span></button>
            <button class="coin-pill coin-pill--energy" data-sheet="fishing" aria-label="${m.energy.current} năng lượng, mở hồ câu cá" title="Năng lượng — mở Hồ câu cá"><img class="coin-img" src="${A('assets/ui/menu-energy.svg')}" alt="" /><b>${m.energy.current}</b><span class="pill-plus">＋</span></button>
            ${m.dog?.active ? `<button class="coin-pill coin-pill--dog" data-sheet="shop" aria-label="Chó canh vườn đang trực, còn ${fmtTime(m.dog.until - Date.now())}, mở cửa hàng" title="Chó canh vườn đang trực">🐕<b>${fmtTime(m.dog.until - Date.now())}</b></button>` : ''}
            <button class="coin-pill coin-pill--star" data-sheet="stars" aria-label="${m.stars.toLocaleString('vi')} sao nông trại, mở mốc sao" title="Sao Nông Trại">${STAR}<b>${m.stars.toLocaleString('vi')}</b>${starReady ? '<i class="dot"></i>' : ''}</button>
            ${hasDebts ? `<button class="coin-pill coin-pill--debt" data-sheet="ledger" aria-label="${((m.tax?.owed || 0) + (m.debts?.owe || 0)).toLocaleString('vi')} vàng nợ và thuế, mở sổ nông thôn" title="Sổ nợ & thuế đất — bấm để xem">${m.tax?.owed > 0 ? '🏛️' : '💸'}<b>${((m.tax?.owed || 0) + (m.debts?.owe || 0)).toLocaleString('vi')}</b><i class="dot"></i></button>` : ''}
            <span class="hud-rounds">
              <button class="hud-round" id="btn-audio-toggle" aria-label="Âm thanh" aria-pressed="${!window.NTVVAudio?.isMuted()}" title="${window.NTVVAudio?.isMuted() ? 'Bật âm thanh' : 'Tắt âm thanh'}"><img class="hud-icon" src="${A(window.NTVVAudio?.isMuted() ? 'assets/ui/menu-audio-off.svg' : 'assets/ui/menu-audio-on.svg')}" alt="" /></button>
              <button class="hud-round" data-sheet="events" aria-label="Mở bản tin làng" title="Bản tin làng"><img class="hud-icon" src="${A('assets/ui/menu-events.svg')}" alt="" /></button>
              <button class="hud-round" id="btn-lb" aria-label="Mở bảng xếp hạng" title="Bảng xếp hạng"><img class="hud-icon" src="${A('assets/ui/menu-leaderboard.svg')}" alt="" /></button>
              <button class="hud-round${hasDebts ? ' hud-round--warn' : ''}" data-sheet="ledger" aria-label="Mở sổ nông thôn" title="Sổ nông thôn"><img class="hud-icon" src="${A('assets/ui/menu-ledger.svg')}" alt="" />${hasDebts ? '<i class="dot"></i>' : ''}</button>
            </span>
          </div>
        </header>
        <nav class="bottom-dock" aria-label="Điều hướng nông trại">
          <button class="dock-btn${!visiting && !sheet && !showLb ? ' dock-btn--active' : ''}" id="btn-dock-farm" title="Nông trại">
            <span class="dock-icon"><img src="${A('assets/ui/dock-farm.svg')}" alt="" /></span>
            <span class="dock-label">Trại</span>
          </button>
          <button class="dock-btn dock-btn--gold" id="btn-harvestall" title="Thu hoạch tất cả">
            <span class="dock-icon"><img src="${A('assets/ui/dock-harvest.svg')}" alt="" /></span>
            ${m.plots.some((p) => p.crop && p.ready) ? '<i class="dot"></i>' : ''}
            <span class="dock-label">Thu hoạch</span>
          </button>
          <button class="dock-btn${sheet?.type === 'shop' ? ' dock-btn--active' : ''}" data-sheet="shop" title="Cửa hàng">
            <span class="dock-icon"><img src="${A('assets/ui/dock-shop.svg')}" alt="" /></span>
            <span class="dock-label">Cửa hàng</span>
          </button>
          <button class="dock-btn${sheet?.type === 'inventory' ? ' dock-btn--active' : ''}" data-sheet="inventory" title="Kho đồ">
            <span class="dock-icon"><img src="${A('assets/ui/dock-inventory.svg')}" alt="" /></span>
            <span class="dock-label">Kho đồ</span>
          </button>
          <button class="dock-btn${sheet?.type === 'more' ? ' dock-btn--active' : ''}" data-sheet="more" title="Thêm tính năng">
            <span class="dock-icon"><img src="${A('assets/ui/dock-more.svg')}" alt="" /></span>
            ${(questsReady || ordersReady || festReady || canLearnAnySkill(m) || m.animals.some((x) => x.ready) || Object.values(m.machines).some((jobs) => Object.values(jobs || {}).some((j) => j.ready)) || hasDebts) ? '<i class="dot"></i>' : ''}
            <span class="dock-label">Thêm</span>
          </button>
        </nav>

        <div class="stage-center">
          <div class="scene-banner">
            <div class="sb-hills"></div>
            <img class="sb sb-house" src="${A('assets/scene-v3/farmhouse_v3.png')}" alt="" />
            <img class="sb sb-tree1" src="${A('assets/pack/tree_01.png')}" alt="" />
            <img class="sb sb-barn" src="${A('assets/scene-v3/red_barn_v3.png')}" alt="" />
            <img class="sb sb-green" src="${A('assets/scene-v3/greenhouse_v3.png')}" alt="" />
            <img class="sb sb-tree2" src="${A('assets/pack/tree_02.png')}" alt="" />
            <span class="sb sb-pen" aria-hidden="true"></span>
            ${renderSceneBarn('cuu', 'sb-sheep', visiting)}
            ${renderSceneBarn('bo', 'sb-cowbarn', visiting)}
            ${sceneHerdCount(visiting, 'heo') ? `<img class="sb sb-pig" src="${A('assets/art/pig.png')}" alt="" />` : ''}
            <img class="sb sb-well" src="${A('assets/pack/well.png')}" alt="" />
            <img class="sb sb-farmer" src="${A('assets/scene-v3/farmer_v3.png')}" alt="" />
            ${(visiting ? visiting.farm.dogUntil > Date.now() : m.dog?.active) ? `<img class="sb sb-dog" src="${A('assets/pets-v3/companion-dog.png')}" alt="" />` : ''}
            ${renderSceneButtons(visiting)}
            <img class="sb sb-logo" src="${A('assets/pack/farm_logo.png')}" alt="Nông Trại Vui Vẻ" />
          </div>

          ${visiting ? `
            <div class="visit-bar">
              <span>👀 Ruộng của <b class="${frameCls(visiting.farm.luxury?.frame)}">${esc(visiting.farm.name)}</b>${visiting.farm.luxury?.title && DATA.config.luxury?.[visiting.farm.luxury.title] ? ` <i class="vis-title">${DATA.config.luxury[visiting.farm.luxury.title].emoji} ${DATA.config.luxury[visiting.farm.luxury.title].name}</i>` : ''}${[...(visiting.farm.luxury?.pets || []), ...(visiting.farm.luxury?.decor || [])].length ? ` <span class="hud-decor">${([...(visiting.farm.luxury.pets || []), ...(visiting.farm.luxury.decor || [])].length + ' món trưng bày')}</span>` : ''} · Lv ${visiting.farm.level}${visiting.farm.online ? ' <span class="online-dot" title="Chủ vườn đang online">🟢 online</span>' : ''}${visiting.farm.dogUntil > Date.now() ? ` <span class="dog-warn">🐕 Có chó canh — ${visiting.farm.dogChance || 20}% bị tóm${visiting.farm.online ? ' (chủ đang online +10%)' : ''}!</span>` : ''}</span>
          ${(() => {
            // Một nút trộm tất cả: ruộng + chuồng + máy (phần nào đang trong giờ chờ thì hiện đồng hồ).
            const loot = visiting.farm.loot || {};
            const now3 = Date.now();
            const plotsN = Object.values(visiting.myActs).filter((x) => x.canPoach).length;
            const animalOk = loot.animalsReady && now3 >= (loot.animalPoachAt || 0);
            const machineOk = loot.machinesReady && now3 >= (loot.machinePoachAt || 0);
            const left = Object.values(visiting.myActs).reduce((a, x) => a + (x.poachLeft || 0), 0);
            const parts = [plotsN ? `${plotsN} ô${left > plotsN ? ` · ${left} lượt` : ''}` : '', animalOk ? 'chuồng' : '', machineOk ? 'máy' : ''].filter(Boolean);
            const waits = [loot.animalsReady && !animalOk ? `⏳ chuồng ${Math.max(1, Math.ceil((loot.animalPoachAt - now3) / 60000))}p` : '', loot.machinesReady && !machineOk ? `⏳ máy ${Math.max(1, Math.ceil((loot.machinePoachAt - now3) / 60000))}p` : ''].filter(Boolean);
            return `${parts.length ? `<button class="gbtn gbtn--gold btn-mini" id="btn-poach-everything" data-plots="${plotsN}" data-animal="${animalOk ? 1 : 0}" data-machine="${machineOk ? 1 : 0}">😋 Trộm hết (${parts.join(' + ')})</button>` : ''}${waits.length ? `<span class="seed-meta">${waits.join(' · ')}</span>` : ''}`;
          })()}
          ${visiting.farm.loot?.emptyPlots ? `<button class="gbtn gbtn--gold btn-mini" id="btn-plant-help">🌱 Trồng giúp (${visiting.farm.loot.emptyPlots})</button>` : ''}
          ${(() => { const n = Object.values(visiting.myActs).filter((x) => x.canWater).length; return n >= 2 ? `<button class="gbtn gbtn--green btn-mini" id="btn-water-help-all">💧 Tưới hết (${n})</button>` : ''; })()}
          ${(() => { const n = visiting.farm.plots.filter((p) => p.crop && p.ready).length; return n ? `<button class="gbtn gbtn--green btn-mini" id="btn-harvest-help">🧺 Thu hoạch giúp (${n})</button>` : ''; })()}
              <button class="gbtn ${INSPECT ? 'gbtn--gold' : 'gbtn--green'} btn-mini" id="btn-inspect-mode" title="Khám xét: bấm vào ô đang trồng (${DATA.config.cansa?.inspectFee ? `tốn ${DATA.config.cansa.inspectFee.toLocaleString('vi')} vàng` : 'miễn phí'}, ${DATA.config.cansa?.inspectPerDay || 5} lượt/nhà/ngày); trúng cần sa thì lĩnh ${(DATA.config.cansa?.bounty || 500000).toLocaleString('vi')}">🔍 Khám xét${INSPECT ? ' — bấm ô' : ''}</button>
              <button class="gbtn gbtn--green btn-mini" id="btn-gold-give">💝 Cho tiền</button>
              <button class="gbtn gbtn--green btn-mini" id="btn-gold-ask">🙏 Xin tiền</button>
              <button id="btn-home" class="gbtn gbtn--gold">🏡 Về nhà</button>
            </div>` : renderToolbar()}

          <div class="field-wrap">
            ${luxStrip((visiting ? visiting.farm : m).luxury)}
            <span class="field-decor decor-1">🌻</span>
            <span class="field-decor decor-2">🍄</span>
            <img class="scarecrow-img" src="${A('assets/decor-v3/scarecrow.png')}" alt="" />
            <span class="butterfly">🦋</span>
            <div class="farm-grid" id="grid">${renderPlots(visiting)}</div>
          </div>

          <section class="family-block" aria-labelledby="family-heading">
            <h3 class="family-heading" id="family-heading">👥 Người nhà</h3>
            <div class="family-search-wrap">
              <span class="family-search-icon">🔍</span>
              <input class="family-search" type="search" aria-label="Tìm người nhà" placeholder="Tìm người nhà…" value="${esc(familyFilter)}" />
            </div>
            <div class="family-strip">${familyStripHtml()}</div>
          </section>

        </div>

        <button class="pond-img pond-btn" data-sheet="fishing" title="Hồ câu cá"><img src="${A('assets/scene-v3/fishing_pond_v3-224.png')}" alt="Hồ câu cá" /></button>

        ${!visiting ? renderQuickbar() : ''}
      </div>

      ${sheet ? renderSheet() : ''}
      ${showLb ? renderLb() : ''}
    `;
    patchHtml(app, nextHtml);
    restoreScroll(savedScroll);
    if (DATA.me?.awayReport && !VISIT && !sheet && !showLb) app.insertAdjacentHTML('beforeend', renderAway(DATA.me.awayReport));
    bind();
    if ((sheet?.type || null) !== lastRenderedSheetType) sheetNavigationEpoch += 1;
    lastRenderedSheetType = sheet?.type || null;
    lastRenderedModalType = modalType;
    if (openingSheet) document.querySelector('.sheet-close')?.focus({ preventScroll: true });
    else if (!sheet && previousSheetType) {
      if (!showLb) {
        const target = sheetReturnFocus?.isConnected && !sheetReturnFocus.closest('.sheet')
          ? sheetReturnFocus : document.getElementById('btn-dock-farm');
        target?.focus({ preventScroll: true });
      }
      sheetReturnFocus = null;
    }
    if (modalType && !previousModalType) document.querySelector('.modal-close, #btn-away-ack')?.focus({ preventScroll: true });
    else if (!modalType && previousModalType) {
      (modalReturnFocus?.isConnected ? modalReturnFocus : document.getElementById(modalReturnFocusId) || document.getElementById('btn-dock-farm'))?.focus({ preventScroll: true });
      modalReturnFocus = null;
      modalReturnFocusId = null;
    }
    if (searchWasFocused) {
      const input = document.querySelector(sheet?.type === 'family' ? '.sheet--family .family-search' : '.family-block .family-search');
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
    const list = q ? DATA.family.filter((u) => fold(u.me ? 'Nhà mình' : u.name).includes(q)) : DATA.family;
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
        ${renderNextStep()}
        ${readyN >= 2 ? `<button class="gbtn gbtn--gold btn-mini" id="btn-harvestall-tb">🧺 Thu hết ${readyN}</button>` : ''}
        ${dryN >= 2 ? `<button class="gbtn gbtn--green btn-mini" id="btn-waterall">💧 Tưới hết ${dryN}</button>` : ''}
        ${empty >= 2 ? `<button class="gbtn gbtn--green btn-mini" id="btn-plantall">🌱 Gieo hết ${empty} ô</button>` : ''}
        ${renderRewardGoal()}
        ${renderCollectionGoal()}
      </div>`;
  }

  function readyRewardGroups(m = me()) {
    const groups = [];
    if (m.daily.done >= m.daily.required && !m.daily.chestClaimed) {
      groups.push({ type: 'quests', title: 'Rương nhiệm vụ ngày', count: 1, detail: `${m.daily.done} nhiệm vụ đã hoàn tất` });
    }
    if (m.starNext && m.stars >= m.starNext.stars) {
      groups.push({ type: 'stars', title: `Mốc ${m.starNext.stars} sao`, count: 1, detail: `Bạn có ${m.stars} sao` });
    }
    const collections = (m.collections || []).filter((collection) => !collection.claimed && collection.items.every((item) => item.found));
    if (collections.length) groups.push({ type: 'collections', title: 'Bộ sưu tập', count: collections.length, detail: collections.map((collection) => collection.name).join(', ') });
    const festival = m.festival.milestones.filter((milestone) => !milestone.claimed && milestone.progress >= milestone.target);
    if (festival.length) groups.push({ type: 'festival', title: 'Quà lễ hội', count: festival.length, detail: m.festival.name });
    return groups;
  }

  function renderRewardGoal() {
    const groups = readyRewardGroups();
    const count = groups.reduce((sum, group) => sum + group.count, 0);
    if (!count) return '';
    return `<button class="collection-goal reward-goal" type="button" data-sheet="rewards"><span aria-hidden="true">🎁</span><span><b>${count} phần thưởng đang chờ</b><small>${groups.map((group) => esc(group.title)).join(' · ')}</small></span><span aria-hidden="true">›</span></button>`;
  }

  function renderCollectionGoal() {
    const collection = (me().collections || []).find((entry) => !entry.claimed);
    if (!collection) return '';
    const found = collection.items.filter((item) => item.found).length;
    const missing = collection.items.find((item) => !item.found);
    const crop = missing && crops()[missing.id];
    const hint = missing
      ? me().level < crop.level ? `${crop.name} mở ở cấp ${crop.level}` : `Thu hoạch ${crop.name} để ghi sổ`
      : `Đã đủ giống · nhận ${collection.gold.toLocaleString('vi')} vàng`;
    return `<button class="collection-goal" type="button" data-sheet="collections">
      <span aria-hidden="true">📒</span><span><b>${esc(collection.name)} · ${found}/${collection.items.length}</b><small>${esc(hint)}</small></span><span aria-hidden="true">›</span>
    </button>`;
  }

  function renderNextStep() {
    const farm = me();
    const plots = farm.plots;
    const ready = plots.filter((plot) => plot.crop && plot.ready).length;
    const empty = plots.filter((plot) => !plot.crop).length;
    const dry = plots.filter((plot) => plot.crop && !plot.ready && !plot.watered).length;
    const nextGrowing = plots.filter((plot) => plot.crop && !plot.ready && plot.readyAt != null)
      .sort((a, b) => a.readyAt - b.readyAt)[0];
    const deliverableOrders = farm.orders.filter(canDeliver).length;
    const finishedJobs = Object.values(farm.machines).reduce((total, jobs) => total
      + Object.values(jobs || {}).reduce((count, job) => count + (job.completed || 0), 0), 0);
    const readyFishBatches = (farm.fishFarm?.batches || []).filter((batch) => batch.ready);
    const hungryAnimals = farm.animals.filter((animal) => animal.ready_at == null).length;
    const readyCollection = (farm.collections || []).find((collection) => !collection.claimed
      && collection.items.every((item) => item.found));
    const readyFestival = farm.festival.milestones.filter((milestone) => !milestone.claimed && milestone.progress >= milestone.target).length;
    const firstSaleReady = farm.level <= 2 && !farm.soldGold
      && Object.entries(farm.inventory).some(([id, qty]) => qty > 0 && crops()[id]);
    const step = ready
      ? { kind: 'harvest', icon: '🧺', title: `${ready} ô đã chín`, detail: 'Chạm để thu hoạch ô đầu tiên.' }
      : firstSaleReady
        ? { kind: 'inventory', icon: '🎒', title: 'Bán vụ đầu tiên', detail: 'Chạm để mở kho và bán nông sản.' }
      : readyCollection
        ? { kind: 'collections', icon: '📒', title: `${readyCollection.name} đã hoàn thành`, detail: `Chạm để nhận ${readyCollection.gold.toLocaleString('vi')} vàng${readyCollection.gems ? ` và ${readyCollection.gems} kim cương` : ''}.` }
      : readyFestival
        ? { kind: 'festival', icon: '🎪', title: `${readyFestival} phần thưởng lễ hội sẵn sàng`, detail: 'Chạm để nhận quà của mùa này.' }
      : deliverableOrders
        ? { kind: 'orders', icon: '🚚', title: `${deliverableOrders} đơn sẵn sàng giao`, detail: 'Chạm để giao hàng và nhận vàng, EXP, sao.' }
      : finishedJobs
        ? { kind: 'mill', icon: '🏭', title: `${finishedJobs} mẻ đã chế biến xong`, detail: 'Chạm để nhận sản phẩm từ nhà máy.' }
      : readyFishBatches.length
        ? { kind: 'pond', icon: '🐟', title: `${readyFishBatches.length} mẻ trong ao đã lớn`, detail: 'Chạm để thu hoạch và giải phóng chỗ nuôi.' }
      : hungryAnimals
        ? { kind: 'feed', icon: '🌰', title: `${hungryAnimals} vật nuôi đang đói`, detail: 'Chạm để mua thức ăn và tiếp tục nuôi.' }
      : dry
        ? { kind: 'water', icon: '💧', title: `${dry} ô cần tưới`, detail: 'Chạm để tưới ô đầu tiên và nhận EXP.' }
        : empty
          ? { kind: 'seed', icon: '🌱', title: `${empty} ô đang trống`, detail: 'Chạm để chọn hạt giống.' }
          : nextGrowing
            ? { kind: 'growing', idx: nextGrowing.idx, readyAt: nextGrowing.readyAt, icon: '⏳', title: 'Vụ tiếp theo sắp chín', detail: `Ô ${nextGrowing.idx + 1} chín sau ${fmtTime(nextGrowing.readyAt - Date.now())}` }
            : { kind: 'orders', icon: '🏡', title: 'Nông trại đang lớn lên', detail: 'Chạm để xem mục tiêu tiếp theo.' };
    return `<button class="farm-next-step" type="button" data-next-step="${step.kind}"${step.kind === 'growing' ? ` data-next-idx="${step.idx}" data-next-ready="${step.readyAt}"` : ''}><span aria-hidden="true">${step.icon}</span><span><b>${step.title}</b><small>${step.detail}</small></span></button>`;
  }

  function renderUpcomingUnlocks(level) {
    const unlocks = [
      ...Object.values(DATA.config.crops).filter((item) => !item.risky).map((item) => ({ ...item, type: 'Cây trồng' })),
      ...Object.values(DATA.config.trees).map((item) => ({ ...item, type: 'Cây ăn quả' })),
      ...Object.values(DATA.config.animals).map((item) => ({ ...item, type: 'Vật nuôi' })),
      ...Object.values(DATA.config.machines).map((item) => ({ ...item, type: 'Chế biến' })),
      { level: DATA.config.orderUnlockLevel, name: 'Đơn hàng', emoji: '🚚', type: 'Tính năng' },
      { level: DATA.config.fishing.level, name: 'Hồ câu cá', emoji: '🎣', type: 'Tính năng' },
    ].filter((item) => item.level > level).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'vi'));
    const nextLevels = [...new Set(unlocks.map((item) => item.level))].slice(0, 3);
    if (!nextLevels.length) return '';
    return `<section class="upcoming-unlocks" aria-label="Sắp mở khóa">
      <h4>Sắp mở khóa</h4>
      ${nextLevels.map((nextLevel) => `<div class="unlock-level"><b>Cấp ${nextLevel}</b><div>${unlocks.filter((item) => item.level === nextLevel).map((item) => `<span class="unlock-item">${item.emoji || '✨'} ${esc(item.name)} <small>${item.type}</small></span>`).join('')}</div></div>`).join('')}
    </section>`;
  }

  function sceneHerdCount(visiting, kind) {
    return visiting ? (visiting.farm.herd || []).find((herd) => herd.kind === kind)?.count || 0
      : me().animals.filter((animal) => animal.kind === kind).length;
  }
  function renderSceneBarn(kind, className, visiting) {
    const farm = visiting ? visiting.farm : me();
    const animal = DATA.config.animals[kind];
    const count = sceneHerdCount(visiting, kind);
    const unlocked = farm.level >= animal.level;
    const label = unlocked ? `${animal.name} · ${count} con` : `Lv ${animal.level}`;
    const attrs = `class="sb ${className} scene-barn-mark${unlocked ? '' : ' sb--locked'}${!visiting && unlocked ? ' sb-btn' : ''}" data-scene-barn="${kind}" data-herd-count="${count}" aria-label="Chuồng ${esc(label)}"`;
    const content = `${barnArtImg(kind)}<span class="sb-tag" aria-hidden="true">${esc(label)}</span>${unlocked ? `<span class="scene-herd-count" aria-hidden="true">${count}</span>` : ''}`;
    return !visiting && unlocked ? `<button ${attrs} data-barn="${kind}">${content}</button>` : `<span ${attrs} role="img">${content}</span>`;
  }
  function renderPlots(visiting) {
    const farm = visiting ? visiting.farm : me();
    const mine = !visiting;
    const now = Date.now();
    const cells = farm.plots.map((p) => {
      const plotName = `Ô đất ${p.idx + 1}`;
      if (!p.crop) {
        return `<button class="plot plot--empty" data-idx="${p.idx}" data-kind="empty" aria-label="${mine ? 'Gieo hạt, ' : ''}${plotName}: ${mine ? 'trống, chọn hạt để gieo' : 'trống'}" ${mine ? '' : 'disabled'}>
          <span class="plot-main">${mine ? `<img class="plot-empty-sprout" src="${A('assets/crops/seed-1.svg')}" alt="" />` : ''}</span>
          ${mine ? '<span class="plot-note">Gieo hạt</span>' : ''}
        </button>`;
      }
      if (p.tree) {
        const t = trees()[p.crop];
        const acts = visiting ? visiting.myActs[p.idx] : null;
        const canPoach = visiting && p.ready && acts?.canPoach;
        const left = p.readyAt - now;
        return `<button class="plot plot--tree${p.ready ? ' plot--ready' : p.watered ? ' plot--growing plot--watered' : ' plot--growing plot--dry'}" data-idx="${p.idx}" data-kind="${p.ready ? (mine ? 'harvest' : canPoach ? 'poach' : 'ripe') : (mine ? (p.watered ? 'plotmenu' : 'waterplot') : (visiting && acts?.canWater ? 'water' : 'growing'))}" aria-label="${plotName}, ${esc(t.name)}: ${p.ready ? (mine ? 'hái quả' : canPoach ? 'hái ké' : 'đã chín') : `${p.watered ? (mine ? 'đã tưới, mở tùy chọn' : 'đã tưới') : mine ? 'tưới cây' : acts?.canWater ? 'tưới giúp' : 'đang lớn'}, còn ${fmtTime(left)}`}" data-ready="${p.readyAt}" data-total="${t.growMs}" data-cropid="${p.crop}">
          <img class="tree-sprite${p.ready ? '' : ' tree-sprite--wait'}" src="${treeArt(p.crop)}" alt="${t.name}" />${TREE_PNG.has(p.crop) ? '' : `<span class="tree-emoji">${t.emoji}</span>`}
          ${p.ready
            ? `<span class="plot-note">${mine ? (p.poached ? 'Bị hái ké 😭' : 'Hái quả!') : canPoach ? 'Hái ké!' : 'Chín rồi'}</span><span class="plot-badge">×${Math.max(0, (p.fruits || 0) - Math.floor((p.poachedN || 0) / 3))}</span>`
            : `<span class="plot-timer">${fmtTime(left)}</span>${p.watered ? '<span class="plot-badge plot-badge--fresh" aria-hidden="true">💧</span>' : mine || acts?.canWater ? '<span class="plot-act plot-act--water" aria-hidden="true">💧</span>' : ''}`}
          ${p.poached && p.ready ? '<span class="plot-act">😋</span>' : ''}${p.treeEndsAt && p.treeEndsAt - Date.now() < t.cycleMs ? '<span class="plot-act" title="Cây sắp tàn">🍂</span>' : ''}
        </button>`;
      }
      const c = crops()[p.crop];
      if (p.ready) {
        const acts = visiting ? visiting.myActs[p.idx] : null;
        const canPoach = visiting && acts?.canPoach;
        return `<button class="plot plot--ready" data-idx="${p.idx}" data-kind="${mine ? 'harvest' : canPoach ? 'poach' : 'ripe'}" aria-label="${plotName}, ${esc(c.name)}: ${mine ? 'thu hoạch' : canPoach ? 'hái ké' : 'đã chín'}">
          <img class="crop-sprite crop-sprite--ready" src="${cropSprite(p.crop, 3)}" alt="${c.name}" />
          <span class="plot-note">${mine ? (p.poached ? 'Bị hái ké 😭' : 'Thu hoạch!') : canPoach ? 'Hái ké!' : 'Chín rồi'}</span>
          ${p.poached ? '<span class="plot-badge">😋</span>' : p.watered ? '<span class="plot-badge plot-badge--fresh">💧</span>' : ''}
          ${!mine && canPoach ? '<span class="plot-act">😋</span>' : ''}
        </button>`;
      }
      const total = Math.max(1, (p.readyAt - p.plantedAt) || c.growMs);
      const left = p.readyAt - now;
      const pct = Math.min(100, Math.max(3, Math.round(((total - left) / total) * 100)));
      const acts = visiting ? visiting.myActs[p.idx] : null;
      const canWater = visiting ? !!acts?.canWater : !p.watered;
      return `<button class="plot plot--growing ${p.watered ? 'plot--watered' : 'plot--dry'}" data-idx="${p.idx}" data-kind="${mine ? (p.watered ? 'plotmenu' : 'waterplot') : canWater ? 'water' : 'growing'}" aria-label="${plotName}, ${esc(c.name)}: ${p.watered ? (mine ? 'đã tưới, mở tùy chọn' : 'đã tưới') : mine ? 'tưới cây' : canWater ? 'tưới giúp' : 'đang lớn'}, còn ${fmtTime(left)}" data-ready="${p.readyAt}" data-total="${total}" data-cropid="${p.crop}">
        <img class="crop-sprite" src="${cropSprite(p.crop, pct < 45 ? 1 : 2)}" alt="${c.name}" />
        <span class="plot-timer">${fmtTime(left)}</span>
        <div class="plot-progress"><i style="width:${pct}%"></i></div>
        ${p.watered ? '<span class="plot-badge plot-badge--fresh" aria-hidden="true">💧</span>' : canWater ? '<span class="plot-act plot-act--water" aria-hidden="true">💧</span>' : ''}
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
        <img class="sb sb-coop${visiting.farm.level < DATA.config.chicken.level ? ' sb--locked' : ''}" src="${A('assets/scene-v3/chicken_coop_v3.png')}" alt="" />
        ${sceneHerdCount(visiting, 'ga') ? `<img class="sb sb-hen2" src="${A('assets/art/chicken_v3.png')}" alt="" />` : ''}
        <img class="sb sb-mill${visiting.farm.level < DATA.config.mill.level ? ' sb--locked' : ''}" src="${A('assets/scene-v3/windmill_v3-224.png')}" alt="" />
        <img class="sb sb-shop" src="${A('assets/scene-v3/market_shop_v3-208.png')}" alt="" />`;
    }
    return `
      ${coopUnlocked ? `
        <button class="sb sb-btn sb-coop" data-sheet="coop" title="Chuồng gà">
          <img src="${A('assets/scene-v3/chicken_coop_v3.png')}" alt="Chuồng gà" />
          ${eggReady ? '<i class="dot"></i>' : ''}
          <span class="sb-tag">${eggReady ? '🥚 Trứng!' : hungry ? 'Gà đói' : 'Chuồng gà'}</span>
        </button>
        ${sceneHerdCount(null, 'ga') ? `<img class="sb sb-hen2" src="${A('assets/art/chicken_v3.png')}" alt="" />` : ''}`
      : `<img class="sb sb-coop sb--locked" src="${A('assets/scene-v3/chicken_coop_v3.png')}" alt="" title="Chuồng gà — cần Lv ${DATA.config.chicken.level}" />`}
      ${millUnlocked ? `
        <button class="sb sb-btn sb-mill" data-sheet="mill" title="Cối xay">
          <img src="${A('assets/scene-v3/windmill_v3-224.png')}" alt="Cối xay" />
          ${millDone ? '<i class="dot"></i>' : ''}
          <span class="sb-tag">${millDone ? '✅ Xong!' : m.mill ? 'Đang xay…' : 'Cối xay'}</span>
        </button>`
      : `<img class="sb sb-mill sb--locked" src="${A('assets/scene-v3/windmill_v3-224.png')}" alt="" title="Cối xay — cần Lv ${DATA.config.mill.level}" />`}
      <button class="sb sb-btn sb-shop" data-sheet="shop" title="Cửa hàng">
          <img src="${A('assets/scene-v3/market_shop_v3-208.png')}" alt="Cửa hàng" />
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
  // Xa xỉ phẩm: khung tên (class) + dòng danh hiệu/trang trí dưới tên.
  const frameCls = (id) => (id ? ` nf nf-${id}` : '');
  const LUXURY_ART = {
    vuonhoa: 'assets/decor-v3/flower-garden.png', denlong: 'assets/decor-v3/garden-lantern.png',
    daiphunnuoc: 'assets/decor-v3/stone-fountain.png', caugo: 'assets/decor-v3/wooden-bridge.png',
    bunhin: 'assets/decor-v3/scarecrow.png',
    coixaygio: 'assets/scene-v3/windmill_v3-224.png', xekeo: 'assets/decor-v3/wooden-handcart.png',
    tuongga: 'assets/decor-v3/golden-rooster-statue.png', hosen: 'assets/decor-v3/lotus-pond.png',
    conglang: 'assets/decor-v3/village-gate.png', gheda: 'assets/decor-v3/stone-garden-bench.png',
    bangten: 'assets/decor-v3/farm-sign.png',
    chuongbocau: 'assets/decor-v3/garden-dovecote.png', caythong: 'assets/decor-v3/decorative-pine.png',
    thuyen: 'assets/decor-v3/wooden-rowboat.png', laudaicat: 'assets/decor-v3/sandcastle.png',
    tuongbovang: 'assets/decor-v3/golden-cow-statue.png', vuonbonsai: 'assets/decor-v3/bonsai-garden.png',
    phaohoa: 'assets/decor-v3/fireworks-display.png', thapdongho: 'assets/decor-v3/village-clock-tower.png',
    tuongda: 'assets/decor-v3/ancient-stone-statue.png', biethu: 'assets/decor-v3/garden-villa.png',
    petcho: 'assets/pets-v3/companion-dog.png', petmeo: 'assets/pets-v3/companion-cat.png',
    pettho: 'assets/art/rabbit_v3.png', petvet: 'assets/pets-v3/companion-parrot.png',
    petrua: 'assets/pets-v3/golden-turtle.png', petkylan: 'assets/pets-v3/gentle-unicorn.png',
    petrong: 'assets/pets-v3/baby-dragon.png',
  };
  const luxuryArt = (id) => LUXURY_ART[id]
    ? `<img class="lux-art" src="${A(LUXURY_ART[id])}" alt="" loading="lazy" />`
    : `<span aria-hidden="true">${DATA.config.luxury[id]?.emoji || ''}</span>`;
  function luxLine(l) {
    if (!l || !DATA.config.luxury) return '';
    const t = l.title ? DATA.config.luxury[l.title] : null;
    const d = (l.pets?.length || 0) + (l.decor?.length || 0);
    if (!t && !d) return '';
    return `<span class="hud-title">${t ? `${t.emoji} ${esc(t.name)}` : ''}${d ? ` <span class="hud-decor">${d} món trưng bày</span>` : ''}</span>`;
  }

  // Dải xa xỉ trên đầu ruộng (mình và khi thăm): danh hiệu + thú cưng + trang trí.
  function luxStrip(l) {
    if (!l || !DATA.config.luxury) return '';
    const L = DATA.config.luxury;
    const t = l.title ? L[l.title] : null;
    const items = [...(l.pets || []), ...(l.decor || [])].filter((id) => L[id]);
    if (!t && !items.length) return '';
    const ownerId = VISIT?.ownerId || me().id;
    const title = t ? `<span class="lux-title-badge">${t.emoji} ${esc(t.name)}</span>` : '';
    if (!items.length) return `<div class="lux-strip">${title}</div>`;
    return `<details class="lux-strip" data-decor-owner="${ownerId}" ${openDecorOwners.has(String(ownerId)) ? 'open' : ''}><summary>${title}<span>Bộ sưu tập (${items.length})</span></summary><ul class="lux-gallery" tabindex="0" aria-label="Trang trí và thú cưng đã sở hữu">${items.map((id) => `<li data-decor="${id}">${luxuryArt(id)}<span>${esc(L[id].name)}</span></li>`).join('')}</ul></details>`;
  }

  // Chấm đỏ Kỹ năng chỉ khi điểm hiện có đủ nâng ít nhất một kỹ năng.
  function canLearnAnySkill(m) {
    const tree = DATA.config.skillTree;
    const sk = m.skills;
    if (!tree || !sk || sk.points <= 0) return false;
    return tree.branches.some((b) => b.nodes.some((n) => {
      const rank = sk.learned[n.id] || 0;
      return rank < tree.maxRank && sk.points >= n.cost * (rank + 1);
    }));
  }

  // Sổ mất trộm trong lúc vắng mặt: hiện một lần khi quay lại, bấm Đã biết để xoá hoặc Trả thù ngay.
  function renderAway(r) {
    const fmt = (t) => new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    const items = r.items.map((x) => `<div class="away-row">${itemImg(x.id, 'away-img')}<span class="away-name">${itemInfo(x.id)?.name || x.id}</span><span class="away-qty">−${x.qty}</span></div>`).join('');
    const thieves = r.thieves.map((t) => `
      <div class="away-thief-card">
        <span class="away-thief-info">🥷 <b>${esc(t.name)}</b>: cuỗm ${t.qty} món (${t.times} lần)</span>
        <button class="gbtn btn-mini gbtn--warn btn-revenge" data-revenge-id="${t.id}" title="Ghé trang trại kẻ trộm để trả thù">🎯 Trả thù</button>
      </div>`).join('');
    return `
      <div class="modal-backdrop" data-away-close="1">
        <div class="modal modal--away" role="dialog" aria-modal="true" aria-labelledby="away-title" onclick="event.stopPropagation()">
          <h3 id="away-title">😱 Trong lúc bạn vắng mặt</h3>
          <p class="sheet-note">Từ ${fmt(r.since)} đến ${fmt(r.until)}, nhà bạn bị chôm tổng cộng <b>${r.total}</b> món:</p>
          <div class="away-scroll">
            ${items}
            <div class="away-thieves-list">
              <div class="sheet-note" style="margin:.3rem 0 .1rem;font-weight:700">Danh sách đạo tặc:</div>
              ${thieves}
            </div>
          </div>
          <button class="btn gbtn gbtn--gold" id="btn-away-ack" style="width:100%;margin-top:.4rem;flex:0 0 auto">Đã biết, đi trả thù thôi 😤</button>
        </div>
      </div>`;
  }

  function sheetShell(title, body, extraClass = '') {
    return `
      <div class="sheet-backdrop" data-close="1"></div>
      <div class="sheet ${extraClass}" role="dialog" aria-modal="true" aria-labelledby="farm-sheet-title">
        <h3 id="farm-sheet-title">${title}</h3>
        <button class="sheet-close" type="button" data-close="1" aria-label="Đóng bảng">×</button>
        <div class="sheet-scroll">${body}</div>
      </div>`;
  }

  // Thẻ một chuồng/ao: trạng thái + nút Mua / Mua đầy / Nâng cấp / Mở.
  function barnCard(a) {
    const m = me();
    const herd = m.animals.filter((x) => x.kind === a.id);
    const readyN = herd.filter((x) => x.ready).length;
    const hungryN = herd.filter((x) => x.ready_at == null).length;
    const locked = m.level < a.level;
    const info = itemInfo(a.product);
    const barn = m.barns[a.id];
    const full = herd.length >= barn.capacity;
    const canBuy = Math.max(0, Math.min(barn.capacity - herd.length, Math.floor(m.gold / a.price)));
    const house = 'chuồng';
    return `<div class="barn-card${locked ? ' barn-card--locked' : ''}${hungryN ? ' barn-card--hungry' : ''}" data-barn-owned="${herd.length > 0}" data-barn-hungry="${hungryN > 0}">
      <div class="barn-head">${barnArtImg(a.id)}
        <span class="seed-info"><span class="seed-name">${a.name}${locked ? '' : ` · ${house} cấp ${barn.level}`}</span>
          <div class="seed-meta">${locked ? `🔒 Mở ở cấp ${a.level}` : `${herd.length}/${barn.capacity} con · ${info.name} ${itemImg(a.product, 'coin-img')} mỗi ${animalDuration(a.produceMs)}${readyN ? ` · <b>${readyN} sẵn sàng</b>` : ''}`}</div></span>
      </div>
      ${hungryN ? `<p class="barn-hunger">${hungryN} con đói · cần ${hungryN * a.feedQty} túi cho một lượt</p>` : ''}
      ${locked ? '' : `<div class="barn-actions">
        <button class="gbtn gbtn--green btn-mini" data-buy-animal="${a.id}" ${full || m.gold < a.price ? 'disabled' : ''}>＋ Mua ${a.name.toLowerCase()} · ${a.price.toLocaleString('vi')} ${COIN}</button>
        <button class="gbtn gbtn--green btn-mini" data-buy-animal="${a.id}" data-count="max" ${canBuy ? '' : 'disabled'}>Mua tối đa (${canBuy} con · ${(canBuy * a.price).toLocaleString('vi')} vàng)</button>
        ${barn.next
          ? `<button class="gbtn gbtn--gold btn-mini" data-preview-barn="${a.id}">Xem nâng cấp ${barn.next.level} · ${barn.next.gold.toLocaleString('vi')} ${COIN}</button>`
          : `<span class="seed-meta">${house === 'ao' ? 'Ao' : 'Chuồng'} đã tối đa</span>`}
        <button class="gbtn btn-mini" data-barn="${a.id}" aria-label="Mở ${house} ${esc(a.name)}">Mở ${house}</button>
      </div>`}
    </div>`;
  }

  // Ao nuôi tiêu hao: thả giống theo mẻ, đủ giờ thu cả mẻ.
  function renderFishFarm(m) {
    const ff = m.fishFarm;
    const cfg = DATA.config.fishFarm;
    const readyN = ff.batches.filter((b) => b.ready).length;
    const room = ff.capacity - ff.used;
    const batchRows = [...ff.batches].sort((a, b) => Number(b.ready) - Number(a.ready) || a.readyAt - b.readyAt).map((b) => {
      const sp = cfg[b.species];
      const left = b.readyAt - Date.now();
      return `<div class="inv-row fish-batch${b.ready ? ' fish-batch--ready' : ''}">
        ${itemImg(sp?.product || b.species, 'seed-sprite')}
        <span class="seed-info"><span class="seed-name">${b.qty} con ${sp?.name || b.species}</span>
          <div class="seed-meta">${b.ready ? '<b>✅ Sẵn sàng thu</b>' : `⏱ còn ${fmtTime(left)}`}</div></span>
        ${b.ready ? `<button class="gbtn gbtn--gold btn-mini" data-fish-harvest="${b.id}" aria-label="Thu ${b.qty} con ${esc(sp?.name || b.species)}">Thu</button>` : ''}
      </div>`;
    }).join('');
    const species = Object.values(cfg).sort((x, y) => x.level - y.level);
    const options = species.map((sp) => {
      return `<option value="${sp.id}" ${m.level < sp.level ? 'disabled' : ''}>${sp.name}${m.level < sp.level ? ` (Lv ${sp.level})` : ''}</option>`;
    }).join('');
    return `<section class="fish-farm" aria-labelledby="fish-farm-title"><h3 id="fish-farm-title">Ao nuôi</h3>
      <p class="sheet-note">Thả giống theo mẻ, đủ giờ thu cả mẻ. Nâng ao câu cá để tăng sức chứa.</p>
      <div class="fish-summary"><div><span>Đang nuôi</span><strong>${ff.used}/${ff.capacity} con</strong></div><div><span>Còn chỗ</span><strong>${room} con</strong></div><div><span>Sẵn sàng thu</span><strong>${readyN} mẻ</strong></div></div>
      ${readyN > 1 ? `<button class="btn gbtn gbtn--gold" id="btn-fish-harvest-all" style="width:100%;margin-bottom:.4rem">✅ Thu hết ${readyN} mẻ</button>` : ''}
      ${batchRows || '<p class="sheet-note">Ao đang trống — thả giống đi!</p>'}
      ${room > 0 ? `<h4 class="fish-stock-title">Thả giống mới</h4><div class="want-form fish-stock-form">
        <label class="want-field want-field--item" for="fish-species">Loài nuôi<select id="fish-species">${options}</select></label>
        <div class="fish-species-detail" id="fish-species-detail"></div>
        <label class="want-field want-field--qty" for="fish-qty">Số con<input id="fish-qty" type="number" inputmode="numeric" min="1" max="${room}" value="1" /></label>
        <button class="gbtn gbtn--green btn-mini" id="btn-fish-stock">🐟 Thả số đã chọn</button>
        <button class="gbtn gbtn--gold btn-mini" id="btn-fish-stock-max">Thả tối đa</button>
      </div><p class="sheet-note fish-preview" id="fish-preview" role="status" aria-live="polite"></p>` : '<p class="sheet-note">Ao đã đầy — thu hoạch hoặc nâng cấp ao để thả thêm.</p>'}</section>`;
  }

  function renderSheet() {
    const m = me();
    const t = sheet.type;

    if (t === 'gold-give' || t === 'gold-ask') {
      const asking = t === 'gold-ask';
      return sheetShell(asking ? '🙏 Xin vàng' : '💝 Tặng vàng', `<p class="sheet-note">${asking ? 'Xin từ' : 'Người nhận'}: <b>${esc(sheet.recipientName)}</b></p>
        <p class="sheet-note">${asking ? 'Gửi lời xin chưa chuyển vàng. Người nhà có thể cho hoặc từ chối trong Xin / Cho tiền.' : `Bạn có ${m.gold.toLocaleString('vi')} vàng. Vàng đã tặng được chuyển ngay cho người nhận.`}</p>
        <div class="mc-finder"><label for="gift-amount">Số vàng muốn ${asking ? 'xin' : 'tặng'}</label>
          <input id="gift-amount" type="number" inputmode="numeric" min="1" max="1000000000" step="1" value="${esc(sheet.amount || '')}" aria-describedby="gift-preview" /></div>
        ${asking ? `<div class="mc-finder"><label for="gift-note">Lời nhắn (không bắt buộc, tối đa 80 ký tự)</label><input id="gift-note" type="text" maxlength="80" value="${esc(sheet.note || '')}" /></div>` : ''}
        <p class="sheet-note" id="gift-preview" role="status" aria-live="polite"></p>
        <div class="sheet-actions"><button class="btn btn-ghost" data-close="1">Hủy</button>
          <button class="btn gbtn gbtn--green" id="btn-gift-send" disabled>Tặng vàng</button></div>`, 'sheet--gift');
    }

    if (t === 'seed') {
      // Lưới thẻ: cây trồng + cây ăn quả; chế độ gieo hết không hiện số ô/tổng giá.
      // Sắp xếp theo thời gian (mặc định), giá trị hoặc cấp — nhớ lựa chọn.
      let seedSort = 'time';
      try { seedSort = localStorage.getItem('seedSort') || 'time'; } catch {}
      const sortBy = (list, timeKey, valueKey) => [...list].sort((x, y) => seedSort === 'value'
        ? (y[valueKey] - x[valueKey]) || (x[timeKey] - y[timeKey])
        : seedSort === 'level' ? (x.level - y.level) || (x[timeKey] - y[timeKey])
        : (x[timeKey] - y[timeKey]) || (x[valueKey] - y[valueKey]));
      const sortBar = `<div class="seed-sort" role="group" aria-label="Sắp xếp giống">
        ${[['time', '⏱ Thời gian'], ['value', '💰 Giá trị'], ['level', '🔓 Cấp']].map(([k, label]) => `<button class="gbtn btn-mini${seedSort === k ? ' gbtn--gold' : ''}" data-seed-sort="${k}" aria-pressed="${seedSort === k}">${label}</button>`).join('')}
      </div>`;
      const finderFields = `<div class="seed-finder mc-finder"><label for="seed-search">Tìm giống theo tên</label>
        <input id="seed-search" type="search" autocomplete="off" value="${esc(sheet.seedQuery || '')}" placeholder="Ví dụ: cà rốt, cam" />
        <p class="seed-result-count mc-result-count" role="status" aria-live="polite"></p>
        <p class="sheet-note seed-search-empty" hidden>Không tìm thấy giống phù hợp. Xóa tìm kiếm để xem lại các giống.</p></div>`;
      const finder = m.level < 4
        ? `<details class="seed-search-disclosure" ${sheet.seedQuery ? 'open' : ''}><summary>Tìm giống khác</summary>${finderFields}</details>`
        : finderFields;
      const cropCard = (c) => {
        const lockLevel = m.level < c.level;
        const locked = lockLevel || m.gold < c.seed;
        const baseProfit = c.sell * DATA.config.harvestYield - c.seed;
        const cycleXp = c.expSow + c.expHarvest;
        return `<button class="seed-card${locked ? ' seed-card--locked' : ''}${sheet.preferredCrop === c.id ? ' seed-card--recommended' : ''}" data-crop="${locked ? '' : c.id}" data-seed-name="${esc(c.name)}" data-seed-unlocked="${lockLevel ? '0' : '1'}" title="${c.name}" ${locked ? 'disabled' : ''}>
          <img class="seed-sprite" src="${cropSprite(c.id, 3)}" alt="" loading="${lockLevel ? 'lazy' : 'eager'}" decoding="async" />
          <span class="seed-name">${c.name}</span>
          <span class="seed-meta">⏱ ${cropDuration(c.growMs)} · ${c.risky ? `${(DATA.config.cansa?.reward || 1000000).toLocaleString('vi')} ${COIN}/cây · bị khám xét = mất trắng` : `~${baseProfit.toLocaleString('vi')} ${COIN}/ô · ${cycleXp} EXP`}</span>
          ${lockLevel ? `<span class="seed-lock">Lv ${c.level}</span>` : `<span class="seed-cost">${c.seed} ${COIN}</span>`}
          ${!lockLevel && m.gold < c.seed ? `<span class="seed-unaffordable">Thiếu ${(c.seed - m.gold).toLocaleString('vi')} vàng</span>` : ''}
        </button>`;
      };
      const allCrops = sortBy(Object.values(crops()), 'growMs', 'sell');
      const availableCrops = allCrops.filter((c) => c.level <= m.level)
        .sort((a, b) => Number(b.id === sheet.preferredCrop) - Number(a.id === sheet.preferredCrop)
          || Number(m.gold < a.seed) - Number(m.gold < b.seed));
      const futureCrops = allCrops.filter((c) => c.level > m.level);
      const treeCard = (t) => {
        const lockLevel = m.level < t.level;
        const locked = lockLevel || m.gold < t.price;
        return `<button class="seed-card seed-card--tree${locked ? ' seed-card--locked' : ''}" data-tree="${locked ? '' : t.id}" data-seed-name="${esc(t.name)}" data-seed-unlocked="${lockLevel ? '0' : '1'}" title="${t.name} — lớn ${preciseDuration(cropDurationMs(t.growMs))}, rồi ${t.yield} quả mỗi ${preciseDuration(Math.max(1000, cropDurationMs(t.cycleMs)))}, tàn sau ${fmtDuration(t.lifeMs)}" ${locked ? 'disabled' : ''}>
          <img class="seed-sprite" src="${treeArt(t.id)}" alt="" loading="${lockLevel ? 'lazy' : 'eager'}" decoding="async" />
          <span class="seed-name">${t.name} ${t.emoji}</span>
          <span class="seed-meta">🌳 lớn ${cropDuration(t.growMs)} · ${t.yield} quả/${cropDuration(t.cycleMs, 1000)} · sống ${fmtDuration(t.lifeMs)} · ${t.sell.toLocaleString('vi')} ${COIN}</span>
          ${lockLevel ? `<span class="seed-lock">Lv ${t.level}</span>` : `<span class="seed-cost">${t.price.toLocaleString('vi')} ${COIN}</span>`}
          ${!lockLevel && m.gold < t.price ? `<span class="seed-unaffordable">Thiếu ${(t.price - m.gold).toLocaleString('vi')} vàng</span>` : ''}
        </button>`;
      };
      const allTrees = sortBy(Object.values(trees()), 'growMs', 'sell');
      const availableTrees = allTrees.filter((tree) => tree.level <= m.level)
        .sort((a, b) => Number(m.gold < a.price) - Number(m.gold < b.price));
      const futureTrees = allTrees.filter((tree) => tree.level > m.level);
      return sheetShell(
        sheet.all ? `🧺 Gieo hết ô trống <span class="sheet-coins">${COIN} ${m.gold.toLocaleString('vi')}</span>`
          : `🌱 Chọn hạt giống <span class="sheet-coins">${COIN} ${m.gold.toLocaleString('vi')}</span>`,
        `${sheet.all ? '<p class="sheet-note">Chọn một giống — gieo kín mọi ô trống theo số vàng đang có.</p>' : ''}
         ${sheet.preferredCrop ? `<p class="sheet-note seed-tip">🌱 Đơn hàng cần ${esc(crops()[sheet.preferredCrop]?.name || sheet.preferredCrop)}. Chọn giống được đánh dấu để gieo vào ô trống.</p>` : ''}
         ${m.level === 1 ? '<p class="sheet-note seed-tip">🌾 Bắt đầu với Lúa mì: thu sau 1 phút. Cà rốt cho nhiều vàng hơn nếu bạn có thời gian chờ.</p>' : ''}
         <p class="sheet-note">Lãi ước tính cho một ô sau khi bán đủ ${DATA.config.harvestYield} nông sản; giá chợ có thể thay đổi.</p>
         ${finder}${sortBar}
         <section data-seed-section><h3 class="seed-section-title">🌱 Trồng được ở cấp ${m.level}</h3>
         <div class="seed-grid">${availableCrops.map(cropCard).join('')}</div></section>
         ${availableTrees.length ? `<section data-seed-section><h3 class="seed-section-title">🌳 Cây ăn quả</h3><div class="seed-grid">${availableTrees.map(treeCard).join('')}</div></section>` : ''}
         ${futureCrops.length || futureTrees.length ? `<details class="seed-future"><summary>🔒 Xem giống sắp mở (${futureCrops.length + futureTrees.length})</summary>
           ${futureCrops.length ? `<section data-seed-section><div class="seed-grid">${futureCrops.map(cropCard).join('')}</div></section>` : ''}
           ${futureTrees.length ? `<section data-seed-section><h3 class="seed-section-title">🌳 Cây ăn quả sắp mở</h3><div class="seed-grid">${futureTrees.map(treeCard).join('')}</div></section>` : ''}
         </details>` : ''}`,
        'sheet--wide sheet--seed',
      );
    }

    if (t === 'plotmenu') {
      const p = m.plots[sheet.idx];
      if (sheet.removeTree) {
        const target = sheet.removeTree;
        const valid = p?.tree && m.mutationVersion === target.version;
        return sheetShell(`Nhổ cây ${esc(trees()[target.crop]?.name || '')}?`, `<article class="festival-card tree-removal-review">
          <p class="festival-hint">Ô đất ${sheet.idx + 1} sẽ trống. Cây bị mất và không hoàn lại vàng mua cây.</p>
          <p class="festival-hint">${p?.fruits ? `${p.fruits} quả trên cây cũng bị mất. ` : ''}Các vụ quả tương lai của cây này sẽ dừng.</p>
          ${valid ? '' : '<p class="festival-hint">Trại đã thay đổi. Giữ cây và mở lại để xem trạng thái mới.</p>'}
          </article><div class="sheet-actions"><button class="btn gbtn gbtn--green" id="btn-cancel-remove-tree">Giữ cây</button>
          <button class="btn btn-ghost" id="btn-confirm-remove-tree" ${valid ? '' : 'disabled'}>Nhổ cây, không hoàn vàng</button></div>`, 'sheet--tree-removal');
      }
      if (!p || !p.crop || p.ready) return '';
      const info = p.tree ? trees()[p.crop] : crops()[p.crop];
      const left = p.readyAt - Date.now();
      const cost = Math.max(1, Math.ceil(left / (5 * 60_000)));
      const icon = p.tree ? `<img class="seed-sprite" src="${treeArt(p.crop)}" alt="" />` : `<img class="seed-sprite" src="${cropSprite(p.crop, 3)}" alt="" />`;
      return sheetShell(
        `${icon} ${info.name}`,
        `<p class="sheet-note">Còn <b>${fmtTime(left)}</b> nữa là ${p.tree ? 'ra quả' : 'chín'}.${p.watered ? ' Đã tưới 💧 (Tươi tốt).' : ''}${p.tree && p.treeEndsAt ? ` 🍂 Cây còn sống <b>${fmtDuration(Math.max(0, p.treeEndsAt - Date.now()))}</b>.` : ''}</p>
         <div class="sheet-actions">
           ${p.watered ? '' : `<button class="btn gbtn gbtn--green" id="btn-water-own">💧 Tưới (+EXP khi thu)</button>`}
           <button class="btn gbtn gbtn--gold" id="btn-speedup-plot">${GEM} ${cost} · ${p.tree ? 'Ra quả ngay' : 'Chín ngay'}</button>
           ${p.tree ? `<button class="btn btn-ghost" id="btn-remove-tree">🪓 Nhổ cây</button>` : ''}
         </div>`,
      );
    }

    if (t === 'inventory') {
      const entries = Object.entries(m.inventory);
      const animalProducts = new Set(Object.values(DATA.config.animals).map((animal) => animal.product));
      const inventoryGroup = (id) => crops()[id] ? 'crops' : trees()[id] ? 'fruit'
        : animalProducts.has(id) ? 'animals'
          : DATA.config.machines[goods()[id]?.source] ? 'products' : 'other';
      const inventoryGroups = [
        ['all', 'Tất cả'], ['crops', 'Cây trồng'], ['fruit', 'Trái cây'],
        ['animals', 'Vật nuôi'], ['products', 'Chế biến'], ['other', 'Khác'],
      ];
      const inventoryCounts = { all: entries.length, crops: 0, fruit: 0, animals: 0, products: 0, other: 0 };
      entries.forEach(([id]) => { inventoryCounts[inventoryGroup(id)] += 1; });
      const selectedGroup = inventoryGroups.some(([key]) => key === sheet.inventoryGroup) ? sheet.inventoryGroup : 'all';
      const finder = `<div class="inv-finder">
        <label for="inventory-search">Tìm trong kho</label>
        <input id="inventory-search" type="search" autocomplete="off" value="${esc(sheet.inventoryQuery || '')}" placeholder="Tên vật phẩm" />
        <div class="inv-groups" role="group" aria-label="Lọc kho theo loại">${inventoryGroups.map(([key, label]) => `<button type="button" data-inventory-group="${key}" aria-pressed="${selectedGroup === key}">${label} (${inventoryCounts[key]})</button>`).join('')}</div>
        <p class="inv-result-count" aria-live="polite"></p>
        <p class="sheet-note inv-filter-empty" hidden>Không tìm thấy vật phẩm phù hợp. Chọn Tất cả hoặc xóa từ tìm kiếm.</p>
      </div>`;
      const rows = entries.length === 0
        ? '<p class="sheet-note">Kho trống — thu hoạch gì đó đi!</p>'
        : entries.map(([id, q]) => {
            const info = itemInfo(id);
            const quote = m.salePrices?.[id];
            const saleRate = quote?.unitGold ?? info?.sell ?? 0;
            return `<div class="inv-row${info?.sell ? ' inv-row--sell' : ''}" data-item="${id}" data-inventory-kind="${inventoryGroup(id)}" data-sale-rate="${saleRate}">
              ${itemImg(id)}
              <span class="seed-info"><span class="seed-name">${info?.name || id}</span>
                <div class="seed-meta">x${q}${info?.sell ? ` · ~${Math.round(saleRate).toLocaleString('vi')} ${COIN}/cái${quote?.bonusPercent ? ` · +${quote.bonusPercent}% kỹ năng` : ''}${m.market?.[id] ? ` <i class="sat">📉 −${Math.round((1 - m.market[id].mult) * 100)}% bão hoà · hồi ~${m.market[id].hours}h</i>` : ''}` : ' · không bán được'}</div>
                ${info?.sell ? `<p class="seed-meta sale-preview" aria-live="polite">Bán 1: ước tính ${Math.round(saleRate).toLocaleString('vi')} vàng.</p>` : ''}</span>
              ${info?.sell ? `
                <span class="btn-group">
                  <span class="qty-ctl">
                    <button type="button" data-qstep="-1">−</button>
                    <input class="qty-input" type="number" inputmode="numeric" aria-label="Số lượng ${esc(info?.name || id)} muốn bán" min="1" max="${q}" value="1" />
                    <button type="button" data-qstep="1">＋</button>
                  </span>
                  <button class="gbtn gbtn--gold btn-mini" data-sell="${id}">Bán 1</button>
                  <button class="gbtn gbtn--green btn-mini" data-sell="${id}" data-qty="${q}">Hết</button>
                </span>` : ''}
            </div>`;
          }).join('');
      const worth = `<div class="inv-worth" role="group" aria-label="Giá trị tài sản">
        <div class="inv-worth-card"><span>Giá trị kho</span><strong>${(m.inventoryValue || 0).toLocaleString('vi')} ${COIN}</strong><small>Giá gốc, chưa tính kỹ năng/bão hoà</small></div>
        <div class="inv-worth-card"><span>Tổng tài sản</span><strong>${(m.netWorth ?? m.gold).toLocaleString('vi')} ${COIN}</strong><small>Vàng + giá trị kho cơ bản</small></div>
      </div>`;
      return sheetShell(`🎒 Kho đồ <span class="sheet-coins">${COIN} ${m.gold.toLocaleString('vi')}</span>`, worth + '<p class="sheet-note">Ước tính bán đã tính kỹ năng và bão hoà. Giá thực nhận chốt lúc bán.</p>' + finder + rows, 'sheet--inventory');
    }

    if (t === 'shop') {
      const feed = goods().thucan;
      const shopCategory = sheet.shopCategory || 'all';
      const categories = { all: 'Tất cả', supplies: 'Thức ăn & hạt', animals: 'Vật nuôi', gems: 'Kim cương', guard: 'Canh vườn' };
      const categoryButtons = `<div class="mc-view-switch" role="group" aria-label="Danh mục cửa hàng">${Object.entries(categories).map(([id, label]) => `<button type="button" data-shop-category="${id}" aria-pressed="${shopCategory === id}">${label}</button>`).join('')}</div>`;
      const categoryHidden = (id) => shopCategory !== 'all' && shopCategory !== id ? 'hidden' : '';
      const chickenCount = m.animals.filter((animal) => animal.kind === 'ga').length;
      const seedRows = Object.values(crops()).filter((c) => m.level >= c.level).slice(-4).reverse()
        .map((c) => `<div class="seed-meta">· ${c.name}: hạt ${c.seed} ${COIN}, bán ${c.sell} ${COIN}</div>`).join('');
      return sheetShell(
        `🏪 Cửa hàng <span class="sheet-coins">${COIN} ${m.gold.toLocaleString('vi')}</span>`,
        `${categoryButtons}<section data-shop-section="gems" ${categoryHidden('gems')} aria-labelledby="gem-exchange-heading">
           <h3 id="gem-exchange-heading">Đổi vàng lấy kim cương</h3>
           <p class="sheet-note">Dùng để tăng tốc, mua năng lượng, hoàn điểm kỹ năng. Vàng dùng để đổi sẽ rời khỏi kinh tế làng.</p>
           ${(DATA.config.gemPacks || []).map((p) => `<article class="festival-card" data-gem-pack="${p.id}">
             <div class="festival-card-heading"><h4>${p.gems} kim cương</h4><span>${p.gold.toLocaleString('vi')} vàng</span></div>
             <p class="festival-hint">${(p.gold / p.gems).toLocaleString('vi')} vàng / kim cương.</p>
             <p class="festival-hint gem-exchange-balance">${m.gold >= p.gold ? `Sau khi đổi: còn ${(m.gold - p.gold).toLocaleString('vi')} vàng · có ${(m.gems + p.gems).toLocaleString('vi')} kim cương.` : `Thiếu ${(p.gold - m.gold).toLocaleString('vi')} vàng.`}</p>
             <div class="festival-card-footer"><button class="gbtn gbtn--green" data-buy-gems="${p.id}" ${m.gold >= p.gold ? '' : 'disabled'}>Đổi ${p.gold.toLocaleString('vi')} vàng lấy ${p.gems} kim cương</button></div>
           </article>`).join('')}
         </section><section data-shop-section="supplies" ${categoryHidden('supplies')}><div class="inv-row">
           <img src="${A('assets/ui/feed.svg')}" alt="" />
           <span class="seed-info"><span class="seed-name">Thức ăn gia súc</span>
             <div class="seed-meta">${feed.buy} ${COIN}/túi · gà ăn 1 túi cho 1 trứng</div></span>
           <span class="btn-group">
             ${[1, 10, 100].map((qty) => `<button class="gbtn ${qty === 1 ? 'gbtn--green' : 'gbtn--gold'} btn-mini" data-buy="thucan" data-qty="${qty}" ${m.gold >= feed.buy * qty ? '' : 'disabled'}>${qty} túi<small>${(feed.buy * qty).toLocaleString('vi')} vàng</small></button>`).join('')}
           </span>
         </div>
         ${sheet.returnBarn ? `<p class="sheet-note">Có thức ăn, chuồng tự cho ăn và chạy tiếp.</p><button class="btn gbtn gbtn--green" data-barn="${esc(sheet.returnBarn)}">Về chuồng ${esc(DATA.config.animals[sheet.returnBarn]?.name || '')}</button>` : ''}
         <p class="sheet-note">Hạt giống mua ngay lúc gieo: chạm ô đất trống.</p>${seedRows}</section>
         <section data-shop-section="guard" ${categoryHidden('guard')}><section class="festival-card dog-hire" aria-labelledby="dog-hire-heading">
           <div class="festival-card-heading"><img class="lux-art" src="${A('assets/pets-v3/companion-dog.png')}" alt="" loading="lazy" /><h3 id="dog-hire-heading">Chó canh vườn</h3></div>
           <p class="festival-hint dog-hire-status">${m.dog?.active ? `Đang trực, còn ${fmtTime(m.dog.until - Date.now())}. Mua thêm sẽ nối tiếp ca hiện tại.` : 'Chưa có ca trực. Ca mới bắt đầu ngay khi thuê.'}</p>
           <p class="festival-hint">Tỷ lệ bắt trộm ${Math.round(DATA.config.dog.catchChance * 100)}%, thêm ${Math.round((DATA.config.dog.onlineBonus || 0) * 100)} điểm phần trăm khi bạn online. Không đảm bảo chặn mọi lần trộm.</p>
           <p class="festival-hint">Kẻ trộm bị bắt nộp ${DATA.config.dog.fine.toLocaleString('vi')} vàng cho bạn; mỗi lần bị bắt liên tiếp tăng ${DATA.config.dog.fineStep.toLocaleString('vi')} vàng. Trộm trót lọt thì mức phạt trở về ban đầu.</p>
           ${DATA.config.dog.hoursOptions.map((h) => {
             const cost = DATA.config.dog.pricePerHour * h;
             return `<article class="festival-card" data-dog-option="${h}"><div class="festival-card-heading"><h4>${m.dog?.active ? 'Thêm' : 'Thuê'} ${h} giờ</h4><span>${cost.toLocaleString('vi')} vàng</span></div>
               <p class="festival-hint dog-hire-balance">${m.gold >= cost ? `Sau khi thuê: còn ${(m.gold - cost).toLocaleString('vi')} vàng.` : `Thiếu ${(cost - m.gold).toLocaleString('vi')} vàng.`}</p>
               <div class="festival-card-footer"><button class="gbtn gbtn--green" data-dog-hire="${h}" ${m.gold >= cost ? '' : 'disabled'}>Thuê ${h} giờ · ${cost.toLocaleString('vi')} vàng</button></div></article>`;
           }).join('')}
         </section></section><section data-shop-section="animals" ${categoryHidden('animals')}>
         ${m.level >= DATA.config.chicken.level ? `
         <div class="inv-row">
           <img src="${A('assets/art/chicken.png')}" alt="" />
           <span class="seed-info"><span class="seed-name">Gà mái</span>
             <div class="seed-meta">${DATA.config.chicken.price} ${COIN} · đẻ trứng ${animalDuration(DATA.config.chicken.produceMs)}/quả · chuồng ${chickenCount}/${m.barns.ga.capacity}</div></span>
           <button class="gbtn gbtn--green btn-mini" data-buy-animal="ga" ${chickenCount >= m.barns.ga.capacity || m.gold < DATA.config.chicken.price ? 'disabled' : ''}>${chickenCount >= m.barns.ga.capacity ? 'Chuồng đầy' : 'Mua gà'}</button>
         </div>` : ''}
         ${Object.keys(DATA.config.animals).filter((k) => k !== 'ga').sort((x, y) => DATA.config.animals[x].level - DATA.config.animals[y].level).map((k) => {
           const a = DATA.config.animals[k];
           if (m.level < a.level) return `<div class="inv-row">${barnArtImg(k)}<span class="seed-info"><span class="seed-name">${a.name}</span><div class="seed-meta">🔒 Mở ở cấp ${a.level}</div></span></div>`;
           const herd = m.animals.filter((x) => x.kind === k).length;
           const info = itemInfo(a.product);
           return `<div class="inv-row">
             ${barnArtImg(k)}
             <span class="seed-info"><span class="seed-name">${a.name}</span>
               <div class="seed-meta">${a.price.toLocaleString('vi')} ${COIN} · ${info.name} ${itemImg(a.product, 'coin-img')} mỗi ${animalDuration(a.produceMs)} · chuồng ${herd}/${m.barns[k].capacity}</div></span>
             <button class="gbtn gbtn--green btn-mini" data-buy-animal="${k}" aria-label="${herd >= m.barns[k].capacity ? `Chuồng đầy: ${esc(a.name)}` : `Mua ${esc(a.name)} với ${a.price.toLocaleString('vi')} vàng`}" ${herd >= m.barns[k].capacity || m.gold < a.price ? 'disabled' : ''}>${herd >= m.barns[k].capacity ? 'Chuồng đầy' : 'Mua'}</button>
           </div>`;
         }).join('')}
         </section>`,
        'sheet--shop',
      );
    }

    if (t === 'rewards') {
      const groups = readyRewardGroups(m);
      const rows = groups.map((group) => `<article class="festival-card" data-reward-group="${group.type}">
        <div class="festival-card-heading"><h4>${esc(group.title)}</h4><span class="festival-status">${group.count} quà sẵn sàng</span></div>
        <p class="festival-hint">${esc(group.detail)}</p>
        <button class="gbtn gbtn--gold" data-sheet="${group.type}" aria-label="Xem quà: ${esc(group.title)}">Xem quà</button>
      </article>`).join('');
      return sheetShell('🎁 Phần thưởng đang chờ', `<p class="sheet-note">Mở từng mục để xem và nhận thưởng.</p>${rows || '<p class="sheet-note">Đã nhận hết quà sẵn sàng. Tiếp tục chăm trại để mở mốc mới.</p>'}`, 'sheet--rewards');
    }

    if (t === 'quests') {
      const d = m.daily;
      const activities = {
        harvest: { farm: true, label: 'Ra ruộng' }, sow: { farm: true, label: 'Ra ruộng' },
        deliver: { sheet: 'orders', level: DATA.config.orderUnlockLevel, label: 'Xem đơn hàng' },
        process: { sheet: 'mill', level: Math.min(...Object.values(DATA.config.machines).map((machine) => machine.level)), label: 'Mở chế biến' },
        feed: { sheet: 'barns', level: DATA.config.chicken.level, label: 'Xem chuồng trại' },
        sell: { sheet: 'inventory', label: 'Mở kho bán hàng' },
        fish: { sheet: 'fishing', level: DATA.config.fishing.level, label: 'Đi câu cá' },
      };
      const rows = [...d.quests].sort((a, b) => Number(a.progress >= a.target) - Number(b.progress >= b.target)).map((q) => {
        const done = q.progress >= q.target;
        const activity = activities[q.id];
        const action = done ? `<span class="festival-claimed">${d.chestClaimed ? 'Đã nhận thưởng' : 'Đã hoàn tất'}</span>`
          : m.level < (activity.level || 1) ? `<button class="gbtn" disabled>Mở ở cấp ${activity.level}</button>`
          : `<button class="gbtn gbtn--green" ${activity.farm ? 'data-festival-farm' : `data-sheet="${activity.sheet}"`}>${activity.label}</button>`;
        return `<article class="festival-card${done ? ' festival-card--claimed' : ''}" data-daily-quest="${q.id}" aria-labelledby="daily-${q.id}">
          <div class="festival-card-heading"><h4 id="daily-${q.id}"><span aria-hidden="true">${q.emoji}</span> ${esc(q.name)}</h4><span class="festival-status">${q.progress}/${q.target}</span></div>
          <div class="q-track" role="progressbar" aria-label="Tiến độ ${esc(q.name)}" aria-valuemin="0" aria-valuemax="${q.target}" aria-valuenow="${Math.min(q.progress, q.target)}"><i style="width:${Math.min(100, Math.round((q.progress / q.target) * 100))}%"></i></div>
          <div class="festival-card-footer"><span class="festival-reward">Thưởng: ${q.gold.toLocaleString('vi')} ${COIN} +${q.exp} EXP${q.stars ? ` +${q.stars}${STAR}` : ''}</span>${action}</div>
        </article>`;
      }).join('');
      const canChest = d.done >= d.required && !d.chestClaimed;
      return sheetShell(
        `🧾 Nhiệm vụ ngày <span class="sheet-coins">${d.done}/${d.required} ✅</span>`,
        `<p class="festival-summary">Đã xong ${d.done} nhiệm vụ · ${d.chestClaimed ? 'Đã mở rương hôm nay' : `cần ${Math.max(0, d.required - d.done)} nhiệm vụ nữa để mở rương`}.</p>
         <p class="sheet-note">Mở rương nhận thưởng các nhiệm vụ đã xong. Sau khi mở, mỗi nhiệm vụ còn lại tự trả thưởng khi hoàn tất.</p>
         <button class="btn gbtn ${canChest ? 'gbtn--gold' : 'gbtn--green'}" id="btn-chest" ${canChest ? '' : 'disabled'} style="width:100%;margin-bottom:.7rem">
           ${d.chestClaimed ? 'Mai lại có rương mới 🎁' : canChest ? '🎁 Mở rương ngày!' : `🎁 Xong ${d.required} nhiệm vụ để mở rương`}
         </button>${rows}`,
        'sheet--quests',
      );
    }

    if (t === 'collections') {
      const rows = (m.collections || []).map((collection) => {
        const count = collection.items.filter((entry) => entry.found).length;
        const complete = count === collection.items.length;
        return `<section class="machine-block" aria-label="${esc(collection.name)}">
          <h4>📒 ${esc(collection.name)} · ${count}/${collection.items.length}</h4>
          <p class="sheet-note">Thu hoạch mỗi giống một lần để ghi vào sổ. Tiến độ được giữ qua các mùa.</p>
          <div class="collection-grid">${collection.items.map(({ id, found }) => `<div class="collection-item${found ? ' collection-item--found' : ''}">
            <img src="${cropSprite(id, 3)}" alt="" />
            <span>${esc(crops()[id]?.name || id)}</span><b>${found ? '✓' : '○'}</b>
          </div>`).join('')}</div>
          <div class="sheet-actions"><span class="seed-meta">Thưởng: ${collection.gold.toLocaleString('vi')} ${COIN}${collection.gems ? ` · ${collection.gems}${GEM}` : ''}</span>
            <button class="gbtn gbtn--gold btn-mini" data-collection-claim="${collection.id}" ${complete && !collection.claimed ? '' : 'disabled'}>${collection.claimed ? 'Đã nhận' : complete ? 'Nhận thưởng' : 'Chưa đủ'}</button>
          </div>
        </section>`;
      }).join('');
      return sheetShell('📒 Sổ mùa vụ', `<p class="sheet-note">Bộ sưu tập ghi nhận các vụ thu hoạch từ khi Sổ mùa vụ ra mắt.</p>${rows}`);
    }

    if (t === 'orders') {
      const rows = m.orders.length === 0
        ? '<p class="sheet-note">Đơn mới đang trên đường tới…</p>'
        : [...m.orders].sort((a, b) => Number(canDeliver(b)) - Number(canDeliver(a)) || a.slot - b.slot).map((o) => {
            const ok = canDeliver(o);
            const missing = Object.entries(o.items).reduce((sum, [id, q]) => sum + Math.max(0, q - (m.inventory[id] || 0)), 0);
            const quick = o.slot === 0 && Object.keys(o.items).length === 1 && Boolean(crops()[Object.keys(o.items)[0]]);
            const missingItems = Object.entries(o.items).filter(([id, q]) => (m.inventory[id] || 0) < q);
            const missingCropId = missingItems.find(([id]) => crops()[id] && !crops()[id].risky)?.[0];
            const missingRecipeId = !missingCropId && missingItems.find(([id]) => {
              const machine = DATA.config.machines[goods()[id]?.source];
              return machine && m.level >= machine.level && Object.values(machine.recipes).some((recipe) => recipe.out[id]);
            })?.[0];
            const emptyPlot = m.plots.find((plot) => !plot.crop);
            const canGrowMissing = missingCropId && emptyPlot && m.gold >= crops()[missingCropId].seed;
            const items = Object.entries(o.items).map(([id, q]) => {
              const have = m.inventory[id] || 0;
              const itemName = esc(itemInfo(id)?.name || id);
              return `<span class="o-item${have >= q ? ' o-item--ok' : ''}">${itemImg(id)}<span class="o-item-name">${itemName}</span><span class="o-item-count">${Math.min(have, q)}/${q}</span></span>`;
            }).join('');
            return `<div class="order-card${ok ? ' order-card--ready' : ''}">
              <div class="o-status">${ok ? '✓ Sẵn sàng giao' : `Còn thiếu ${missing} sản phẩm`}</div>
              ${quick ? '<div class="o-fast">🌱 Đơn cây trồng nhanh</div>' : ''}
              <div class="o-items">${items}</div>
              <div class="o-reward">${o.gold.toLocaleString('vi')} ${COIN} · +${o.exp}EXP · ${o.stars}${STAR}</div>
              <div class="sheet-actions">
                ${missingCropId ? `<button class="btn-mini gbtn gbtn--gold" data-grow-order="${missingCropId}" ${canGrowMissing ? '' : 'disabled'}>${!emptyPlot ? 'Chờ ô trống' : m.gold < crops()[missingCropId].seed ? 'Thiếu vàng mua hạt' : `🌱 Gieo ${esc(crops()[missingCropId].name)}`}</button>` : ''}
                ${missingRecipeId ? `<button class="btn-mini gbtn gbtn--gold" data-make-order="${missingRecipeId}">🏭 Làm ${esc(goods()[missingRecipeId].name)}</button>` : ''}
                <button class="btn-mini gbtn gbtn--green" data-deliver="${o.id}" aria-label="Giao đơn hàng ${o.slot + 1}" ${ok ? '' : 'disabled'}>🚚 Giao</button>
                <button class="btn-mini btn-ghost" data-discard="${o.id}" aria-label="Bỏ đơn hàng ${o.slot + 1}">Bỏ</button>
              </div>
            </div>`;
          }).join('');
      const refreshNote = m.ordersRefreshAt > Date.now() ? `<p class="sheet-note">🔄 Bảng đơn thay mới toàn bộ sau <b>${fmtTime(m.ordersRefreshAt - Date.now())}</b>.</p>` : '';
      return sheetShell(`🚚 Đơn hàng <span class="sheet-coins">${COIN} ${m.gold.toLocaleString('vi')}</span>`, refreshNote + rows);
    }

    if (t === 'market') {
      const mk = MARKET || { mine: [], others: [] };
      const catalog = [...Object.values(crops()), ...Object.values(goods()).filter((x) => x.sell > 0), ...Object.values(trees())];
      const unitPrice = (id) => Math.round((itemInfo(id)?.sell || 0) * 1.3);
      const options = catalog.map((x) => `<option value="${x.id}">${x.emoji} ${x.name} — ${unitPrice(x.id).toLocaleString('vi')}/cái</option>`).join('');
      const mine = mk.mine.map((w) => `<div class="inv-row">${itemImg(w.item)}
          <span class="seed-info"><span class="seed-name">${itemInfo(w.item)?.name || w.item}</span>
            <div class="seed-meta">đã nhận ${w.filled}/${w.qty} · trả ${w.price.toLocaleString('vi')} ${COIN}/cái</div></span>
          <button class="gbtn btn-mini" data-want-cancel="${w.id}">Huỷ · hoàn ${((w.qty - w.filled) * w.price).toLocaleString('vi')}</button>
        </div>`).join('');
      const fillable = mk.others.filter((want) => (m.inventory[want.item] || 0) > 0).length;
      const others = [...mk.others].sort((a, b) => Number((m.inventory[b.item] || 0) > 0) - Number((m.inventory[a.item] || 0) > 0)).map((w) => {
        const have = m.inventory[w.item] || 0;
        const rem = w.qty - w.filled;
        const can = Math.min(have, rem);
        return `<div class="inv-row" data-want="${w.id}" data-want-price="${w.price}" data-want-can="${can > 0}">${itemImg(w.item)}
          <span class="seed-info"><span class="seed-name">${esc(w.ownerName)} cần ${itemInfo(w.item)?.name || w.item}</span>
            <div class="seed-meta">còn ${rem}/${w.qty} · trả <b>${w.price.toLocaleString('vi')}</b> ${COIN}/cái · bạn có ${have}</div></span>
          ${can > 0 ? `<span class="btn-group"><span class="qty-ctl">
              <button type="button" data-qstep="-1">−</button>
              <input class="qty-input" type="number" inputmode="numeric" aria-label="Số lượng ${esc(itemInfo(w.item)?.name || w.item)} muốn bán cho ${esc(w.ownerName)}" min="1" max="${can}" value="${can}" />
              <button type="button" data-qstep="1">＋</button>
            </span>
            <button class="gbtn gbtn--green btn-mini" data-want-fill="${w.id}">Bán</button></span>` : '<span class="seed-lock">Không có hàng</span>'}
        </div>`;
      }).join('');
      return sheetShell(
        `🤝 Thu mua <span class="sheet-coins">${COIN} ${m.gold.toLocaleString('vi')}</span>`,
        `<div class="machine-block"><h4>📣 Đăng tin cần mua</h4>
          <p class="sheet-note">Giá thu mua = <b>130%</b> giá bán cho hệ thống. Vàng ký quỹ lúc đăng; huỷ thì hoàn phần chưa nhận. Tối đa 5 tin.</p>
          <label class="want-catalog-search" for="want-search">Tìm mặt hàng<input id="want-search" type="search" autocomplete="off" placeholder="Ví dụ: lua mi, sữa, ốc" value="${esc(sheet.wantQuery || '')}" /></label>
          <p class="sheet-note" id="want-search-count" role="status" aria-live="polite"></p>
          <div class="want-form">
            <label class="want-field want-field--item">Mặt hàng<select id="want-item">${options}</select></label>
            <label class="want-field want-field--qty">Số lượng<input id="want-qty" type="number" inputmode="numeric" min="1" max="999" value="10" /></label>
            <button class="gbtn gbtn--gold btn-mini" id="btn-want-create">Đăng tin</button>
          </div>
          <p class="sheet-note" id="want-preview" role="status" aria-live="polite"></p>
        </div>
        <div class="machine-block"><h4>🧾 Tin của tôi</h4>${mine || '<p class="sheet-note">Chưa có tin nào.</p>'}</div>
        <div class="machine-block"><h4>🏘️ Làng đang cần</h4>
          <label class="want-catalog-search" for="want-board-search">Tìm người mua hoặc mặt hàng<input id="want-board-search" type="search" value="${esc(sheet.wantBoardQuery || '')}" /></label>
          <div class="inv-groups" role="group" aria-label="Lọc tin thu mua"><button type="button" data-want-view="all" aria-pressed="${!sheet.wantBoardView || sheet.wantBoardView === 'all'}">Tất cả (${mk.others.length})</button><button type="button" data-want-view="available" aria-pressed="${sheet.wantBoardView === 'available'}">Có thể bán (${fillable})</button></div>
          <p class="sheet-note" id="want-board-count" role="status" aria-live="polite"></p>
          <p class="sheet-note" id="want-board-empty" hidden>Không có tin phù hợp. Xóa tìm kiếm hoặc chọn Tất cả.</p>
          ${others || '<p class="sheet-note">Chưa ai đăng tin — bạn đăng trước đi!</p>'}</div>`,
      );
    }

    if (t === 'barns') {
      const all = Object.values(DATA.config.animals).sort((x, y) => x.level - y.level);
      const owned = all.filter((animal) => m.animals.some((entry) => entry.kind === animal.id));
      const hungry = owned.filter((animal) => m.animals.some((entry) => entry.kind === animal.id && entry.ready_at == null));
      return sheetShell(
        `🐾 Chuồng trại <span class="sheet-coins">${COIN} ${m.gold.toLocaleString('vi')}</span>`,
        `<p class="sheet-note">${m.animals.length} con trong ${owned.length} chuồng · thức ăn dùng chung: <b>${m.inventory.thucan || 0} túi</b>.</p>
         <div class="barn-filters" role="group" aria-label="Lọc chuồng trại">${[['all', 'Tất cả', all.length], ['owned', 'Đang nuôi', owned.length], ['hungry', 'Cần thức ăn', hungry.length]].map(([key, label, count]) => `<button class="gbtn btn-mini" data-barn-filter="${key}" aria-pressed="${(sheet.barnFilter || 'all') === key}">${label} (${count})</button>`).join('')}</div>
         <p class="barn-result-count sheet-note" role="status" aria-live="polite"></p>
         <p class="barn-filter-empty sheet-note" hidden>Không có chuồng trong nhóm này. Chọn Tất cả để xem các loài khác.</p>
         ${all.map(barnCard).join('')}<button class="gbtn" data-sheet="fishing">Mở ao nuôi tôm cá</button>`,
        'sheet--barns',
      );
    }

    if (t === 'coop' || t === 'barn') {
      const kind = t === 'coop' ? 'ga' : sheet.kind;
      const a = DATA.config.animals[kind];
      const barn = m.barns[kind];
      const feedQty = m.inventory.thucan || 0;
      const herd = m.animals.filter((x) => x.kind === kind);
      const readyN = herd.filter((x) => x.ready).length;
      const hungryN = herd.filter((x) => x.ready_at == null).length;
      const canFeed = Math.min(hungryN, Math.floor(feedQty / a.feedQty));
      const feedMissing = Math.max(0, hungryN * a.feedQty - feedQty);
      const canBuy = Math.max(0, Math.min(barn.capacity - herd.length, Math.floor(m.gold / a.price)));
      const productInfo = itemInfo(a.product);
      if (m.level < a.level) {
        return sheetShell(`${a.emoji} Chuồng ${a.name}`, `<p class="sheet-note">🔒 Mở ở <b>cấp ${a.level}</b> — cày thêm chút nữa nhé!</p>`);
      }
      const pens = herd.map((x) => `
        <span class="hen${x.ready ? ' hen--ready' : ''}">
          ${barnArtImg(kind)}
          <small>${x.ready ? `${itemImg(a.product, 'coin-img')}!` : x.ready_at == null ? 'đói' : fmtTime(x.ready_at - Date.now())}</small>
        </span>`).join('');
      return sheetShell(
        `${a.emoji} Chuồng ${a.name} cấp ${barn.level} · ${herd.length}/${barn.capacity} <span class="sheet-coins"><img class="coin-img" src="${A('assets/art/feed.png')}" alt=""/> ${feedQty}</span>`,
        `<div class="barn-summary"><div><span>Đang nuôi</span><strong>${herd.length}/${barn.capacity} con</strong></div><div><span>Đang đói</span><strong>${hungryN} con</strong></div><div><span>Thức ăn trong kho</span><strong>${feedQty} túi</strong></div></div>
         <p class="sheet-note">Chuồng tự đưa sản phẩm vào kho và tự ăn tiếp khi đủ thức ăn. Hết thức ăn thì dừng, không mất con vật.</p>
         <div class="barn-cycle">${itemImg(a.product, 'seed-sprite')}<div><b>${productInfo.name}</b><p>${a.feedQty} túi / con / lượt · ${animalDuration(a.produceMs)}</p><p>Bán ${productInfo.sell.toLocaleString('vi')} vàng / sản phẩm · +${a.expCollect} EXP</p></div></div>
         ${herd.length === 0 ? `<p class="sheet-note">Chuồng trống — mua ${a.name.toLowerCase()} đầu tiên đi!</p>` : `<div class="hen-row">${pens}</div>`}
         <div class="sheet-actions">
           ${hungryN ? `<button class="btn gbtn gbtn--green" data-feed-kind="${kind}" ${canFeed ? '' : 'disabled'}>🌰 Cho ${canFeed}/${hungryN} con ăn (${canFeed * a.feedQty} túi)</button>` : ''}
           ${readyN ? `<button class="btn gbtn gbtn--gold" data-collect-kind="${kind}">${itemImg(a.product, 'coin-img')} Thu ${readyN}</button>` : ''}
           ${herd.length < barn.capacity ? `<button class="btn btn-ghost" data-buy-animal="${kind}">＋ Mua ${a.name} (${a.price.toLocaleString('vi')} vàng)</button>
           <button class="btn gbtn gbtn--green" data-buy-animal="${kind}" data-count="max" ${canBuy ? '' : 'disabled'}>＋ Mua tối đa (${canBuy} con · ${(canBuy * a.price).toLocaleString('vi')} vàng)</button>` : ''}
         </div>
         ${barn.next ? `<article class="festival-card barn-upgrade-preview">
           <div class="festival-card-heading"><h3>Nâng chuồng cấp ${barn.next.level}</h3></div>
           <p class="festival-hint barn-upgrade-capacity">Sức chứa: ${barn.capacity} → ${barn.next.capacity} con (thêm ${barn.next.capacity - barn.capacity} chỗ).</p>
           <p class="festival-hint">Chỉ mở thêm chỗ; mua vật nuôi riêng. Vật nuôi và lịch sản xuất hiện tại được giữ lại.</p>
           <p class="festival-hint barn-upgrade-balance">${m.gold >= barn.next.gold ? `Sau khi nâng: còn ${(m.gold - barn.next.gold).toLocaleString('vi')} vàng.` : `Thiếu ${(barn.next.gold - m.gold).toLocaleString('vi')} vàng.`}</p>
           <div class="festival-card-footer"><button class="btn gbtn gbtn--gold" data-upgrade-barn="${kind}" ${m.gold >= barn.next.gold ? '' : 'disabled'}>Nâng cấp · ${barn.next.gold.toLocaleString('vi')} vàng</button></div>
         </article>` : '<p class="sheet-note">Chuồng đã đạt cấp tối đa.</p>'}
         ${feedMissing ? `<div class="barn-feed-help"><p>Thiếu ${feedMissing} túi để cho ${hungryN} con đói ăn một lượt. Thức ăn dùng chung cho mọi chuồng.</p><button class="gbtn gbtn--green" data-sheet="shop" data-shop-category="supplies" data-return-barn="${kind}">Mua thức ăn</button><p class="sheet-note">Cũng có thể xay 2 ngô ở Cối xay (Lv 10).</p></div>` : ''}`,
        'sheet--barn',
      );
    }

    if (t === 'mill') {
      const QMAX = DATA.config.machineQueueMax || 50;
      const factoryView = ['all', 'available', 'active'].includes(sheet.factoryView) ? sheet.factoryView : 'all';
      const recipeCounts = { all: 0, available: 0, active: 0 };
      const blocks = Object.values(DATA.config.machines).map((mc) => {
        if (m.level < mc.level) {
          if (factoryView !== 'all') return '';
          return `<div class="machine-block machine-block--locked"><h4>${machineIcon(mc)}<span>${mc.name}</span></h4><p class="sheet-note">🔒 Mở ở cấp ${mc.level}</p></div>`;
        }
        const jobs = m.machines[mc.id] || {};
        const jobList = Object.values(jobs);
        const readyJobs = jobList.filter((j) => j.ready);
        const readyCount = readyJobs.reduce((n, j) => n + (j.completed || 0), 0);
        let head;
        if (readyJobs.length) {
          head = `<button class="btn gbtn gbtn--gold mc-collect" data-machine-collect="${mc.id}">✅ Lấy hết ${readyCount} mẻ xong</button>`;
        } else if (jobList.length) {
          head = `<div class="mc-status">🔄 Đang nấu <b>${jobList.length}</b> món song song</div>`;
        } else {
          head = '<div class="mc-status mc-status--idle">💤 Rảnh — bấm ＋ để nấu, mỗi món chạy riêng</div>';
        }
        const ml = (m.machineLevels || {})[mc.id] || 0;
        const speedSkill = m.skills?.learned?.lamnhanh || 0;
        const rows = Object.values(mc.recipes).map((r) => {
          const duration = Math.round(r.ms * (1 - 0.05 * speedSkill) * (1 - 0.1 * ml));
          const job = jobs[r.id];
          const room = QMAX - (job ? job.queue : 0);
          const maxBatches = Math.max(0, Math.min(room, ...Object.entries(r.in).map(([iid, q]) => Math.floor((m.inventory[iid] || 0) / q))));
          const canAdd = maxBatches > 0;
          recipeCounts.all += 1;
          if (canAdd) recipeCounts.available += 1;
          if (job) recipeCounts.active += 1;
          if ((factoryView === 'available' && !canAdd) || (factoryView === 'active' && !job)) return '';
          const missingParts = room > 0 ? Object.entries(r.in).filter(([iid, q]) => (m.inventory[iid] || 0) < q)
            .map(([iid, q]) => ({ id: iid, qty: q - (m.inventory[iid] || 0) })) : [];
          const missing = missingParts.map(({ id, qty }) => `${id}:${qty}`).join(',');
          const missingText = missingParts.map(({ id, qty }) => `${qty} ${itemInfo(id)?.name || id}`).join(', ');
          const unavailable = missing ? `Đăng mua nguyên liệu thiếu cho ${r.name}: ${missingText}` : `Hàng đợi ${mc.name} đã đầy`;
          const ins = Object.entries(r.in).map(([id, q]) => `${q} ${itemInfo(id)?.name || id}`).join(' + ');
          const outId = Object.keys(r.out)[0];
          const outInfo = itemInfo(outId);
          let state = '';
          if (job && job.ready) {
            const running = job.processing
              ? `<small class="mc-run" data-machine-ready="${job.currentReadyAt}">🔄 mẻ kế · ${fmtTime(job.currentReadyAt - Date.now())} · chờ ${job.queued}</small>`
              : '';
            state = `<button class="mc-plus mc-plus--done" data-machine-collect="${mc.id}" data-recipe="${r.id}" aria-label="Lấy ${job.completed} mẻ ${r.name} từ ${mc.name}" title="Lấy ${r.name}">✅ Lấy ${job.completed}</button>${running}`;
          } else if (job) {
            const left = (job.currentReadyAt || job.readyAt) - Date.now();
            state = `<small class="mc-run" data-machine-ready="${job.currentReadyAt || job.readyAt}">🔄 1 đang làm · chờ ${job.queued} · ${fmtTime(left)}</small>
              <button class="mc-plus mc-plus--gem" data-machine-speed="${mc.id}" data-recipe="${r.id}" aria-label="Hoàn thành ngay ${r.name} với ${Math.max(1, Math.ceil(left / 300000))} kim cương" title="Xong ngay">${GEM}${Math.max(1, Math.ceil(left / 300000))}</button>`;
          }
          return `<div class="seed-row mc-row${job ? ' mc-row--active' : ''}${canAdd ? '' : ' mc-row--dim'}${sheet.preferredRecipe === outId ? ' mc-row--recommended' : ''}" data-recipe-output="${outId}" data-can-make="${canAdd ? '1' : '0'}" data-job-active="${job ? '1' : '0'}" ${missing ? `data-missing="${missing}" data-missing-name="${r.name}" title="Thiếu nguyên liệu — bấm để đăng tin thu mua" style="cursor:pointer"` : 'style="cursor:default"'}>
            ${itemImg(outId, 'seed-sprite')}
            <span class="seed-info"><span class="seed-name">${r.name} <small>×${Object.values(r.out)[0]}</small></span></span>
            <div class="seed-meta mc-recipe-meta">
              <span><b>Cần:</b> ${ins}</span>
              <span><time class="mc-duration" datetime="PT${duration / 1000}S" data-duration-ms="${duration}">⏱ ${fmtTime(duration)} /mẻ</time> · Bán ${(outInfo?.sell || 0).toLocaleString('vi')} ${COIN} · +${r.exp} EXP</span>
            </div>${missing ? `<small class="mc-missing">Thiếu ${esc(missingText)} · Bấm 🛒 để đăng mua</small>` : ''}
            <span class="mc-add">
              ${state}
              <button class="mc-plus${missing ? ' mc-plus--want' : ''}" data-machine-run="${mc.id}" data-recipe="${r.id}" data-count="1" ${canAdd ? '' : missing ? 'data-off="1"' : 'disabled'} aria-label="${canAdd ? `Thêm 1 mẻ ${r.name} tại ${mc.name}` : unavailable}" title="${canAdd ? 'Thêm 1 mẻ' : unavailable}">${missing ? '🛒' : '＋'}</button>
              <button class="mc-plus mc-plus--max" data-machine-run="${mc.id}" data-recipe="${r.id}" data-count="${maxBatches}" ${canAdd && maxBatches > 1 ? '' : 'disabled'} aria-label="${canAdd && maxBatches > 1 ? `Xếp ${maxBatches} mẻ ${r.name} tại ${mc.name}` : canAdd ? `Chỉ xếp được 1 mẻ ${r.name}` : unavailable}" title="${canAdd && maxBatches > 1 ? 'Xếp hết nguyên liệu' : canAdd ? 'Chỉ xếp được 1 mẻ' : unavailable}">＋${maxBatches > 1 ? maxBatches : ''}</button>
            </span>
          </div>`;
        }).join('');
        if (factoryView !== 'all' && !rows) return '';
        const ug = DATA.config.machineUpgradeGold || [];
        const up = ml >= ug.length
          ? `<div class="mc-status">⚙️ Cấp ${ml} tối đa · −${ml * 10}% thời gian</div>`
          : `<div class="festival-card mc-upgrade-preview" data-upgrade-preview="${mc.id}">
            <p class="festival-hint">Cấp máy ${ml} → ${ml + 1} · Giảm thời gian gốc: ${ml * 10}% → ${(ml + 1) * 10}%.</p>
            <p class="festival-hint">Thời gian công thức đã tính kỹ năng và cấp máy. Mẻ đang chạy giữ mốc hoàn thành; mẻ tiếp theo dùng tốc độ mới.</p>
            <p class="festival-hint mc-upgrade-balance">${m.gold >= ug[ml] ? `Sau khi nâng: còn ${(m.gold - ug[ml]).toLocaleString('vi')} vàng.` : `Thiếu ${(ug[ml] - m.gold).toLocaleString('vi')} vàng.`}</p>
            <div class="festival-card-footer"><button class="btn btn-ghost mc-upgrade" data-machine-upgrade="${mc.id}" ${m.gold >= ug[ml] ? '' : 'disabled'}>Nâng cấp ${ml + 1} · ${ug[ml].toLocaleString('vi')} vàng</button></div>
          </div>`;
        return `<div class="machine-block"><h4>${machineIcon(mc)}<span>${mc.name}</span>${ml ? ` <small>⚙️${ml}</small>` : ''}</h4>${head}${rows}${up}</div>`;
      }).join('');
      const readyTotal = Object.values(m.machines).reduce((acc, jobs) => acc + Object.values(jobs || {}).reduce((n, j) => n + (j.completed || 0), 0), 0);
      const canCookAny = Object.values(DATA.config.machines).some((mc) => m.level >= mc.level && Object.values(mc.recipes).some((r) => r.id !== 'thucan'
        && Object.entries(r.in).every(([iid, q]) => (m.inventory[iid] || 0) >= q)
        && ((m.machines[mc.id] || {})[r.id]?.queue || 0) < QMAX));
      const viewButtons = `<div class="mc-view-switch" role="group" aria-label="Lọc công thức chế biến">
        <button type="button" data-factory-view="all" aria-pressed="${factoryView === 'all'}">Tất cả (${recipeCounts.all})</button>
        <button type="button" data-factory-view="available" aria-pressed="${factoryView === 'available'}">Có thể làm (${recipeCounts.available})</button>
        <button type="button" data-factory-view="active" aria-pressed="${factoryView === 'active'}">Đang làm (${recipeCounts.active})</button>
      </div>`;
      const emptyView = factoryView !== 'all' && !recipeCounts[factoryView] ? `<p class="sheet-note mc-view-empty">${factoryView === 'available' ? 'Chưa đủ nguyên liệu cho công thức nào. Chọn Tất cả để xem nguyên liệu cần mua.' : 'Chưa có mẻ nào đang làm. Chọn Có thể làm để bắt đầu.'}</p>` : '';
      const toolbar = `<div class="mc-toolbar">
        <button class="btn gbtn gbtn--gold" id="btn-collect-all" ${readyTotal ? '' : 'disabled'}>✅ Thu hết${readyTotal ? ` (${readyTotal} món xong)` : ''}</button>
        <button class="btn gbtn gbtn--green" id="btn-cook-all" ${canCookAny ? '' : 'disabled'} title="Xếp tối đa mọi công thức đủ nguyên liệu (trừ thức ăn gia súc)">🏭 Chế biến hết</button>
      </div>`;
      const orderHint = sheet.preferredRecipe ? `<p class="sheet-note seed-tip">Đơn hàng cần ${esc(goods()[sheet.preferredRecipe]?.name || sheet.preferredRecipe)}. Công thức được đánh dấu bên dưới.</p>` : '';
      const finder = `<div class="mc-finder">
        <label for="factory-search">Tìm công thức hoặc nguyên liệu</label>
        <input id="factory-search" type="search" autocomplete="off" value="${esc(sheet.factoryQuery || '')}" placeholder="Ví dụ: bánh, cá, bột mì" />
        <p class="mc-result-count" role="status" aria-live="polite"></p>
        <p class="sheet-note mc-search-empty" hidden>Không tìm thấy công thức phù hợp. Xóa tìm kiếm hoặc chọn Tất cả.</p>
      </div>`;
      const bulkNote = '<p class="sheet-note mc-bulk-note">Chế biến hết xếp tối đa mọi công thức đủ nguyên liệu. Nguyên liệu dùng ngay; mẻ đã xếp không hủy được.</p>';
      return sheetShell('🏭 Khu chế biến', `${orderHint}${toolbar}${bulkNote}${viewButtons}${finder}${emptyView}<div class="machine-grid">${blocks}</div>`, 'sheet--factory');
    }

    if (t === 'money') {
      const g = MONEY || { incoming: [], outgoing: [] };
      const fmtT = (t2) => new Date(t2).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
      const statusText = { open: '⏳ Đang chờ', paid: '✅ Đã cho', declined: '🙅 Từ chối', cancelled: '↩️ Đã huỷ' };
      const incoming = g.incoming.length ? g.incoming.map((r) => `<article class="festival-card" data-gold-request="${r.id}" aria-labelledby="request-in-${r.id}">
          <div class="festival-card-heading"><h4 id="request-in-${r.id}">${esc(r.fromName)} xin ${r.amount.toLocaleString('vi')} vàng</h4></div>
          <p class="festival-hint">${r.note ? `“${esc(r.note)}” · ` : ''}${fmtT(r.createdAt)}</p>
          <p class="festival-hint">${m.gold >= r.amount ? `Sau khi cho: còn ${(m.gold - r.amount).toLocaleString('vi')} vàng.` : `Thiếu ${(r.amount - m.gold).toLocaleString('vi')} vàng để cho. Bạn vẫn có thể từ chối.`}</p>
          <div class="festival-card-footer">
            <button class="gbtn gbtn--gold btn-mini" data-gr-act="pay" data-gr-id="${r.id}" aria-label="Cho ${r.amount.toLocaleString('vi')} vàng" ${m.gold >= r.amount ? '' : 'disabled'}>Cho ${r.amount.toLocaleString('vi')} vàng</button>
            <button class="gbtn btn-mini" data-gr-act="decline" data-gr-id="${r.id}" aria-label="Từ chối lời xin của ${esc(r.fromName)}">Từ chối</button>
          </div>
        </article>`).join('') : '<p class="sheet-note">Chưa ai xin tiền bạn 😌</p>';
      const outgoing = g.outgoing.length ? g.outgoing.map((r) => `<article class="festival-card${r.status === 'paid' ? ' festival-card--claimed' : ''}" aria-labelledby="request-out-${r.id}">
          <div class="festival-card-heading"><h4 id="request-out-${r.id}">Xin ${esc(r.toName)} ${r.amount.toLocaleString('vi')} vàng</h4><span class="festival-status">${statusText[r.status] || esc(r.status)}</span></div>
          <p class="festival-hint">${fmtT(r.createdAt)}${r.note ? ` · “${esc(r.note)}”` : ''}</p>
          ${r.status === 'open' ? `<div class="festival-card-footer"><button class="gbtn btn-mini" data-gr-act="cancel" data-gr-id="${r.id}" aria-label="Hủy lời xin ${r.amount.toLocaleString('vi')} vàng từ ${esc(r.toName)}">Hủy lời xin</button></div>` : ''}
        </article>`).join('') : '<p class="sheet-note">Bạn chưa xin ai. Vào ruộng người nhà, bấm 🙏 Xin tiền hoặc 💝 Cho tiền.</p>';
      return sheetShell(`💌 Xin / Cho tiền <span class="sheet-coins">${COIN} ${m.gold.toLocaleString('vi')}</span>`,
        `<h4 class="lb-sec">🙏 Người nhà xin bạn (${g.incoming.length})</h4>${incoming}<h4 class="lb-sec">📨 Bạn đã xin (${g.outgoing.length})</h4>${outgoing}<p class="sheet-note">Cho tiền là chuyển vàng thẳng từ kho bạn sang người kia, không tính kinh tế làng.</p>`, 'sheet--money');
    }

    if (t === 'luxury') {
      const L = DATA.config.luxury || {};
      const lux = m.luxury || { owned: [], decor: [] };
      const view = sheet.luxView || 'all';
      const matches = (x) => view === 'owned' ? lux.owned.includes(x.id) : view === 'available' ? !lux.owned.includes(x.id) && m.gold >= x.price : true;
      const choices = Object.values(L).filter(matches);
      const filters = `<div class="inv-groups" role="group" aria-label="Lọc đồ trang trí">${[['all', 'Tất cả', Object.keys(L).length], ['owned', 'Đã có', lux.owned.length], ['available', 'Có thể mua', Object.values(L).filter((x) => !lux.owned.includes(x.id) && m.gold >= x.price).length]].map(([id, name, count]) => `<button data-lux-view="${id}" aria-pressed="${view === id}">${name} (${count})</button>`).join('')}</div>${choices.length ? '' : '<p class="sheet-note">Chưa có món phù hợp. Chọn Tất cả để xem giá và mục tiêu tiết kiệm.</p>'}`;
      const section = (kind, title, note) => !choices.some((x) => x.kind === kind) ? '' : `<h4 class="lb-sec">${title}</h4><p class="sheet-note">${note}</p>${choices.filter((x) => x.kind === kind).map((x) => {
        const owned = lux.owned.includes(x.id);
        const active = lux.title === x.id || lux.frame === x.id;
        const btn = owned
          ? (kind === 'decor' || kind === 'pet' ? '<span class="lux-owned">✅ Đã có</span>' : active ? `<button class="gbtn btn-mini" data-lux-equip="" data-lux-kind="${kind}">Đang dùng · Bỏ</button>` : `<button class="gbtn gbtn--green btn-mini" data-lux-equip="${x.id}">Dùng</button>`)
          : `<button class="gbtn gbtn--gold btn-mini" data-lux-buy="${x.id}" ${m.gold >= x.price ? '' : 'disabled'}>Mua ${x.price.toLocaleString('vi')} vàng</button>`;
        return `<article class="festival-card" data-lux-item="${x.id}" aria-labelledby="lux-${x.id}"><div class="festival-card-heading"><h4 id="lux-${x.id}" class="${kind === 'frame' ? frameCls(x.id) : ''}">${luxuryArt(x.id)} ${esc(x.name)}</h4></div><p class="festival-hint">${esc(x.desc || '')}</p>${!owned ? `<p class="festival-hint">${m.gold < x.price ? `Thiếu ${(x.price - m.gold).toLocaleString('vi')} vàng.` : `Sau khi mua: còn ${(m.gold - x.price).toLocaleString('vi')} vàng.`}</p>` : ''}<div class="festival-card-footer">${btn}</div></article>`;
      }).join('')}`;
      const lot = LOTTERY_DATA;
      const lotteryRemaining = lot ? Math.max(0, lot.maxPerDay - lot.mine) : 0;
      const lottery = lot ? `<h4 class="lb-sec">🎟️ Xổ số làng</h4>
        <p class="sheet-note">Vé ${lot.ticket.toLocaleString('vi')} ${COIN}. Hũ tối thiểu <b>${(lot.base || 0).toLocaleString('vi')}</b> ${COIN}, mỗi vé bán ra cộng thêm <b>${(lot.perTicket || 0).toLocaleString('vi')}</b>. Quay lúc <b>9h sáng giờ Los Angeles</b>: <b>3 người may mắn</b> 🥇 ${Math.round((lot.shares?.[0] || .5) * 100)}% · 🥈 ${Math.round((lot.shares?.[1] || .3) * 100)}% · 🥉 ${Math.round((lot.shares?.[2] || .2) * 100)}% hũ (mua nhiều vé, tỉ lệ cao hơn; thiếu người thì dồn về giải 1). Tối đa ${lot.maxPerDay} vé/ngày.</p>
        <div class="lux-lottery"><span>Hũ hôm nay: <b>${lot.pot.toLocaleString('vi')}</b> ${COIN} · ${lot.tickets} vé / ${lot.players} người · bạn có <b>${lot.mine}</b> vé</span>
          <div class="lottery-options">${[1, 10, 50].map((n) => {
            const cost = n * lot.ticket;
            const allowed = n <= lotteryRemaining;
            const affordable = m.gold >= cost;
            const hint = !allowed ? lotteryRemaining ? `Còn ${lotteryRemaining} vé có thể mua hôm nay.` : 'Đã đạt giới hạn vé hôm nay.'
              : !affordable ? `Thiếu ${(cost - m.gold).toLocaleString('vi')} vàng.` : `Sau khi mua: còn ${(m.gold - cost).toLocaleString('vi')} vàng.`;
            return `<div class="lottery-option"><button class="gbtn gbtn--gold btn-mini" data-lottery-buy="${n}" aria-describedby="lottery-hint-${n}" ${allowed && affordable ? '' : 'disabled'}><span>Mua ${n} vé</span> <small>${cost.toLocaleString('vi')} vàng</small></button><p class="festival-hint" id="lottery-hint-${n}">${hint}</p></div>`;
          }).join('')}</div></div>
        ${lot.last ? `<p class="sheet-note">Kỳ trước (${lot.last.day.replace(/^la-/, '')}, hũ ${lot.last.pot.toLocaleString('vi')} ${COIN}, ${lot.last.tickets} vé): ${(lot.last.winners || []).map((w) => `${['🥇', '🥈', '🥉'][w.rank - 1] || ''} <b>${esc(w.name)}</b> +${(w.gold || 0).toLocaleString('vi')}`).join(' · ')}</p>` : ''}` : '';
      return sheetShell(`💎 Xa xỉ <span class="sheet-coins">${COIN} ${m.gold.toLocaleString('vi')}</span>`,
        `<p class="sheet-note">Đồ khoe của — không tăng sức mạnh, chỉ để cả làng trầm trồ. Vàng mua bị đốt khỏi kinh tế làng. Thuế đất: ${(DATA.config.taxPerPlot || 0).toLocaleString('vi')} ${COIN}/ô/ngày (hôm nay ${(m.tax?.today || 0).toLocaleString('vi')} ${COIN}).</p>${filters}${section('title', '🏷️ Danh hiệu', 'Hiện cạnh tên (chọn 1 để dùng).')}${section('frame', '🖼️ Khung tên', 'Tô màu tên bạn khắp làng (chọn 1).')}${section('pet', '🐾 Thú cưng', 'Đi theo tên bạn khắp làng.')}${section('decor', '🏡 Trang trí ruộng', 'Hiện trên đầu ruộng, ai ghé cũng thấy.')}${lottery}`,
        'sheet--factory sheet--luxury');
    }

    if (t === 'expand') {
      const e = m.expandNext;
      if (!e) return '';
      const can = m.level >= e.level && m.gold >= e.gold;
      const added = e.plots || 4;
      const afterPlots = m.plotsCount + added;
      const taxLevel = m.tax?.unlockLevel || 20;
      const taxPerPlot = m.tax?.perPlot ?? DATA.config.taxPerPlot ?? 0;
      return sheetShell('🧱 Mở rộng nông trại', `
        <article class="festival-card" aria-labelledby="expansion-title">
          <div class="festival-card-heading"><h4 id="expansion-title">${m.plotsCount} → ${afterPlots} ô đất</h4><span class="festival-status">Thêm ${added} ô</span></div>
          <p class="festival-hint">Giá mở đất: ${e.gold.toLocaleString('vi')} vàng · Cần cấp ${e.level}.</p>
          <p class="festival-hint expansion-level">${m.level >= e.level ? 'Đã đủ cấp để mở rộng.' : `Cần thêm ${e.level - m.level} cấp để mở rộng.`}</p>
          <p class="festival-hint expansion-balance">${m.gold >= e.gold ? `Sau khi mở: còn ${(m.gold - e.gold).toLocaleString('vi')} vàng.` : `Thiếu ${(e.gold - m.gold).toLocaleString('vi')} vàng. Bạn có ${m.gold.toLocaleString('vi')} vàng.`}</p>
          <p class="festival-hint expansion-tax">${m.level < taxLevel ? `Đang miễn thuế đến cấp ${taxLevel}. ` : ''}Thuế dự kiến sau mở đất: ${(afterPlots * taxPerPlot).toLocaleString('vi')} vàng/ngày (tăng ${(added * taxPerPlot).toLocaleString('vi')} vàng/ngày).</p>
        </article>
        <div class="sheet-actions">
          <button class="btn btn-ghost" data-close="1">Để sau</button>
          <button class="btn gbtn gbtn--green" id="btn-expand" ${can ? '' : 'disabled'}>Mở ${added} ô · ${e.gold.toLocaleString('vi')} vàng</button>
        </div>`, 'sheet--expand');
    }

    if (t === 'events') {
      const rows = DATA.events.length
        ? `<ul class="event-list">${DATA.events.map((e) => `<li><time>${timeAgo(e.at)}</time><span>${esc(e.text)}</span></li>`).join('')}</ul>`
        : '<p class="sheet-note">Chưa có gì — gieo hạt đầu tiên đi!</p>';
      return sheetShell('📰 Bản tin làng', rows);
    }

    if (t === 'fishing') {
      const cfg = DATA.config.fishing;
      const en = m.energy;
      const locked = m.level < cfg.level;
      const canFish = !locked && en.current >= cfg.energyCost;
      const casts = Math.floor(en.current / cfg.energyCost);
      const missingEnergy = Math.max(0, cfg.energyCost - en.current);
      const waitForCast = missingEnergy ? (en.nextRegenMs || en.regenMs) + (missingEnergy - 1) * en.regenMs : 0;
      const energyGain = Math.max(0, Math.min(DATA.config.energy.buyAmount, DATA.config.energy.buyCap - en.current));
      const canBuyEnergy = energyGain > 0 && m.gems >= en.buyGems;
      const pondUpgrade = !locked && m.pond.next ? `<article class="festival-card pond-upgrade">
        <div class="festival-card-heading"><h3>Nâng ao cấp ${m.pond.next.level}</h3></div>
        <p class="festival-hint">Câu cá: ${m.pond.fishPerCast} → ${m.pond.next.fishPerCast} cá/lượt${m.pond.fishPerCast === m.pond.next.fishPerCast ? ' (giữ nguyên)' : ''}.</p>
        <p class="festival-hint pond-upgrade-capacity">Sức chứa nuôi: ${m.fishFarm.capacity} → ${DATA.config.fishStockByLevel[m.pond.next.level - 1]} con. Các mẻ đang nuôi được giữ lại.</p>
        <p class="festival-hint pond-upgrade-balance">${m.gold >= m.pond.next.gold ? `Sau khi nâng: còn ${(m.gold - m.pond.next.gold).toLocaleString('vi')} vàng.` : `Thiếu ${(m.pond.next.gold - m.gold).toLocaleString('vi')} vàng. Bạn có ${m.gold.toLocaleString('vi')} vàng.`}</p>
        <div class="festival-card-footer"><button class="btn gbtn gbtn--gold" id="btn-upgrade-pond" ${m.gold >= m.pond.next.gold ? '' : 'disabled'}>Nâng ao · ${m.pond.next.gold.toLocaleString('vi')} vàng</button></div>
      </article>` : '';
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
          <div class="fishing-energy"><b>${casts} lượt câu có thể dùng</b><p>Mỗi lượt tốn ${cfg.energyCost} năng lượng · nhận ${m.pond.fishPerCast} cá.</p><p>Tự hồi 1 năng lượng mỗi ${fmtDuration(en.regenMs)}${waitForCast ? ` · đủ một lượt sau ${fmtTime(waitForCast)}` : ''}.</p></div>
          <button class="btn gbtn gbtn--green" id="btn-fish" ${canFish ? '' : 'disabled'} style="width:100%;margin-bottom:0.55rem">🎣 Quăng cần (${cfg.energyCost}⚡${m.pond.fishPerCast > 1 ? ` · ${m.pond.fishPerCast} cá` : ''})</button>`}
        ${lootRows}
        <div class="fishing-energy-purchase"><button class="btn btn-ghost" id="btn-buy-energy" ${canBuyEnergy ? '' : 'disabled'}>⚡ Mua ${energyGain} năng lượng — ${en.buyGems} ${GEM}</button>
        <p class="sheet-note">${!energyGain ? `Đã đạt giới hạn mua ${DATA.config.energy.buyCap} năng lượng.` : m.gems < en.buyGems ? `Thiếu ${en.buyGems - m.gems} kim cương. Bạn có thể chờ năng lượng tự hồi.` : `Sau khi mua: ${en.current + energyGain}/${DATA.config.energy.buyCap} năng lượng · trừ ${en.buyGems} kim cương.`}</p></div>
        ${pondUpgrade}
        ${renderFishFarm(m)}`,
      );
    }

    if (t === 'skills') {
      const sk = m.skills;
      const tree = DATA.config.skillTree;
      const allNodes = tree.branches.flatMap((branch) => branch.nodes);
      const available = allNodes.filter((node) => sk.unlocked && (sk.learned[node.id] || 0) < tree.maxRank && sk.points >= node.cost * ((sk.learned[node.id] || 0) + 1)).length;
      const branches = tree.branches.map((b) => {
        const nodes = b.nodes.map((n) => {
          const rank = sk.learned[n.id] || 0;
          const maxed = rank >= tree.maxRank;
          const cost = n.cost * (rank + 1);
          const can = sk.unlocked && !maxed && sk.points >= cost;
          return `<article class="festival-card skill-card" data-skill="${n.id}" data-skill-can="${can}" aria-labelledby="skill-${n.id}">
            <div class="festival-card-heading"><h4 id="skill-${n.id}">${esc(n.name)}</h4><span class="festival-status">Bậc ${rank}/${tree.maxRank}</span></div>
            <p class="festival-hint">${esc(n.desc)}</p>
            <div class="festival-card-footer"><span class="festival-reward">${maxed ? 'Đã đạt bậc tối đa' : `Bậc kế: ${rank + 1} · ${cost} điểm`}</span>
              ${maxed ? '' : `<button class="gbtn gbtn--gold" data-skill-learn="${n.id}" aria-label="Học bậc ${rank + 1}: ${esc(n.name)}, ${cost} điểm" ${can ? '' : 'disabled'}>Học bậc ${rank + 1}</button>`}</div>
            ${maxed || can ? '' : `<p class="festival-hint">${!sk.unlocked ? `Mở ở cấp ${tree.unlockLevel}.` : `Thiếu ${cost - sk.points} điểm. Lên cấp để nhận thêm điểm.`}</p>`}
          </article>`;
        }).join('');
        return `<section class="skill-branch"><h4>${b.emoji} ${b.name}</h4>${nodes}</section>`;
      }).join('');
      const canRespec = Date.now() >= sk.nextRespecAt;
      return sheetShell(
        `🎓 Kỹ năng <span class="sheet-coins">✨ ${sk.points} điểm</span>`,
        `<p class="sheet-note">Mỗi cấp sau cấp ${tree.unlockLevel} tặng 1 điểm kỹ năng. Mỗi kỹ năng nâng được ${tree.maxRank} bậc, bậc sau tốn nhiều điểm hơn.</p>
         <div class="inv-groups" role="group" aria-label="Lọc kỹ năng"><button type="button" data-skill-view="all" aria-pressed="${!sheet.skillView || sheet.skillView === 'all'}">Tất cả (${allNodes.length})</button><button type="button" data-skill-view="available" aria-pressed="${sheet.skillView === 'available'}">Có thể học (${available})</button></div>
         <p class="sheet-note skill-empty" hidden>Chưa đủ điểm cho kỹ năng nào. Lên cấp để nhận thêm điểm hoặc chọn Tất cả để xem các bậc tiếp theo.</p>${branches}
         ${Object.keys(sk.learned).length ? `<div class="skill-respec"><button class="btn btn-ghost" id="btn-skill-respec" ${canRespec && m.gems >= tree.respecGems ? '' : 'disabled'}>♻️ Hoàn trả toàn bộ điểm — ${tree.respecGems} ${GEM}</button><p class="sheet-note">${!canRespec ? `Có thể hoàn điểm sau ${fmtDuration(sk.nextRespecAt - Date.now())}.` : m.gems < tree.respecGems ? `Thiếu ${tree.respecGems - m.gems} kim cương để hoàn điểm.` : 'Hoàn trả tất cả bậc đã học để chọn lại kỹ năng.'}</p></div>` : ''}`,
        'sheet--skills',
      );
    }

    if (t === 'festival') {
      const fest = m.festival;
      const claimed = fest.milestones.filter((ms) => ms.claimed).length;
      const ready = fest.milestones.filter((ms) => !ms.claimed && ms.progress >= ms.target).length;
      const rank = (ms) => ms.claimed ? 2 : ms.progress >= ms.target ? 0 : 1;
      const processLevel = Math.min(...Object.values(DATA.config.machines).map((machine) => machine.level));
      const activities = {
        harvest: { icon: '🌾', hint: 'Thu hoạch cây trên ruộng của bạn để tăng tiến độ.', action: '<button class="gbtn gbtn--green" data-festival-farm>Ra ruộng</button>' },
        deliver: { icon: '🚚', hint: 'Giao đơn hàng trên bảng đơn để tăng tiến độ.', sheet: 'orders', level: DATA.config.orderUnlockLevel, label: 'Xem đơn hàng' },
        process: { icon: '🏭', hint: 'Lấy các mẻ đã chế biến xong để tăng tiến độ.', sheet: 'mill', level: processLevel, label: 'Mở chế biến' },
      };
      const rows = [...fest.milestones].sort((a, b) => rank(a) - rank(b) || a.id - b.id).map((ms) => {
        const done = ms.progress >= ms.target;
        const activity = activities[ms.type];
        const reward = [ms.gold ? `${ms.gold.toLocaleString('vi')} ${COIN}` : '', ms.gems ? `${ms.gems} ${GEM}` : ''].filter(Boolean).join(' + ');
        const action = activity.action || (m.level >= activity.level
          ? `<button class="gbtn gbtn--green" data-sheet="${activity.sheet}">${activity.label}</button>`
          : `<button class="gbtn" data-festival-locked="${ms.type}" disabled>Mở ở cấp ${activity.level}</button>`);
        return `<article class="festival-card${ms.claimed ? ' festival-card--claimed' : done ? ' festival-card--ready' : ''}" data-festival-id="${ms.id}" aria-labelledby="festival-goal-${ms.id}">
          <div class="festival-card-heading"><h4 id="festival-goal-${ms.id}"><span aria-hidden="true">${ms.claimed ? '✅' : done ? '🎁' : activity.icon}</span> ${esc(ms.label)}</h4>
            <span class="festival-status">${ms.progress}/${ms.target}${ms.claimed ? ' · Đã nhận' : done ? ' · Quà sẵn sàng' : ''}</span></div>
          <div class="q-track" role="progressbar" aria-label="Tiến độ ${esc(ms.label)}" aria-valuemin="0" aria-valuemax="${ms.target}" aria-valuenow="${Math.min(ms.progress, ms.target)}"><i style="width:${Math.min(100, Math.round((ms.progress / ms.target) * 100))}%"></i></div>
          <p class="festival-hint">${activity.hint}</p>
          <div class="festival-card-footer"><span class="festival-reward">Thưởng: ${reward}</span>${ms.claimed ? '<span class="festival-claimed">Đã nhận quà</span>' : done
            ? `<button class="gbtn gbtn--gold" data-fest-claim="${ms.id}" aria-label="Nhận quà: ${esc(ms.label)}">Nhận quà</button>` : action}</div>
        </article>`;
      }).join('');
      return sheetShell(
        `${fest.emoji} ${fest.name} <span class="sheet-coins">⏳ còn ${fest.daysLeft} ngày</span>`,
        `<p class="festival-summary">Đã nhận <b>${claimed}/${fest.milestones.length}</b> phần thưởng${ready ? ` · <b>${ready} quà đang chờ</b>` : ''}.</p>
         <p class="sheet-note">Sự kiện cá nhân trong ${fest.daysLeft} ngày còn lại. Thu hoạch, giao đơn và lấy sản phẩm để tiến gần mốc tiếp theo; mùa mới sẽ đặt lại tiến độ.</p>${rows}`,
        'sheet--festival',
      );
    }

    if (t === 'stars') {
      const next = m.starNext;
      const can = next && m.stars >= next.stars;
      const rows = DATA.config.starMilestones.map((ms) => {
        const claimed = !next || ms.stars < next.stars;
        const current = next?.stars === ms.stars;
        const progress = Math.min(m.stars, ms.stars);
        const status = claimed ? 'Đã nhận' : current ? can ? 'Sẵn sàng nhận' : `Còn ${ms.stars - progress} sao` : 'Nhận mốc trước';
        const reward = [ms.gold ? `${ms.gold.toLocaleString('vi')} vàng` : '', ms.gems ? `${ms.gems} kim cương` : ''].filter(Boolean).join(' + ');
        return `<article class="festival-card${claimed ? ' festival-card--claimed' : current && can ? ' festival-card--ready' : ''}" data-star-milestone="${ms.stars}" data-star-state="${claimed ? 'claimed' : current && can ? 'ready' : 'pending'}" aria-labelledby="star-${ms.stars}">
          <div class="festival-card-heading"><h4 id="star-${ms.stars}">Mốc ${ms.stars} sao</h4><span class="festival-status">${status}</span></div>
          <p class="festival-hint">${progress}/${ms.stars} sao · Thưởng: ${reward}</p>
          <div class="q-track" role="progressbar" aria-label="Tiến độ mốc ${ms.stars} sao" aria-valuemin="0" aria-valuemax="${ms.stars}" aria-valuenow="${progress}"><i style="width:${100 * progress / ms.stars}%"></i></div>
        </article>`;
      }).join('');
      return sheetShell(
        `${STAR} Sao Nông Trại — ${m.stars}`,
        `<p class="festival-summary">${next ? can ? `Đã đủ sao cho mốc ${next.stars}. Nhận thưởng để mở mốc kế tiếp.` : `Còn ${next.stars - m.stars} sao để nhận mốc ${next.stars}.` : 'Đã nhận tất cả phần thưởng sao.'}</p>
         ${next ? `<button class="btn gbtn gbtn--gold" id="btn-star-claim" ${can ? '' : 'disabled'} style="width:100%;margin-bottom:0.5rem">${can ? `🎉 Nhận mốc ${next.stars} sao!` : `Mốc kế: ${next.stars} sao`}</button>` : ''}
         <p class="sheet-note">Sao tích lũy không mất khi nhận thưởng. Giao đơn và làm nhiệm vụ để nhận thêm sao.</p>
         <div class="festival-card-footer"><button class="gbtn gbtn--green" data-sheet="quests">Làm nhiệm vụ</button>${m.level >= DATA.config.orderUnlockLevel ? '<button class="gbtn gbtn--gold" data-sheet="orders">Giao đơn</button>' : `<span class="festival-hint">Đơn hàng mở ở cấp ${DATA.config.orderUnlockLevel}.</span>`}</div>${rows}`,
        'sheet--stars',
      );
    }

    if (t === 'ledger') {
      const taxOwed = m.tax?.owed || 0;
      const debtOwe = m.debts?.owe || 0;
      const debtOwedToMe = m.debts?.owedToMe || 0;
      return sheetShell(
        '📋 Sổ Nông Thôn & Tài Chính',
        `<div class="ledger-box">
          <div class="ledger-metric">
            <span class="lm-label">💰 Tiền mặt</span>
            <span class="lm-val">${m.gold.toLocaleString('vi')} ${COIN}</span>
          </div>
          <div class="ledger-metric">
            <span class="lm-label">📦 Kho đồ (ước tính)</span>
            <span class="lm-val">${(m.netWorth ? Math.max(0, m.netWorth - m.gold) : 0).toLocaleString('vi')} ${COIN}</span>
          </div>
          <div class="ledger-metric">
            <span class="lm-label">🏛️ Tổng tài sản</span>
            <span class="lm-val"><b>${(m.netWorth ?? m.gold).toLocaleString('vi')}</b> ${COIN}</span>
          </div>
        </div>
        <h4 style="margin:0.8rem 0 0.4rem;font-size:0.95rem;color:var(--ink);">Khoản nợ & Nghĩa vụ</h4>
        <div class="ledger-items">
          <div class="ledger-row ${taxOwed > 0 ? 'ledger-row--warn' : ''}">
            <span class="lr-icon">🏛️</span>
            <div class="lr-info">
              <b>Thuế đất</b>
              <div class="lr-desc">${m.level < (m.tax?.unlockLevel || 20) ? `Miễn thuế đến cấp ${m.tax?.unlockLevel || 20} — cứ yên tâm trồng trọt` : taxOwed > 0 ? `Nợ ${taxOwed.toLocaleString('vi')} vàng (tự cấn trừ khi có vàng, cần trả để gieo hạt)` : 'Đã nộp đủ — đất đai tự do canh tác'}</div>
            </div>
            <span class="lr-val">${taxOwed > 0 ? `<span class="tag-debt">−${taxOwed.toLocaleString('vi')}</span>` : '<span class="tag-ok">0</span>'}</span>
          </div>
          <div class="ledger-row ${debtOwe > 0 ? 'ledger-row--warn' : ''}">
            <span class="lr-icon">💸</span>
            <div class="lr-info">
              <b>Tiền phạt chó cắn</b>
              <div class="lr-desc">${debtOwe > 0 ? `Nợ ${debtOwe.toLocaleString('vi')} vàng (lãi ${Math.round((m.debts?.interest || 0.05) * 100)}%/10p, tự cấn trừ khi có vàng)` : 'Không có khoản phạt nào'}</div>
            </div>
            <span class="lr-val">${debtOwe > 0 ? `<span class="tag-debt">−${debtOwe.toLocaleString('vi')}</span>` : '<span class="tag-ok">0</span>'}</span>
          </div>
          <div class="ledger-row">
            <span class="lr-icon">🐕</span>
            <div class="lr-info">
              <b>Tiền phạt trộm nợ bạn</b>
              <div class="lr-desc">${debtOwedToMe > 0 ? `Kẻ trộm đang nợ bạn ${debtOwedToMe.toLocaleString('vi')} vàng (tự thu khi họ có vàng)` : 'Không có ai nợ bạn tiền phạt'}</div>
            </div>
            <span class="lr-val">${debtOwedToMe > 0 ? `<span class="tag-credit">+${debtOwedToMe.toLocaleString('vi')}</span>` : '0'}</span>
          </div>
        </div>
        <div style="margin-top:1rem;display:flex;gap:0.5rem;">
          <button class="gbtn gbtn--gold" data-sheet="inventory" style="flex:1">🎒 Mở kho bán đồ</button>
          <button class="btn btn-ghost" data-close="1" style="flex:1">Đóng</button>
        </div>`
      );
    }

    if (t === 'family') {
      return sheetShell('👥 Người nhà', `<p class="sheet-note">Chọn người nhà để ghé thăm ruộng và giúp nhau.</p>
        <div class="family-search-wrap"><span class="family-search-icon" aria-hidden="true">🔍</span>
          <input class="family-search" type="search" aria-label="Tìm người nhà" placeholder="Tìm người nhà…" value="${esc(familyFilter)}" />
        </div><div class="family-strip">${familyStripHtml()}</div>`, 'sheet--family');
    }

    if (t === 'more') {
      const qReady = m.daily.done >= m.daily.required && !m.daily.chestClaimed;
      const oReady = m.orders.some((o) => canDeliver(o));
      const fReady = m.festival.milestones.some((ms) => !ms.claimed && ms.progress >= ms.target);
      const canSkill = canLearnAnySkill(m);
      const aReady = m.animals.some((x) => x.ready);
      const mReady = Object.values(m.machines).some((jobs) => Object.values(jobs || {}).some((j) => j.ready));
      const fishReady = (m.fishFarm?.batches || []).some((b) => b.ready);
      const wantsReady = DATA.wants?.canFill;
      const hasMail = m.goldRequests?.incoming;
      const deb = (m.tax?.owed > 0) || (m.debts?.owe > 0) || (m.debts?.owedToMe > 0);

      return sheetShell(
        '✨ Tính Năng Nông Trại',
        `<div class="more-grid">
          <button class="more-card" data-sheet="quests">
            <span class="mc-icon"><img src="${A('assets/ui/menu-quests.svg')}" alt="" />${qReady ? '<i class="dot"></i>' : ''}</span>
            <span class="mc-name">Nhiệm vụ</span>
            <span class="mc-sub">${m.daily.done}/${m.daily.required} hôm nay</span>
          </button>
          ${m.level >= DATA.config.orderUnlockLevel ? `
          <button class="more-card" data-sheet="orders">
            <span class="mc-icon"><img src="${A('assets/ui/menu-orders.svg')}" alt="" />${oReady ? '<i class="dot"></i>' : ''}</span>
            <span class="mc-name">Đơn hàng</span>
            <span class="mc-sub">${m.orders.filter((o) => canDeliver(o)).length} đơn sẵn sàng</span>
          </button>` : ''}
          <button class="more-card" data-sheet="festival">
            <span class="mc-icon"><img src="${A('assets/ui/menu-festival.svg')}" alt="" />${fReady ? '<i class="dot"></i>' : ''}</span>
            <span class="mc-name">Sự kiện</span>
            <span class="mc-sub">Mùa lễ hội</span>
          </button>
          <button class="more-card" data-sheet="collections">
            <span class="mc-icon"><img src="${A('assets/ui/menu-collections.svg')}" alt="" />${(m.collections || []).some((c) => !c.claimed && c.items.every((i) => i.found)) ? '<i class="dot"></i>' : ''}</span>
            <span class="mc-name">Sổ mùa vụ</span>
            <span class="mc-sub">Mục tiêu lâu dài</span>
          </button>
          ${m.skills.unlocked ? `
          <button class="more-card" data-sheet="skills">
            <span class="mc-icon"><img src="${A('assets/ui/menu-skills.svg')}" alt="" />${canSkill ? '<i class="dot"></i>' : ''}</span>
            <span class="mc-name">Kỹ năng</span>
            <span class="mc-sub">${m.skills.points} điểm</span>
          </button>` : ''}
          ${m.level >= DATA.config.animals.vit.level ? `
          <button class="more-card" data-sheet="barns">
            <span class="mc-icon"><img src="${A('assets/ui/menu-barns.svg')}" alt="" />${aReady ? '<i class="dot"></i>' : ''}</span>
            <span class="mc-name">Chuồng trại</span>
            <span class="mc-sub">Vật nuôi</span>
          </button>` : ''}
          ${m.level >= Math.min(...Object.values(DATA.config.machines).map((x) => x.level)) ? `
          <button class="more-card" data-sheet="mill">
            <span class="mc-icon"><img src="${A('assets/ui/menu-mill.svg')}" alt="" />${mReady ? '<i class="dot"></i>' : ''}</span>
            <span class="mc-name">Nhà máy</span>
            <span class="mc-sub">Chế biến</span>
          </button>` : ''}
          ${m.level >= DATA.config.fishing.level ? `
          <button class="more-card" data-sheet="fishing">
            <span class="mc-icon"><img src="${A('assets/ui/menu-fishing.svg')}" alt="" />${fishReady ? '<i class="dot"></i>' : ''}</span>
            <span class="mc-name">Hồ câu & Ao</span>
            <span class="mc-sub">Cá tươi</span>
          </button>` : ''}
          <button class="more-card" data-sheet="market">
            <span class="mc-icon"><img src="${A('assets/ui/dock-shop.svg')}" alt="" />${wantsReady ? '<i class="dot"></i>' : ''}</span>
            <span class="mc-name">Chợ thu mua</span>
            <span class="mc-sub">Giao dịch</span>
          </button>
          <button class="more-card" data-sheet="family">
            <span class="mc-icon"><img src="${A('assets/ui/menu-family.svg')}" alt="" /></span>
            <span class="mc-name">Người nhà</span>
            <span class="mc-sub">${DATA.family.length} nông dân · ghé thăm</span>
          </button>
          <button class="more-card" data-sheet="luxury">
            <span class="mc-icon"><img src="${A('assets/ui/menu-luxury.svg')}" alt="" /></span>
            <span class="mc-name">Đồ xa xỉ</span>
            <span class="mc-sub">Trang trí & Khung</span>
          </button>
          <button class="more-card" data-sheet="money">
            <span class="mc-icon"><img src="${A('assets/ui/menu-money.svg')}" alt="" />${hasMail ? '<i class="dot"></i>' : ''}</span>
            <span class="mc-name">Xin / Cho vàng</span>
            <span class="mc-sub">Tương trợ</span>
          </button>
          <button class="more-card" data-sheet="ledger">
            <span class="mc-icon"><img src="${A('assets/ui/menu-ledger.svg')}" alt="" />${deb ? '<i class="dot"></i>' : ''}</span>
            <span class="mc-name">Sổ Nông Thôn</span>
            <span class="mc-sub">Tài chính & Nợ</span>
          </button>
          <button class="more-card" data-action="leaderboard">
            <span class="mc-icon"><img src="${A('assets/ui/menu-leaderboard.svg')}" alt="" /></span>
            <span class="mc-name">Bảng xếp hạng</span>
            <span class="mc-sub">Vinh danh làng</span>
          </button>
        </div>${renderUpcomingUnlocks(m.level)}`
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
        <span class="lb-name${frameCls(f.frame)}">${esc(f.name)}${f.title ? ` <i class="lb-title">${esc(f.title)}</i>` : ''}</span>
        <span class="lb-stat">Lv ${f.level} · ${f.stars}${STAR} · ${f.gold.toLocaleString('vi')} ${COIN} · 💰 ${(f.netWorth ?? f.gold).toLocaleString('vi')}</span>
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
      <p class="sheet-note">Chốt sổ <b>9h sáng giờ Los Angeles</b> mỗi ngày: ${tb.rewards.map((r, i) => `${medal(i + 1)} ${r.gems} ${GEM} + ${r.gold.toLocaleString('vi')} ${COIN}`).join(' · ')}</p>
      <p class="sheet-note">💹 Kinh tế làng = tổng vàng cả làng đã <b>bán hàng</b> (hệ thống + đơn hàng + bạn bè; không tính vàng tặng/trộm/thưởng): ${(tb.economy?.villageGold || 0).toLocaleString('vi')} ${COIN} → thưởng ×${tb.economy?.mult || 1} (mỗi 5 triệu cộng thêm ×1).</p>`;
    return `
      <div class="modal-backdrop" data-close="1">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title" onclick="event.stopPropagation()">
          <h3 id="leaderboard-title">Bảng xếp hạng</h3>
          <button class="modal-close" type="button" data-close="1" aria-label="Đóng bảng xếp hạng">×</button>
          <div class="lb-tabs">
            <button class="gbtn btn-mini${thiefTab ? '' : ' gbtn--gold'}" data-lb-tab="village">🏆 Làng</button>
            <button class="gbtn btn-mini${thiefTab ? ' gbtn--gold' : ''}" data-lb-tab="thief">🥷 Trộm</button>
          </div>
          ${thiefTab ? thief : village}
        </div>
      </div>`;
  }

  let MONEY = null;
  async function loadReadOnlySheet(path, type, save) {
    const sequence = ++sheetLoadSequence;
    const navigationEpoch = sheetNavigationEpoch;
    const startedAtMutationEpoch = mutationEpoch;
    const visitOwnerId = VISIT?.ownerId;
    try {
      const data = await api(path);
      if (sequence !== sheetLoadSequence || navigationEpoch !== sheetNavigationEpoch
        || startedAtMutationEpoch !== mutationEpoch || visitOwnerId !== VISIT?.ownerId) return;
      save(data);
      sheet = { type };
      render();
    } catch { /* api() has already shown the request error */ }
  }
  async function openMoney() {
    await loadReadOnlySheet('/gold-requests', 'money', (data) => { MONEY = data; });
  }

  let LOTTERY_DATA = null;
  async function openLuxury() {
    await loadReadOnlySheet('/lottery', 'luxury', (data) => { LOTTERY_DATA = data; });
  }

  async function openMarket() {
    await loadReadOnlySheet('/wants', 'market', (data) => { MARKET = data; });
  }

  // ---------- events ----------
  let bindAbort = null;
  function bind() {
    bindAbort?.abort();
    bindAbort = new AbortController();
    const nativeAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function addBoundEvent(type, listener, options) {
      const opts = typeof options === 'boolean'
        ? { capture: options, signal: bindAbort.signal }
        : { ...(options || {}), signal: bindAbort.signal };
      return nativeAdd.call(this, type, listener, opts);
    };
    document.querySelectorAll('[data-close]').forEach((el) =>
      el.addEventListener('click', () => { sheet = null; showLb = null; render(); }));
    document.addEventListener('keydown', (ev) => {
      const awayOpen = !!document.querySelector('.modal--away');
      if (!sheet && !showLb && !awayOpen) return;
      if (ev.key === 'Escape') {
        ev.preventDefault();
        if (sheet) sheet = null;
        else if (showLb) showLb = null;
        else if (DATA.me) DATA.me.awayReport = null;
        render();
        return;
      }
      if (ev.key !== 'Tab') return;
      const panel = document.querySelector(sheet ? '.sheet' : '.modal');
      const focusable = [...(panel?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])]
        .filter((element) => element.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (ev.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        ev.preventDefault();
        first.focus();
      }
    });

    document.querySelectorAll('[data-sheet]').forEach((el) =>
      el.addEventListener('click', () => {
        sfx('playTap');
        if (el.dataset.sheet === 'market') { openMarket(); return; }
        if (el.dataset.sheet === 'luxury') { openLuxury(); return; }
        if (el.dataset.sheet === 'money') { openMoney(); return; }
        sheet = { type: el.dataset.sheet, shopCategory: el.dataset.shopCategory, returnBarn: el.dataset.returnBarn }; render();
      }));
    if (sheet?.type === 'seed') {
      const updateSeedFinder = () => {
        const root = document.querySelector('.sheet--seed');
        if (!root) return;
        const query = normalizeSearch(sheet.seedQuery).trim();
        let matched = 0;
        let unlocked = 0;
        root.querySelectorAll('.seed-card[data-seed-name]').forEach((card) => {
          card.hidden = !normalizeSearch(card.dataset.seedName).includes(query);
          if (!card.hidden) { matched += 1; if (card.dataset.seedUnlocked === '1') unlocked += 1; }
        });
        root.querySelectorAll('[data-seed-section]').forEach((section) => {
          section.hidden = ![...section.querySelectorAll('.seed-card')].some((card) => !card.hidden);
        });
        const future = root.querySelector('.seed-future');
        if (future) {
          const hasMatch = [...future.querySelectorAll('.seed-card')].some((card) => !card.hidden);
          future.hidden = !hasMatch;
          future.open = Boolean(query) && hasMatch;
        }
        root.querySelector('.seed-result-count').textContent = query
          ? `${matched} giống phù hợp · ${unlocked} đã mở`
          : `${unlocked} giống đã mở · ${matched - unlocked} sắp mở`;
        root.querySelector('.seed-search-empty').hidden = matched > 0;
      };
      document.getElementById('seed-search')?.addEventListener('input', (event) => {
        sheet.seedQuery = event.currentTarget.value;
        updateSeedFinder();
      });
      updateSeedFinder();
    }
    if (sheet?.type === 'skills') {
      const updateSkillView = () => {
        let visible = 0;
        document.querySelectorAll('.skill-branch').forEach((branch) => {
          let branchVisible = 0;
          branch.querySelectorAll('[data-skill]').forEach((card) => {
            card.hidden = sheet.skillView === 'available' && card.dataset.skillCan !== 'true';
            if (!card.hidden) { visible += 1; branchVisible += 1; }
          });
          branch.hidden = branchVisible === 0;
        });
        document.querySelector('.skill-empty').hidden = visible > 0;
        document.querySelectorAll('[data-skill-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.skillView === (sheet.skillView || 'all'))));
      };
      document.querySelectorAll('[data-skill-view]').forEach((button) => button.addEventListener('click', () => {
        sheet.skillView = button.dataset.skillView; updateSkillView();
      }));
      updateSkillView();
    }
    if (sheet?.type === 'barns') {
      const updateBarnFilter = () => {
        const filter = sheet.barnFilter || 'all';
        let visible = 0;
        document.querySelectorAll('.sheet--barns .barn-card').forEach((card) => {
          card.hidden = (filter === 'owned' && card.dataset.barnOwned !== 'true')
            || (filter === 'hungry' && card.dataset.barnHungry !== 'true');
          if (!card.hidden) visible += 1;
        });
        document.querySelectorAll('[data-barn-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.barnFilter === filter)));
        document.querySelector('.barn-result-count').textContent = `${visible} chuồng phù hợp`;
        document.querySelector('.barn-filter-empty').hidden = visible > 0;
      };
      document.querySelectorAll('[data-barn-filter]').forEach((button) => button.addEventListener('click', () => {
        sheet.barnFilter = button.dataset.barnFilter;
        updateBarnFilter();
      }));
      updateBarnFilter();
    }
    if (sheet?.type === 'inventory') {
      const updateInventoryFinder = () => {
        const query = normalizeSearch(sheet.inventoryQuery).trim();
        const group = sheet.inventoryGroup || 'all';
        let visible = 0;
        document.querySelectorAll('.sheet--inventory .inv-row[data-item]').forEach((row) => {
          const name = normalizeSearch(row.querySelector('.seed-name')?.textContent);
          row.hidden = (group !== 'all' && row.dataset.inventoryKind !== group) || !name.includes(query);
          if (!row.hidden) visible += 1;
        });
        document.querySelectorAll('[data-inventory-group]').forEach((button) => {
          button.setAttribute('aria-pressed', String(button.dataset.inventoryGroup === group));
        });
        const count = document.querySelector('.inv-result-count');
        if (count) count.textContent = `${visible} vật phẩm phù hợp`;
        const empty = document.querySelector('.inv-filter-empty');
        if (empty) empty.hidden = visible > 0 || Object.keys(me().inventory).length === 0;
      };
      document.querySelector('#inventory-search')?.addEventListener('input', (event) => {
        sheet.inventoryQuery = event.currentTarget.value;
        updateInventoryFinder();
      });
      document.querySelectorAll('[data-inventory-group]').forEach((button) => button.addEventListener('click', () => {
        sheet.inventoryGroup = button.dataset.inventoryGroup;
        updateInventoryFinder();
      }));
      updateInventoryFinder();
    }
    document.querySelectorAll('[data-action="leaderboard"]').forEach((el) =>
      el.addEventListener('click', async () => {
        sfx('playTap');
        sheet = null;
        const r = await run(async () => {
          const [lb, tb] = await Promise.all([api('/leaderboard'), api('/thief-board')]);
          return { lb, tb, tab: 'thief' };
        });
        if (r) { showLb = r; render(); }
      }));
    document.getElementById('btn-dock-farm')?.addEventListener('click', () => {
      sfx('playTap');
      if (VISIT) { VISIT = null; INSPECT = false; refresh(); }
      else { sheet = null; showLb = null; render(); }
    });
    document.querySelector('[data-next-step]')?.addEventListener('click', (ev) => {
      const kind = ev.currentTarget.dataset.nextStep;
      if (kind === 'seed') {
        const firstEmpty = me().plots.find((plot) => !plot.crop);
        if (!firstEmpty) return;
        sheet = { type: 'seed', idx: firstEmpty.idx };
        render();
        return;
      }
      if (['orders', 'inventory', 'collections', 'festival'].includes(kind)) {
        sheet = { type: kind === 'orders' && me().level < DATA.config.orderUnlockLevel ? 'quests' : kind };
        render();
        return;
      }
      if (kind === 'mill' || kind === 'feed') {
        sheet = { type: kind === 'mill' ? 'mill' : 'shop' };
        render();
        return;
      }
      if (kind === 'pond') {
        sheet = { type: 'fishing' };
        render();
        const harvest = document.querySelector('#btn-fish-harvest-all') || document.querySelector('[data-fish-harvest]');
        harvest?.scrollIntoView({ block: 'center' });
        harvest?.focus({ preventScroll: true });
        return;
      }
      if (kind === 'growing') {
        document.querySelector(`.plot[data-idx="${ev.currentTarget.dataset.nextIdx}"]`)?.click();
        return;
      }
      document.querySelector(kind === 'harvest' ? '.plot[data-kind="harvest"]' : '.plot[data-kind="waterplot"]')?.click();
    });
    document.querySelectorAll('[data-festival-farm]').forEach((button) => button.addEventListener('click', () => {
      sheet = null;
      render();
      const plot = document.querySelector('.plot[data-kind="harvest"]') || document.querySelector('.plot[data-kind="empty"]') || document.querySelector('.plot:not(:disabled)');
      plot?.scrollIntoView({ block: 'center' });
      plot?.focus({ preventScroll: true });
    }));
    document.getElementById('btn-inspect-mode')?.addEventListener('click', () => { INSPECT = !INSPECT; toast(INSPECT ? '🔍 Bấm vào một ô đang trồng để khám xét' : 'Tắt khám xét'); render(); });
    document.getElementById('btn-gold-give')?.addEventListener('click', () => {
      sheet = { type: 'gold-give', recipientId: VISIT.ownerId, recipientName: VISIT.farm.name, amount: '' };
      render();
    });
    const giftPreview = () => {
      const input = document.getElementById('gift-amount');
      const preview = document.getElementById('gift-preview');
      const send = document.getElementById('btn-gift-send');
      if (!input || !preview || !send) return false;
      sheet.amount = input.value;
      const amount = Number(input.value);
      const valid = /^[0-9]+$/.test(input.value) && Number.isSafeInteger(amount) && amount >= 1 && amount <= 1_000_000_000;
      const asking = sheet.type === 'gold-ask';
      const affordable = valid && (asking || amount <= me().gold);
      send.disabled = !affordable;
      send.textContent = affordable ? `${asking ? 'Gửi lời xin' : 'Tặng'} ${amount.toLocaleString('vi')} vàng` : asking ? 'Gửi lời xin' : 'Tặng vàng';
      preview.textContent = !valid ? 'Nhập số vàng nguyên từ 1 đến 1.000.000.000.'
        : !affordable ? `Thiếu ${(amount - me().gold).toLocaleString('vi')} vàng.`
          : asking ? `Xin ${sheet.recipientName} ${amount.toLocaleString('vi')} vàng · chưa chuyển vàng.`
            : `${sheet.recipientName} nhận ${amount.toLocaleString('vi')} vàng · bạn còn ${(me().gold - amount).toLocaleString('vi')} vàng.`;
      return affordable;
    };
    document.getElementById('gift-amount')?.addEventListener('input', giftPreview);
    giftPreview();
    document.getElementById('gift-note')?.addEventListener('input', (event) => { sheet.note = event.target.value; });
    document.getElementById('btn-gift-send')?.addEventListener('click', async () => {
      if (!giftPreview()) return;
      const actionSheet = sheet;
      const n = Number(actionSheet.amount);
      const asking = actionSheet.type === 'gold-ask';
      const r = await run(() => api(asking ? '/gold-ask' : '/gold-give', { toId: actionSheet.recipientId, amount: n, ...(asking ? { note: actionSheet.note || '' } : {}) }), 'global', document.getElementById('btn-gift-send'));
      if (r) {
        updateMe(r);
        if (sheet === actionSheet) sheet = null;
        toast(asking ? `🙏 Đã gửi lời xin ${n.toLocaleString('vi')} vàng tới ${actionSheet.recipientName}` : `💝 Đã tặng ${actionSheet.recipientName} ${n.toLocaleString('vi')} vàng!`);
        render();
      }
    });
    document.getElementById('btn-gold-ask')?.addEventListener('click', () => {
      sheet = { type: 'gold-ask', recipientId: VISIT.ownerId, recipientName: VISIT.farm.name, amount: '', note: '' };
      render();
    });
    document.querySelectorAll('[data-gr-act]').forEach((el) => el.addEventListener('click', async () => {
      const act = el.dataset.grAct;
      if (act === 'pay') {
        const request = MONEY?.incoming.find((entry) => entry.id === Number(el.dataset.grId));
        if (!request || me().gold < request.amount) return;
        if (!window.confirm(`Cho ${request.fromName} ${request.amount.toLocaleString('vi')} vàng? Bạn còn ${(me().gold - request.amount).toLocaleString('vi')} vàng sau khi cho.`)) return;
      }
      const r = await run(() => api('/gold-request-act', { id: Number(el.dataset.grId), action: act }));
      if (r) { updateMe(r); MONEY = r.requests; toast(act === 'pay' ? '💝 Đã cho!' : act === 'decline' ? '🙅 Đã từ chối' : '↩️ Đã huỷ'); render(); }
    }));
    document.getElementById('btn-audio-toggle')?.addEventListener('click', () => {
      const muted = window.NTVVAudio?.toggleMute();
      sfx('playTap');
      const btn = document.getElementById('btn-audio-toggle');
      if (btn) {
        btn.innerHTML = `<img class="hud-icon" src="${A(muted ? 'assets/ui/menu-audio-off.svg' : 'assets/ui/menu-audio-on.svg')}" alt="" />`;
        btn.setAttribute('aria-pressed', String(!muted));
        btn.title = muted ? 'Bật âm thanh' : 'Tắt âm thanh';
      }
      toast(muted ? '🔇 Đã tắt âm thanh' : '🔊 Đã bật âm thanh');
    });
    document.getElementById('btn-away-ack')?.addEventListener('click', async () => {
      sfx('playTap');
      const r = await run(() => api('/away-ack', {}));
      if (r) { updateMe(r); render(); }
    });
    document.querySelectorAll('[data-revenge-id]').forEach((el) => el.addEventListener('click', async () => {
      const targetId = Number(el.dataset.revengeId);
      if (!targetId) return;
      sfx('playTap');
      await api('/away-ack', {});
      if (DATA.me) DATA.me.awayReport = null;
      try {
        const r = await api(`/farm/${targetId}`);
        VISIT = { ownerId: targetId, farm: r.farm, myActs: r.myActs };
        render();
        toast(`🎯 Đã đột nhập nông trại của ${r.farm.name}! Mau hành động!`);
      } catch (err) {
        toast(err?.message || 'Không thể ghé thăm nông trại này');
      }
    }));
    document.querySelectorAll('[data-away-close]').forEach((el) => el.addEventListener('click', () => { if (DATA.me) DATA.me.awayReport = null; render(); }));
    document.querySelectorAll('[data-buy-gems]').forEach((el) => el.addEventListener('click', async () => {
      const pack = (DATA.config.gemPacks || []).find((p) => p.id === el.dataset.buyGems);
      if (!pack || !window.confirm(`Mua ${pack.gems} kim cương với ${pack.gold.toLocaleString('vi')} vàng?`)) return;
      const r = await run(() => api('/buy-gems', { pack: pack.id }));
      if (r) { updateMe(r); toast(`💎 +${r.gems} kim cương!`); render(); }
    }));
    document.querySelector('[data-decor-owner]')?.addEventListener('toggle', (event) => {
      const owner = event.currentTarget.dataset.decorOwner;
      if (event.currentTarget.open) openDecorOwners.add(owner); else openDecorOwners.delete(owner);
    });
    document.querySelectorAll('[data-lux-view]').forEach((button) => button.addEventListener('click', () => {
      sheet.luxView = button.dataset.luxView;
      render();
      document.querySelector(`[data-lux-view="${sheet.luxView}"]`)?.focus();
    }));
    document.querySelectorAll('[data-lux-buy]').forEach((el) => el.addEventListener('click', async () => {
      if (el.dataset.off) { toast('Chưa đủ vàng 😅'); return; }
      const x = DATA.config.luxury[el.dataset.luxBuy];
      if (!window.confirm(`Tậu ${x.emoji} ${x.name} với ${x.price.toLocaleString('vi')} vàng? Vàng này bị đốt, không hoàn lại.`)) return;
      const r = await run(() => api('/luxury-buy', { item: x.id }));
      if (r) { updateMe(r); toast(`💎 Đã tậu ${x.emoji} ${x.name}!`); render(); }
    }));
    document.querySelectorAll('[data-lux-equip]').forEach((el) => el.addEventListener('click', async () => {
      const r = await run(() => api('/luxury-equip', { item: el.dataset.luxEquip || '', kind: el.dataset.luxKind }));
      if (r) { updateMe(r); render(); }
    }));
    document.querySelectorAll('[data-lottery-buy]').forEach((el) => el.addEventListener('click', async () => {
      const r = await run(() => api('/lottery-buy', { qty: Number(el.dataset.lotteryBuy) }));
      if (r) { updateMe(r); LOTTERY_DATA = r.lottery; toast(`🎟️ Đã mua ${el.dataset.lotteryBuy} vé — chúc may mắn!`); render(); }
    }));
    document.querySelectorAll('[data-machine-upgrade]').forEach((el) => el.addEventListener('click', async () => {
      const r = await run(() => api('/machine-upgrade', { machine: el.dataset.machineUpgrade }));
      if (r) { updateMe(r); toast('⚙️ Nâng cấp xong — nấu nhanh hơn!'); render(); }
    }));
    document.querySelectorAll('[data-dog-hire]').forEach((el) =>
      el.addEventListener('click', async () => {
        const r = await run(() => api('/dog-hire', { hours: Number(el.dataset.dogHire) }));
        if (r) { updateMe(r); toast(`🐕 Chó canh vườn nhận ca ${el.dataset.dogHire} giờ!`); render(); }
      }));
    document.getElementById('btn-want-create')?.addEventListener('click', async () => {
      const item = document.getElementById('want-item')?.value;
      const qty = Number(document.getElementById('want-qty')?.value) || 1;
      const r = await run(() => api('/want-create', { item, qty }));
      if (r) { updateMe(r); MARKET = r.wants; toast('📣 Đã đăng tin cần mua!'); render(); }
    });
    document.querySelectorAll('[data-want-cancel]').forEach((el) =>
      el.addEventListener('click', async () => {
        const r = await run(() => api('/want-cancel', { id: Number(el.dataset.wantCancel) }));
        if (r) { updateMe(r); MARKET = r.wants; toast(`Đã huỷ tin — hoàn ${r.refund.toLocaleString('vi')} vàng.`); render(); }
      }));
    document.querySelectorAll('[data-want-fill]').forEach((el) =>
      el.addEventListener('click', async (e) => {
        const r = await run(() => api('/want-fill', { id: Number(el.dataset.wantFill), qty: rowQty(el) }));
        if (r) { updateMe(r); MARKET = r.wants; floatGain(e.clientX, e.clientY, `+${r.gained.toLocaleString('vi')} ${COIN}`); toast(`🤝 Đã bán ${r.sold} món cho bạn bè!`); render(); }
      }));
    const wantPreview = () => {
      const sel = document.getElementById('want-item'); const q = document.getElementById('want-qty'); const p = document.getElementById('want-preview');
      if (!sel || !p) return;
      const button = document.getElementById('btn-want-create');
      const n = Number(q?.value);
      const valid = Number.isSafeInteger(n) && n >= 1 && n <= 999;
      const unit = Math.round((itemInfo(sel.value)?.sell || 0) * 1.3);
      const full = (MARKET?.mine.length || 0) >= 5;
      button.disabled = !valid || !unit || full || me().gold < unit * n;
      if (!unit) { p.textContent = 'Không có mặt hàng phù hợp. Xóa tìm kiếm hoặc nhập tên khác.'; return; }
      if (!valid) { p.textContent = 'Nhập số lượng nguyên từ 1 đến 999.'; return; }
      if (full) { p.textContent = 'Bạn đã có 5 tin. Hủy hoặc hoàn thành một tin trước khi đăng thêm.'; return; }
      p.innerHTML = `Trả <b>${unit.toLocaleString('vi')}</b> vàng/cái × ${n} = <b>${(unit * n).toLocaleString('vi')}</b> vàng (ký quỹ ngay, hoàn phần chưa nhận khi huỷ).${me().gold < unit * n ? ` Thiếu ${(unit * n - me().gold).toLocaleString('vi')} vàng.` : ''}`;
    };
    const filterWantCatalog = () => {
      const select = document.getElementById('want-item');
      if (!select) return;
      const query = normalizeSearch(sheet.wantQuery || '').trim();
      const options = [...select.options];
      options.forEach((option) => { option.hidden = !normalizeSearch(option.textContent).includes(query); });
      const matches = options.filter((option) => !option.hidden);
      if (!matches.some((option) => option.value === select.value)) select.value = matches[0]?.value || '';
      select.disabled = matches.length === 0;
      document.getElementById('want-search-count').textContent = `${matches.length} mặt hàng phù hợp`;
      wantPreview();
    };
    document.getElementById('want-search')?.addEventListener('input', (event) => {
      sheet.wantQuery = event.currentTarget.value;
      filterWantCatalog();
    });
    document.getElementById('want-item')?.addEventListener('change', wantPreview);
    document.getElementById('want-qty')?.addEventListener('input', wantPreview);
    filterWantCatalog();
    const filterWantBoard = () => {
      const count = document.getElementById('want-board-count');
      if (!count) return;
      const query = normalizeSearch(sheet.wantBoardQuery || '').trim();
      let visible = 0;
      const rows = document.querySelectorAll('[data-want]');
      rows.forEach((row) => {
        row.hidden = (sheet.wantBoardView === 'available' && row.dataset.wantCan !== 'true')
          || !normalizeSearch(row.querySelector('.seed-name').textContent).includes(query);
        if (!row.hidden) visible += 1;
      });
      document.querySelectorAll('[data-want-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.wantView === (sheet.wantBoardView || 'all'))));
      count.textContent = `${visible} tin phù hợp`;
      document.getElementById('want-board-empty').hidden = visible > 0 || rows.length === 0;
    };
    document.getElementById('want-board-search')?.addEventListener('input', (event) => {
      sheet.wantBoardQuery = event.currentTarget.value; filterWantBoard();
    });
    document.querySelectorAll('[data-want-view]').forEach((button) => button.addEventListener('click', () => {
      sheet.wantBoardView = button.dataset.wantView; filterWantBoard();
    }));
    filterWantBoard();
    document.querySelectorAll('[data-want] .qty-input').forEach((input) => {
      const update = () => {
        const row = input.closest('[data-want]');
        const button = row.querySelector('[data-want-fill]');
        const n = Number(input.value);
        const valid = Number.isSafeInteger(n) && n >= 1 && n <= Number(input.max);
        button.disabled = !valid;
        button.textContent = valid ? `Bán ${n} · +${(n * Number(row.dataset.wantPrice)).toLocaleString('vi')} vàng` : `Nhập từ 1 đến ${input.max}`;
      };
      input.addEventListener('input', update);
      update();
    });

    document.getElementById('btn-lb')?.addEventListener('click', async () => {
      const r = await run(async () => {
        const [lb, tb] = await Promise.all([api('/leaderboard'), api('/thief-board')]);
        return { lb, tb, tab: 'thief' };
      });
      if (r) { showLb = r; render(); }
    });
    document.querySelectorAll('[data-lb-tab]').forEach((el) =>
      el.addEventListener('click', () => { showLb.tab = el.dataset.lbTab; render(); }));

    document.getElementById('btn-home')?.addEventListener('click', () => { VISIT = null; INSPECT = false; refresh(); });

    document.querySelectorAll('.family-strip').forEach((strip) => strip.addEventListener('click', async (ev) => {
      const el = ev.target.closest('[data-visit]');
      if (!el) return;
      if (el.dataset.me === '1') { VISIT = null; sheet = null; refresh(); return; }
      try {
        const r = await api(`/farm/${Number(el.dataset.visit)}`);
        VISIT = { ownerId: Number(el.dataset.visit), farm: r.farm, myActs: r.myActs };
        sheet = null;
        render();
      } catch { /* toast lo rồi */ }
    }));

    document.querySelectorAll('.family-search').forEach((input) => input.addEventListener('input', (ev) => {
      familyFilter = ev.target.value;
      document.querySelectorAll('.family-strip').forEach((strip) => { strip.innerHTML = familyStripHtml(); });
    }));

    document.getElementById('btn-plantall')?.addEventListener('click', () => { sheet = { type: 'seed', all: true }; render(); });
    document.getElementById('btn-harvestall')?.addEventListener('click', async (e) => {
      sfx('playHarvest');
      const r = await run(() => api('/harvest-all', {}));
      if (r) { sfx('playCoin'); updateMe(r); floatGain(e.clientX || 200, e.clientY || 300, `🧺 +${r.harvested}`); render(); }
    });

    document.querySelectorAll('[data-seed-sort]').forEach((el) =>
      el.addEventListener('click', () => {
        try { localStorage.setItem('seedSort', el.dataset.seedSort); } catch {}
        render();
      }));
    document.querySelectorAll('[data-tree]').forEach((el) =>
      el.addEventListener('click', async () => {
        if (!el.dataset.tree) return;
        const startedSheet = sheet;
        const wasAll = sheet.all;
        const r = await run(() => wasAll ? api('/plant-all', { crop: el.dataset.tree }) : api('/plant-tree', { idx: sheet.idx, tree: el.dataset.tree }), wasAll ? 'global' : plotResource(me().id, sheet.idx), el);
        if (r) { updateMe(r); closeSheetAfterAction(startedSheet); toast(wasAll ? `🌳 Đã trồng ${r.planted} cây!` : '🌳 Cây đã bén rễ!'); render(); }
      }));
    document.getElementById('btn-remove-tree')?.addEventListener('click', () => {
      const plot = me().plots[sheet.idx];
      sheet.removeTree = { crop: plot.crop, version: me().mutationVersion };
      render();
      document.getElementById('btn-cancel-remove-tree')?.focus();
    });
    document.getElementById('btn-cancel-remove-tree')?.addEventListener('click', () => {
      if (!me().plots[sheet.idx]?.tree || me().plots[sheet.idx]?.ready) { sheet = null; render(); return; }
      delete sheet.removeTree;
      render();
      document.getElementById('btn-remove-tree')?.focus();
    });
    document.getElementById('btn-confirm-remove-tree')?.addEventListener('click', async (e) => {
      const startedSheet = sheet;
      const r = await run(() => api('/remove-tree', { idx: sheet.idx, expectedVersion: sheet.removeTree.version }), plotResource(me().id, sheet.idx), e.currentTarget);
      if (r) { updateMe(r); closeSheetAfterAction(startedSheet); toast('🪓 Đã nhổ cây.'); render(); }
    });
    document.querySelectorAll('[data-crop]').forEach((el) =>
      el.addEventListener('click', async () => {
        const cropId = el.dataset.crop;
        if (!cropId) return;
        const startedSheet = sheet;
        const wasAll = sheet.all;
        const r = await run(() => wasAll ? api('/plant-all', { crop: cropId }) : api('/plant', { idx: sheet.idx, crop: cropId }), wasAll ? 'global' : plotResource(me().id, sheet.idx), el);
        if (r) { updateMe(r); closeSheetAfterAction(startedSheet); if (wasAll) toast(`🌱 Đã gieo ${r.planted} ô!`); render(); }
      }));

    document.querySelectorAll('button[data-shop-category]:not([data-sheet])').forEach((el) =>
      el.addEventListener('click', () => {
        if (sheet?.type !== 'shop') return;
        sheet.shopCategory = el.dataset.shopCategory;
        render();
        document.querySelector(`[data-shop-category="${sheet.shopCategory}"]`)?.focus();
      }));
    document.querySelectorAll('[data-factory-view]').forEach((el) =>
      el.addEventListener('click', () => {
        if (!sheet || sheet.type !== 'mill') return;
        sheet.factoryView = el.dataset.factoryView;
        render();
        document.querySelector(`[data-factory-view="${sheet.factoryView}"]`)?.focus();
      }));
    if (sheet?.type === 'mill') {
      const updateFactoryFinder = () => {
        const query = normalizeSearch(sheet.factoryQuery).trim();
        let visible = 0;
        document.querySelectorAll('.sheet--factory .machine-grid > .machine-block').forEach((block) => {
          const rows = [...block.querySelectorAll('.mc-row')];
          rows.forEach((row) => {
            const recipe = row.querySelector('.seed-name')?.textContent || '';
            const ingredients = row.querySelector('.mc-recipe-meta span')?.textContent || '';
            row.hidden = Boolean(query) && !normalizeSearch(`${recipe} ${ingredients}`).includes(query);
            if (!row.hidden) visible += 1;
          });
          block.hidden = Boolean(query) && !rows.some((row) => !row.hidden);
        });
        const count = document.querySelector('.mc-result-count');
        if (count) count.textContent = `${visible} công thức phù hợp`;
        const empty = document.querySelector('.mc-search-empty');
        if (empty) empty.hidden = !query || visible > 0 || Boolean(document.querySelector('.mc-view-empty'));
      };
      document.querySelector('#factory-search')?.addEventListener('input', (event) => {
        sheet.factoryQuery = event.currentTarget.value;
        updateFactoryFinder();
      });
      updateFactoryFinder();
    }
    document.querySelectorAll('[data-machine-run]').forEach((el) =>
      el.addEventListener('click', async () => {
        if (!el.dataset.recipe) return;
        if (el.dataset.off) {
          const row = el.closest('[data-missing]');
          if (row) offerWants(row); else toast('Hàng đợi máy đầy hoặc không thêm được nữa.');
          return;
        }
        const r = await run(() => api('/machine-run', { machine: el.dataset.machineRun, recipe: el.dataset.recipe, count: Number(el.dataset.count) || 1 }));
        if (r) { updateMe(r); toast(r.total > r.queued ? `🏭 +${r.queued} mẻ (hàng đợi ${r.total})` : `🏭 Đã xếp ${r.queued} mẻ!`); render(); }
      }));
    // Thiếu nguyên liệu → hỏi đăng tin thu mua phần thiếu (giá 130% chợ, ký quỹ).
    async function offerWants(el) {
        const need = el.dataset.missing.split(',').map((x) => { const [id, q] = x.split(':'); return { id, q: Number(q) }; });
        const lines = need.map((x) => `• ${x.q} ${itemInfo(x.id)?.name || x.id} — ${(Math.round((itemInfo(x.id)?.sell || 0) * 1.3) * x.q).toLocaleString('vi')} vàng`).join('\n');
        const total = need.reduce((a, x) => a + Math.round((itemInfo(x.id)?.sell || 0) * 1.3) * x.q, 0);
        if (!window.confirm(`Thiếu nguyên liệu cho ${el.dataset.missingName}:\n${lines}\n\nĐăng tin thu mua từ bạn bè (trả 130% giá chợ, ký quỹ ${total.toLocaleString('vi')} vàng)?`)) return;
        let ok = 0;
        for (const x of need) {
          const r = await run(() => api('/want-create', { item: x.id, qty: x.q }));
          if (r) { ok += 1; updateMe(r); MARKET = r.wants; }
        }
        if (ok) toast(`📣 Đã đăng ${ok} tin cần mua — cả làng được báo!`);
        render();
    }
    document.querySelectorAll('[data-missing]').forEach((el) =>
      el.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        offerWants(el);
      }));
    const fishPreview = () => {
      const sel = document.getElementById('fish-species'); const q = document.getElementById('fish-qty'); const p = document.getElementById('fish-preview');
      if (!sel || !p) return;
      const sp = DATA.config.fishFarm[sel.value];
      if (!sp) return;
      const requested = Number(q?.value);
      const valid = Number.isSafeInteger(requested) && requested >= 1;
      const room = Math.max(0, me().fishFarm.capacity - me().fishFarm.used);
      const affordable = Math.floor(me().gold / sp.fry);
      const maxStock = Math.max(0, Math.min(room, affordable));
      const n = valid ? Math.min(requested, maxStock) : 0;
      const stockButton = document.getElementById('btn-fish-stock');
      const maxButton = document.getElementById('btn-fish-stock-max');
      if (stockButton) stockButton.disabled = n < 1;
      if (maxButton) { maxButton.disabled = maxStock < 1; maxButton.textContent = `Thả tối đa (${maxStock})`; }
      const info = itemInfo(sp?.product);
      const detail = document.getElementById('fish-species-detail');
      if (detail) detail.innerHTML = `${itemImg(sp.product, 'seed-sprite')}<div><b>${esc(sp.name)}</b><dl><div><dt>Giống / con</dt><dd>${sp.fry.toLocaleString('vi')} vàng</dd></div><div><dt>Thời gian</dt><dd>${animalDuration(sp.growMs)}</dd></div><div><dt>Bán / con</dt><dd>${(info?.sell || 0).toLocaleString('vi')} vàng</dd></div></dl></div>`;
      if (!valid) { p.textContent = 'Nhập số con nguyên dương để xem chi phí.'; return; }
      if (!maxStock) { p.textContent = `Chưa đủ ${sp.fry.toLocaleString('vi')} vàng để mua giống ${sp.name}.`; return; }
      const limitNote = n < requested ? `Bạn chọn ${requested} con; ao còn ${room} chỗ và đủ vàng cho ${affordable} con. ` : '';
      p.innerHTML = `${limitNote}Sẽ thả <b>${n} con ${sp.name}</b>, tốn <b>${(sp.fry * n).toLocaleString('vi')}</b> vàng · sau ${animalDuration(sp.growMs)} thu ${n} ${info?.name || ''} (bán ${((info?.sell || 0) * n).toLocaleString('vi')} vàng).`;
    };
    document.getElementById('fish-species')?.addEventListener('change', fishPreview);
    document.getElementById('fish-qty')?.addEventListener('input', fishPreview);
    fishPreview();
    const stockFish = async (qty) => {
      const species = document.getElementById('fish-species')?.value;
      const r = await run(() => api('/fish-stock', { species, qty }));
      if (r) { updateMe(r); toast(`🐟 Đã thả ${r.stocked} con (−${r.cost.toLocaleString('vi')} vàng)`); render(); }
    };
    document.getElementById('btn-fish-stock')?.addEventListener('click', () => stockFish(Number(document.getElementById('fish-qty')?.value) || 1));
    document.getElementById('btn-fish-stock-max')?.addEventListener('click', () => stockFish('max'));
    const harvestFish = async (id, e) => {
      const r = await run(() => api('/fish-harvest', id ? { id } : {}));
      if (r) { updateMe(r); const desc = Object.entries(r.items).map(([k, q]) => `${q} ${itemInfo(k)?.name || k}`).join(', '); floatGain(e?.clientX || 200, e?.clientY || 300, `🐟 +${Object.values(r.items).reduce((x, y) => x + y, 0)}`); toast(`🐟 Thu hoạch: ${desc} (+${r.xp} EXP)`); render(); }
    };
    document.querySelectorAll('[data-fish-harvest]').forEach((el) => el.addEventListener('click', (e) => harvestFish(Number(el.dataset.fishHarvest), e)));
    document.getElementById('btn-fish-harvest-all')?.addEventListener('click', (e) => harvestFish(null, e));
    document.getElementById('btn-collect-all')?.addEventListener('click', async (e) => {
      const r = await run(() => api('/machine-collect-all', {}));
      if (r) {
        updateMe(r);
        const desc = Object.entries(r.items || {}).map(([id, q]) => `${q} ${itemInfo(id)?.name || id}`).join(', ');
        floatGain(e.clientX || 200, e.clientY || 300, `+${r.collected}`);
        toast(`✅ Đã thu ${r.collected} mẻ: ${desc}`);
        render();
      }
    });
    document.getElementById('btn-cook-all')?.addEventListener('click', async () => {
      if (!window.confirm('Xếp tối đa mọi công thức đủ nguyên liệu? Nguyên liệu sẽ dùng ngay và không thể hủy các mẻ đã xếp.')) return;
      const r = await run(() => api('/machine-run-all', {}));
      if (r) { updateMe(r); toast(`🏭 Đã xếp ${r.queued} mẻ vào ${new Set(r.jobs.map((j) => j.machine)).size} máy!`); render(); }
    });
    document.querySelectorAll('[data-machine-collect]').forEach((el) =>
      el.addEventListener('click', async (e) => {
        const r = await run(() => api('/machine-collect', { machine: el.dataset.machineCollect, recipe: el.dataset.recipe || undefined }));
        if (r) { updateMe(r); floatGain(e.clientX || 200, e.clientY || 300, `${itemImg(r.product, 'coin-img')} +${Object.values(r.items || {}).reduce((x, y) => x + y, 0) || r.collected}`); render(); }
      }));
    document.querySelectorAll('[data-machine-speed]').forEach((el) =>
      el.addEventListener('click', async () => {
        const r = await run(() => api('/speedup', { target: 'machine', kind: el.dataset.machineSpeed, recipe: el.dataset.recipe || undefined }));
        if (r) { updateMe(r); toast(`💎 -${r.cost} kim cương!`); render(); }
      }));

    const simple = (id, path, after) => document.getElementById(id)?.addEventListener('click', async (e) => {
      const r = await run(() => api(path, {}));
      if (r) { updateMe(r); if (after) after(r, e); render(); }
    });
    document.querySelectorAll('[data-barn], [data-preview-barn]').forEach((el) =>
      el.addEventListener('click', () => { sheet = { type: 'barn', kind: el.dataset.barn || el.dataset.previewBarn }; render(); }));
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
        const r = await run(() => api('/buy-animal', { kind: el.dataset.buyAnimal, count: el.dataset.count || 1 }));
        if (r) { updateMe(r); toast('🎉 Thành viên mới về chuồng!'); render(); }
      }));
    document.querySelectorAll('[data-upgrade-barn]').forEach((el) =>
      el.addEventListener('click', async () => {
        const k = el.dataset.upgradeBarn;
        const r = await run(() => api('/upgrade-barn', { kind: k }));
        if (r) { updateMe(r); toast(`⬆️ Chuồng lên cấp ${r.me.barns[k].level} — chứa ${r.me.barns[k].capacity} con!`); render(); }
      }));
    simple('btn-collect', '/collect', (r, e) => { sfx('playHarvest'); floatGain(e.clientX || 200, e.clientY || 300, `🥚 +${r.collected}`, `+${r.collected * DATA.config.chicken.expCollect} EXP`); });
    simple('btn-buy-chicken', '/buy-chicken', () => { sfx('playCoin'); toast('🐔 Gà mới về chuồng!'); });
    simple('btn-mill-collect', '/mill-collect', () => { sfx('playHarvest'); toast('⚙️ Xong một mẻ!'); });
    simple('btn-expand', '/expand', () => { sfx('playLevelUp'); sheet = null; toast('🎉 Đất rộng thêm 4 ô!'); });
    simple('btn-chest', '/quest-chest', (r) => { sfx('playSuccess'); sfx('playCoin'); toast(r.gem ? '🎁 Rương ngày + 1 kim cương! 💎' : '🎁 Đã mở rương ngày!'); });
    simple('btn-star-claim', '/star-claim', (r) => { sfx('playLevelUp'); toast(`🌟 Nhận thưởng mốc ${r.claimed.stars} sao!`); });
    simple('btn-waterall', '/water-all', (r) => { sfx('playWater'); toast(`💧 Đã tưới ${r.watered} ô!`); });
    simple('btn-buy-energy', '/buy-energy', (r) => { sfx('playCoin'); toast(`⚡ Đang có ${r.me.energy.current} năng lượng!`); });
    simple('btn-skill-respec', '/skill-respec', () => { sfx('playTap'); toast('♻️ Đã hoàn trả toàn bộ điểm kỹ năng!'); });
    document.querySelectorAll('[data-skill-learn]').forEach((el) =>
      el.addEventListener('click', async () => {
        const r = await run(() => api('/skill-learn', { id: el.dataset.skillLearn }));
        if (r) { updateMe(r); toast(r.rank > 1 ? `🎓 Kỹ năng lên bậc ${r.rank}!` : '🎓 Đã học kỹ năng mới!'); render(); }
      }));
    // Trộm hết một lần: ruộng → chuồng → máy; bước nào lỗi (hết lượt, chó tóm…) thì báo rồi đi tiếp.
    document.getElementById('btn-poach-everything')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const ownerId = VISIT.ownerId;
      const steps = [];
      if (Number(btn.dataset.plots) > 0) steps.push(['/poach-all', 'ruộng']);
      if (btn.dataset.animal === '1') steps.push(['/poach-animal', 'chuồng']);
      if (btn.dataset.machine === '1') steps.push(['/poach-machine', 'máy']);
      const got = {};
      let total = 0;
      let caughtMsg = null;
      await run(async () => {
        for (const [path] of steps) {
          try {
            const r = await api(path, { ownerId });
            if (!r) continue;
            updateMe(r);
            if (r.items) for (const [id, q] of Object.entries(r.items)) got[id] = (got[id] || 0) + q;
            if (r.poached) total += r.poached;
            if (typeof r.got === 'number' && r.item) { got[r.item] = (got[r.item] || 0) + r.got; total += r.got; }
            else if (typeof r.got === 'number' && !r.items) total += r.got;
            if (r.caught?.message) caughtMsg = r.caught.message;
          } catch { /* api() đã toast lỗi của bước này */ }
        }
        return true;
      });
      const desc = Object.entries(got).map(([id, q]) => `${q} ${itemInfo(id)?.name || id}`).join(', ');
      if (total) { floatGain(e.clientX, e.clientY, `😋 +${total}`); toast(`😋 Cuỗm được ${total} món${desc ? ` (${desc})` : ''}!`); }
      if (caughtMsg) setTimeout(() => toast(caughtMsg), total ? 900 : 0);
      render();
    });
    document.getElementById('btn-harvest-help')?.addEventListener('click', async () => {
      const r = await run(() => api('/harvest-help', { ownerId: VISIT.ownerId, all: true }));
      if (r) {
        updateMe(r);
        const desc = Object.entries(r.items || {}).map(([id, q]) => `${q} ${itemInfo(id)?.name || id}`).join(', ');
        toast(`🧺 Đã thu hoạch giúp ${r.harvested} ô (${desc}) — vào kho bạn ấy, bạn +${r.gained} vàng`);
        render();
      }
    });
    document.getElementById('btn-water-help-all')?.addEventListener('click', async () => {
      const r = await run(() => api('/water-help-all', { ownerId: VISIT.ownerId }));
      if (r) { updateMe(r); toast(`💧 Đã tưới giúp ${r.watered} ô (+${r.gained} vàng) — cây chín sớm 10 phút!`); render(); }
    });
    document.getElementById('btn-poach-all')?.addEventListener('click', async () => {
      const r = await run(() => api('/poach-all', { ownerId: VISIT.ownerId }));
      if (r) {
        updateMe(r);
        const desc = Object.entries(r.items || {}).map(([id, q]) => `${q} ${itemInfo(id)?.name || id}`).join(', ');
        if (r.poached) toast(`😋 Hái ké ${desc}!`);
        if (r.caught) setTimeout(() => toast(r.caught.message), r.poached ? 900 : 0);
        render();
      }
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

    document.querySelectorAll('[data-collection-claim]').forEach((el) =>
      el.addEventListener('click', async () => {
        const r = await run(() => api('/collection-claim', { id: el.dataset.collectionClaim }));
        if (r) { updateMe(r); toast(`📒 Hoàn thành bộ sưu tập! +${r.gold.toLocaleString('vi')} vàng${r.gems ? `, +${r.gems} kim cương` : ''}`); render(); }
      }));

    document.getElementById('btn-water-own')?.addEventListener('click', async (e) => {
      const startedSheet = sheet;
      const r = await run(() => api('/water', { idx: sheet.idx }), plotResource(me().id, sheet.idx), e.currentTarget);
      if (r) { updateMe(r); closeSheetAfterAction(startedSheet); floatGain(e.clientX || 200, e.clientY || 300, '💧'); render(); }
    });
    document.getElementById('btn-speedup-plot')?.addEventListener('click', async (e) => {
      const startedSheet = sheet;
      const r = await run(() => api('/speedup', { target: 'plot', idx: sheet.idx }), plotResource(me().id, sheet.idx), e.currentTarget);
      if (r) { updateMe(r); closeSheetAfterAction(startedSheet); toast(`💎 -${r.cost} kim cương — chín ngay!`); render(); }
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
    function updateSalePreview(row) {
      const preview = row?.querySelector('.sale-preview');
      if (!preview) return;
      const input = row.querySelector('.qty-input');
      const quantity = Number(input.value);
      const valid = input.value.trim() !== '' && Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= Number(input.max);
      row.querySelector('[data-sell]:not([data-qty])').disabled = !valid;
      preview.textContent = valid ? `Bán ${quantity}: ước tính ${Math.round(Number(row.dataset.saleRate) * quantity).toLocaleString('vi')} vàng.` : `Nhập số nguyên từ 1 đến ${input.max}.`;
    }
    document.querySelectorAll('[data-qstep]').forEach((el) =>
      el.addEventListener('click', () => {
        const row = el.closest('.inv-row');
        const input = row.querySelector('.qty-input');
        const max = Number(input.max) || 999;
        input.value = Math.max(1, Math.min(max, Math.round(Number(input.value) || 1) + Number(el.dataset.qstep)));
        input.dispatchEvent(new Event('input'));
        const btn = row.querySelector('[data-sell]:not([data-qty])');
        if (btn) btn.textContent = `Bán ${input.value}`;
      }));
    document.querySelectorAll('.qty-input').forEach((el) =>
      el.addEventListener('input', () => {
        const btn = el.closest('.inv-row').querySelector('[data-sell]:not([data-qty])');
        if (btn) btn.textContent = `Bán ${Math.max(1, Math.min(Number(el.max) || 999, Math.round(Number(el.value) || 1)))}`;
        updateSalePreview(el.closest('.inv-row'));
      }));
    document.querySelectorAll('[data-sell]').forEach((el) =>
      el.addEventListener('click', async (e) => {
        const qty = el.dataset.qty ? Number(el.dataset.qty) : rowQty(el);
        const r = await run(() => api('/sell', { item: el.dataset.sell, qty }));
        if (r) { sfx('playCoin'); updateMe(r); floatGain(e.clientX, e.clientY, `+${r.gained} ${COIN}`); render(); }
      }));
    document.querySelectorAll('[data-buy]').forEach((el) =>
      el.addEventListener('click', async () => {
        const r = await run(() => api('/buy', { item: el.dataset.buy, qty: Number(el.dataset.qty) }));
        if (r) { sfx('playCoin'); updateMe(r); render(); }
      }));
    document.querySelectorAll('[data-grow-order]').forEach((el) =>
      el.addEventListener('click', () => {
        const firstEmpty = me().plots.find((plot) => !plot.crop);
        if (!firstEmpty) return;
        sheet = { type: 'seed', idx: firstEmpty.idx, preferredCrop: el.dataset.growOrder };
        render();
      }));
    document.querySelectorAll('[data-make-order]').forEach((el) =>
      el.addEventListener('click', () => {
        sheet = { type: 'mill', preferredRecipe: el.dataset.makeOrder };
        render();
        document.querySelector('.mc-row--recommended')?.scrollIntoView({ block: 'center' });
      }));
    document.querySelectorAll('[data-deliver]').forEach((el) =>
      el.addEventListener('click', async (e) => {
        const r = await run(() => api('/order-deliver', { id: Number(el.dataset.deliver) }));
        if (r) { sfx('playSuccess'); sfx('playCoin'); updateMe(r); floatGain(e.clientX, e.clientY, `🚚 +${r.gained} ${COIN}`); render(); }
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
      if (VISIT && INSPECT && kind !== 'empty') {
        const fee = DATA.config.cansa?.inspectFee || 0;
        if (!window.confirm(`Khám xét ô này? ${fee ? `Tốn ${fee.toLocaleString('vi')} vàng.` : 'Miễn phí, mỗi nhà 5 lượt/ngày.'} Trúng cần sa: ô bị nhổ sạch, bạn lĩnh ${(DATA.config.cansa?.bounty || 500000).toLocaleString('vi')} vàng.`)) return;
        const r = await run(() => api('/inspect', { ownerId: VISIT.ownerId, idx }), plotResource(VISIT.ownerId, idx), btn);
        if (r) {
          updateMe(r);
          toast(r.found ? `🚨 Trúng rồi! Cần sa bị nhổ sạch — bạn lĩnh ${r.bounty.toLocaleString('vi')} vàng` : `🔍 Không có gì${r.fee ? ` — mất ${r.fee.toLocaleString('vi')} vàng phí khám` : ''} (còn ${r.left} lượt hôm nay)`);
          render();
        }
        return;
      }
      const { clientX: x, clientY: y } = ev;

      if (kind === 'empty') { sfx('playTap'); sheet = { type: 'seed', idx }; render(); }
      else if (kind === 'waterplot') {
        sfx('playWater');
        const r = await run(() => api('/water', { idx }), plotResource(me().id, idx), btn);
        if (r) { updateMe(r); floatGain(x, y, '💧'); render(); }
      }
      else if (kind === 'expand') { sfx('playTap'); sheet = { type: 'expand' }; render(); }
      else if (kind === 'plotmenu') { sfx('playTap'); sheet = { type: 'plotmenu', idx }; render(); }
      else if (kind === 'harvest') {
        const p = me().plots[idx];
        const c = p?.crop ? crops()[p.crop] : null;
        sfx('playHarvest');
        const r = await run(() => api('/harvest', { idx }), plotResource(me().id, idx), btn);
        if (r) {
          sfx('playCoin');
          updateMe(r);
          if (c) floatGain(x, y, `${itemImg(c.id, 'coin-img')} +1`, `+${c.expHarvest} EXP`);
          render();
        }
      } else if (kind === 'water') {
        sfx('playWater');
        const r = await run(() => api('/water', { ownerId: VISIT.ownerId, idx }), plotResource(VISIT.ownerId, idx), btn);
        if (r) { updateMe(r); floatGain(x, y, '💧 −10p', `+${2 * 4} ${COIN}`); render(); }
      } else if (kind === 'poach') {
        sfx('playHarvest');
        const r = await run(() => api('/poach', { ownerId: VISIT.ownerId, idx }), plotResource(VISIT.ownerId, idx), btn);
        if (r) { updateMe(r); floatGain(x, y, '😋 +2'); render(); }
      } else if (kind === 'ripe' && VISIT) {
        if (!window.confirm('Thu hoạch giúp ô này? Nông sản vào kho của bạn ấy, bạn nhận 8 vàng công.')) return;
        const r = await run(() => api('/harvest-help', { ownerId: VISIT.ownerId, idx }), plotResource(VISIT.ownerId, idx), btn);
        if (r) { sfx('playHarvest'); sfx('playCoin'); updateMe(r); floatGain(x, y, '🧺', `+${r.gained} ${COIN}`); render(); }
      } else if (kind === 'growing' || kind === 'ripe') {
        const farm = VISIT ? VISIT.farm : me();
        const p = farm.plots[idx];
        if (p?.crop) {
          const c = crops()[p.crop];
          toast(p.ready ? `${c.name} chín rồi!` : `${c.name} — còn ${fmtTime(p.readyAt - Date.now())}`);
        }
      }
    });
    EventTarget.prototype.addEventListener = nativeAdd;
  }

  // ---------- vòng lặp ----------
  // Chữ ký trạng thái: refresh định kỳ mà không có gì đổi thì khỏi vẽ lại
  // (vẽ lại toàn trang tốn kém trên điện thoại).
  let lastStateSig = null;
  async function refresh() {
    const sequence = ++refreshSequence;
    const startedAtEpoch = mutationEpoch;
    const visitOwnerId = VISIT?.ownerId;
    try {
      const next = await api('/state');
      if (sequence !== refreshSequence || startedAtEpoch !== mutationEpoch || visitOwnerId !== VISIT?.ownerId) return;
      if (checkServerBoot(next)) return;
      let visitedFarm = null;
      if (visitOwnerId) visitedFarm = await api(`/farm/${visitOwnerId}`);
      if (sequence !== refreshSequence || startedAtEpoch !== mutationEpoch || visitOwnerId !== VISIT?.ownerId) return;
      const sig = JSON.stringify([next.me, next.family, next.events?.[0]?.at, next.wants]);
      const changed = sig !== lastStateSig;
      lastStateSig = sig;
      DATA = next;
      if (lastLevel && DATA.me.level > lastLevel) toast(`🎉 Lên cấp ${DATA.me.level}!`);
      lastLevel = DATA.me.level;
      if (visitedFarm) VISIT = { ownerId: visitOwnerId, farm: visitedFarm.farm, myActs: visitedFarm.myActs };
      if (changed || VISIT || !document.querySelector('.stage')) render();
      scheduleCritter();
    } catch { /* gate/waking đã render */ }
  }

  setInterval(() => {
    if (!DATA) return;
    const farm = VISIT ? VISIT.farm : me();
    const now = Date.now();
    let flip = false;
    for (const p of farm.plots) {
      if (p.crop && !p.ready && p.readyAt != null && now >= p.readyAt) {
        p.ready = true; flip = true;
        // Cây ăn quả: vụ mới vừa chín → cộng tạm số quả (server chốt lại khi hái/refresh).
        if (p.tree) { p.fruits = (p.fruits || 0) + (DATA.config.trees[p.crop]?.yield || 0); p.readyAt += DATA.config.trees[p.crop]?.cycleMs || 0; }
      }
    }
    for (const a of me().animals || []) {
      if (a.ready_at != null && !a.ready && now >= a.ready_at) { a.ready = true; flip = true; }
    }
    if (me().mill && !me().mill.ready && now >= me().mill.readyAt) { me().mill.ready = true; flip = true; }
    const machineDue = Object.values(me().machines || {}).some((jobs) => Object.values(jobs || {})
      .some((job) => job.currentReadyAt && now >= job.currentReadyAt));
    if (machineDue && !machineRefreshPending) {
      machineRefreshPending = true;
      refresh().finally(() => { machineRefreshPending = false; });
    }
    if (flip && !sheet && !showLb) { render(); return; }

    const nextGrowingPrompt = document.querySelector('.farm-next-step[data-next-step="growing"]');
    if (nextGrowingPrompt) {
      const detail = nextGrowingPrompt.querySelector('small');
      if (detail) detail.textContent = `Ô ${Number(nextGrowingPrompt.dataset.nextIdx) + 1} chín sau ${fmtTime(Number(nextGrowingPrompt.dataset.nextReady) - now)}`;
    }

    document.querySelectorAll('.plot--growing').forEach((el) => {
      const left = Number(el.dataset.ready) - now;
      const total = Number(el.dataset.total);
      const timer = el.querySelector('.plot-timer');
      if (timer) {
        const remaining = fmtTime(left);
        timer.textContent = remaining;
        const label = el.getAttribute('aria-label');
        if (label) el.setAttribute('aria-label', label.replace(/, còn .+$/, `, còn ${remaining}`));
      }
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
