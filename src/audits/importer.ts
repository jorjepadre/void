/**
 * AuditImporter — import audit findings from external sources.
 */

import { readFile } from 'node:fs/promises';
import type { AuditStore } from './store.js';
import type { NewFindingInput } from '../types/audit.js';
import type { GateResult } from '../types/gate.js';
import { ImportAuditSchema } from '../config/schemas.js';

/**
 * Map GateViolation severity to FindingSeverity.
 * error -> high, warning -> medium, info -> low.
 */
function mapGateSeverity(
  violationSeverity: 'error' | 'warning' | 'info',
): 'high' | 'medium' | 'low' {
  switch (violationSeverity) {
    case 'error':
      return 'high';
    case 'warning':
      return 'medium';
    case 'info':
      return 'low';
  }
}

/**
 * Convert gate results into findings and add them to an audit.
 * Returns the number of findings added.
 */
export function importFromGateResults(
  store: AuditStore,
  auditId: string,
  gateResults: Array<{ checkId: string; result: GateResult }>,
): number {
  let count = 0;
  for (const { checkId, result } of gateResults) {
    for (const violation of result.violations) {
      const input: NewFindingInput = {
        severity: mapGateSeverity(violation.severity),
        category: checkId,
        title: violation.message,
        description: '',
        file_path: violation.file ?? null,
        line_number: violation.line ?? null,
        rule: violation.rule,
      };
      store.addFinding(auditId, input);
      count++;
    }
  }
  return count;
}

/**
 * Import findings from a JSON file into an audit.
 * File format matches ImportAuditSchema.
 */
export async function importFromJsonFile(
  store: AuditStore,
  auditId: string,
  filePath: string,
): Promise<number> {
  const raw = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  const validated = ImportAuditSchema.parse(parsed);

  let count = 0;
  for (const f of validated.findings) {
    store.addFinding(auditId, {
      severity: f.severity,
      category: f.category,
      title: f.title,
      description: f.description,
      file_path: f.file_path,
      line_number: f.line_number,
      rule: f.rule,
      status: f.status,
    });
    count++;
  }
  return count;
}
