/**
 * SQLite migrations — creates all tables for the Void persistence layer.
 * Run on database open. Uses version tracking to support future upgrades.
 */

import type Database from 'better-sqlite3';

// Current schema version (for reference; migrations increment it in-table)
export const CURRENT_SCHEMA_VERSION = 2;

/**
 * Runs all pending migrations on the given database.
 * Safe to call multiple times — only applies migrations newer than the stored version.
 */
export function runMigrations(db: Database.Database): void {
  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const currentVersion = getSchemaVersion(db);

  if (currentVersion < 1) {
    applyV1(db);
  }
  if (currentVersion < 2) {
    applyV2(db);
  }
}

function getSchemaVersion(db: Database.Database): number {
  // Check if schema_version table exists
  const tableExists = db
    .prepare(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='schema_version'"
    )
    .get() as { count: number };

  if (tableExists.count === 0) {
    return 0;
  }

  const row = db
    .prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1')
    .get() as { version: number } | undefined;

  return row?.version ?? 0;
}

function applyV1(db: Database.Database): void {
  db.exec(`
    -- Schema version tracking
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    );

    -- Memory key-value store
    CREATE TABLE IF NOT EXISTS memory (
      key TEXT NOT NULL,
      namespace TEXT NOT NULL DEFAULT 'default',
      value TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      agent_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      expires_at INTEGER,
      PRIMARY KEY (namespace, key)
    );

    CREATE INDEX IF NOT EXISTS idx_memory_namespace ON memory (namespace);
    CREATE INDEX IF NOT EXISTS idx_memory_agent_id ON memory (agent_id);
    CREATE INDEX IF NOT EXISTS idx_memory_expires_at ON memory (expires_at);

    -- FTS5 for memory search
    CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
      key, value, tags, content='memory', content_rowid='rowid'
    );

    -- FTS sync triggers: keep memory_fts in sync with memory table
    CREATE TRIGGER IF NOT EXISTS memory_ai AFTER INSERT ON memory BEGIN
      INSERT INTO memory_fts(rowid, key, value, tags)
      VALUES (NEW.rowid, NEW.key, NEW.value, NEW.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS memory_ad AFTER DELETE ON memory BEGIN
      INSERT INTO memory_fts(memory_fts, rowid, key, value, tags)
      VALUES ('delete', OLD.rowid, OLD.key, OLD.value, OLD.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS memory_au AFTER UPDATE ON memory BEGIN
      INSERT INTO memory_fts(memory_fts, rowid, key, value, tags)
      VALUES ('delete', OLD.rowid, OLD.key, OLD.value, OLD.tags);
      INSERT INTO memory_fts(rowid, key, value, tags)
      VALUES (NEW.rowid, NEW.key, NEW.value, NEW.tags);
    END;

    -- Sessions
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      harness TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions (status);

    -- Session events
    CREATE TABLE IF NOT EXISTS session_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      event_type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      tool_name TEXT,
      tool_input TEXT,
      tool_output TEXT,
      duration_ms INTEGER,
      success INTEGER,
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events (session_id);
    CREATE INDEX IF NOT EXISTS idx_session_events_event_type ON session_events (event_type);

    -- FTS5 for session events search
    CREATE VIRTUAL TABLE IF NOT EXISTS session_events_fts USING fts5(
      tool_name, tool_input, tool_output, metadata,
      content=session_events, content_rowid=id
    );

    -- Session events FTS sync triggers
    CREATE TRIGGER IF NOT EXISTS session_events_ai AFTER INSERT ON session_events BEGIN
      INSERT INTO session_events_fts(rowid, tool_name, tool_input, tool_output, metadata)
      VALUES (NEW.id, NEW.tool_name, NEW.tool_input, NEW.tool_output, NEW.metadata);
    END;

    CREATE TRIGGER IF NOT EXISTS session_events_ad AFTER DELETE ON session_events BEGIN
      INSERT INTO session_events_fts(session_events_fts, rowid, tool_name, tool_input, tool_output, metadata)
      VALUES ('delete', OLD.id, OLD.tool_name, OLD.tool_input, OLD.tool_output, OLD.metadata);
    END;

    CREATE TRIGGER IF NOT EXISTS session_events_au AFTER UPDATE ON session_events BEGIN
      INSERT INTO session_events_fts(session_events_fts, rowid, tool_name, tool_input, tool_output, metadata)
      VALUES ('delete', OLD.id, OLD.tool_name, OLD.tool_input, OLD.tool_output, OLD.metadata);
      INSERT INTO session_events_fts(rowid, tool_name, tool_input, tool_output, metadata)
      VALUES (NEW.id, NEW.tool_name, NEW.tool_input, NEW.tool_output, NEW.metadata);
    END;

    -- Installed components tracking
    CREATE TABLE IF NOT EXISTS installed_components (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      version TEXT NOT NULL,
      installed_at TEXT NOT NULL,
      profile TEXT,
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_installed_components_type ON installed_components (type);
    CREATE INDEX IF NOT EXISTS idx_installed_components_profile ON installed_components (profile);

    -- Audit log
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      details TEXT,
      severity TEXT DEFAULT 'info',
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_log (event);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log (timestamp);

    -- Instincts
    CREATE TABLE IF NOT EXISTS instincts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      version TEXT NOT NULL DEFAULT '1.0.0',
      trigger_type TEXT NOT NULL,
      trigger_condition TEXT NOT NULL,
      trigger_parameters TEXT,
      confidence REAL NOT NULL DEFAULT 0.5,
      domain_tags TEXT DEFAULT '[]',
      action TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_applied TEXT,
      usage_count INTEGER DEFAULT 0
    );

    -- Learned patterns
    CREATE TABLE IF NOT EXISTS learned_patterns (
      id TEXT PRIMARY KEY,
      source_session TEXT REFERENCES sessions(id),
      pattern_type TEXT NOT NULL,
      description TEXT NOT NULL,
      confidence REAL NOT NULL,
      usage_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      last_used TEXT,
      skill_generated INTEGER DEFAULT 0,
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_learned_patterns_type ON learned_patterns (pattern_type);
    CREATE INDEX IF NOT EXISTS idx_learned_patterns_source ON learned_patterns (source_session);

    -- Record schema version
    INSERT INTO schema_version (version) VALUES (1);
  `);
}

function applyV2(db: Database.Database): void {
  db.exec(`
    -- Audits — security/quality audit sessions
    CREATE TABLE IF NOT EXISTS audits (
      id TEXT PRIMARY KEY,
      project_path TEXT NOT NULL,
      name TEXT NOT NULL,
      auditor TEXT,
      created_at TEXT NOT NULL,
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_audits_project ON audits (project_path);
    CREATE INDEX IF NOT EXISTS idx_audits_created ON audits (created_at);

    -- Audit findings — individual issues discovered during an audit
    CREATE TABLE IF NOT EXISTS audit_findings (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      severity TEXT NOT NULL,
      category TEXT,
      title TEXT NOT NULL,
      description TEXT,
      file_path TEXT,
      line_number INTEGER,
      rule TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_findings_audit ON audit_findings (audit_id);
    CREATE INDEX IF NOT EXISTS idx_findings_status ON audit_findings (status);
    CREATE INDEX IF NOT EXISTS idx_findings_severity ON audit_findings (severity);

    INSERT INTO schema_version (version) VALUES (2);
  `);
}
