/**
 * void session — manage session recordings.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerSession(program: Command): void {
  program
    .command('session')
    .description('Manage session recordings')
    .argument('<action>', 'Action: list, show, replay, export, or alias')
    .argument('[id]', 'Session ID or alias')
    .option('--format <fmt>', 'Export format: json, csv, or text', 'json')
    .action(async (
      action: string,
      id: string | undefined,
      opts: { format: string },
    ) => {
      try {
        const { resolve } = await import('node:path');
        const cwd = process.cwd();
        const { default: Database } = await import('better-sqlite3');
        const { runMigrations } = await import('../../memory/migrations.js');

        const dbPath = resolve(cwd, '.void', 'memory', 'void.db');
        const db = new Database(dbPath);
        runMigrations(db);

        const { SessionStore } = await import('../../session/store.js');
        const store = new SessionStore(db);

        const { SessionAliases } = await import('../../session/aliases.js');
        const aliases = new SessionAliases();

        switch (action) {
          case 'list': {
            const sessions = store.listSessions({ limit: 20 });

            if (sessions.length === 0) {
              out.info('No sessions recorded');
            } else {
              out.heading('Recent sessions');
              out.table(
                ['ID', 'Harness', 'Status', 'Started'],
                sessions.map((s) => [
                  s.id.slice(0, 8) + '...',
                  s.harness,
                  s.status,
                  s.started_at,
                ]),
              );
            }
            break;
          }

          case 'show': {
            if (!id) {
              out.error('Session ID is required for show');
              process.exitCode = 1;
              break;
            }
            const sessionId = aliases.resolve(id, store);
            if (!sessionId) {
              out.error(`Session not found: ${id}`);
              process.exitCode = 1;
              break;
            }

            const session = store.getSession(sessionId);
            if (!session) {
              out.error(`Session not found: ${sessionId}`);
              process.exitCode = 1;
              break;
            }

            out.heading(`Session: ${sessionId}`);
            out.json(session);

            const events = store.getSessionEvents(sessionId);
            const { SessionReplay } = await import('../../session/replay.js');
            const replay = new SessionReplay();
            const summary = replay.getSummary(session, events);
            out.heading('Summary');
            out.table(
              ['Metric', 'Value'],
              [
                ['Duration', `${summary.duration}ms`],
                ['Events', String(events.length)],
                ['Errors', String(summary.errorCount)],
                ['Success rate', `${(summary.successRate * 100).toFixed(1)}%`],
              ],
            );
            break;
          }

          case 'replay': {
            if (!id) {
              out.error('Session ID is required for replay');
              process.exitCode = 1;
              break;
            }
            const sessionId = aliases.resolve(id, store);
            if (!sessionId) {
              out.error(`Session not found: ${id}`);
              process.exitCode = 1;
              break;
            }

            const events = store.getSessionEvents(sessionId);
            const { SessionReplay } = await import('../../session/replay.js');
            const replay = new SessionReplay();
            const text = replay.replay(events);
            console.log(text);
            break;
          }

          case 'export': {
            if (!id) {
              out.error('Session ID is required for export');
              process.exitCode = 1;
              break;
            }
            const sessionId = aliases.resolve(id, store);
            if (!sessionId) {
              out.error(`Session not found: ${id}`);
              process.exitCode = 1;
              break;
            }

            const session = store.getSession(sessionId);
            const events = store.getSessionEvents(sessionId);
            const { SessionReplay } = await import('../../session/replay.js');
            const replay = new SessionReplay();

            switch (opts.format) {
              case 'json': {
                const data = replay.exportJson(session!, events);
                console.log(data);
                break;
              }
              case 'csv': {
                const data = replay.exportCsv(events);
                console.log(data);
                break;
              }
              case 'text': {
                const data = replay.replay(events);
                console.log(data);
                break;
              }
              default:
                out.error(`Unknown format: ${opts.format}. Use json, csv, or text.`);
                process.exitCode = 1;
            }
            break;
          }

          case 'alias': {
            if (!id) {
              // List all aliases
              out.heading('Session aliases');
              out.info('Use "void session alias <name>=<session-id>" to create an alias');
              out.info('Built-in aliases: "latest", "active"');
            } else {
              // Need a second arg for the session ID — use a simple split
              const parts = id.split('=');
              if (parts.length === 2 && parts[0] && parts[1]) {
                aliases.set(parts[0], parts[1]);
                out.success(`Alias "${parts[0]}" -> ${parts[1]}`);
              } else {
                out.error('Usage: void session alias <name>=<session-id>');
                process.exitCode = 1;
              }
            }
            break;
          }

          default:
            out.error(`Unknown action: ${action}. Use list, show, replay, export, or alias.`);
            process.exitCode = 1;
        }

        db.close();
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
