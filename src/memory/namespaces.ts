/**
 * NamespaceManager — namespace listing, stats, and access control.
 *
 * Namespace access conventions (using dot separator for validation compatibility):
 *   - "agent.{agentId}.private"  — only accessible by that agent
 *   - "agent.{agentId}.public"   — writable by that agent, readable by all
 *   - "shared"                   — accessible to all agents
 *   - Any other namespace        — accessible to all (no restrictions)
 */

import type Database from 'better-sqlite3';
import { isValidNamespace, ValidationError } from '../security/validate.js';

export interface NamespaceStats {
  entryCount: number;
  oldestEntry: number;
  newestEntry: number;
}

export class NamespaceManager {
  private readonly _db: Database.Database;
  private readonly _listStmt: Database.Statement;
  private readonly _existsStmt: Database.Statement;
  private readonly _statsStmt: Database.Statement;

  constructor(db: Database.Database) {
    this._db = db;

    this._listStmt = this._db.prepare(
      'SELECT DISTINCT namespace FROM memory ORDER BY namespace'
    );

    this._existsStmt = this._db.prepare(
      'SELECT COUNT(*) as count FROM memory WHERE namespace = ?'
    );

    this._statsStmt = this._db.prepare(
      `SELECT
         COUNT(*) as entryCount,
         MIN(created_at) as oldestEntry,
         MAX(created_at) as newestEntry
       FROM memory
       WHERE namespace = ?`
    );
  }

  /**
   * Lists all namespaces that currently have entries.
   */
  list(): string[] {
    const rows = this._listStmt.all() as Array<{ namespace: string }>;
    return rows.map((r) => r.namespace);
  }

  /**
   * Checks whether a namespace has any entries.
   */
  exists(namespace: string): boolean {
    validateNs(namespace);
    const row = this._existsStmt.get(namespace) as { count: number };
    return row.count > 0;
  }

  /**
   * Returns entry count and oldest/newest timestamps for a namespace.
   * Timestamps are epoch milliseconds; returns 0 for both if namespace is empty.
   */
  getStats(namespace: string): NamespaceStats {
    validateNs(namespace);
    const row = this._statsStmt.get(namespace) as {
      entryCount: number;
      oldestEntry: number | null;
      newestEntry: number | null;
    };
    return {
      entryCount: row.entryCount,
      oldestEntry: row.oldestEntry ?? 0,
      newestEntry: row.newestEntry ?? 0,
    };
  }

  /**
   * Checks whether an agent can access a given namespace.
   *
   * Rules:
   *   - "shared" and any non-agent-prefixed namespace: accessible to all
   *   - "agent.{id}.private": only accessible to the owning agent
   *   - "agent.{id}.public": readable by all agents (access granted)
   */
  isAccessible(namespace: string, agentId: string): boolean {
    validateNs(namespace);

    // Parse agent-scoped namespaces: "agent.{ownerId}.private" or "agent.{ownerId}.public"
    const agentMatch = namespace.match(/^agent\.([a-zA-Z0-9_-]+)\.(private|public)$/);
    if (!agentMatch) {
      // Not an agent-scoped namespace; accessible to all
      return true;
    }

    const ownerId = agentMatch[1];
    const visibility = agentMatch[2];

    if (visibility === 'private') {
      return ownerId === agentId;
    }

    // "public" agent namespaces are readable by anyone
    return true;
  }
}

function validateNs(namespace: string): void {
  if (!isValidNamespace(namespace)) {
    throw new ValidationError(
      `Invalid namespace: "${namespace}". Must be 1-256 alphanumeric chars, dots, or hyphens.`
    );
  }
}
