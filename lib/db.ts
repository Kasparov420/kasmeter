import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const dbPath = path.join(dataDir, 'db.sqlite');
export const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  receiver_address TEXT NOT NULL,
  expected_amount_sompi INTEGER NOT NULL,
  checkpoint_seconds INTEGER NOT NULL,
  rate_kas_per_minute REAL NOT NULL,
  created_at INTEGER NOT NULL,
  paid_until INTEGER NOT NULL,
  last_payment_outpoint TEXT
);

CREATE TABLE IF NOT EXISTS seen_outpoints (
  outpoint TEXT PRIMARY KEY,
  amount_sompi INTEGER NOT NULL,
  seen_at INTEGER NOT NULL
);
`);

// Lightweight migration for older demo DBs
try {
  const cols: Array<{ name: string }> = db.prepare("PRAGMA table_info(sessions)").all();
  const names = new Set(cols.map((c) => c.name));
  if (!names.has('checkpoint_seconds')) {
    db.exec('ALTER TABLE sessions ADD COLUMN checkpoint_seconds INTEGER NOT NULL DEFAULT 60');
  }
  if (!names.has('rate_kas_per_minute')) {
    db.exec('ALTER TABLE sessions ADD COLUMN rate_kas_per_minute REAL NOT NULL DEFAULT 0.1');
  }
} catch {
  // ignore
}

export type SessionRow = {
  id: string;
  receiver_address: string;
  expected_amount_sompi: number;
  checkpoint_seconds: number;
  rate_kas_per_minute: number;
  created_at: number;
  paid_until: number;
  last_payment_outpoint?: string | null;
};
