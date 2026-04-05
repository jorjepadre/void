/**
 * void identity — manage user identity and team configuration.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerIdentity(program: Command): void {
  program
    .command('identity')
    .description('Manage user identity and team configuration')
    .argument('<action>', 'Action: show, set, or team')
    .argument('[key]', 'Identity field key')
    .argument('[value]', 'Value to set')
    .action(async (
      action: string,
      key: string | undefined,
      value: string | undefined,
    ) => {
      try {
        const cwd = process.cwd();

        switch (action) {
          case 'show': {
            const { UserIdentityManager } = await import('../../identity/user.js');
            const manager = new UserIdentityManager();
            const identity = await manager.load(cwd);

            out.heading('User identity');
            out.json(identity);
            break;
          }

          case 'set': {
            if (!key) {
              out.error('Field key is required for set');
              process.exitCode = 1;
              return;
            }
            if (value === undefined) {
              out.error('Value is required for set');
              process.exitCode = 1;
              return;
            }

            const { UserIdentityManager } = await import('../../identity/user.js');
            const manager = new UserIdentityManager();
            const identity = await manager.load(cwd);

            // Parse value
            let parsedValue: unknown = value;
            if (value === 'true') parsedValue = true;
            else if (value === 'false') parsedValue = false;
            else {
              try {
                parsedValue = JSON.parse(value);
              } catch {
                parsedValue = value;
              }
            }

            // Set the field
            const mutable = identity as unknown as Record<string, unknown>;
            mutable[key] = parsedValue;

            await manager.save(cwd, identity);
            out.success(`Set ${key} = ${JSON.stringify(parsedValue)}`);
            break;
          }

          case 'team': {
            const { TeamConfigManager } = await import('../../identity/team.js');
            const manager = new TeamConfigManager();
            const teamConfig = await manager.load(cwd);

            if (key && value !== undefined) {
              // Set team config value
              const mutable = teamConfig as unknown as Record<string, unknown>;
              let parsedValue: unknown = value;
              try {
                parsedValue = JSON.parse(value);
              } catch {
                parsedValue = value;
              }
              mutable[key] = parsedValue;
              await manager.save(cwd, teamConfig);
              out.success(`Team config: ${key} = ${JSON.stringify(parsedValue)}`);
            } else {
              // Show team config
              out.heading('Team configuration');
              out.json(teamConfig);
            }
            break;
          }

          default:
            out.error(`Unknown action: ${action}. Use show, set, or team.`);
            process.exitCode = 1;
        }
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
