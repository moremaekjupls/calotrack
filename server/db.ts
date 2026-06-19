import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir =
  process.env.DB_DIR ||
  path.resolve(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'calotrack.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF'); // off during migration

// ---------------------------------------------------------------------------
// Schema migration: detect old schema (session_id) and drop legacy tables
// ---------------------------------------------------------------------------

const tableInfo = db.prepare("PRAGMA table_info(entries)").all() as { name: string }[];
const hasSessionId = tableInfo.some((col) => col.name === 'session_id');

if (hasSessionId) {
  console.log('[db] Migrating schema: dropping legacy session-based tables');
  db.exec(`
    DROP TABLE IF EXISTS entries;
    DROP TABLE IF EXISTS goals;
  `);
}

// ---------------------------------------------------------------------------
// Create tables
// ---------------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entries (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    date       TEXT NOT NULL,
    name       TEXT NOT NULL,
    calories   REAL NOT NULL,
    protein    REAL NOT NULL,
    fat        REAL NOT NULL,
    carbs      REAL NOT NULL,
    meal_type  TEXT,
    time       TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS goals (
    user_id    TEXT PRIMARY KEY,
    calories   REAL NOT NULL DEFAULT 2000,
    protein    REAL NOT NULL DEFAULT 150,
    fat        REAL NOT NULL DEFAULT 65,
    carbs      REAL NOT NULL DEFAULT 250,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_entries_user_date
    ON entries (user_id, date);

  CREATE INDEX IF NOT EXISTS idx_sessions_token
    ON sessions (token);
`);

db.pragma('foreign_keys = ON');

export default db;
