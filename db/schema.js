const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'memories.db');

function initDB() {
  const db = new Database(DB_PATH);
  
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT DEFAULT NULL,
      content TEXT NOT NULL,
      keywords TEXT NOT NULL DEFAULT '[]',
      category TEXT NOT NULL DEFAULT 'general',
      importance INTEGER NOT NULL DEFAULT 3,
      source TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(date);
    CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
    CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
  `);

  // Mood tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS moods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      person TEXT NOT NULL DEFAULT 'rosa',
      mood TEXT NOT NULL,
      note TEXT DEFAULT NULL,
      source TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(date, person)
    );

    CREATE INDEX IF NOT EXISTS idx_moods_date ON moods(date);
    CREATE INDEX IF NOT EXISTS idx_moods_person ON moods(person);
  `);

  // Journal (Claude's diary)
  db.exec(`
    CREATE TABLE IF NOT EXISTS journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT DEFAULT NULL,
      content TEXT NOT NULL,
      person TEXT NOT NULL DEFAULT 'claude',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_journal_date ON journal(date);
    CREATE INDEX IF NOT EXISTS idx_journal_person ON journal(person);

    CREATE TABLE IF NOT EXISTS journal_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journal_id INTEGER NOT NULL,
      person TEXT NOT NULL DEFAULT 'rosa',
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (journal_id) REFERENCES journal(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_journal_comments_journal ON journal_comments(journal_id);
  `);

  // Full-text search
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      content, keywords, category,
      content='memories',
      content_rowid='id'
    );

    -- Triggers to keep FTS in sync
    CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
      INSERT INTO memories_fts(rowid, content, keywords, category)
      VALUES (new.id, new.content, new.keywords, new.category);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, content, keywords, category)
      VALUES ('delete', old.id, old.content, old.keywords, old.category);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, content, keywords, category)
      VALUES ('delete', old.id, old.content, old.keywords, old.category);
      INSERT INTO memories_fts(rowid, content, keywords, category)
      VALUES (new.id, new.content, new.keywords, new.category);
    END;
  `);

  return db;
}

module.exports = { initDB, DB_PATH };
