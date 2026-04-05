/**
 * Audit types — persistent security/quality audit findings with status tracking.
 */

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type FindingStatus =
  | 'open'
  | 'fixed'
  | 'accepted'
  | 'wontfix'
  | 'false-positive';

export interface Audit {
  id: string;
  project_path: string;
  name: string;
  auditor: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface AuditFinding {
  id: string;
  audit_id: string;
  severity: FindingSeverity;
  category: string;
  title: string;
  description: string;
  file_path: string | null;
  line_number: number | null;
  rule: string | null;
  status: FindingStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface AuditSummary {
  id: string;
  name: string;
  auditor: string | null;
  created_at: string;
  total_findings: number;
  by_severity: Record<FindingSeverity, number>;
  by_status: Record<FindingStatus, number>;
}

export interface AuditDiff {
  baseline: Audit;
  current: Audit;
  new_findings: AuditFinding[];
  resolved: AuditFinding[];
  still_open: AuditFinding[];
}

/** Input shape for creating a new finding (id + audit_id + created_at generated). */
export interface NewFindingInput {
  severity: FindingSeverity;
  category?: string;
  title: string;
  description?: string;
  file_path?: string | null;
  line_number?: number | null;
  rule?: string | null;
  status?: FindingStatus;
}
