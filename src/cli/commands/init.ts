/**
 * void init — initialize a Void workspace.
 */

import type { Command } from 'commander';
import { resolve } from 'node:path';
import * as out from '../output.js';

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Initialize a Void workspace in the current directory')
    .option('--harness <type>', 'Harness adapter to use (auto-detected if omitted)')
    .option('--profile <name>', 'Install profile (minimal, developer, full)')
    .action(async (opts: { harness?: string; profile?: string }) => {
      try {
        const cwd = process.cwd();
        out.heading('Initializing Void workspace');

        // 1. Detect or use specified harness
        const { HarnessRegistry, detectHarness } = await import('../../harness/index.js');
        const registry = HarnessRegistry.createDefaultRegistry();
        let harnessName = opts.harness;

        if (!harnessName) {
          const spin = out.spinner('Detecting harness...');
          harnessName = await detectHarness(cwd, registry.getAdapterMap());
          spin.stop(`Detected harness: ${harnessName}`);
        } else {
          out.info(`Using specified harness: ${harnessName}`);
        }

        // 2. Detect project
        const { detectProject } = await import('../../detect/index.js');
        const spin2 = out.spinner('Analyzing project...');
        const project = await detectProject(cwd);
        spin2.stop('Project analysis complete');

        out.info(`Languages: ${project.languages.join(', ') || 'none detected'}`);
        out.info(`Frameworks: ${project.frameworks.join(', ') || 'none detected'}`);
        out.info(`Package manager: ${project.packageManager}`);
        if (project.formatter) {
          out.info(`Formatter: ${project.formatter}`);
        }

        // 3. Initialize workspace (.void/ dir, config file)
        const { WorkspaceManager } = await import('../../core/workspace.js');
        const spin3 = out.spinner('Creating workspace...');
        const workspace = await WorkspaceManager.init(cwd);
        spin3.stop('Workspace created');

        // 4. Initialize harness adapter
        const adapter = registry.get(harnessName as import('../../types/harness.js').HarnessType);
        if (adapter) {
          const spin4 = out.spinner(`Initializing ${harnessName} adapter...`);
          await adapter.init(resolve(cwd));
          spin4.stop(`${harnessName} adapter initialized`);
        }

        // 5. Optionally run install with profile
        if (opts.profile) {
          out.info(`Profile install requested: ${opts.profile}`);
          out.info('Run "void install --profile ' + opts.profile + '" to install components');
        }

        // Summary
        out.heading('Workspace ready');
        out.success(`Root: ${workspace.root}`);
        out.success(`Harness: ${harnessName}`);
        out.success(`Config: ${resolve(cwd, 'void.config.yaml')}`);
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
