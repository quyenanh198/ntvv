import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const client = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const server = await readFile(new URL('../server/src/app.js', import.meta.url), 'utf8');

test('inspect reads the plot index before constructing its request', () => {
  const handler = client.slice(client.indexOf("document.getElementById('grid')"), client.indexOf('// ---------- vòng lặp'));
  assert.ok(handler.indexOf('const idx = Number(btn.dataset.idx)') < handler.indexOf("api('/inspect'"));
});

test('gateway failures never recursively retry a mutation', () => {
  const apiHelper = client.slice(client.indexOf('async function api('), client.indexOf('const ERRORS'));
  assert.match(apiHelper, /if \(isMutation\)[\s\S]*throw new Error\('mutation_outcome_unknown'\)/);
  assert.ok(apiHelper.indexOf('if (isMutation)') < apiHelper.indexOf('return api(path, body, attempt + 1)'));
});

test('release identity is content-based instead of process-start time', () => {
  assert.match(server, /createHash\('sha256'\)/);
  assert.doesNotMatch(server, /BOOT_VERSION\s*=\s*Date\.now/);
});

test('normal renders patch the existing DOM instead of replacing the whole app', () => {
  const render = client.slice(client.indexOf('function render()'), client.indexOf('function canDeliver'));
  assert.match(render, /patchHtml\(app, nextHtml\)/);
  assert.doesNotMatch(render, /app\.innerHTML\s*=/);
});

test('machine collection uses the same upgraded cycle as queue creation', () => {
  assert.match(server, /machineTime\(me, scaleMs\(recipe\.ms, config\.fast\), machineId\)/);
});

// CSP của server (default-src 'self', không có 'unsafe-inline') chặn mọi handler viết
// thẳng vào thẻ. Chúng không báo lỗi gì cho người chơi: nút trong hộp thoại chỉ đơn
// giản là không ăn, còn ảnh hỏng thì nằm lại thành icon vỡ.
test('không gắn handler thẳng vào thẻ HTML — CSP chặn, nút sẽ chết câm', () => {
  // Bỏ dòng chú thích trước khi soi: chú thích có quyền nhắc tới chính cái mẫu bị cấm.
  const code = client.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
  const inline = code.match(/\son(?:click|error|change|input|submit|keyup|keydown|focus|blur|load)\s*=\s*"/g) || [];
  assert.deepEqual(inline, [], 'dùng addEventListener trong phần bind thay vì thuộc tính on... trong thẻ');
});

test('nền mờ chỉ đóng khi bấm trúng chính nó, không đóng khi bấm trong hộp', () => {
  const closeHandler = client.slice(client.indexOf("querySelectorAll('[data-close]')"), client.indexOf("querySelectorAll('[data-sheet]')"));
  assert.match(closeHandler, /e\.target !== el/);
  const awayHandler = client.slice(client.indexOf("querySelectorAll('[data-away-close]')"));
  assert.match(awayHandler.slice(0, 400), /e\.target !== el/);
});
