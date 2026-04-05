/**
 * void cmd — look up and execute a command by slash name.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerCommandRun(program: Command): void {
  program
    .command('cmd')
    .description('Execute a registered command by slash name')
    .argument('<command-name>', 'Command slash name (e.g., /tdd)')
    .argument('[args...]', 'Arguments to pass to the command')
    .action(async (commandName: string, args: string[]) => {
      try {
        const cwd = process.cwd();

        const { resolveCommandPaths, resolveAgentPaths } = await import('../../core/library.js');
        const cmdPaths = resolveCommandPaths(cwd);
        const { CommandRegistry } = await import('../../commands/registry.js');
        const registry = new CommandRegistry(cmdPaths);

        const spin = out.spinner('Loading commands...');
        await registry.load();
        spin.stop('Commands loaded');

        // Normalize slash prefix
        const slashName = commandName.startsWith('/')
          ? commandName
          : `/${commandName}`;

        const cmd = registry.getBySlashCommand(slashName);
        if (!cmd) {
          out.error(`Command not found: ${slashName}`);
          out.info('Use "void cmd --help" or check available commands with "void skill list"');
          process.exitCode = 1;
          return;
        }

        out.heading(`Command: ${cmd.name}`);
        out.info(`Slash: ${cmd.slash_command}`);
        out.info(`Description: ${cmd.description}`);

        // Resolve parameters from args
        const params: Record<string, string> = {};
        if (cmd.parameters) {
          for (let i = 0; i < cmd.parameters.length; i++) {
            const param = cmd.parameters[i];
            const arg = args[i];
            if (param && arg) {
              params[param.name] = arg;
            }
          }
        }

        if (Object.keys(params).length > 0) {
          out.info('Parameters:');
          for (const [k, v] of Object.entries(params)) {
            out.info(`  ${k}: ${v}`);
          }
        }

        // Execute or print plan
        out.heading('Execution plan');
        if (cmd.steps.length > 0) {
          out.table(
            ['Step', 'Agent', 'Action'],
            cmd.steps.map((step: { agent: string; action: string }, i: number) => [
              String(i + 1),
              step.agent,
              step.action,
            ]),
          );
        }

        const { CommandExecutor } = await import('../../commands/executor.js');
        const { AgentRegistry } = await import('../../agents/registry.js');
        const agentRegistry = new AgentRegistry(resolveAgentPaths(cwd));
        await agentRegistry.load();

        const executor = new CommandExecutor(agentRegistry);
        const result = await executor.execute(cmd, params);

        if (result.success) {
          out.success(`Command completed in ${result.duration}ms`);
        } else {
          out.error('Command execution failed');
          for (const step of result.steps) {
            if (!step.success) {
              out.error(`  Step ${step.stepIndex}: ${step.error ?? 'unknown error'}`);
            }
          }
          process.exitCode = 1;
        }
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
