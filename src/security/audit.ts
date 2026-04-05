/**
 * AuditTrail — persistent security and operational event logging.
 * Uses better-sqlite3 for synchronous, reliable writes.
 */

import type Database from 'better-sqlite3';

export interface AuditEntry {
  id: number;
  event: string;
  details: string;
  severity: string;
  timestamp: number;
}

export class AuditTrail {
  private readonly _db: Database.Database;
  private readonly _insertStmt: Database.Statement;
  private readonly _queryBaseEvent: Database.Statement;
  private readonly _queryBaseSince: Database.Statement;
  private readonly _queryBaseAll: Database.Statement;

  constructor(db: Database.Database) {
    this._db = db;
    this._ensureTable();

    this._insertStmt = this._db.prepare(
      'INSERT INTO audit_log (event, details, severity, timestamp) VALUES (?, ?, ?, ?)'
    );
    this._queryBaseEvent = this._db.prepare(
      'SELECT id, event, details, severity, timestamp FROM audit_log WHERE event = ? ORDER BY timestamp DESC LIMIT ?'
    );
    this._queryBaseSince = this._db.prepare(
      'SELECT id, event, details, severity, timestamp FROM audit_log WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT ?'
    );
    this._queryBaseAll = this._db.prepare(
      'SELECT id, event, details, severity, timestamp FROM audit_log ORDER BY timestamp DESC LIMIT ?'
    );
  }

  /**
   * Logs an audit event with structured details.
   */
  log(
    event: string,
    details: Record<string, unknown>,
    severity: string = 'info'
  ): void {
    const detailsJson = JSON.stringify(details);
    const timestamp = Date.now();
    this._insertStmt.run(event, detailsJson, severity, timestamp);
  }

  /**
   * Queries audit log entries with optional filters.
   */
  query(opts: {
    event?: string;
    since?: number;
    limit?: number;
  }): AuditEntry[] {
    const limit = opts.limit ?? 100;

    if (opts.event && opts.since) {
      // Combined filter: use a dedicated query
      const stmt = this._db.prepare(
        'SELECT id, event, details, severity, timestamp FROM audit_log WHERE event = ? AND timestamp >= ? ORDER BY timestamp DESC LIMIT ?'
      );
      return stmt.all(opts.event, opts.since, limit) as AuditEntry[];
    }

    if (opts.event) {
      return this._queryBaseEvent.all(opts.event, limit) as AuditEntry[];
    }

    if (opts.since) {
      return this._queryBaseSince.all(opts.since, limit) as AuditEntry[];
    }

    return this._queryBaseAll.all(limit) as AuditEntry[];
  }

  private _ensureTable(): void {
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '{}',
        severity TEXT NOT NULL DEFAULT 'info',
        timestamp INTEGER NOT NULL
      )
    `);
    this._db.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_log (event);
    `);
    this._db.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log (timestamp);
    `);
  }
}
