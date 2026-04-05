/**
 * SessionStore — CRUD operations for sessions and session events.
 * Uses prepared statements for performance and validates all inputs.
 */

import type Database from 'better-sqlite3';
import type {
  SessionRecord,
  SessionStatus,
  SessionEvent,
  SessionEventType,
} from '../types/session.js';
import { isValidIdentifier, ValidationError } from '../security/validate.js';

interface SessionRow {
  id: string;
  harness: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  metadata: string | null;
}

interface SessionEventRow {
  id: number;
  session_id: string;
  event_type: string;
  timestamp: string;
  tool_name: string | null;
  tool_input: string | null;
  tool_output: string | null;
  duration_ms: number | null;
  success: number | null;
  metadata: string | null;
}

function rowToSession(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    harness: row.harness,
    started_at: row.started_at,
    ended_at: row.ended_at ?? undefined,
    status: row.status as SessionStatus,
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : {},
  };
}

function rowToEvent(row: SessionEventRow): SessionEvent {
  return {
    session_id: row.session_id,
    event_type: row.event_type as SessionEventType,
    timestamp: row.timestamp,
    tool_name: row.tool_name ?? undefined,
    tool_input: row.tool_input
      ? (JSON.parse(row.tool_input) as Record<string, unknown>)
      : undefined,
    tool_output: row.tool_output
      ? (JSON.parse(row.tool_output) as unknown)
      : undefined,
    duration_ms: row.duration_ms ?? undefined,
    success: row.success != null ? row.success === 1 : true,
    metadata: row.metadata
      ? (JSON.parse(row.metadata) as Record<string, unknown>)
      : undefined,
  };
}

const VALID_STATUSES = new Set<string>(['active', 'completed', 'aborted']);
const VALID_EVENT_TYPES = new Set<string>([
  'tool_use',
  'hook_fire',
  'gate_check',
  'agent_action',
  'error',
]);

export class SessionStore {
  private readonly _db: Database.Database;
  private readonly _createStmt: Database.Statement;
  private readonly _getStmt: Database.Statement;
  private readonly _updateStatusStmt: Database.Statement;
  private readonly _updateMetadataStmt: Database.Statement;
  private readonly _endStmt: Database.Statement;
  private readonly _listStmt: Database.Statement;
  private readonly _listByStatusStmt: Database.Statement;
  private readonly _addEventStmt: Database.Statement;
  private readonly _getEventsStmt: Database.Statement;

