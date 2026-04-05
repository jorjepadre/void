/**
 * void audit — manage persistent audit findings.
 */

import type { Command } from 'commander';
import * as out from '../output.js';
import type { FindingSeverity, FindingStatus } from '../../types/audit.js';

interface AuditOptions {
  auditor?: string;
  metadata?: string;
  limit?: string;
  project?: string;
  severity?: string;
  format?: string;
  output?: string;
  title?: string;
  file?: string;
  line?: string;
  category?: string;
  description?: string;
  rule?: string;
  name?: string;
}

async function openStore(cwd: string): Promise<{
  store: import('../../audits/store.js').AuditStore;
  manager: import('../../audits/manager.js').AuditManager;
  db: import('better-sqlite3').Database;
}> {
  const { resolve } = await import('node:path');
  const { mkdirSync } = await import('node:fs');
  const { default: Database } = await import('better-sqlite3');
  const { runMigrations } = await import('../../memory/migrations.js');
  const { AuditStore } = await import('../../audits/store.js');
  const { AuditManager } = await import('../../audits/manager.js');

  const dbDir = resolve(cwd, '.void', 'memory');
  mkdirSync(dbDir, { recursive: true });
  const dbPath = resolve(dbDir, 'void.db');
  const db = new Database(dbPath);
  runMigrations(db);

  const store = new AuditStore(db);
  const manager = new AuditManager(store);
  return { store, manager, db };
}

