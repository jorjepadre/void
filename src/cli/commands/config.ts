/**
 * void config — view and manage configuration.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerConfig(program: Command): void {
  program
    .command('config')
    .description('View and manage Void configuration')
    .argument('<action>', 'Action: show, validate, or set')
    .argument('[key]', 'Config key (dot-notated path)')
    .argument('[value]', 'Value to set')
    .action(async (
      action: string,
      key: string | undefined,
      value: string | undefined,
    ) => {
      try {
        const cwd = process.cwd();
        const { loadConfig } = await import('../../config/loader.js');

        switch (action) {
          case 'show': {
            const config = await loadConfig(cwd);

            if (key) {
              // Drill into the config by dot path
              const parts = key.split('.');
              let current: unknown = config;
              for (const part of parts) {
                if (current !== null && typeof current === 'object') {
                  current = (current as Record<string, unknown>)[part];
                } else {
                  current = undefined;
                  break;
                }
              }
              if (current === undefined) {
                out.warn(`Config key not found: ${key}`);
              } else {
                out.json(current);
              }
            } else {
              out.heading('Void configuration');
              out.json(config);
            }
            break;
          }

          case 'validate': {
            out.heading('Validating configuration');
            const spin = out.spinner('Loading config...');

            try {
              const config = await loadConfig(cwd);
              spin.stop('Configuration loaded');
              out.success('Configuration is valid');
              out.info(`Version: ${config.version}`);
              out.info(`Workspace: ${config.workspace}`);
              out.info(`Swarm max agents: ${config.swarm.max_agents}`);
              out.info(`Memory backend: ${config.memory.backend}`);
              out.info(`MCP servers: ${config.mcp.servers.length}`);
              out.info(`Hook profile: ${config.hooks.profile}`);
            } catch (err: unknown) {
              spin.stop('Validation failed');
              out.error(err instanceof Error ? err.message : String(err));
              process.exitCode = 1;
            }
            break;
          }

          case 'set': {
            if (!key) {
              out.error('Config key is required for set');
              process.exitCode = 1;
              return;
            }
            if (value === undefined) {
              out.error('Value is required for set');
              process.exitCode = 1;
              return;
            }

            const { resolve } = await import('node:path');
            const { readFile, writeFile } = await import('node:fs/promises');
            const { existsSync } = await import('node:fs');
            const { parse: parseYaml, stringify: stringifyYaml } = await import('yaml');

            const yamlPath = resolve(cwd, 'void.config.yaml');
            const jsonPath = resolve(cwd, 'void.config.json');

            let configData: Record<string, unknown> = {};
            let configPath = yamlPath;
            let isYaml = true;

            if (existsSync(yamlPath)) {
              const raw = await readFile(yamlPath, 'utf-8');
              configData = (parseYaml(raw) as Record<string, unknown>) ?? {};
            } else if (existsSync(jsonPath)) {
              const raw = await readFile(jsonPath, 'utf-8');
              configData = JSON.parse(raw) as Record<string, unknown>;
              configPath = jsonPath;
              isYaml = false;
            }

            // Set the value at the dot path
            const parts = key.split('.');
            let target: Record<string, unknown> = configData;
            for (let i = 0; i < parts.length - 1; i++) {
              const part = parts[i]!;
              if (!(part in target) || typeof target[part] !== 'object') {
                target[part] = {};
              }
              target = target[part] as Record<string, unknown>;
            }

            const lastPart = parts[parts.length - 1]!;
            // Try to parse as number/boolean/json
            let parsedValue: unknown = value;
            if (value === 'true') parsedValue = true;
            else if (value === 'false') parsedValue = false;
            else if (/^\d+$/.test(value)) parsedValue = parseInt(value, 10);
            else {
              try {
                parsedValue = JSON.parse(value);
              } catch {
                parsedValue = value;
              }
            }

            target[lastPart] = parsedValue;

            if (isYaml) {
              await writeFile(configPath, stringifyYaml(configData), 'utf-8');
            } else {
              await writeFile(configPath, JSON.stringify(configData, null, 2), 'utf-8');
            }

            out.success(`Set ${key} = ${JSON.stringify(parsedValue)}`);
            out.info(`Written to ${configPath}`);
            break;
          }

          default:
            out.error(`Unknown action: ${action}. Use show, validate, or set.`);
            process.exitCode = 1;
        }
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
