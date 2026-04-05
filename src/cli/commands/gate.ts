/**
 * void gate — run quality and security gate checks.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerGate(program: Command): void {
  program
    .command('gate')
    .description('Run quality and security gate checks')
    .argument('<action>', 'Action: run, status, or configure')
    .argument('[check]', 'Specific gate check to run')
    .option('--file <path>', 'Target file for gate check')
    .option('--save-audit <name>', 'Persist gate results as a named audit')
    .action(async (
      action: string,
      check: string | undefined,
      opts: { file?: string; saveAudit?: string },
    ) => {
      try {
        const cwd = process.cwd();

        switch (action) {
          case 'run': {
            out.heading('Running gate checks');

            const { GateRunner } = await import('../../gates/runner.js');
            const { GateReporter } = await import('../../gates/reporter.js');
            const { secretsCheck } = await import('../../gates/checks/secrets.js');
            const { lintCheck } = await import('../../gates/checks/lint.js');
            const { consoleCheck } = await import('../../gates/checks/console.js');
            const { typesCheck } = await import('../../gates/checks/types.js');
            const { formatCheck } = await import('../../gates/checks/format.js');
            const { configProtectionCheck } = await import('../../gates/checks/config-protection.js');
            const { designQualityCheck } = await import('../../gates/checks/design-quality.js');

            const runner = new GateRunner();
            const reporter = new GateReporter();

            // Register all built-in checks
            runner.registerCheck('secrets', secretsCheck);
            runner.registerCheck('lint', lintCheck);
            runner.registerCheck('console', consoleCheck);
            runner.registerCheck('types', typesCheck);
            runner.registerCheck('format', formatCheck);
            runner.registerCheck('config-protection', configProtectionCheck);
            runner.registerCheck('design-quality', designQualityCheck);

            const context = {
              workspace: cwd,
              file_path: opts.file,
              content: '',
            };

            // Collect results for potential audit persistence
            const collectedResults: Array<{ checkId: string; result: import('../../types/gate.js').GateResult }> = [];

            if (check) {
              // Run specific check
              const spin = out.spinner(`Running gate: ${check}...`);
              try {
                const result = await runner.run(check, context);
                spin.stop(`Gate "${check}" complete`);
                console.log(reporter.format([result]));
                collectedResults.push({ checkId: check, result });
              } catch (err: unknown) {
                spin.stop(`Gate "${check}" failed`);
                out.error(err instanceof Error ? err.message : String(err));
                process.exitCode = 1;
              }
            } else {
              // Run all checks
              const spin = out.spinner('Running all gates...');
              const results = await runner.runAll(context);
              spin.stop('All gates complete');
              console.log(reporter.format(results));

              const failed = results.filter((r) => !r.passed);
              if (failed.length > 0) {
                out.error(`${failed.length} gate(s) failed`);
                process.exitCode = 1;
              } else {
                out.success('All gates passed');
              }

              // Collect with check IDs (matches registered order)
              const checkIds = ['secrets', 'lint', 'console', 'types', 'format', 'config-protection', 'design-quality'];
              results.forEach((result, idx) => {
                const checkId = checkIds[idx] ?? 'unknown';
                collectedResults.push({ checkId, result });
              });
            }

            // Persist as audit if requested
            if (opts.saveAudit) {
              const { resolve } = await import('node:path');
              const { mkdirSync } = await import('node:fs');
              const { default: Database } = await import('better-sqlite3');
              const { runMigrations } = await import('../../memory/migrations.js');
              const { AuditStore } = await import('../../audits/store.js');
              const { importFromGateResults } = await import('../../audits/importer.js');

              const dbDir = resolve(cwd, '.void', 'memory');
              mkdirSync(dbDir, { recursive: true });
              const dbPath = resolve(dbDir, 'void.db');
              const db = new Database(dbPath);
              runMigrations(db);

              const store = new AuditStore(db);
              const audit = store.createAudit(cwd, opts.saveAudit, 'gates', {
                check: check ?? 'all',
              });
              const count = importFromGateResults(store, audit.id, collectedResults);
              db.close();
              out.success(`Saved audit "${opts.saveAudit}" with ${count} finding(s)`);
              out.info(`Audit ID: ${audit.id}`);
            }
            break;
          }

          case 'status': {
            out.heading('Gate status');

            const { GateRunner } = await import('../../gates/runner.js');
            const runner = new GateRunner();
            // GateRunner tracks checks internally; run all to get status
            const results = await runner.runAll({
              workspace: cwd,
              content: '',
            });

            if (results.length === 0) {
              out.info('No gate checks registered');
            } else {
              out.info(`${results.length} gate check(s) registered`);
              const passed = results.filter((r: { passed: boolean }) => r.passed).length;
              out.info(`${passed} passing, ${results.length - passed} failing`);
            }
            break;
          }

          case 'configure': {
            if (!check) {
              out.error('Gate check ID is required for configure');
              process.exitCode = 1;
              return;
            }
            out.info(`Configuring gate: ${check}`);
            out.info('Gate configuration is managed via void.config.yaml');
            out.info('Edit the "gates" section to enable/disable specific checks');
            break;
          }

          default:
            out.error(`Unknown action: ${action}. Use run, status, or configure.`);
            process.exitCode = 1;
        }
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
