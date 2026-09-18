import assert from 'node:assert/strict';
import test from 'node:test';

import { machineQueueProgress } from '../server/src/game.js';

test('machine queue keeps the next batch running after the first completes', () => {
  const readyAt = 10_000;
  assert.deepEqual(
    machineQueueProgress({ readyAt, total: 50, cycle: 1_000, now: readyAt }),
    { completed: 1, processing: true, currentReadyAt: 11_000, queued: 48 },
  );
});

test('machine queue accumulates finished output while offline', () => {
  assert.deepEqual(
    machineQueueProgress({ readyAt: 10_000, total: 50, cycle: 1_000, now: 19_500 }),
    { completed: 10, processing: true, currentReadyAt: 20_000, queued: 39 },
  );
});

test('machine queue stops only after every queued batch completes', () => {
  assert.deepEqual(
    machineQueueProgress({ readyAt: 10_000, total: 3, cycle: 1_000, now: 50_000 }),
    { completed: 3, processing: false, currentReadyAt: null, queued: 0 },
  );
});

test('machine queue reports one processing batch before the first completion', () => {
  assert.deepEqual(
    machineQueueProgress({ readyAt: 10_000, total: 50, cycle: 1_000, now: 9_000 }),
    { completed: 0, processing: true, currentReadyAt: 10_000, queued: 49 },
  );
});
