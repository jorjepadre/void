/**
 * void worker — manage background workers.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerWorker(program: Command): void {
  program
    .command('worker')
    .description('Manage background workers')
    .argument('<action>', 'Action: list, start, stop, or status')
    .argument('[id]', 'Worker ID')
    .action(async (action: string, id: string | undefined) => {
      try {
        const { WorkerManager } = await import('../../workers/manager.js');
        const manager = new WorkerManager();

        switch (action) {
          case 'list': {
            out.heading('Workers');
            const statuses = manager.getStatus();

            if (statuses.length === 0) {
              out.info('No workers registered');
              out.info('Workers are registered during swarm startup');
            } else {
              out.table(
                ['ID', 'Name', 'Status', 'Runs', 'Last Run'],
                statuses.map((w) => [
                  w.id,
                  w.name,
                  w.running ? 'running' : 'stopped',
                  String(w.runCount),
                  w.lastRun ? new Date(w.lastRun).toISOString() : 'never',
                ]),
              );
            }
            break;
          }

          case 'start': {
            if (!id) {
              out.error('Worker ID is required for start');
              process.exitCode = 1;
              return;
            }
            try {
              manager.start(id);
              out.success(`Worker started: ${id}`);
            } catch (err: unknown) {
              out.error(err instanceof Error ? err.message : String(err));
              process.exitCode = 1;
            }
            break;
          }

          case 'stop': {
            if (!id) {
              out.error('Worker ID is required for stop');
              process.exitCode = 1;
              return;
            }
            try {
              manager.stop(id);
              out.success(`Worker stopped: ${id}`);
            } catch (err: unknown) {
              out.error(err instanceof Error ? err.message : String(err));
              process.exitCode = 1;
            }
            break;
          }

          case 'status': {
            if (!id) {
              // Show summary
              const statuses = manager.getStatus();
              const running = statuses.filter((w) => w.running).length;
              out.info(`Total workers: ${statuses.length}`);
              out.info(`Running: ${running}`);
              out.info(`Stopped: ${statuses.length - running}`);
            } else {
              const worker = manager.getWorker(id);
              if (!worker) {
                out.error(`Worker not found: ${id}`);
                process.exitCode = 1;
                return;
              }
              out.heading(`Worker: ${worker.name}`);
              out.table(
                ['Property', 'Value'],
                [
                  ['ID', worker.id],
                  ['Name', worker.name],
                  ['Status', worker.isRunning() ? 'running' : 'stopped'],
                  ['Run count', String(worker.getRunCount())],
                  ['Last run', worker.getLastRun() ? new Date(worker.getLastRun()!).toISOString() : 'never'],
                ],
              );
            }
            break;
          }

          default:
            out.error(`Unknown action: ${action}. Use list, start, stop, or status.`);
            process.exitCode = 1;
        }
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
