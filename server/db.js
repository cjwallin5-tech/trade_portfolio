const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'trade_portfolio.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS pros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    trade TEXT NOT NULL,
    tagline TEXT,
    bio TEXT,
    location TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    years_experience INTEGER DEFAULT 0,
    license_number TEXT,
    avatar_path TEXT,
    dashboard_token TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS portfolio_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pro_id INTEGER NOT NULL REFERENCES pros(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    caption TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pro_id INTEGER NOT NULL REFERENCES pros(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    preferred_date TEXT,
    job_description TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_portfolio_pro ON portfolio_items(pro_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_pro ON bookings(pro_id);
`);

module.exports = db;
