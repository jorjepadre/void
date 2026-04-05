/**
 * void instinct — manage behavioral instincts.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerInstinct(program: Command): void {
  program
    .command('instinct')
    .description('Manage behavioral instincts')
    .argument('<action>', 'Action: list, show, import, export, or apply')
    .argument('[id]', 'Instinct ID')
    .option('--file <path>', 'YAML file path for import/export')
    .option('--domain <tag>', 'Filter by domain tag')
    .action(async (
      action: string,
      id: string | undefined,
      opts: { file?: string; domain?: string },
    ) => {
      try {
        const { resolve } = await import('node:path');
        const cwd = process.cwd();
        const { default: Database } = await import('better-sqlite3');
        const { runMigrations } = await import('../../memory/migrations.js');

        const dbPath = resolve(cwd, '.void', 'memory', 'void.db');
        const db = new Database(dbPath);
        runMigrations(db);

        const { InstinctStore } = await import('../../instincts/store.js');
        const store = new InstinctStore(db);

        switch (action) {
          case 'list': {
            const instincts = store.getAll();
            let filtered = instincts;

            if (opts.domain) {
              filtered = instincts.filter((i) =>
                i.domain_tags.includes(opts.domain!),
              );
            }

            if (filtered.length === 0) {
              out.info('No instincts found');
            } else {
              out.heading('Instincts');
              out.table(
                ['ID', 'Name', 'Confidence', 'Domain', 'Usage'],
                filtered.map((i) => [
                  i.id,
                  i.name,
                  i.confidence.toFixed(2),
                  i.domain_tags.join(', '),
                  String(i.usage_count),
                ]),
              );
            }
            break;
          }

          case 'show': {
            if (!id) {
              out.error('Instinct ID is required for show');
              process.exitCode = 1;
              break;
            }
            const instinct = store.get(id);
            if (!instinct) {
              out.error(`Instinct not found: ${id}`);
              process.exitCode = 1;
              break;
            }
            out.heading(instinct.name);
            out.json(instinct);
            break;
          }

          case 'import': {
            if (!opts.file) {
              out.error('--file is required for import');
              process.exitCode = 1;
              break;
            }

            const { InstinctPorter } = await import('../../instincts/porter.js');
            const porter = new InstinctPorter();

            const filePath = resolve(cwd, opts.file);
            const spin = out.spinner(`Importing from ${filePath}...`);
            const imported = await porter.importInstincts(filePath);
            spin.stop(`Imported ${imported.length} instinct(s)`);

            for (const instinct of imported) {
              store.save(instinct);
            }

            out.success(`Stored ${imported.length} instinct(s) in database`);
            break;
          }

          case 'export': {
            if (!opts.file) {
              out.error('--file is required for export');
              process.exitCode = 1;
              break;
            }

            const instincts = id ? [store.get(id)].filter(Boolean) : store.getAll();
            if (instincts.length === 0) {
              out.warn('No instincts to export');
              break;
            }

            const { InstinctPorter } = await import('../../instincts/porter.js');
            const porter = new InstinctPorter();

            const filePath = resolve(cwd, opts.file);
            const spin = out.spinner(`Exporting to ${filePath}...`);
            await porter.exportInstincts(instincts as import('../../types/instinct.js').Instinct[], filePath);
            spin.stop(`Exported ${instincts.length} instinct(s)`);

            out.success(`Written to ${filePath}`);
            break;
          }

          case 'apply': {
            if (!id) {
              out.error('Instinct ID is required for apply');
              process.exitCode = 1;
              break;
            }
            const instinct = store.get(id);
            if (!instinct) {
              out.error(`Instinct not found: ${id}`);
              process.exitCode = 1;
              break;
            }

            out.heading(`Applying instinct: ${instinct.name}`);
            out.info(`Trigger: ${instinct.trigger.type} — ${instinct.trigger.condition}`);
            out.info(`Action: ${instinct.action}`);
            out.info(`Confidence: ${instinct.confidence.toFixed(2)}`);

            // Record application
            store.recordUsage(id);
            out.success('Instinct applied and usage recorded');
            break;
          }

          default:
            out.error(`Unknown action: ${action}. Use list, show, import, export, or apply.`);
            process.exitCode = 1;
        }

        db.close();
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
