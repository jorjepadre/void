/**
 * void hook — manage lifecycle hooks.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerHook(program: Command): void {
  program
    .command('hook')
    .description('Manage lifecycle hooks')
    .argument('<action>', 'Action: list, test, profile, or run')
    .argument('[id]', 'Hook ID')
    .option('--event <type>', 'Event type filter')
    .action(async (
      action: string,
      id: string | undefined,
      opts: { event?: string },
    ) => {
      try {
        const cwd = process.cwd();
        const { loadConfig } = await import('../../config/loader.js');
        const config = await loadConfig(cwd);

        // Load hooks from library and workspace
        const { resolveHookPaths } = await import('../../core/library.js');
        const { HookRegistry } = await import('../../hooks/registry.js');
        const hookRegistry = new HookRegistry();
        const hookDirs = resolveHookPaths(cwd);
        for (const dir of hookDirs) {
          try {
            await hookRegistry.loadFromDirectory(dir);
          } catch {
            // directory may not exist, skip
          }
        }
        const hooks = [...hookRegistry.getAll(), ...config.hooks.hooks];

        switch (action) {
          case 'list': {
            out.heading('Hooks');

            let filtered = hooks;
            if (opts.event) {
              filtered = hooks.filter((h) => h.event === opts.event);
            }

            if (filtered.length === 0) {
              out.info('No hooks configured');
            } else {
              out.table(
                ['ID', 'Event', 'Priority', 'Profiles', 'Enabled'],
                filtered.map((h) => [
                  h.id,
                  h.event,
                  String(h.priority),
                  h.profiles.join(', '),
                  h.enabled ? 'yes' : 'no',
                ]),
              );
            }
            break;
          }

          case 'test': {
            if (!id) {
              out.error('Hook ID is required for test');
              process.exitCode = 1;
              return;
            }

            const hook = hooks.find((h) => h.id === id);
            if (!hook) {
              out.error(`Hook not found: ${id}`);
              process.exitCode = 1;
              return;
            }

            out.heading(`Dry-run: ${hook.id}`);
            out.info(`Event: ${hook.event}`);
            out.info(`Command: ${hook.command}`);
            out.info(`Priority: ${hook.priority}`);
            out.info(`Profiles: ${hook.profiles.join(', ')}`);

            // Simulate a dry run
            out.info('');
            out.info('Sample input: { "tool_name": "Write", "file_path": "test.ts" }');
            out.info(`Would execute: ${hook.command}`);
            out.success('Dry run complete — hook would fire for matching events');
            break;
          }

          case 'profile': {
            const { HookProfileManager } = await import('../../hooks/profiles.js');
            const profileManager = new HookProfileManager(hooks);

            if (id) {
              // Set profile
              const valid = ['minimal', 'standard', 'strict'];
              if (!valid.includes(id)) {
                out.error(`Invalid profile: ${id}. Valid: ${valid.join(', ')}`);
                process.exitCode = 1;
                return;
              }
              profileManager.setActiveProfile(id as 'minimal' | 'standard' | 'strict');
              out.success(`Active profile set to: ${id}`);
            } else {
              // Get profile
              const active = profileManager.getActiveProfile();
              out.info(`Active hook profile: ${active}`);

              const profileHooks = profileManager.getHooksForProfile();
              out.info(`Hooks in active profile: ${profileHooks.length}`);
            }
            break;
          }

          case 'run': {
            if (!id) {
              out.error('Hook ID is required for run');
              process.exitCode = 1;
              return;
            }

            const hook = hooks.find((h) => h.id === id);
            if (!hook) {
              out.error(`Hook not found: ${id}`);
              process.exitCode = 1;
              return;
            }

            out.heading(`Executing hook: ${hook.id}`);
            out.info(`Command: ${hook.command}`);

            const { HookProfileManager } = await import('../../hooks/profiles.js');
            const { HookFlags } = await import('../../hooks/flags.js');
            const { VoidEventBus } = await import('../../hooks/events.js');

            const profileManager = new HookProfileManager(hooks);
            const flags = new HookFlags();
            const eventBus = new VoidEventBus();

            const { HookEngine } = await import('../../hooks/engine.js');
            const engine = new HookEngine(profileManager, flags, eventBus);

            const result = await engine.execute(hook.event, {
              session_id: 'cli',
              hook_event_name: hook.event,
              tool_name: 'cli',
              cwd,
            });

            out.info(`Decision: ${result.decision}`);
            if (result.reason) out.info(`Reason: ${result.reason}`);
            out.success('Hook execution complete');
            break;
          }

          default:
            out.error(`Unknown action: ${action}. Use list, test, profile, or run.`);
            process.exitCode = 1;
        }
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
