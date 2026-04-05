/**
 * InstinctStore — SQLite-backed persistence for instincts.
 * Uses the instincts table created by memory/migrations.ts.
 */

import type Database from 'better-sqlite3';
import type { Instinct } from '../types/instinct.js';

interface InstinctRow {
  id: string;
  name: string;
  description: string | null;
  version: string;
  trigger_type: string;
  trigger_condition: string;
  trigger_parameters: string | null;
  confidence: number;
  domain_tags: string;
  action: string;
  created_at: string;
  last_applied: string | null;
  usage_count: number;
}

function rowToInstinct(row: InstinctRow): Instinct {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    version: row.version,
    trigger: {
      type: row.trigger_type as Instinct['trigger']['type'],
      condition: row.trigger_condition,
      parameters: row.trigger_parameters
        ? (JSON.parse(row.trigger_parameters) as Record<string, unknown>)
        : undefined,
    },
    confidence: row.confidence,
    domain_tags: JSON.parse(row.domain_tags) as string[],
    action: row.action,
    created_at: row.created_at,
    last_applied: row.last_applied ?? undefined,
    usage_count: row.usage_count,
  };
}

export class InstinctStore {
  private readonly _upsertStmt: Database.Statement;
  private readonly _getStmt: Database.Statement;
  private readonly _getAllStmt: Database.Statement;
  private readonly _updateConfidenceStmt: Database.Statement;
  private readonly _recordUsageStmt: Database.Statement;
  private readonly _deleteStmt: Database.Statement;

  constructor(private readonly _db: Database.Database) {
    this._upsertStmt = this._db.prepare(`
      INSERT INTO instincts (id, name, description, version, trigger_type, trigger_condition,
        trigger_parameters, confidence, domain_tags, action, created_at, last_applied, usage_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        version = excluded.version,
        trigger_type = excluded.trigger_type,
        trigger_condition = excluded.trigger_condition,
        trigger_parameters = excluded.trigger_parameters,
        confidence = excluded.confidence,
        domain_tags = excluded.domain_tags,
        action = excluded.action,
        last_applied = excluded.last_applied,
        usage_count = excluded.usage_count
    `);

    this._getStmt = this._db.prepare(`
      SELECT id, name, description, version, trigger_type, trigger_condition,
        trigger_parameters, confidence, domain_tags, action, created_at, last_applied, usage_count
      FROM instincts WHERE id = ?
    `);

    this._getAllStmt = this._db.prepare(`
      SELECT id, name, description, version, trigger_type, trigger_condition,
        trigger_parameters, confidence, domain_tags, action, created_at, last_applied, usage_count
      FROM instincts ORDER BY confidence DESC
    `);

    this._updateConfidenceStmt = this._db.prepare(`
      UPDATE instincts SET confidence = ? WHERE id = ?
    `);

    this._recordUsageStmt = this._db.prepare(`
      UPDATE instincts SET usage_count = usage_count + 1, last_applied = ? WHERE id = ?
    `);

    this._deleteStmt = this._db.prepare(`
      DELETE FROM instincts WHERE id = ?
    `);
  }

  /**
   * Upserts an instinct into the store.
   */
  save(instinct: Instinct): void {
    this._upsertStmt.run(
      instinct.id,
      instinct.name,
      instinct.description,
      instinct.version,
      instinct.trigger.type,
      instinct.trigger.condition,
      instinct.trigger.parameters ? JSON.stringify(instinct.trigger.parameters) : null,
      instinct.confidence,
      JSON.stringify(instinct.domain_tags),
      instinct.action,
      instinct.created_at,
      instinct.last_applied ?? null,
      instinct.usage_count,
    );
  }

  /**
   * Retrieves an instinct by ID, or null if not found.
   */
  get(id: string): Instinct | null {
    const row = this._getStmt.get(id) as InstinctRow | undefined;
    return row ? rowToInstinct(row) : null;
  }

  /**
   * Returns all instincts, ordered by confidence descending.
   */
  getAll(): Instinct[] {
    const rows = this._getAllStmt.all() as InstinctRow[];
    return rows.map(rowToInstinct);
  }

  /**
   * Returns instincts whose domain_tags JSON array contains the given domain.
   */
  getByDomain(domain: string): Instinct[] {
    // Filter in JS since SQLite JSON functions vary; the dataset is small enough.
    const all = this.getAll();
    return all.filter((instinct) => instinct.domain_tags.includes(domain));
  }

  /**
   * Updates the confidence score for a specific instinct.
   */
  updateConfidence(id: string, newConfidence: number): void {
    this._updateConfidenceStmt.run(newConfidence, id);
  }

  /**
   * Increments usage_count and sets last_applied to now.
   */
  recordUsage(id: string): void {
    this._recordUsageStmt.run(new Date().toISOString(), id);
  }

  /**
   * Deletes an instinct by ID.
   */
  delete(id: string): void {
    this._deleteStmt.run(id);
  }
}
