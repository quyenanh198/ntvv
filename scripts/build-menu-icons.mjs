import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Original vector sources. Palette and rounded outlines match the dock family.
const icons = {
  'audio-on': '<path d="M9 25h13l15-13v40L22 39H9V25Z" fill="#e8b95f"/><path d="M44 23c6 5 6 13 0 18M50 15c12 10 12 24 0 34"/>',
  'audio-off': '<path d="M9 25h13l15-13v40L22 39H9V25Z" fill="#f5d99c"/><path d="m45 25 13 14M58 25 45 39" stroke="#a54c32" stroke-width="4"/>',
  energy: '<path d="M35 5 13 35h17l-2 24 23-34H35V5Z" fill="#e8b95f"/>',
  events: '<rect x="6" y="17" width="52" height="38" rx="5" fill="#f5d99c"/><path d="m7 20 25 18 25-18M7 53l17-17M57 53 41 36"/><path d="M25 8h14M29 3h14" stroke="#b07e3b"/>',
  quests: '<path d="M16 8h32v49l-6-4-5 4-5-4-5 4-5-4-6 4V8Z" fill="#f5d99c"/><path d="m23 23 4 4 10-10M23 37h17M23 44h12"/>',
  orders: '<path d="M6 17h33v29H6z" fill="#f5d99c"/><path d="M39 27h10l9 11v8H39z" fill="#c96841"/><path d="M44 31h4l5 7h-9z" fill="#a7d5d5"/><circle cx="17" cy="48" r="7" fill="#e8b95f"/><circle cx="48" cy="48" r="7" fill="#e8b95f"/><path d="M13 26h17M13 33h11"/>',
  festival: '<path d="M10 29h44v25H10z" fill="#f5d99c"/><path d="m5 29 27-19 27 19H5Z" fill="#c96841"/><path d="m22 29 10-19 10 19M32 10V3l13 4-13 4" fill="#e8b95f"/><path d="M24 54V37h16v17" fill="#9a643b"/>',
  collections: '<path d="M10 9h40v46H10z" fill="#f5d99c"/><path d="M17 9v46M47 9h7v46h-7" fill="#c96841"/><path d="M34 40V25M34 33c-10 0-12-10-12-10s11-1 12 10M34 30c0-10 10-12 10-12s1 10-10 12" fill="#86aa55"/>',
  skills: '<path d="m5 22 27-13 27 13-27 13L5 22Z" fill="#c96841"/><path d="M17 29v13c9 9 21 9 30 0V29" fill="#f5d99c"/><path d="M57 24v22M53 48h8"/><path d="m29 40 3 3 7-7"/>',
  barns: '<path d="m6 29 26-21 26 21v27H6V29Z" fill="#c96841"/><path d="M22 35h20v21H22z" fill="#f5d99c"/><path d="m22 35 20 21M42 35 22 56M12 28h40"/><path d="M28 19h8v8h-8z" fill="#a7d5d5"/>',
  mill: '<path d="M13 55V31l13-9v9l13-9v9h13v24H13Z" fill="#f5d99c"/><path d="M45 31V9h7v22" fill="#c96841"/><path d="M21 40h7v8h-7zM36 40h7v8h-7z" fill="#a7d5d5"/><path d="M45 5h8M8 56h49"/>',
  fishing: '<path d="M9 55 43 8c9 5 13 14 12 25"/><path d="M55 33v8c0 9-11 9-11 2"/><path d="M9 40c10-13 23-13 34 0-11 13-24 13-34 0l-6-8v16l6-8Z" fill="#a7d5d5"/><circle cx="34" cy="38" r="1.5" fill="#684523" stroke="none"/>',
  family: '<circle cx="24" cy="19" r="10" fill="#f5d99c"/><circle cx="45" cy="23" r="8" fill="#e8b95f"/><path d="M7 54V43c0-17 34-17 34 0v11H7Z" fill="#86aa55"/><path d="M42 36c12-1 15 7 15 18H45" fill="#c96841"/>',
  luxury: '<path d="M16 10h32l12 17-28 30L4 27l12-17Z" fill="#a7d5d5"/><path d="M4 27h56M16 10l7 17 9 30 9-30 7-17M23 27l9-17 9 17"/><path d="m12 5 1-3M54 57l3 3" stroke="#b07e3b"/>',
  money: '<rect x="6" y="18" width="52" height="36" rx="5" fill="#f5d99c"/><path d="m7 21 25 18 25-18M7 52l16-16M57 52 41 36"/><circle cx="44" cy="15" r="11" fill="#e8b95f"/><path d="M44 9v12M48 10h-6c-4 0-4 5 0 5h3c4 0 4 5 0 5h-6" stroke-width="2"/>',
  ledger: '<path d="M12 9h39v47H12z" fill="#f5d99c"/><path d="M12 9h8v47h-8z" fill="#c96841"/><path d="M27 20h16M27 30h16M27 40h7M39 37v9M35 42h8"/>',
  leaderboard: '<path d="M19 8h26v15c0 17-26 17-26 0V8Z" fill="#e8b95f"/><path d="M19 12H7v7c0 11 8 14 16 13M45 12h12v7c0 11-8 14-16 13M32 36v12M21 55v-7h22v7H21Z" fill="#f5d99c"/><path d="m32 14 2 4 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1 2-4Z" fill="#fff0cf" stroke-width="2"/>',
};
for (const [name, paths] of Object.entries(icons)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#684523" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>\n`;
  writeFileSync(fileURLToPath(new URL(`../public/assets/ui/menu-${name}.svg`, import.meta.url)), svg);
}
