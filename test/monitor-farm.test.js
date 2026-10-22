import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, appendFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { appendSample, captureSample, metricInterval, monitorTarget, previousSample, safeMetrics } from '../scripts/monitor-farm.mjs';

const metrics = (requests = 10) => ({ startedAt: 1000, uptimeSeconds: 60, startupReadyMs: 15,
  requests, errors4xx: 0, errors5xx: 0, replayedMutations: 0,
  latencyMs: { le100: requests, le500: 0, le1000: 0, le5000: 0, over5000: 0 } });
const sample = (requests, capturedAt = 2000) => ({ schemaVersion: 1, target: 'http://localhost/', capturedAt, metrics: metrics(requests) });

test('monitor derives intervals and discards invalid or reset baselines', () => {
  const before = sample(10), after = sample(20, 12000);
  assert.equal(metricInterval(before, after).delta.requestsPerSecond, 1);
  assert.equal(metricInterval(before, sample(10, 12000)).delta.serverErrorRate, 0);
  assert.equal(metricInterval(before, sample(9, 12000)).baseline, 'counter_reset');
  assert.equal(metricInterval(before, sample(10, 1000)).baseline, 'clock_reset');
  assert.equal(metricInterval(before, { ...after, metrics: { ...after.metrics, startedAt: 2000 } }).baseline, 'restart');
  assert.equal(metricInterval(before, { ...after, target: 'http://other/' }).baseline, 'initial');
  assert.equal(metricInterval(before, { ...after, metrics: null }).baseline, 'unavailable');
  assert.equal(safeMetrics({ ...metrics(), requests: 11 }), null);
  assert.equal(safeMetrics({ ...metrics(), privateData: 'hidden' }).privateData, undefined);
  assert.throws(() => monitorTarget('https://user:secret@example.com/'));
});

test('append-only log resumes valid baseline across partial lines and failures', () => {
  const dir = mkdtempSync(join(tmpdir(), 'farm-monitor-'));
  try {
    const file = join(dir, 'samples.jsonl');
    appendSample(file, sample(10));
    appendFileSync(file, '{"partial":');
    appendSample(file, { ...sample(0), metrics: null });
    assert.equal(previousSample(file, 'http://localhost/').metrics.requests, 10);
    appendSample(file, sample(20, 12000));
    assert.equal(previousSample(file, 'http://localhost/').metrics.requests, 20);
    assert.equal(previousSample(file, 'http://other/'), null);
    assert.match(readFileSync(file, 'utf8'), /\{"partial":\n/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('HTTP capture and CLI persist sanitized metrics and resume without leaking secrets', async () => {
  let requests = 10;
  const received = [];
  const server = createServer((req, res) => {
    received.push({ path: req.url, secret: req.headers['x-farm-secret'] });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/healthz') return res.end('{"ok":true}');
    if (req.headers['x-farm-secret'] !== 'test-secret') { res.statusCode = 403; return res.end('{"private":"do not log"}'); }
    res.end(JSON.stringify({ ...metrics(requests), privateData: 'do not log' }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const target = `http://127.0.0.1:${server.address().port}/`;
  const dir = mkdtempSync(join(tmpdir(), 'farm-monitor-cli-'));
  const run = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/monitor-farm.mjs', target, join(dir, 'capture.jsonl'), '--once'],
      { env: { ...process.env, FARM_INTERNAL_SECRET: 'test-secret' } });
    let output = '', error = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { error += data; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, output, error }));
  });
  try {
    const first = await run();
    assert.equal(first.code, 0, first.error);
    assert.equal(JSON.parse(first.output).baseline, 'initial');
    requests = 20;
    const second = await run();
    assert.equal(second.code, 0, second.error);
    assert.equal(JSON.parse(second.output).delta.requests, 10);
    assert.doesNotMatch(readFileSync(join(dir, 'capture.jsonl'), 'utf8'), /test-secret|privateData|do not log/);
    assert.deepEqual(received.slice(0, 2), [{ path: '/healthz', secret: undefined }, { path: '/internal/farm/metrics', secret: 'test-secret' }]);
    const denied = await captureSample(target, 'wrong');
    assert.equal(denied.metricsProbe.status, 403);
    assert.deepEqual(denied.signals, ['metrics_unavailable']);
    const redirect = await captureSample(target, 'test-secret', null, { fetcher: async (_, options) => {
      assert.equal(options.redirect, 'error');
      throw new Error('secret URL must never escape');
    } });
    assert.doesNotMatch(JSON.stringify(redirect), /secret URL/);
    assert.equal(redirect.metrics, null);
  } finally {
    await new Promise(resolve => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});
