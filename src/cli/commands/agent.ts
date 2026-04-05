/**
 * void agent — manage agent definitions.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerAgent(program: Command): void {
  program
    .command('agent')
    .description('Manage agent definitions')
    .argument('<action>', 'Action: list, show, or create')
    .argument('[name]', 'Agent name or ID')
    .option('--language <lang>', 'Filter by language (list) or target language (create)')
    .action(async (
      action: string,
      name: string | undefined,
      opts: { language?: string },
    ) => {
      try {
        const cwd = process.cwd();

        const { resolve } = await import('node:path');
        const { resolveAgentPaths } = await import('../../core/library.js');
        const agentPaths = resolveAgentPaths(cwd);
        const { AgentRegistry } = await import('../../agents/registry.js');
        const registry = new AgentRegistry(agentPaths);

        switch (action) {
          case 'list': {
            const spin = out.spinner('Loading agents...');
            await registry.load();
            spin.stop('Agents loaded');

            let agents = registry.getAll();

            if (opts.language) {
              agents = agents.filter((a) =>
                a.language === opts.language,
              );
            }

            if (agents.length === 0) {
              out.info('No agents found');
            } else {
              out.heading('Agents');
              out.table(
                ['ID', 'Name', 'Skill', 'Languages'],
                agents.map((a) => [
                  a.id,
                  a.name,
                  a.capabilities?.[0] ?? '',
                  a.language ?? '',
                ]),
              );
            }
            break;
          }

          case 'show': {
            if (!name) {
              out.error('Agent name/ID is required for show');
              process.exitCode = 1;
              return;
            }
            await registry.load();
            const agent = registry.get(name);
            if (!agent) {
              out.error(`Agent not found: ${name}`);
              process.exitCode = 1;
              return;
            }
            out.heading(agent.name);
            out.json(agent);
            break;
          }

          case 'create': {
            if (!name) {
              out.error('Agent name is required for create');
              process.exitCode = 1;
              return;
            }

            const { writeFile, mkdir } = await import('node:fs/promises');
            const { stringify } = await import('yaml');

            const agentDir = resolve(cwd, 'agents');
            await mkdir(agentDir, { recursive: true });

            const definition = {
              id: name,
              name,
              description: `Agent: ${name}`,
              skill: 'general',
              languages: opts.language ? [opts.language] : [],
              system_prompt: `You are the ${name} agent.`,
              max_tokens: 4096,
            };

            const filePath = resolve(agentDir, `${name}.yaml`);
            await writeFile(filePath, stringify(definition), 'utf-8');

            out.success(`Created agent definition: ${filePath}`);
            out.json(definition);
            break;
          }

          default:
            out.error(`Unknown action: ${action}. Use list, show, or create.`);
            process.exitCode = 1;
        }
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
