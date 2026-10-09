import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';
import { openDb } from '../server/src/db.js';

test('backup rehearsal restores a copy and serves an existing farmer', () => {
  const root = mkdtempSync(join(tmpdir(), 'ntvv-restore-test-'));
  const dataDir = join(root, 'data');
  const backupPath = join(root, 'backup.sqlite3');
  try {
    const db = openDb(dataDir);
    db.prepare('INSERT INTO farmers (user_id, name, gold, gems, plots_count, created_at) VALUES (1, ?, 321, 5, 12, ?)')
      .run('Restore Farmer', Date.now());
    db.prepare('INSERT INTO inventory (owner_id, item, qty) VALUES (1, ?, 7)').run('luami');
    db.close();
    const sourcePath = join(dataDir, 'farm2.sqlite3');
    const original = readFileSync(sourcePath);
    const command = resolve('scripts/rehearse-db.mjs');
    const output = JSON.parse(execFileSync(process.execPath, [command, dataDir, backupPath], { encoding: 'utf8' }));
    assert.equal(output.integrity, 'ok');
    assert.equal(output.stateProbe, 'passed');
    assert.equal(output.preservedRows.farmers, 1);
    assert.equal(output.preservedRows.inventory, 1);
    assert.deepEqual(readFileSync(sourcePath), original);
    const backup = new Database(backupPath, { readonly: true, fileMustExist: true });
    assert.equal(backup.prepare("SELECT qty FROM inventory WHERE owner_id = 1 AND item = 'luami'").get().qty, 7);
    backup.close();
    assert.throws(() => execFileSync(process.execPath, [command, dataDir, backupPath], { stdio: 'ignore' }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
