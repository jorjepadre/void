/**
 * void plugin — manage plugins.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerPlugin(program: Command): void {
  program
    .command('plugin')
    .description('Manage Void plugins')
    .argument('<action>', 'Action: list, install, remove, or search')
    .argument('[id]', 'Plugin ID or path')
    .action(async (action: string, id: string | undefined) => {
      try {
        const { resolve } = await import('node:path');
        const cwd = process.cwd();

        switch (action) {
          case 'list': {
            const { PluginRegistry } = await import('../../plugins/registry.js');
            const registry = new PluginRegistry();

            // Attempt to load installed plugins
            const { PluginLoader } = await import('../../plugins/loader.js');
            const loader = new PluginLoader();

            const fg = await import('fast-glob');
            const pluginDirs = await fg.default(
              resolve(cwd, 'plugins').replace(/\\/g, '/') + '/*/plugin.yaml',
              { absolute: true, onlyFiles: true },
            );

            for (const manifestPath of pluginDirs) {
              try {
                const pluginDir = resolve(manifestPath, '..');
                const manifest = await loader.loadManifest(pluginDir);
                registry.register(manifest);
              } catch {
                // Skip invalid plugins
              }
            }

            const plugins = registry.getAll();
            if (plugins.length === 0) {
              out.info('No plugins installed');
              out.info('Use "void plugin install <path>" to install a plugin');
            } else {
              out.heading('Installed plugins');
              out.table(
                ['ID', 'Name', 'Version', 'State', 'Capabilities'],
                plugins.map((p) => [
                  p.manifest.id,
                  p.manifest.name,
                  p.manifest.version,
                  p.state,
                  (p.manifest.capabilities ?? []).join(', '),
                ]),
              );
            }
            break;
          }

          case 'install': {
            if (!id) {
              out.error('Plugin path or ID is required for install');
              process.exitCode = 1;
              return;
            }

            const pluginPath = resolve(cwd, id);
            const { PluginLoader } = await import('../../plugins/loader.js');
            const loader = new PluginLoader();

            const spin = out.spinner(`Installing plugin from ${pluginPath}...`);
            try {
              const manifest = await loader.loadManifest(pluginPath);
              spin.stop(`Plugin loaded: ${manifest.name}`);

              out.success(`Installed: ${manifest.name} v${manifest.version}`);
              out.info(`Capabilities: ${(manifest.capabilities ?? []).join(', ') || 'none'}`);
            } catch (err: unknown) {
              spin.stop('Installation failed');
              out.error(err instanceof Error ? err.message : String(err));
              process.exitCode = 1;
            }
            break;
          }

          case 'remove': {
            if (!id) {
              out.error('Plugin ID is required for remove');
              process.exitCode = 1;
              return;
            }

            const { PluginRegistry } = await import('../../plugins/registry.js');
            const registry = new PluginRegistry();

            const plugin = registry.get(id);
            if (!plugin) {
              out.warn(`Plugin not found in registry: ${id}`);
              out.info('It may have already been removed');
            } else {
              registry.unregister(id);
              out.success(`Removed plugin: ${id}`);
            }
            break;
          }

          case 'search': {
            const { PluginMarketplace } = await import('../../plugins/marketplace.js');
            const marketplace = new PluginMarketplace();

            const spin = out.spinner('Loading marketplace catalog...');
            await marketplace.load();
            spin.stop('Catalog loaded');

            const query = id ?? '';
            const results = marketplace.search(query);

            if (results.length === 0) {
              out.info('No plugins found in marketplace');
            } else {
              out.heading('Marketplace results');
              out.table(
                ['ID', 'Name', 'Version', 'Description'],
                results.map((p) => [p.id, p.name, p.version, p.description ?? '']),
              );
            }
            break;
          }

          default:
            out.error(`Unknown action: ${action}. Use list, install, remove, or search.`);
            process.exitCode = 1;
        }
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
