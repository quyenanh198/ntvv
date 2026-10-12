import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

test('API request IDs and protected operational counters include replay and errors', async () => {
  const bootStartedNs = process.hrtime.bigint() - 100_000_000n;
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-metrics-'));
  const db = openDb(dataDir);
  const app = buildApp({
    db,
    logger: false,
    config: {
      dataDir,
      bootStartedNs,
      internalSecret: 'test-metrics-secret',
      mockChatUser: { id: 1, username: 'metricsfarmer', display_name: 'Metrics Farmer' },
    },
  });
  const metrics = (secret) => app.inject({
    method: 'GET', url: '/internal/farm/metrics',
    headers: secret ? { 'x-farm-secret': secret } : {},
  });
  try {
    assert.equal((await metrics()).statusCode, 404);
    assert.equal((await metrics('wrong-metrics-secret')).statusCode, 403);

    const state = await app.inject({ method: 'GET', url: '/farm/api/state' });
    assert.equal(state.statusCode, 200);
    assert.match(state.headers['x-request-id'], /^\S+$/);

    const key = 'metrics-replay-key-123456';
    const plant = () => app.inject({
      method: 'POST', url: '/farm/api/plant',
      headers: { 'idempotency-key': key }, payload: { idx: 0, crop: 'luami' },
    });
    assert.equal((await plant()).statusCode, 200);
    assert.equal((await plant()).statusCode, 200);
    const invalid = await app.inject({ method: 'POST', url: '/farm/api/plant', payload: { idx: -1, crop: 'missing' } });
    assert.equal(invalid.statusCode, 400);
    assert.ok(invalid.headers['x-request-id']);

    const response = await metrics('test-metrics-secret');
    assert.equal(response.statusCode, 200);
    const snapshot = response.json();
    assert.equal(snapshot.requests, 4);
    assert.equal(snapshot.errors4xx, 1);
    assert.equal(snapshot.errors5xx, 0);
    assert.equal(snapshot.replayedMutations, 1);
    assert.equal(Object.values(snapshot.latencyMs).reduce((sum, count) => sum + count, 0), 4);
    assert.ok(snapshot.startedAt > 0);
    assert.ok(snapshot.startupReadyMs >= 100);
  } finally {
    await app.close();
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
