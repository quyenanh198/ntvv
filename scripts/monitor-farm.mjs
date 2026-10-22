import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const counters = ['requests', 'errors4xx', 'errors5xx', 'replayedMutations'];
const buckets = ['le100', 'le500', 'le1000', 'le5000', 'over5000'];
const count = (value) => Number.isSafeInteger(value) && value >= 0;

export function monitorTarget(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Use an HTTP(S) base URL without credentials, query or fragment');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

export function safeMetrics(value) {
  if (!value || !count(value.startedAt) || !value.startedAt || !count(value.uptimeSeconds)
    || !Number.isFinite(value.startupReadyMs) || value.startupReadyMs < 0
    || !counters.every((key) => count(value[key]))
    || !buckets.every((key) => count(value.latencyMs?.[key]))) return null;
  if (value.errors4xx + value.errors5xx > value.requests
    || buckets.reduce((sum, key) => sum + value.latencyMs[key], 0) !== value.requests) return null;
  return { startedAt: value.startedAt, uptimeSeconds: value.uptimeSeconds, startupReadyMs: value.startupReadyMs,
    ...Object.fromEntries(counters.map((key) => [key, value[key]])),
    latencyMs: Object.fromEntries(buckets.map((key) => [key, value.latencyMs[key]])) };
}

export function metricInterval(previous, sample) {
  if (!sample.metrics) return { baseline: 'unavailable', delta: null };
  if (!previous?.metrics || previous.target !== sample.target) return { baseline: 'initial', delta: null };
  if (previous.metrics.startedAt !== sample.metrics.startedAt) return { baseline: 'restart', delta: null };
  const elapsedSeconds = (sample.capturedAt - previous.capturedAt) / 1000;
  if (elapsedSeconds <= 0) return { baseline: 'clock_reset', delta: null };
  if (counters.some((key) => sample.metrics[key] < previous.metrics[key])
    || buckets.some((key) => sample.metrics.latencyMs[key] < previous.metrics.latencyMs[key])
    || sample.metrics.uptimeSeconds < previous.metrics.uptimeSeconds) return { baseline: 'counter_reset', delta: null };
  const delta = Object.fromEntries(counters.map((key) => [key, sample.metrics[key] - previous.metrics[key]]));
  const latencyMs = Object.fromEntries(buckets.map((key) => [key, sample.metrics.latencyMs[key] - previous.metrics.latencyMs[key]]));
  return { baseline: 'delta', delta: { ...delta, latencyMs, elapsedSeconds,
    requestsPerSecond: delta.requests / elapsedSeconds,
    serverErrorRate: delta.requests ? delta.errors5xx / delta.requests : 0,
    slowOver1000Rate: delta.requests ? (latencyMs.le5000 + latencyMs.over5000) / delta.requests : 0 } };
}

export async function captureSample(baseUrl, secret, previous, { fetcher = fetch, timeoutMs = 30000 } = {}) {
  const target = monitorTarget(baseUrl);
  if (typeof secret !== 'string' || !secret) throw new Error('FARM_INTERNAL_SECRET is required');
  const probe = async (path, headers = {}) => {
    const started = performance.now();
    let status = null;
    try {
      // Redirects are errors so protected headers cannot follow a redirect to another host.
      const response = await fetcher(new URL(path, target), { headers, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
      status = response.status;
      if (!response.ok) return { ok: false, status, elapsedMs: Math.round(performance.now() - started), error: 'http_error' };
      const body = await response.json();
      const data = path === 'healthz' ? (body?.ok === true ? { ok: true } : null) : safeMetrics(body);
      return { ok: !!data, status, elapsedMs: Math.round(performance.now() - started),
        ...(data ? { data } : { error: 'invalid_response' }) };
    } catch (error) {
      return { ok: false, status, elapsedMs: Math.round(performance.now() - started),
        error: error.name === 'TimeoutError' ? 'timeout' : 'request_failed' };
    }
  };
  // Probe public health first; its elapsed time includes any initial wake-up delay.
  const health = await probe('healthz');
  const protectedProbe = await probe('internal/farm/metrics', { 'x-farm-secret': secret });
  const { data: metrics, ...metricsProbe } = protectedProbe;
  const sample = { schemaVersion: 1, capturedAt: Date.now(), target,
    health: { ok: health.ok, status: health.status, elapsedMs: health.elapsedMs, ...(health.error ? { error: health.error } : {}) },
    metricsProbe, metrics: metrics || null };
  Object.assign(sample, metricInterval(previous, sample));
  sample.signals = [!health.ok && 'health_unavailable', !metrics && 'metrics_unavailable',
    sample.baseline === 'restart' && 'process_restarted', sample.baseline === 'counter_reset' && 'counters_reset',
    sample.baseline === 'clock_reset' && 'clock_reset'].filter(Boolean);
  return sample;
}

export function previousSample(output, target) {
  if (!existsSync(output)) return null;
  const size = statSync(output).size;
  const length = Math.min(size, 256 * 1024);
  const buffer = Buffer.alloc(length);
  const fd = openSync(output, 'r');
  try { readSync(fd, buffer, 0, length, size - length); } finally { closeSync(fd); }
  for (const line of buffer.toString('utf8').split('\n').reverse()) {
    try {
      const sample = JSON.parse(line);
      const metrics = safeMetrics(sample.metrics);
      if (sample.schemaVersion === 1 && sample.target === target && metrics && count(sample.capturedAt)) return { ...sample, metrics };
    } catch { /* Ignore a truncated/partial line, including the bounded tail's first line. */ }
  }
  return null;
}

export function appendSample(output, sample) {
  if (!output.endsWith('.jsonl')) throw new Error('Monitoring output must end in .jsonl');
  mkdirSync(dirname(output), { recursive: true });
  let separator = '';
  if (existsSync(output) && statSync(output).size) {
    const fd = openSync(output, 'r');
    const last = Buffer.alloc(1);
    try { readSync(fd, last, 0, 1, statSync(output).size - 1); } finally { closeSync(fd); }
    if (last[0] !== 10) separator = '\n';
  }
  appendFileSync(output, `${separator}${JSON.stringify(sample)}\n`, { encoding: 'utf8', mode: 0o600 });
}

async function main() {
  const [baseUrl, outputArg, ...options] = process.argv.slice(2);
  if (!baseUrl || !outputArg || options.some((option) => option !== '--once' && !/^--interval-ms=\d+$/.test(option))) {
    throw new Error('Usage: npm run ops:monitor -- BASE_URL OUTPUT.jsonl [--once] [--interval-ms=60000]');
  }
  const target = monitorTarget(baseUrl);
  const output = resolve(outputArg);
  if (!output.endsWith('.jsonl')) throw new Error('Monitoring output must end in .jsonl');
  const secret = process.env.FARM_INTERNAL_SECRET;
  if (!secret) throw new Error('FARM_INTERNAL_SECRET is required');
  const intervalMs = Number(options.find((option) => option.startsWith('--interval-ms='))?.split('=')[1] || 60000);
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 1000 || intervalMs > 86400000) throw new Error('Interval must be between 1000 and 86400000 ms');
  let previous = previousSample(output, target);
  const stop = new AbortController();
  const stopping = () => stop.abort();
  process.once('SIGINT', stopping);
  process.once('SIGTERM', stopping);
  try {
    do {
      const sample = await captureSample(target, secret, previous);
      appendSample(output, sample);
      process.stdout.write(`${JSON.stringify(sample)}\n`);
      if (sample.metrics) previous = sample;
      if (options.includes('--once')) { process.exitCode = sample.health.ok && sample.metrics ? 0 : 1; break; }
      if (!stop.signal.aborted) await delay(intervalMs, undefined, { signal: stop.signal }).catch((error) => { if (error.name !== 'AbortError') throw error; });
    } while (!stop.signal.aborted);
  } finally {
    process.removeListener('SIGINT', stopping);
    process.removeListener('SIGTERM', stopping);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    // Do not print network errors or raw input: those can contain credentials.
    process.stderr.write('Farm monitor failed. Check URL, output path, interval and FARM_INTERNAL_SECRET.\n');
    process.exitCode = 1;
  });
}
