/**
 * void run — submit a task to the swarm coordinator.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerRun(program: Command): void {
  program
    .command('run')
    .description('Submit a task to the swarm coordinator')
    .argument('<description>', 'Task description')
    .option('--skill <name>', 'Skill to use for execution')
    .option('--priority <n>', 'Task priority (0 = highest)', '5')
    .action(async (description: string, opts: { skill?: string; priority: string }) => {
      try {
        const priority = parseInt(opts.priority, 10);
        if (Number.isNaN(priority) || priority < 0) {
          out.error('Priority must be a non-negative integer');
          process.exitCode = 1;
          return;
        }

        out.heading('Submitting task');
        out.info(`Description: ${description}`);
        if (opts.skill) out.info(`Skill: ${opts.skill}`);
        out.info(`Priority: ${priority}`);

        const { TaskQueue } = await import('../../core/task-queue.js');
        const queue = new TaskQueue();

        const taskId = crypto.randomUUID();
        const now = new Date().toISOString();
        const task: import('../../types/task.js').Task = {
          id: taskId,
          description,
          skill: opts.skill ?? 'general',
          priority,
          input: {},
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        };

        queue.enqueue(task);

        const spin = out.spinner('Waiting for task execution...');

        // In a full implementation, the coordinator would pick this up.
        // For now, we report the task was submitted.
        spin.stop('Task submitted');

        out.success(`Task ID: ${taskId}`);
        out.info(`Status: queued (priority ${priority})`);
        out.info('Use "void swarm status" to check execution progress');
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
