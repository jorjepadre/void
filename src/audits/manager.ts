/**
 * AuditManager — high-level audit operations combining store + diff + export.
 */

import type { AuditStore } from './store.js';
import type {
  Audit,
  AuditFinding,
  AuditSummary,
  NewFindingInput,
} from '../types/audit.js';
import { diffAudits } from './diff.js';
import type { AuditDiff } from '../types/audit.js';

export class AuditManager {
  constructor(private readonly _store: AuditStore) {}

  createAudit(
    projectPath: string,
    name: string,
    auditor: string | null = null,
    metadata: Record<string, unknown> = {},
  ): Audit {
    return this._store.createAudit(projectPath, name, auditor, metadata);
  }

  addFindings(auditId: string, findings: NewFindingInput[]): AuditFinding[] {
    const results: AuditFinding[] = [];
    for (const f of findings) {
      results.push(this._store.addFinding(auditId, f));
    }
    return results;
  }

  getSummary(auditId: string): AuditSummary | null {
    return this._store.getSummary(auditId);
  }

  getLatestAudit(projectPath: string): Audit | null {
    return this._store.latestAudit(projectPath);
  }

  compare(baselineId: string, currentId: string): AuditDiff | null {
    const baseline = this._store.getAudit(baselineId);
    const current = this._store.getAudit(currentId);
    if (!baseline || !current) return null;

    const baselineFindings = this._store.listFindings(baselineId);
    const currentFindings = this._store.listFindings(currentId);

    return diffAudits(baseline, baselineFindings, current, currentFindings);
  }
}
