import { copyFileSync, existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { buildApp } from '../server/src/app.js';
import { openDb } from '../server/src/db.js';

const [dataDirArg, backupArg] = process.argv.slice(2);
if (!dataDirArg || !backupArg) {
  console.error('Usage: node scripts/rehearse-db.mjs <data-dir> <new-backup-file>');
  process.exit(2);
}

const sourcePath = resolve(dataDirArg, 'farm2.sqlite3');
const backupPath = resolve(backupArg);
if (!existsSync(sourcePath)) throw new Error(`Database not found: ${sourcePath}`);
if (backupPath === sourcePath || existsSync(backupPath)) throw new Error(`Backup destination must be a new file: ${backupPath}`);
mkdirSync(dirname(backupPath), { recursive: true });

const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
try {
  await source.backup(backupPath);
} finally {
  source.close();
}

const backup = new Database(backupPath, { readonly: true, fileMustExist: true });
let before;
let probeFarmer;
try {
  if (backup.prepare('PRAGMA integrity_check').pluck().get() !== 'ok') throw new Error('Backup integrity check failed');
  const existing = new Set(backup.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
  before = Object.fromEntries(['farmers', 'plots', 'inventory', 'animals'].filter((table) => existing.has(table)).map((table) => [
    table, backup.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get(),
  ]));
  probeFarmer = existing.has('farmers') ? backup.prepare('SELECT user_id, name FROM farmers ORDER BY user_id LIMIT 1').get() : undefined;
} finally {
  backup.close();
}

const rehearsalDir = mkdtempSync(join(tmpdir(), 'ntvv-db-rehearsal-'));
let stateProbe = 'skipped: no existing farmer';
try {
  copyFileSync(backupPath, join(rehearsalDir, 'farm2.sqlite3'));
  const upgraded = openDb(rehearsalDir);
  try {
    if (upgraded.prepare('PRAGMA integrity_check').pluck().get() !== 'ok') throw new Error('Upgraded copy integrity check failed');
    for (const [table, count] of Object.entries(before)) {
      if (upgraded.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get() !== count) {
        throw new Error(`Row count changed during rehearsal: ${table}`);
      }
    }
    if (probeFarmer) {
      const app = buildApp({
        db: upgraded,
        logger: false,
        config: { dataDir: rehearsalDir, mockChatUser: { id: probeFarmer.user_id, username: `restore-${probeFarmer.user_id}`, display_name: probeFarmer.name } },
      });
      try {
        const response = await app.inject({ method: 'GET', url: '/farm/api/state' });
        if (response.statusCode !== 200 || response.json().me.id !== probeFarmer.user_id) {
          throw new Error(`Restored application state probe failed: HTTP ${response.statusCode}`);
        }
        stateProbe = 'passed';
      } finally {
        await app.close();
      }
    }
  } finally {
    upgraded.close();
  }
} finally {
  rmSync(rehearsalDir, { recursive: true, force: true });
}

console.log(JSON.stringify({ backup: backupPath, integrity: 'ok', preservedRows: before, stateProbe }));
