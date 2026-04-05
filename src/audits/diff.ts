/**
 * Audit diff — compares two audits and identifies new, resolved, and still-open findings.
 */

import type { Audit, AuditFinding, AuditDiff } from '../types/audit.js';

/**
 * Build a normalized key for matching findings across audits.
 * Two findings are considered "the same" if they share title + file + line + rule.
 */
function findingKey(f: AuditFinding): string {
  return [
    f.title.trim().toLowerCase(),
    f.file_path ?? '',
    f.line_number ?? '',
    f.rule ?? '',
  ].join('|');
}

/**
 * Diff two audits. Returns findings that are new, resolved, or still open.
 *
 * - new_findings: in current but not in baseline
 * - resolved: in baseline but not in current (assumed fixed)
 * - still_open: present in both audits
 */
export function diffAudits(
  baseline: Audit,
  baselineFindings: AuditFinding[],
  current: Audit,
  currentFindings: AuditFinding[],
): AuditDiff {
  const baselineKeys = new Map<string, AuditFinding>();
  for (const f of baselineFindings) {
    baselineKeys.set(findingKey(f), f);
  }

  const currentKeys = new Map<string, AuditFinding>();
  for (const f of currentFindings) {
    currentKeys.set(findingKey(f), f);
  }

  const new_findings: AuditFinding[] = [];
  const still_open: AuditFinding[] = [];
  for (const [key, finding] of currentKeys) {
    if (baselineKeys.has(key)) {
      still_open.push(finding);
    } else {
      new_findings.push(finding);
    }
  }

  const resolved: AuditFinding[] = [];
  for (const [key, finding] of baselineKeys) {
    if (!currentKeys.has(key)) {
      resolved.push(finding);
    }
  }

  return {
    baseline,
    current,
    new_findings,
    resolved,
    still_open,
  };
}
