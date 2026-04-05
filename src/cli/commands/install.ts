/**
 * void install — install manifest components into the workspace.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerInstall(program: Command): void {
  program
    .command('install')
    .description('Install components from a manifest profile')
    .option('--profile <name>', 'Install profile (minimal, developer, full)')
    .option('--with <components...>', 'Additional components to include')
    .option('--without <components...>', 'Components to exclude')
    .action(async (opts: { profile?: string; with?: string[]; without?: string[] }) => {
      try {
        const cwd = process.cwd();
        out.heading('Installing components');

        // Detect project for profile resolution
        const { detectProject } = await import('../../detect/index.js');
        const project = await detectProject(cwd);

        // Resolve profile components
        const { buildProfile } = await import('../../manifest/profiles.js');
        const profileName = opts.profile ?? 'developer';
        const spin = out.spinner(`Resolving ${profileName} profile...`);
        const components = buildProfile(
          profileName as import('../../types/manifest.js').ManifestProfileName,
          project,
        );
        spin.stop(`Resolved ${components.length} components from "${profileName}" profile`);

        // Apply --with additions
        if (opts.with && opts.with.length > 0) {
          out.info(`Adding: ${opts.with.join(', ')}`);
        }

        // Apply --without exclusions
        let filtered = components;
        if (opts.without && opts.without.length > 0) {
          const excludeSet = new Set(opts.without);
          filtered = components.filter((c: { id: string }) => !excludeSet.has(c.id));
          out.info(`Excluding: ${opts.without.join(', ')}`);
        }

        // Dependency resolution
        const { DependencyResolver } = await import('../../manifest/resolver.js');
        const resolver = new DependencyResolver();
        const spin2 = out.spinner('Resolving dependencies...');
        const ordered = resolver.resolve(filtered);
        spin2.stop(`Resolved install order for ${ordered.length} components`);

        // Install via adapter
        const { HarnessRegistry, detectHarness } = await import('../../harness/index.js');
        const registry = HarnessRegistry.createDefaultRegistry();
        const harnessName = await detectHarness(cwd, registry.getAdapterMap());
        const adapter = registry.get(harnessName);

        if (adapter) {
          const { ComponentInstaller } = await import('../../manifest/installer.js');
          const installer = new ComponentInstaller();
          const manifest: import('../../types/manifest.js').ManifestConfig = {
            version: '1.0.0',
            harness: harnessName,
            profile: profileName as import('../../types/manifest.js').ManifestProfileName,
            installed_at: new Date().toISOString(),
            components: ordered,
          };
          const spin3 = out.spinner('Installing components...');
          const result = await installer.install(cwd, manifest, adapter);
          spin3.stop('Installation complete');

          // Print summary
          if (result.installed.length > 0) {
            out.success(`Installed: ${result.installed.join(', ')}`);
          }
          if (result.skipped.length > 0) {
            out.warn(`Skipped: ${result.skipped.join(', ')}`);
          }
          if (result.failed.length > 0) {
            out.error(`Failed: ${result.failed.join(', ')}`);
          }
        } else {
          out.warn(`No adapter found for harness "${harnessName}", listing components only`);
          out.table(
            ['ID', 'Type', 'Version'],
            ordered.map((c) => [c.id, c.type, c.version]),
          );
        }
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
