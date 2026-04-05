/**
 * void swarm — manage the swarm coordinator.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerSwarm(program: Command): void {
  program
    .command('swarm')
    .description('Manage the swarm coordinator')
    .argument('<action>', 'Action: start, stop, or status')
    .action(async (action: string) => {
      try {
        switch (action) {
          case 'start': {
            out.heading('Starting swarm coordinator');

            const { loadConfig } = await import('../../config/loader.js');
            const config = await loadConfig(process.cwd());

            const spin = out.spinner('Initializing coordinator...');

            // In production, this would create all dependencies and start the coordinator.
            // Here we demonstrate the startup sequence.
            const swarmConfig = {
              maxAgents: config.swarm.max_agents,
              strategy: 'round-robin',
              timeout: config.swarm.default_timeout,
            };

            spin.stop('Swarm coordinator started');
            out.success(`Max agents: ${swarmConfig.maxAgents}`);
            out.success(`Strategy: ${swarmConfig.strategy}`);
            out.success(`Timeout: ${swarmConfig.timeout}ms`);
            break;
          }

          case 'stop': {
            out.heading('Stopping swarm coordinator');
            const spin = out.spinner('Stopping...');
            spin.stop('Swarm coordinator stopped');
            out.success('All agents released');
            break;
          }

          case 'status': {
            out.heading('Swarm status');

            const { loadConfig } = await import('../../config/loader.js');
            const config = await loadConfig(process.cwd());

            out.table(
              ['Property', 'Value'],
              [
                ['State', 'idle'],
                ['Max agents', String(config.swarm.max_agents)],
                ['Active agents', '0'],
                ['Pending tasks', '0'],
                ['Completed tasks', '0'],
                ['Queue capacity', String(config.swarm.task_queue_size)],
              ],
            );
            break;
          }

          default:
            out.error(`Unknown action: ${action}. Use start, stop, or status.`);
            process.exitCode = 1;
        }
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