  constructor(db: Database.Database) {
    this._db = db;

    this._createStmt = this._db.prepare(
      `INSERT INTO sessions (id, harness, started_at, status, metadata)
       VALUES (?, ?, ?, 'active', ?)`
    );

    this._getStmt = this._db.prepare(
      `SELECT id, harness, started_at, ended_at, status, metadata
       FROM sessions WHERE id = ?`
    );

    this._updateStatusStmt = this._db.prepare(
      'UPDATE sessions SET status = ? WHERE id = ?'
    );

    this._updateMetadataStmt = this._db.prepare(
      'UPDATE sessions SET metadata = ? WHERE id = ?'
    );

    this._endStmt = this._db.prepare(
      `UPDATE sessions SET status = ?, ended_at = ? WHERE id = ?`
    );

    this._listStmt = this._db.prepare(
      `SELECT id, harness, started_at, ended_at, status, metadata
       FROM sessions ORDER BY started_at DESC LIMIT ? OFFSET ?`
    );

    this._listByStatusStmt = this._db.prepare(
      `SELECT id, harness, started_at, ended_at, status, metadata
       FROM sessions WHERE status = ? ORDER BY started_at DESC LIMIT ? OFFSET ?`
    );

    this._addEventStmt = this._db.prepare(
      `INSERT INTO session_events
         (session_id, event_type, timestamp, tool_name, tool_input, tool_output, duration_ms, success, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    this._getEventsStmt = this._db.prepare(
      `SELECT id, session_id, event_type, timestamp, tool_name, tool_input,
              tool_output, duration_ms, success, metadata
       FROM session_events
       WHERE session_id = ?
       ORDER BY id ASC
       LIMIT ? OFFSET ?`
    );
  }

  /**
   * Creates a new session and returns the record.
   */
  createSession(
    id: string,
    harness: string,
    metadata?: Record<string, unknown>
  ): SessionRecord {
    validateSessionId(id);

    const now = new Date().toISOString();
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    this._createStmt.run(id, harness, now, metadataJson);

    return {
      id,
      harness,
      started_at: now,
      status: 'active',
      metadata: metadata ?? {},
    };
  }

  /**
   * Retrieves a session by ID. Returns null if not found.
   */
  getSession(id: string): SessionRecord | null {
    validateSessionId(id);
    const row = this._getStmt.get(id) as SessionRow | undefined;
    return row ? rowToSession(row) : null;
  }

  /**
   * Updates session status and/or metadata.
   */
  updateSession(
    id: string,
    update: { status?: SessionStatus; metadata?: Record<string, unknown> }
  ): void {
    validateSessionId(id);

    if (update.status != null) {
      if (!VALID_STATUSES.has(update.status)) {
        throw new ValidationError(`Invalid session status: ${update.status}`);
      }
      this._updateStatusStmt.run(update.status, id);
    }

    if (update.metadata != null) {
      this._updateMetadataStmt.run(JSON.stringify(update.metadata), id);
    }
  }

  /**
   * Ends a session by setting its status and ended_at timestamp.
   */
  endSession(id: string, status: 'completed' | 'aborted' = 'completed'): void {
    validateSessionId(id);
    if (!VALID_STATUSES.has(status)) {
      throw new ValidationError(`Invalid end status: ${status}`);
    }
    const now = new Date().toISOString();
    this._endStmt.run(status, now, id);
  }

  /**
   * Lists sessions, optionally filtered by status.
   */
  listSessions(opts?: {
    status?: SessionStatus;
    limit?: number;
    offset?: number;
  }): SessionRecord[] {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;

    if (opts?.status != null) {
      if (!VALID_STATUSES.has(opts.status)) {
        throw new ValidationError(`Invalid session status: ${opts.status}`);
      }
      const rows = this._listByStatusStmt.all(opts.status, limit, offset) as SessionRow[];
      return rows.map(rowToSession);
    }

    const rows = this._listStmt.all(limit, offset) as SessionRow[];
    return rows.map(rowToSession);
  }

  /**
   * Adds an event to a session's event log.
   */
  addSessionEvent(event: SessionEvent): void {
    if (!VALID_EVENT_TYPES.has(event.event_type)) {
      throw new ValidationError(`Invalid event type: ${event.event_type}`);
    }

    this._addEventStmt.run(
      event.session_id,
      event.event_type,
      event.timestamp,
      event.tool_name ?? null,
      event.tool_input ? JSON.stringify(event.tool_input) : null,
      event.tool_output != null ? JSON.stringify(event.tool_output) : null,
      event.duration_ms ?? null,
      event.success ? 1 : 0,
      event.metadata ? JSON.stringify(event.metadata) : null
    );
  }

  /**
   * Retrieves events for a given session, ordered chronologically.
   */
  getSessionEvents(
    sessionId: string,
    limit: number = 500,
    offset: number = 0
  ): SessionEvent[] {
    validateSessionId(sessionId);
    const rows = this._getEventsStmt.all(sessionId, limit, offset) as SessionEventRow[];
    return rows.map(rowToEvent);
  }
}

function validateSessionId(id: string): void {
  if (!isValidIdentifier(id)) {
    throw new ValidationError(
      `Invalid session ID: "${id}". Must be 1-128 alphanumeric chars, hyphens, or underscores.`
    );
  }
}
