import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { ANIMALS, CROPS, MACHINES, TREES } from '../server/src/game.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicDir = resolve(root, 'public');
const asset = (path) => existsSync(resolve(publicDir, path));
const v3Name = { luami: 'wheat', carot: 'carrot', ngo: 'corn', khoaitay: 'potato', toi: 'garlic', rauthom: 'herbs', dualeo: 'cucumber', sa: 'lemongrass', bapcai: 'cabbage', dauphong: 'peanut', cachua: 'tomato', khoailang: 'sweet-potato', ot: 'chili', me: 'sesame', hanhtay: 'onion', dauxanh: 'mung-bean', mia: 'sugarcane', dautay: 'strawberry', gung: 'ginger', catim: 'eggplant', huongduong: 'sunflower', gao: 'rice', bongcai: 'cauliflower', bingo: 'pumpkin', tra: 'tea', thom: 'pineapple', bongvai: 'cotton', duahau: 'watermelon', nho: 'grape', caphe: 'coffee', cansa: 'cannabis', hoahong: 'rose', oliu: 'olive', nam: 'mushroom', cacao: 'cacao', vani: 'vanilla' };
const legacyName = { luami: 'lua', dautay: 'dau' };
const treePng = new Set(['cam', 'tao', 'xoai', 'thanhlong', 'chuoi', 'chanh', 'dua', 'dao', 'anhdao', 'quame', 'coc', 'quabo', 'saurieng']);
const animalPng = { ga: 'chicken_v3', cut: 'quail_v3', vit: 'duck_v3', bo: 'cow', ngong: 'goose_v3', tho: 'rabbit_v3', ong: 'bee_v3', cuu: 'sheep', gatay: 'turkey_v3', de: 'goat_v3', tam: 'silkworm_v3', heo: 'pig', trau: 'buffalo_v3', alpaca: 'alpaca_v3', huou: 'deer_v3' };
const machinePng = { lonuong: 'fish-oven', quanoc: 'snail-stall', bepan: 'family-kitchen', coixay: 'flour-mill', quanvat: 'snack-stall', mayep: 'juice-press', noimut: 'jam-kettle', nhamaysua: 'dairy-workshop' };
const status = (path, kind) => asset(path) ? kind : 'MISSING';

const cropRows = Object.values(CROPS).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'vi')).map((crop) => {
  const base = v3Name[crop.id];
  const legacy = legacyName[crop.id] || crop.id;
  const growing = base && asset(`assets/crops-v3/${base}-growing.png`)
    ? 'v3 PNG' : status(`assets/crops/${legacy}-2.svg`, 'legacy SVG');
  const ripe = base && asset(`assets/crops-v3/${base}-ripe.png`)
    ? 'v3 PNG' : status(`assets/crops/${legacy}-3.svg`, 'legacy SVG');
  return `| ${crop.name} | ${crop.id} | ${crop.level} | ${growing} | ${ripe} |`;
});

const treeRows = Object.values(TREES).sort((a, b) => a.level - b.level).map((tree) => {
  const path = treePng.has(tree.id) ? `assets/art/trees/${tree.id}.png` : 'assets/art/tree.png';
  return `| ${tree.name} | ${tree.id} | ${tree.level} | ${status(path, treePng.has(tree.id) ? 'unique PNG' : 'shared PNG + emoji')} |`;
});

const animalRows = Object.values(ANIMALS).sort((a, b) => a.level - b.level).map((animal) => {
  const path = animalPng[animal.id] && `assets/art/${animalPng[animal.id]}.png`;
  return `| ${animal.name} | ${animal.id} | ${animal.level} | ${path ? status(path, 'unique PNG') : 'emoji'} |`;
});

const machineRows = Object.values(MACHINES).sort((a, b) => a.level - b.level).map((machine) => {
  const path = machinePng[machine.id] && `assets/machines-v3/${machinePng[machine.id]}.png`;
  return `| ${machine.name} | ${machine.id} | ${machine.level} | ${path ? status(path, 'unique PNG') : 'emoji/UI'} |`;
});

const clientSource = readFileSync(resolve(publicDir, 'app.js'), 'utf8');
const staticPaths = [...new Set(clientSource.match(/assets\/[\w./-]+\.(?:png|svg)/g) || [])].sort();
const staticRows = staticPaths.map((path) => {
  const bytes = asset(path) ? statSync(resolve(publicDir, path)).size : null;
  return `| \`${path}\` | ${bytes === null ? 'MISSING' : bytes < 1024 ? '<1 KB' : `${Math.round(bytes / 1024)} KB`} |`;
});

const completeCrops = cropRows.filter((row) => row.includes('| v3 PNG | v3 PNG |')).length;
const lines = [
  '# Farm art inventory',
  '',
  'Generated from `server/src/game.js` and the current asset directory by `npm run art:inventory`. The shared seedling is `public/assets/crops-v3/seedling.png`.',
  '',
  `**Coverage:** ${completeCrops}/${cropRows.length} crops have matching growing and ripe v3 art; ${treePng.size}/${treeRows.length} trees and ${Object.keys(animalPng).length}/${animalRows.length} animals have individual PNG art. ${Object.keys(machinePng).length}/${machineRows.length} machines have individual PNG art. ${staticPaths.length} static asset paths appear in the client.`,
  '',
  '## Crops', '',
  '| Crop | ID | Unlock | Growing | Ripe |', '| --- | --- | ---: | --- | --- |', ...cropRows,
  '', '## Fruit trees', '',
  '| Tree | ID | Unlock | Current art |', '| --- | --- | ---: | --- |', ...treeRows,
  '', '## Animals', '',
  '| Animal | ID | Unlock | Current art |', '| --- | --- | ---: | --- |', ...animalRows,
  '', '## Machines', '',
  '| Machine | ID | Unlock | Current art |', '| --- | --- | ---: | --- |', ...machineRows,
  '', '## Static client asset references', '',
  'This list includes scene buildings, backgrounds, UI icons, and product art named directly in `public/app.js`. Crop, tree, and animal IDs generated at runtime are covered by the catalog tables above.',
  '', '| Path | Size |', '| --- | ---: |', ...staticRows,
  '',
];
const report = `${lines.join('\n')}\n`;
if (process.argv.includes('--write')) writeFileSync(resolve(root, 'docs/art-inventory.md'), report);
else process.stdout.write(report);
if (report.includes('MISSING')) process.exitCode = 1;
