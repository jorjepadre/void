/**
 * NativeSessionAdapter — loads sessions and events from Void's own SQLite database.
 */

import Database from 'better-sqlite3';
import type { SessionRecord, SessionEvent, SessionStatus, SessionEventType } from '../../types/session.js';

interface SessionRow {
  id: string;
  harness: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  metadata: string | null;
}

interface EventRow {
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

function rowToEvent(row: EventRow): SessionEvent {
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

export class NativeSessionAdapter {
  /**
   * Loads all sessions from a Void SQLite database file.
   */
  async loadSessions(dbPath: string): Promise<SessionRecord[]> {
    let db: Database.Database | undefined;
    try {
      db = new Database(dbPath, { readonly: true });
      const rows = db
        .prepare(
          `SELECT id, harness, started_at, ended_at, status, metadata
           FROM sessions ORDER BY started_at DESC`
        )
        .all() as SessionRow[];
      return rows.map(rowToSession);
    } catch {
      return [];
    } finally {
      db?.close();
    }
  }

  /**
   * Loads events for a specific session from a Void SQLite database file.
   */
  async loadEvents(
    dbPath: string,
    sessionId: string
  ): Promise<SessionEvent[]> {
    let db: Database.Database | undefined;
    try {
      db = new Database(dbPath, { readonly: true });
      const rows = db
        .prepare(
          `SELECT session_id, event_type, timestamp, tool_name, tool_input,
                  tool_output, duration_ms, success, metadata
           FROM session_events
           WHERE session_id = ?
           ORDER BY id ASC`
        )
        .all(sessionId) as EventRow[];
      return rows.map(rowToEvent);
    } catch {
      return [];
    } finally {
      db?.close();
    }
  }
}
