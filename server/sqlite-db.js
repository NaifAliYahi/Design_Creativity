import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, 'data');
export const DB_FILE = path.join(DATA_DIR, 'app.db');
const LEGACY_STORE = path.join(DATA_DIR, 'store.json');

let db;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function migrateFromStoreJson(database) {
  if (!fs.existsSync(LEGACY_STORE)) return;
  let store;
  try {
    store = JSON.parse(fs.readFileSync(LEGACY_STORE, 'utf8'));
  } catch {
    return;
  }
  const insert = database.prepare(
    'INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES (?, ?, ?)'
  );
  database.exec('BEGIN');
  try {
    for (const [key, value] of Object.entries(store)) {
      if (key.startsWith('_')) continue;
      insert.run(key, JSON.stringify(value), Date.now());
    }
    database.exec('COMMIT');
  } catch (e) {
    database.exec('ROLLBACK');
    throw e;
  }
  const backup = `${LEGACY_STORE}.migrated-${Date.now()}.bak`;
  try {
    fs.renameSync(LEGACY_STORE, backup);
  } catch {
    /* keep json if rename fails */
  }
}

export function openDatabase() {
  if (db) return db;
  ensureDir();
  db = new DatabaseSync(DB_FILE);
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  const row = db.prepare('SELECT COUNT(*) AS c FROM kv').get();
  if (row.c === 0) migrateFromStoreJson(db);
  return db;
}

export function getJson(key) {
  const row = openDatabase().prepare('SELECT value FROM kv WHERE key = ?').get(key);
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

export function setJson(key, value) {
  openDatabase()
    .prepare('INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES (?, ?, ?)')
    .run(key, JSON.stringify(value), Date.now());
}

export function deleteKey(key) {
  openDatabase().prepare('DELETE FROM kv WHERE key = ?').run(key);
}

export function dbStats() {
  const d = openDatabase();
  const keys = d.prepare('SELECT COUNT(*) AS c FROM kv').get().c;
  const fileSize = fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0;
  return { keys, fileSize, path: DB_FILE };
}
