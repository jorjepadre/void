/**
 * AuditStore — SQLite-backed persistence for audits and findings.
 * Uses the audits and audit_findings tables created by memory/migrations.ts (v2).
 */

import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type {
  Audit,
  AuditFinding,
  AuditSummary,
  FindingSeverity,
  FindingStatus,
  NewFindingInput,
} from '../types/audit.js';

interface AuditRow {
  id: string;
  project_path: string;
  name: string;
  auditor: string | null;
  created_at: string;
  metadata: string | null;
}

interface FindingRow {
  id: string;
  audit_id: string;
  severity: string;
  category: string | null;
  title: string;
  description: string | null;
  file_path: string | null;
  line_number: number | null;
  rule: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

function rowToAudit(row: AuditRow): Audit {
  let metadata: Record<string, unknown> = {};
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata) as Record<string, unknown>;
    } catch {
      metadata = {};
    }
  }
  return {
    id: row.id,
    project_path: row.project_path,
    name: row.name,
    auditor: row.auditor,
    created_at: row.created_at,
    metadata,
  };
}

function rowToFinding(row: FindingRow): AuditFinding {
  return {
    id: row.id,
    audit_id: row.audit_id,
    severity: row.severity as FindingSeverity,
    category: row.category ?? '',
    title: row.title,
    description: row.description ?? '',
    file_path: row.file_path,
    line_number: row.line_number,
    rule: row.rule,
    status: row.status as FindingStatus,
    created_at: row.created_at,
    resolved_at: row.resolved_at,
  };
}

export class AuditStore {
  private readonly _createAudit: Database.Statement;
  private readonly _getAudit: Database.Statement;
  private readonly _listAudits: Database.Statement;
  private readonly _listAuditsByProject: Database.Statement;
  private readonly _latestByProject: Database.Statement;
  private readonly _deleteAudit: Database.Statement;
  private readonly _addFinding: Database.Statement;
  private readonly _getFinding: Database.Statement;
  private readonly _listFindings: Database.Statement;
  private readonly _listFindingsBySeverity: Database.Statement;
  private readonly _updateStatus: Database.Statement;
  private readonly _countBySeverity: Database.Statement;
  private readonly _countByStatus: Database.Statement;
  private readonly _countTotal: Database.Statement;

