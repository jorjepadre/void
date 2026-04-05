/**
 * void memory — interact with the memory store.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerMemory(program: Command): void {
  program
    .command('memory')
    .description('Manage the key-value memory store')
    .argument('<action>', 'Action: get, set, search, list, or clear')
    .argument('[key]', 'Memory key')
    .argument('[value]', 'Value to store (for set)')
    .option('--namespace <ns>', 'Namespace', 'default')
    .option('--tags <tags>', 'Comma-separated tags')
    .action(async (
      action: string,
      key: string | undefined,
      value: string | undefined,
      opts: { namespace: string; tags?: string },
    ) => {
      try {
        const cwd = process.cwd();
        const { resolve } = await import('node:path');
        const { default: Database } = await import('better-sqlite3');
        const { MemoryStore } = await import('../../memory/store.js');
        const { MemorySearch } = await import('../../memory/search.js');
        const { runMigrations } = await import('../../memory/migrations.js');

        const dbPath = resolve(cwd, '.void', 'memory', 'void.db');
        const db = new Database(dbPath);
        runMigrations(db);

        const store = new MemoryStore(db);
        const search = new MemorySearch(db);

        switch (action) {
          case 'get': {
            if (!key) {
              out.error('Key is required for get');
              process.exitCode = 1;
              return;
            }
            const entry = store.get(key, opts.namespace);
            if (!entry) {
              out.warn(`No entry found for key "${key}" in namespace "${opts.namespace}"`);
            } else {
              out.heading(`Memory: ${key}`);
              out.json(entry);
            }
            break;
          }

          case 'set': {
            if (!key) {
              out.error('Key is required for set');
              process.exitCode = 1;
              return;
            }
            if (value === undefined) {
              out.error('Value is required for set');
              process.exitCode = 1;
              return;
            }
            let parsed: unknown;
            try {
              parsed = JSON.parse(value);
            } catch {
              parsed = value;
            }
            const tags = opts.tags ? opts.tags.split(',').map((t) => t.trim()) : [];
            store.set(key, JSON.stringify(parsed), { namespace: opts.namespace, tags });
            out.success(`Stored "${key}" in namespace "${opts.namespace}"`);
            break;
          }

          case 'search': {
            if (!key) {
              out.error('Search query is required');
              process.exitCode = 1;
              return;
            }
            const results = search.search({
              search: key,
              namespace: opts.namespace !== 'default' ? opts.namespace : undefined,
              limit: 20,
            });
            if (results.length === 0) {
              out.info('No results found');
            } else {
              out.table(
                ['Key', 'Namespace', 'Tags', 'Updated'],
                results.map((r) => [
                  r.key,
                  r.namespace,
                  (r.tags ?? []).join(', '),
                  r.updatedAt ?? '',
                ]),
              );
            }
            break;
          }

          case 'list': {
            const entries = store.list(opts.namespace);
            if (entries.length === 0) {
              out.info(`No entries in namespace "${opts.namespace}"`);
            } else {
              out.heading(`Entries in "${opts.namespace}"`);
              out.table(
                ['Key', 'Tags', 'Updated'],
                entries.map((e) => [
                  e.key,
                  (e.tags ?? []).join(', '),
                  e.updatedAt ?? '',
                ]),
              );
            }
            break;
          }

          case 'clear': {
            out.warn(`This will clear all entries in namespace "${opts.namespace}"`);
            store.clear(opts.namespace);
            out.success(`Cleared namespace "${opts.namespace}"`);
            break;
          }

          default:
            out.error(`Unknown action: ${action}. Use get, set, search, list, or clear.`);
            process.exitCode = 1;
        }

        db.close();
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
