/**
 * ComponentTracker — tracks installed components (skills, agents, commands, rules, hooks).
 * Persists to the installed_components SQLite table.
 */

import type Database from 'better-sqlite3';
import type { ComponentRef, ComponentType } from '../types/manifest.js';
import { isValidIdentifier, ValidationError } from '../security/validate.js';

interface ComponentRow {
  id: string;
  type: string;
  version: string;
  installed_at: string;
  profile: string | null;
  metadata: string | null;
}

export interface TrackedComponent extends ComponentRef {
  installed_at: string;
  profile?: string;
  metadata?: Record<string, unknown>;
}

const VALID_TYPES = new Set<string>([
  'skill',
  'agent',
  'command',
  'rule',
  'hook',
]);

function rowToComponent(row: ComponentRow): TrackedComponent {
  return {
    id: row.id,
    type: row.type as ComponentType,
    version: row.version,
    installed_at: row.installed_at,
    profile: row.profile ?? undefined,
    metadata: row.metadata
      ? (JSON.parse(row.metadata) as Record<string, unknown>)
      : undefined,
  };
}

export class ComponentTracker {
  private readonly _db: Database.Database;
  private readonly _upsertStmt: Database.Statement;
  private readonly _deleteStmt: Database.Statement;
  private readonly _listAllStmt: Database.Statement;
  private readonly _listByTypeStmt: Database.Statement;
  private readonly _listByProfileStmt: Database.Statement;
  private readonly _existsStmt: Database.Statement;

  constructor(db: Database.Database) {
    this._db = db;

    this._upsertStmt = this._db.prepare(
      `INSERT INTO installed_components (id, type, version, installed_at, profile, metadata)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         type = excluded.type,
         version = excluded.version,
         installed_at = excluded.installed_at,
         profile = excluded.profile,
         metadata = excluded.metadata`
    );

    this._deleteStmt = this._db.prepare(
      'DELETE FROM installed_components WHERE id = ?'
    );

    this._listAllStmt = this._db.prepare(
      `SELECT id, type, version, installed_at, profile, metadata
       FROM installed_components ORDER BY installed_at DESC`
    );

    this._listByTypeStmt = this._db.prepare(
      `SELECT id, type, version, installed_at, profile, metadata
       FROM installed_components WHERE type = ? ORDER BY installed_at DESC`
    );

    this._listByProfileStmt = this._db.prepare(
      `SELECT id, type, version, installed_at, profile, metadata
       FROM installed_components WHERE profile = ? ORDER BY installed_at DESC`
    );

    this._existsStmt = this._db.prepare(
      'SELECT COUNT(*) as count FROM installed_components WHERE id = ?'
    );
  }

  /**
   * Tracks (installs or updates) a component.
   */
  track(component: {
    id: string;
    type: ComponentType;
    version: string;
    profile?: string;
    metadata?: Record<string, unknown>;
  }): void {
    validateComponentId(component.id);
    validateComponentType(component.type);

    const now = new Date().toISOString();
    const metadataJson = component.metadata
      ? JSON.stringify(component.metadata)
      : null;

    this._upsertStmt.run(
      component.id,
      component.type,
      component.version,
      now,
      component.profile ?? null,
      metadataJson
    );
  }

  /**
   * Untracks (removes) a component by ID. Returns true if a row was deleted.
   */
  untrack(id: string): boolean {
    validateComponentId(id);
    const result = this._deleteStmt.run(id);
    return result.changes > 0;
  }

  /**
   * Returns all installed components, optionally filtered by type.
   */
  getInstalled(type?: ComponentType): TrackedComponent[] {
    if (type != null) {
      validateComponentType(type);
      const rows = this._listByTypeStmt.all(type) as ComponentRow[];
      return rows.map(rowToComponent);
    }

    const rows = this._listAllStmt.all() as ComponentRow[];
    return rows.map(rowToComponent);
  }

  /**
   * Checks whether a component with the given ID is installed.
   */
  isInstalled(id: string): boolean {
    validateComponentId(id);
    const row = this._existsStmt.get(id) as { count: number };
    return row.count > 0;
  }

  /**
   * Returns all components installed under a specific profile.
   */
  getByProfile(profile: string): TrackedComponent[] {
    const rows = this._listByProfileStmt.all(profile) as ComponentRow[];
    return rows.map(rowToComponent);
  }
}

function validateComponentId(id: string): void {
  if (!isValidIdentifier(id)) {
    throw new ValidationError(
      `Invalid component ID: "${id}". Must be 1-128 alphanumeric chars, hyphens, or underscores.`
    );
  }
}

function validateComponentType(type: string): void {
  if (!VALID_TYPES.has(type)) {
    throw new ValidationError(
      `Invalid component type: "${type}". Must be one of: ${[...VALID_TYPES].join(', ')}`
    );
  }
}