  constructor(private readonly _db: Database.Database) {
    this._createAudit = this._db.prepare(
      'INSERT INTO audits (id, project_path, name, auditor, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?)',
    );
    this._getAudit = this._db.prepare('SELECT * FROM audits WHERE id = ?');
    this._listAudits = this._db.prepare(
      'SELECT * FROM audits ORDER BY created_at DESC LIMIT ?',
    );
    this._listAuditsByProject = this._db.prepare(
      'SELECT * FROM audits WHERE project_path = ? ORDER BY created_at DESC LIMIT ?',
    );
    this._latestByProject = this._db.prepare(
      'SELECT * FROM audits WHERE project_path = ? ORDER BY created_at DESC LIMIT 1',
    );
    this._deleteAudit = this._db.prepare('DELETE FROM audits WHERE id = ?');

    this._addFinding = this._db.prepare(
      'INSERT INTO audit_findings (id, audit_id, severity, category, title, description, file_path, line_number, rule, status, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    this._getFinding = this._db.prepare('SELECT * FROM audit_findings WHERE id = ?');
    this._listFindings = this._db.prepare(
      'SELECT * FROM audit_findings WHERE audit_id = ? ORDER BY CASE severity WHEN \'critical\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 WHEN \'low\' THEN 3 ELSE 4 END, created_at ASC',
    );
    this._listFindingsBySeverity = this._db.prepare(
      'SELECT * FROM audit_findings WHERE audit_id = ? AND severity = ? ORDER BY created_at ASC',
    );
    this._updateStatus = this._db.prepare(
      'UPDATE audit_findings SET status = ?, resolved_at = ? WHERE id = ?',
    );

    this._countBySeverity = this._db.prepare(
      'SELECT severity, COUNT(*) as count FROM audit_findings WHERE audit_id = ? GROUP BY severity',
    );
    this._countByStatus = this._db.prepare(
      'SELECT status, COUNT(*) as count FROM audit_findings WHERE audit_id = ? GROUP BY status',
    );
    this._countTotal = this._db.prepare(
      'SELECT COUNT(*) as count FROM audit_findings WHERE audit_id = ?',
    );
  }

  createAudit(
    projectPath: string,
    name: string,
    auditor: string | null = null,
    metadata: Record<string, unknown> = {},
  ): Audit {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    this._createAudit.run(
      id,
      projectPath,
      name,
      auditor,
      createdAt,
      JSON.stringify(metadata),
    );
    return {
      id,
      project_path: projectPath,
      name,
      auditor,
      created_at: createdAt,
      metadata,
    };
  }

  getAudit(id: string): Audit | null {
    const row = this._getAudit.get(id) as AuditRow | undefined;
    return row ? rowToAudit(row) : null;
  }

  listAudits(limit = 50, projectPath?: string): Audit[] {
    const rows = projectPath
      ? (this._listAuditsByProject.all(projectPath, limit) as AuditRow[])
      : (this._listAudits.all(limit) as AuditRow[]);
    return rows.map(rowToAudit);
  }

  latestAudit(projectPath: string): Audit | null {
    const row = this._latestByProject.get(projectPath) as AuditRow | undefined;
    return row ? rowToAudit(row) : null;
  }

  deleteAudit(id: string): boolean {
    const result = this._deleteAudit.run(id);
    return result.changes > 0;
  }

  addFinding(auditId: string, input: NewFindingInput): AuditFinding {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const status = input.status ?? 'open';
    const finding: AuditFinding = {
      id,
      audit_id: auditId,
      severity: input.severity,
      category: input.category ?? '',
      title: input.title,
      description: input.description ?? '',
      file_path: input.file_path ?? null,
      line_number: input.line_number ?? null,
      rule: input.rule ?? null,
      status,
      created_at: createdAt,
      resolved_at: null,
    };
    this._addFinding.run(
      finding.id,
      finding.audit_id,
      finding.severity,
      finding.category,
      finding.title,
      finding.description,
      finding.file_path,
      finding.line_number,
      finding.rule,
      finding.status,
      finding.created_at,
      finding.resolved_at,
    );
    return finding;
  }

  getFinding(id: string): AuditFinding | null {
    const row = this._getFinding.get(id) as FindingRow | undefined;
    return row ? rowToFinding(row) : null;
  }

  listFindings(auditId: string, severity?: FindingSeverity): AuditFinding[] {
    const rows = severity
      ? (this._listFindingsBySeverity.all(auditId, severity) as FindingRow[])
      : (this._listFindings.all(auditId) as FindingRow[]);
    return rows.map(rowToFinding);
  }

  updateStatus(findingId: string, status: FindingStatus): boolean {
    const resolvedAt =
      status === 'fixed' || status === 'wontfix' || status === 'false-positive'
        ? new Date().toISOString()
        : null;
    const result = this._updateStatus.run(status, resolvedAt, findingId);
    return result.changes > 0;
  }

  getSummary(auditId: string): AuditSummary | null {
    const audit = this.getAudit(auditId);
    if (!audit) return null;

    const totalRow = this._countTotal.get(auditId) as { count: number };
    const severityRows = this._countBySeverity.all(auditId) as Array<{
      severity: string;
      count: number;
    }>;
    const statusRows = this._countByStatus.all(auditId) as Array<{
      status: string;
      count: number;
    }>;

    const by_severity: Record<FindingSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    for (const row of severityRows) {
      if (row.severity in by_severity) {
        by_severity[row.severity as FindingSeverity] = row.count;
      }
    }

    const by_status: Record<FindingStatus, number> = {
      open: 0,
      fixed: 0,
      accepted: 0,
      wontfix: 0,
      'false-positive': 0,
    };
    for (const row of statusRows) {
      if (row.status in by_status) {
        by_status[row.status as FindingStatus] = row.count;
      }
    }

    return {
      id: audit.id,
      name: audit.name,
      auditor: audit.auditor,
      created_at: audit.created_at,
      total_findings: totalRow.count,
      by_severity,
      by_status,
    };
  }
}
