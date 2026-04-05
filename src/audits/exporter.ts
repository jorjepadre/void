/**
 * AuditExporter — export audits to markdown or JSON.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type {
  Audit,
  AuditFinding,
  FindingSeverity,
  FindingStatus,
} from '../types/audit.js';

const SEVERITY_EMOJI: Record<FindingSeverity, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🔵',
  info: '⚪',
};

const STATUS_EMOJI: Record<FindingStatus, string> = {
  open: '⏳',
  fixed: '✅',
  accepted: '📝',
  wontfix: '🚫',
  'false-positive': '❌',
};

export function exportMarkdown(audit: Audit, findings: AuditFinding[]): string {
  const lines: string[] = [];
  lines.push(`# Audit: ${audit.name}`);
  lines.push('');
  lines.push(`**Project:** ${audit.project_path}`);
  lines.push(`**Auditor:** ${audit.auditor ?? 'unknown'}`);
  lines.push(`**Date:** ${audit.created_at}`);
  lines.push(`**Total findings:** ${findings.length}`);
  lines.push('');

  // Summary by severity
  const bySeverity = new Map<FindingSeverity, number>();
  for (const f of findings) {
    bySeverity.set(f.severity, (bySeverity.get(f.severity) ?? 0) + 1);
  }
  lines.push('## Summary');
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('|----------|-------|');
  for (const sev of ['critical', 'high', 'medium', 'low', 'info'] as FindingSeverity[]) {
    const count = bySeverity.get(sev) ?? 0;
    if (count > 0) {
      lines.push(`| ${SEVERITY_EMOJI[sev]} ${sev} | ${count} |`);
    }
  }
  lines.push('');

  // Group by severity
  lines.push('## Findings');
  lines.push('');
  for (const sev of ['critical', 'high', 'medium', 'low', 'info'] as FindingSeverity[]) {
    const items = findings.filter((f) => f.severity === sev);
    if (items.length === 0) continue;

    lines.push(`### ${SEVERITY_EMOJI[sev]} ${sev.charAt(0).toUpperCase() + sev.slice(1)} (${items.length})`);
    lines.push('');
    for (const f of items) {
      lines.push(`#### ${STATUS_EMOJI[f.status]} ${f.title}`);
      lines.push('');
      if (f.category) lines.push(`**Category:** ${f.category}`);
      if (f.file_path) {
        const location = f.line_number ? `${f.file_path}:${f.line_number}` : f.file_path;
        lines.push(`**Location:** \`${location}\``);
      }
      if (f.rule) lines.push(`**Rule:** ${f.rule}`);
      lines.push(`**Status:** ${f.status}`);
      if (f.resolved_at) lines.push(`**Resolved:** ${f.resolved_at}`);
      if (f.description) {
        lines.push('');
        lines.push(f.description);
      }
      lines.push('');
      lines.push(`*Finding ID: \`${f.id}\`*`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function exportJson(audit: Audit, findings: AuditFinding[]): string {
  return JSON.stringify({ audit, findings }, null, 2);
}

export async function writeToFile(
  audit: Audit,
  findings: AuditFinding[],
  filePath: string,
  format: 'markdown' | 'json' = 'markdown',
): Promise<void> {
  const content =
    format === 'json'
      ? exportJson(audit, findings)
      : exportMarkdown(audit, findings);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf-8');
}
