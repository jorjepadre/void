/**
 * void uninstall — remove components from the workspace.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerUninstall(program: Command): void {
  program
    .command('uninstall')
    .description('Remove installed components')
    .argument('<components...>', 'Component IDs to remove')
    .action(async (components: string[]) => {
      try {
        out.heading('Uninstalling components');

        const cwd = process.cwd();
        const { HarnessRegistry, detectHarness } = await import('../../harness/index.js');
        const registry = HarnessRegistry.createDefaultRegistry();
        const harnessName = await detectHarness(cwd, registry.getAdapterMap());
        const adapter = registry.get(harnessName);

        const removed: string[] = [];
        const notFound: string[] = [];

        for (const id of components) {
          try {
            if (adapter) {
              await adapter.uninstall(cwd, [id]);
            }
            removed.push(id);
          } catch {
            notFound.push(id);
          }
        }

        if (removed.length > 0) {
          out.success(`Removed: ${removed.join(', ')}`);
        }
        if (notFound.length > 0) {
          out.warn(`Not found or failed: ${notFound.join(', ')}`);
        }
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
