/**
 * MemorySearch — full-text search over the memory store using SQLite FTS5.
 * Supports BM25 ranking, namespace filtering, and tag filtering.
 */

import type Database from 'better-sqlite3';
import type { MemoryEntry, MemoryQuery } from '../types/memory.js';
import { isValidNamespace, ValidationError } from '../security/validate.js';

interface MemoryFtsRow {
  key: string;
  namespace: string;
  value: string;
  tags: string;
  agent_id: string | null;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
  rank: number;
}

function rowToEntry(row: MemoryFtsRow): MemoryEntry {
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

/**
 * Escapes FTS5 special characters in user input to prevent query injection.
 * Wraps each token in double quotes to treat them as literals.
 */
function escapeFts5Query(input: string): string {
  // Remove FTS5 operators and special characters, then quote each token
  const cleaned = input
    .replace(/["+*\-(){}[\]^~\\:]/g, ' ')
    .replace(/\b(AND|OR|NOT|NEAR)\b/gi, '')
    .trim();

  if (cleaned.length === 0) {
    return '""';
  }

  // Quote each whitespace-delimited token
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  return tokens.map((t) => `"${t}"`).join(' ');
}

export class MemorySearch {
  private readonly _db: Database.Database;

  constructor(db: Database.Database) {
    this._db = db;
  }

  /**
   * Searches memory entries using FTS5 full-text search with BM25 ranking.
   * Optionally filters by namespace and tags. Excludes expired entries.
   */
  search(query: MemoryQuery): MemoryEntry[] {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    if (query.namespace != null && !isValidNamespace(query.namespace)) {
      throw new ValidationError(
        `Invalid namespace: "${query.namespace}". Must be 1-256 alphanumeric chars, dots, or hyphens.`
      );
    }

    // If no search text, fall back to filtered listing
    if (!query.search || query.search.trim().length === 0) {
      return this._listFiltered(query.namespace, query.tags, limit, offset);
    }

    const ftsQuery = escapeFts5Query(query.search);

    const conditions: string[] = [
      '(m.expires_at IS NULL OR m.expires_at > ?)',
    ];
    const params: (string | number)[] = [Date.now()];

    if (query.namespace != null) {
      conditions.push('m.namespace = ?');
      params.push(query.namespace);
    }

    // Build the SQL with FTS5 join
    const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT m.key, m.namespace, m.value, m.tags, m.agent_id,
             m.created_at, m.updated_at, m.expires_at,
             rank
      FROM memory_fts fts
      JOIN memory m ON m.rowid = fts.rowid
      WHERE memory_fts MATCH ?
        ${whereClause}
      ORDER BY rank
      LIMIT ? OFFSET ?
    `;

    params.unshift(ftsQuery);
    params.push(limit, offset);

    const rows = this._db.prepare(sql).all(...params) as MemoryFtsRow[];

    // Apply tag filter in application layer (tags are JSON arrays)
    if (query.tags && query.tags.length > 0) {
      return rows
        .filter((row) => {
          const entryTags = JSON.parse(row.tags) as string[];
          return query.tags!.every((t) => entryTags.includes(t));
        })
        .map(rowToEntry);
    }

    return rows.map(rowToEntry);
  }

  /**
   * Fallback listing when no search text is provided.
   * Applies namespace and tag filters.
   */
  private _listFiltered(
    namespace: string | undefined,
    tags: string[] | undefined,
    limit: number,
    offset: number
  ): MemoryEntry[] {
    const conditions: string[] = [
      '(expires_at IS NULL OR expires_at > ?)',
    ];
    const params: (string | number)[] = [Date.now()];

    if (namespace != null) {
      conditions.push('namespace = ?');
      params.push(namespace);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      SELECT key, namespace, value, tags, agent_id,
             created_at, updated_at, expires_at
      FROM memory
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const rows = this._db.prepare(sql).all(...params) as MemoryFtsRow[];

    // Apply tag filter in application layer
    if (tags && tags.length > 0) {
      return rows
        .filter((row) => {
          const entryTags = JSON.parse(row.tags) as string[];
          return tags.every((t) => entryTags.includes(t));
        })
        .map(rowToEntry);
    }

    return rows.map(rowToEntry);
  }
}
