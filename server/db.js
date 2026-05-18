const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'leads.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT NOT NULL,
    industry TEXT,
    suburb TEXT,
    website_url TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    website_status TEXT DEFAULT 'unknown',
    lead_score INTEGER DEFAULT 0,
    pipeline_status TEXT DEFAULT 'found',
    last_contacted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS website_audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    audit_json TEXT,
    audited_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