export function registerAudit(program: Command): void {
  program
    .command('audit')
    .description('Manage persistent audit findings')
    .argument(
      '<action>',
      'Action: create, list, show, latest, compare, summary, add-finding, status, export, import, delete',
    )
    .argument('[id]', 'Audit ID or finding ID (depending on action)')
    .argument('[id2]', 'Second argument (e.g., current audit ID for compare, status value for status)')
    .option('--auditor <name>', 'Auditor name')
    .option('--metadata <json>', 'Metadata JSON string')
    .option('--limit <n>', 'Max results to return', '50')
    .option('--project <path>', 'Filter by project path')
    .option('--severity <sev>', 'Filter findings by severity')
    .option('--format <fmt>', 'Export format: markdown or json', 'markdown')
    .option('--output <path>', 'Output file path')
    .option('--title <text>', 'Finding title')
    .option('--file <path>', 'Finding file path')
    .option('--line <n>', 'Finding line number')
    .option('--category <cat>', 'Finding category')
    .option('--description <text>', 'Finding description')
    .option('--rule <rule>', 'Finding rule')
    .option('--name <name>', 'Audit name (for import)')
    .action(
      async (
        action: string,
        id: string | undefined,
        id2: string | undefined,
        opts: AuditOptions,
      ) => {
        try {
          const cwd = process.cwd();
          const { store, manager, db } = await openStore(cwd);

          try {
            switch (action) {
              case 'create': {
                if (!id) {
                  out.error('Audit name is required: void audit create <name>');
                  process.exitCode = 1;
                  return;
                }
                let metadata: Record<string, unknown> = {};
                if (opts.metadata) {
                  try {
                    metadata = JSON.parse(opts.metadata) as Record<string, unknown>;
                  } catch {
                    out.error('Invalid --metadata JSON');
                    process.exitCode = 1;
                    return;
                  }
                }
                const audit = manager.createAudit(
                  cwd,
                  id,
                  opts.auditor ?? null,
                  metadata,
                );
                out.success(`Created audit "${audit.name}"`);
                out.info(`Audit ID: ${audit.id}`);
                break;
              }

              case 'list': {
                const limit = parseInt(opts.limit ?? '50', 10);
                const projectPath = opts.project ?? cwd;
                const audits = store.listAudits(limit, projectPath);
                if (audits.length === 0) {
                  out.info('No audits found for this project');
                  break;
                }
                out.heading(`Audits for ${projectPath}`);
                out.table(
                  ['ID', 'Name', 'Auditor', 'Created'],
                  audits.map((a) => [
                    a.id.substring(0, 8),
                    a.name,
                    a.auditor ?? '-',
                    a.created_at,
                  ]),
                );
                break;
              }

              case 'show': {
                if (!id) {
                  out.error('Audit ID is required');
                  process.exitCode = 1;
                  return;
                }
                const audit = store.getAudit(id);
                if (!audit) {
                  out.error(`Audit not found: ${id}`);
                  process.exitCode = 1;
                  return;
                }
                const severity = opts.severity as FindingSeverity | undefined;
                const findings = store.listFindings(id, severity);
                out.heading(`Audit: ${audit.name}`);
                out.info(`Auditor: ${audit.auditor ?? 'unknown'}`);
                out.info(`Created: ${audit.created_at}`);
                out.info(`Findings: ${findings.length}`);
                if (findings.length === 0) {
                  out.info('No findings');
                  break;
                }
                out.table(
                  ['ID', 'Severity', 'Status', 'Title', 'Location'],
                  findings.map((f) => [
                    f.id.substring(0, 8),
                    f.severity,
                    f.status,
                    f.title.length > 50 ? f.title.substring(0, 47) + '...' : f.title,
                    f.file_path
                      ? `${f.file_path}${f.line_number ? ':' + f.line_number : ''}`
                      : '-',
                  ]),
                );
                break;
              }

              case 'latest': {
                const audit = manager.getLatestAudit(cwd);
                if (!audit) {
                  out.info('No audits found for this project');
                  break;
                }
                const summary = manager.getSummary(audit.id);
                out.heading(`Latest audit: ${audit.name}`);
                out.info(`ID: ${audit.id}`);
                out.info(`Auditor: ${audit.auditor ?? 'unknown'}`);
                out.info(`Created: ${audit.created_at}`);
                if (summary) {
                  out.info(`Total findings: ${summary.total_findings}`);
                  const sevs = summary.by_severity;
                  if (summary.total_findings > 0) {
                    out.info(
                      `Severity: critical=${sevs.critical}, high=${sevs.high}, medium=${sevs.medium}, low=${sevs.low}, info=${sevs.info}`,
                    );
                  }
                }
                break;
              }

              case 'compare': {
                if (!id || !id2) {
                  out.error(
                    'Both audit IDs required: void audit compare <baseline-id> <current-id>',
                  );
                  process.exitCode = 1;
                  return;
                }
                const diff = manager.compare(id, id2);
                if (!diff) {
                  out.error('One or both audit IDs not found');
                  process.exitCode = 1;
                  return;
                }
                out.heading(`Audit comparison: ${diff.baseline.name} → ${diff.current.name}`);
                out.info(`New findings: ${diff.new_findings.length}`);
                out.info(`Resolved: ${diff.resolved.length}`);
                out.info(`Still open: ${diff.still_open.length}`);
                if (diff.new_findings.length > 0) {
                  out.heading('New findings');
                  out.table(
                    ['Severity', 'Title', 'Location'],
                    diff.new_findings.map((f) => [
                      f.severity,
                      f.title.length > 60 ? f.title.substring(0, 57) + '...' : f.title,
                      f.file_path
                        ? `${f.file_path}${f.line_number ? ':' + f.line_number : ''}`
                        : '-',
                    ]),
                  );
                }
                if (diff.resolved.length > 0) {
                  out.heading('Resolved');
                  out.table(
                    ['Severity', 'Title'],
                    diff.resolved.map((f) => [
                      f.severity,
                      f.title.length > 60 ? f.title.substring(0, 57) + '...' : f.title,
                    ]),
                  );
                }
                break;
              }

              case 'summary': {
                if (!id) {
                  out.error('Audit ID is required');
                  process.exitCode = 1;
                  return;
                }
                const summary = manager.getSummary(id);
                if (!summary) {
                  out.error(`Audit not found: ${id}`);
                  process.exitCode = 1;
                  return;
                }
                out.heading(`Summary: ${summary.name}`);
                out.info(`Total findings: ${summary.total_findings}`);
                out.heading('By severity');
                out.table(
                  ['Severity', 'Count'],
                  Object.entries(summary.by_severity).map(([s, c]) => [s, String(c)]),
                );
                out.heading('By status');
                out.table(
                  ['Status', 'Count'],
                  Object.entries(summary.by_status).map(([s, c]) => [s, String(c)]),
                );
                break;
              }

              case 'add-finding': {
                if (!id) {
                  out.error('Audit ID is required');
                  process.exitCode = 1;
                  return;
                }
                if (!opts.title) {
                  out.error('--title is required');
                  process.exitCode = 1;
                  return;
                }
                const severity = (opts.severity ?? 'medium') as FindingSeverity;
                const validSevs: FindingSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
                if (!validSevs.includes(severity)) {
                  out.error(`Invalid severity. Must be one of: ${validSevs.join(', ')}`);
                  process.exitCode = 1;
                  return;
                }
                const lineNum = opts.line ? parseInt(opts.line, 10) : null;
                const finding = store.addFinding(id, {
                  severity,
                  title: opts.title,
                  category: opts.category ?? '',
                  description: opts.description ?? '',
                  file_path: opts.file ?? null,
                  line_number: lineNum,
                  rule: opts.rule ?? null,
                });
                out.success(`Added finding`);
                out.info(`Finding ID: ${finding.id}`);
                break;
              }

              case 'status': {
                if (!id || !id2) {
                  out.error('Usage: void audit status <finding-id> <status>');
                  process.exitCode = 1;
                  return;
                }
                const validStatuses: FindingStatus[] = [
                  'open',
                  'fixed',
                  'accepted',
                  'wontfix',
                  'false-positive',
                ];
                if (!validStatuses.includes(id2 as FindingStatus)) {
                  out.error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
                  process.exitCode = 1;
                  return;
                }
                const updated = store.updateStatus(id, id2 as FindingStatus);
                if (!updated) {
                  out.error(`Finding not found: ${id}`);
                  process.exitCode = 1;
                  return;
                }
                out.success(`Updated finding status to "${id2}"`);
                break;
              }

              case 'export': {
                if (!id) {
                  out.error('Audit ID is required');
                  process.exitCode = 1;
                  return;
                }
                const audit = store.getAudit(id);
                if (!audit) {
                  out.error(`Audit not found: ${id}`);
                  process.exitCode = 1;
                  return;
                }
                const findings = store.listFindings(id);
                const format = (opts.format ?? 'markdown') as 'markdown' | 'json';
                if (format !== 'markdown' && format !== 'json') {
                  out.error('Format must be "markdown" or "json"');
                  process.exitCode = 1;
                  return;
                }
                const { exportMarkdown, exportJson, writeToFile } = await import(
                  '../../audits/exporter.js'
                );
                if (opts.output) {
                  await writeToFile(audit, findings, opts.output, format);
                  out.success(`Exported to ${opts.output}`);
                } else {
                  const content =
                    format === 'json'
                      ? exportJson(audit, findings)
                      : exportMarkdown(audit, findings);
                  console.log(content);
                }
                break;
              }

              case 'import': {
                if (!id) {
                  out.error('File path is required: void audit import <path>');
                  process.exitCode = 1;
                  return;
                }
                const auditName = opts.name ?? `imported-${new Date().toISOString()}`;
                const audit = manager.createAudit(
                  cwd,
                  auditName,
                  opts.auditor ?? 'import',
                );
                const { importFromJsonFile } = await import('../../audits/importer.js');
                const count = await importFromJsonFile(store, audit.id, id);
                out.success(`Imported ${count} findings into audit "${auditName}"`);
                out.info(`Audit ID: ${audit.id}`);
                break;
              }

              case 'delete': {
                if (!id) {
                  out.error('Audit ID is required');
                  process.exitCode = 1;
                  return;
                }
                const deleted = store.deleteAudit(id);
                if (!deleted) {
                  out.error(`Audit not found: ${id}`);
                  process.exitCode = 1;
                  return;
                }
                out.success(`Deleted audit ${id}`);
                break;
              }

              default:
                out.error(`Unknown action: ${action}`);
                out.info(
                  'Valid actions: create, list, show, latest, compare, summary, add-finding, status, export, import, delete',
                );
                process.exitCode = 1;
            }
          } finally {
            db.close();
          }
        } catch (err: unknown) {
          out.error(err instanceof Error ? err.message : String(err));
          process.exitCode = 1;
        }
      },
    );
}
