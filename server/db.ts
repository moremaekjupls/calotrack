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

  CREATE TABLE IF NOT EXISTS water_logs (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    date       TEXT NOT NULL,
    ml         REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_entries_user_date
    ON entries (user_id, date);

  CREATE INDEX IF NOT EXISTS idx_water_logs_user_date
    ON water_logs (user_id, date);

  CREATE INDEX IF NOT EXISTS idx_sessions_token
    ON sessions (token);
`);

// ---------------------------------------------------------------------------
// Migration: add water_goal_ml to goals if it doesn't exist yet
// (goals table may already exist in production without this column)
// ---------------------------------------------------------------------------

const goalsInfo = db.prepare("PRAGMA table_info(goals)").all() as { name: string }[];
const hasWaterGoal = goalsInfo.some((col) => col.name === 'water_goal_ml');

if (!hasWaterGoal) {
  console.log('[db] Migrating schema: adding goals.water_goal_ml');
  db.exec(`ALTER TABLE goals ADD COLUMN water_goal_ml REAL NOT NULL DEFAULT 2000;`);
}

// ---------------------------------------------------------------------------
// Migration: profile fields on users (name, height, weight, birth year)
// ---------------------------------------------------------------------------

const usersInfo = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
const userCols = new Set(usersInfo.map((col) => col.name));

if (!userCols.has('name')) {
  console.log('[db] Migrating schema: adding users.name');
  db.exec(`ALTER TABLE users ADD COLUMN name TEXT;`);
}
if (!userCols.has('height_cm')) {
  console.log('[db] Migrating schema: adding users.height_cm');
  db.exec(`ALTER TABLE users ADD COLUMN height_cm REAL;`);
}
if (!userCols.has('weight_kg')) {
  console.log('[db] Migrating schema: adding users.weight_kg');
  db.exec(`ALTER TABLE users ADD COLUMN weight_kg REAL;`);
}
if (!userCols.has('birth_year')) {
  console.log('[db] Migrating schema: adding users.birth_year');
  db.exec(`ALTER TABLE users ADD COLUMN birth_year INTEGER;`);
}

db.pragma('foreign_keys = ON');

export default db;
