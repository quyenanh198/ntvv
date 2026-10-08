import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';
import { openDb } from '../server/src/db.js';

const legacySchema = `
  CREATE TABLE farmers (
    user_id INTEGER PRIMARY KEY, name TEXT NOT NULL, gold INTEGER NOT NULL,
    gems INTEGER NOT NULL, xp INTEGER NOT NULL DEFAULT 0, stars INTEGER NOT NULL DEFAULT 0,
    plots_count INTEGER NOT NULL, next_order_at INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL, gift_gold INTEGER NOT NULL DEFAULT 0
  );
  INSERT INTO farmers (user_id, name, gold, gems, plots_count, created_at, gift_gold)
  VALUES (1, 'Existing farmer', 400, 7, 6, 1000, 25);
  CREATE TABLE machines (
    owner_id INTEGER NOT NULL, kind TEXT NOT NULL, recipe TEXT,
    ready_at INTEGER, PRIMARY KEY (owner_id, kind)
  );
  INSERT INTO machines (owner_id, kind, recipe, ready_at)
  VALUES (1, 'coixay', 'botmi', 2000);
`;

test('legacy schema upgrades atomically and preserves the running machine job', () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-db-upgrade-'));
  try {
    const oldDb = new Database(join(dataDir, 'farm2.sqlite3'));
    oldDb.exec(legacySchema);
    oldDb.close();

    for (let run = 0; run < 2; run += 1) {
      const db = openDb(dataDir);
      try {
        assert.equal(db.prepare('PRAGMA integrity_check').pluck().get(), 'ok');
        assert.deepEqual(db.prepare('SELECT gold, gems, gift_gold, support_paid FROM farmers WHERE user_id = 1').get(),
          { gold: 400, gems: 7, gift_gold: 25, support_paid: 25 });
        assert.deepEqual(db.prepare('SELECT kind, recipe, ready_at, queue_count FROM machine_jobs').get(),
          { kind: 'coixay', recipe: 'botmi', ready_at: 2000, queue_count: 1 });
        assert.equal(db.prepare('SELECT recipe FROM machines WHERE owner_id = 1').get().recipe, null);
        assert.equal(db.prepare('SELECT COUNT(*) AS n FROM machine_jobs').get().n, 1);
      } finally {
        db.close();
      }
    }
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test('failed schema upgrade rolls back every table and column change', () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-db-rollback-'));
  try {
    const oldDb = new Database(join(dataDir, 'farm2.sqlite3'));
    oldDb.exec(`${legacySchema}
      CREATE TRIGGER fail_migration BEFORE UPDATE ON farmers
      BEGIN SELECT RAISE(ABORT, 'forced migration failure'); END;
    `);
    oldDb.close();

    assert.throws(() => openDb(dataDir), /forced migration failure/);
    const db = new Database(join(dataDir, 'farm2.sqlite3'), { readonly: true });
    try {
      assert.equal(db.prepare('PRAGMA integrity_check').pluck().get(), 'ok');
      assert.equal(db.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, 400);
      assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'machine_jobs'").get().n, 0);
      assert.equal(db.prepare('PRAGMA table_info(farmers)').all().some((column) => column.name === 'energy'), false);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test('backup rehearsal migrates a copy and leaves the source schema untouched', () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ntvv-db-rehearsal-source-'));
  try {
    const oldDb = new Database(join(dataDir, 'farm2.sqlite3'));
    oldDb.exec(legacySchema);
    oldDb.close();

    const backupPath = join(dataDir, 'rollback.sqlite3');
    const result = spawnSync(process.execPath, ['scripts/rehearse-db.mjs', dataDir, backupPath], {
      cwd: new URL('..', import.meta.url), encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).preservedRows.farmers, 1);

    const source = new Database(join(dataDir, 'farm2.sqlite3'), { readonly: true });
    const backup = new Database(backupPath, { readonly: true });
    try {
      assert.equal(source.prepare('PRAGMA table_info(farmers)').all().some((column) => column.name === 'energy'), false);
      assert.equal(backup.prepare('PRAGMA integrity_check').pluck().get(), 'ok');
      assert.equal(backup.prepare('SELECT gold FROM farmers WHERE user_id = 1').get().gold, 400);
    } finally {
      source.close();
      backup.close();
    }
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});
