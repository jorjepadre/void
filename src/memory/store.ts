/**
 * MemoryStore — persistent key-value storage with namespacing, tags, and TTL.
 * Uses prepared statements for performance. Validates all inputs.
 */

import type Database from 'better-sqlite3';
import type { MemoryEntry } from '../types/memory.js';
import {
  isValidIdentifier,
  isValidNamespace,
  ValidationError,
} from '../security/validate.js';

export interface MemorySetOptions {
  namespace?: string;
  tags?: string[];
  ttl?: number;
  agentId?: string;
}

interface MemoryRow {
  key: string;
  namespace: string;
  value: string;
  tags: string;
  agent_id: string | null;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
}

function rowToEntry(row: MemoryRow): MemoryEntry {
  return {
    key: row.key,
    namespace: row.namespace,
    value: JSON.parse(row.value) as unknown,
    tags: JSON.parse(row.tags) as string[],
    agentId: row.agent_id ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
  };
}

export class MemoryStore {
  private readonly _db: Database.Database;
  private readonly _getStmt: Database.Statement;
  private readonly _upsertStmt: Database.Statement;
  private readonly _deleteStmt: Database.Statement;
  private readonly _listStmt: Database.Statement;
  private readonly _listAllStmt: Database.Statement;
  private readonly _clearNsStmt: Database.Statement;
  private readonly _clearAllStmt: Database.Statement;
  private readonly _gcStmt: Database.Statement;

  constructor(db: Database.Database) {
    this._db = db;

    this._getStmt = this._db.prepare(
      `SELECT key, namespace, value, tags, agent_id, created_at, updated_at, expires_at
       FROM memory
       WHERE key = ? AND namespace = ?
         AND (expires_at IS NULL OR expires_at > ?)`
    );

    this._upsertStmt = this._db.prepare(
      `INSERT INTO memory (key, namespace, value, tags, agent_id, created_at, updated_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (namespace, key) DO UPDATE SET
         value = excluded.value,
         tags = excluded.tags,
         agent_id = excluded.agent_id,
         updated_at = excluded.updated_at,
         expires_at = excluded.expires_at`
    );

    this._deleteStmt = this._db.prepare(
      'DELETE FROM memory WHERE key = ? AND namespace = ?'
    );

    this._listStmt = this._db.prepare(
      `SELECT key, namespace, value, tags, agent_id, created_at, updated_at, expires_at
       FROM memory
       WHERE namespace = ? AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`
    );

    this._listAllStmt = this._db.prepare(
      `SELECT key, namespace, value, tags, agent_id, created_at, updated_at, expires_at
       FROM memory
       WHERE expires_at IS NULL OR expires_at > ?
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`
    );

    this._clearNsStmt = this._db.prepare(
      'DELETE FROM memory WHERE namespace = ?'
    );

    this._clearAllStmt = this._db.prepare(
      'DELETE FROM memory'
    );

    this._gcStmt = this._db.prepare(
      'DELETE FROM memory WHERE expires_at IS NOT NULL AND expires_at <= ?'
    );
  }

  /**
   * Retrieves a memory entry by key and namespace.
   * Returns null if not found or expired.
   */
  get(key: string, namespace: string = 'default'): MemoryEntry | null {
    validateKey(key);
    validateNamespace(namespace);

    const row = this._getStmt.get(key, namespace, Date.now()) as MemoryRow | undefined;
    return row ? rowToEntry(row) : null;
  }

  /**
   * Sets a memory entry. Upserts if the key already exists in the namespace.
   * TTL is in milliseconds; converts to an absolute expires_at timestamp.
   */
  set(key: string, value: string, opts?: MemorySetOptions): void {
    const namespace = opts?.namespace ?? 'default';
    const tags = opts?.tags ?? [];
    const agentId = opts?.agentId ?? null;

    validateKey(key);
    validateNamespace(namespace);
    if (agentId !== null && !isValidIdentifier(agentId)) {
      throw new ValidationError(`Invalid agent ID: ${agentId}`);
    }

    const now = Date.now();
    const expiresAt = opts?.ttl != null ? now + opts.ttl : null;
    const valueJson = JSON.stringify(value);
    const tagsJson = JSON.stringify(tags);

    this._upsertStmt.run(key, namespace, valueJson, tagsJson, agentId, now, now, expiresAt);
  }

  /**
   * Deletes a memory entry. Returns true if a row was actually deleted.
   */
  delete(key: string, namespace: string = 'default'): boolean {
    validateKey(key);
    validateNamespace(namespace);

    const result = this._deleteStmt.run(key, namespace);
    return result.changes > 0;
  }

  /**
   * Lists memory entries for a namespace (or all namespaces if not specified).
   * Excludes expired entries. Ordered by most recently updated.
   */
  list(namespace?: string, limit: number = 100, offset: number = 0): MemoryEntry[] {
    if (namespace != null) {
      validateNamespace(namespace);
      const rows = this._listStmt.all(namespace, Date.now(), limit, offset) as MemoryRow[];
      return rows.map(rowToEntry);
    }

    const rows = this._listAllStmt.all(Date.now(), limit, offset) as MemoryRow[];
    return rows.map(rowToEntry);
  }

  /**
   * Clears all entries in a namespace, or all entries if no namespace given.
   */
  clear(namespace?: string): void {
    if (namespace != null) {
      validateNamespace(namespace);
      this._clearNsStmt.run(namespace);
    } else {
      this._clearAllStmt.run();
    }
  }

  /**
   * Garbage collects expired entries. Returns the number of entries removed.
   */
  gc(): number {
    const result = this._gcStmt.run(Date.now());
    return result.changes;
  }
}

function validateKey(key: string): void {
  if (!isValidIdentifier(key)) {
    throw new ValidationError(
      `Invalid memory key: "${key}". Must be 1-128 alphanumeric chars, hyphens, or underscores.`
    );
  }
}

function validateNamespace(namespace: string): void {
  if (!isValidNamespace(namespace)) {
    throw new ValidationError(
      `Invalid namespace: "${namespace}". Must be 1-256 alphanumeric chars, dots, or hyphens.`
    );
  }
}
