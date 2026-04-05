/**
 * void rule — manage and inspect rules.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerRule(program: Command): void {
  program
    .command('rule')
    .description('Manage rule definitions and layers')
    .argument('<action>', 'Action: list, show, or layers')
    .argument('[id]', 'Rule ID')
    .option('--language <lang>', 'Filter by language')
    .action(async (
      action: string,
      id: string | undefined,
      opts: { language?: string },
    ) => {
      try {
        const cwd = process.cwd();

        const { resolveRulePaths } = await import('../../core/library.js');
        const rulesDirs = resolveRulePaths(cwd);
        const fg = await import('fast-glob');
        const { loadRule } = await import('../../rules/loader.js');

        const patterns: string[] = [];
        for (const dir of rulesDirs) {
          patterns.push(dir.replace(/\\/g, '/') + '/**/*.yaml');
          patterns.push(dir.replace(/\\/g, '/') + '/**/*.yml');
        }
        const allFiles = await fg.default(patterns, { absolute: true, onlyFiles: true });
        // Skip catalog/index files — they're not rules
        const files = allFiles.filter((f: string) => !f.endsWith('_index.yaml') && !f.endsWith('_index.yml'));

        const rules = [];
        const errors: Array<{ file: string; error: string }> = [];
        for (const file of files) {
          try {
            const rule = await loadRule(file);
            rules.push(rule);
          } catch (err: unknown) {
            errors.push({ file, error: err instanceof Error ? err.message : String(err) });
          }
        }

        switch (action) {
          case 'list': {
            out.heading('Rules');

            if (errors.length > 0) {
              out.warn(`${errors.length} rule file(s) had errors`);
            }

            let filtered = rules;
            if (opts.language) {
              filtered = rules.filter((r) =>
                r.layer === 'language' && r.id.toLowerCase().includes(opts.language!.toLowerCase()),
              );
            }

            if (filtered.length === 0) {
              out.info('No rules found');
            } else {
              out.table(
                ['ID', 'Layer', 'Specificity', 'Sections'],
                filtered.map((r) => [
                  r.id,
                  r.layer,
                  String(r.specificity),
                  String(Object.keys(r.sections).length),
                ]),
              );
            }
            break;
          }

          case 'show': {
            if (!id) {
              out.error('Rule ID is required for show');
              process.exitCode = 1;
              return;
            }
            const rule = rules.find((r) => r.id === id);
            if (!rule) {
              out.error(`Rule not found: ${id}`);
              process.exitCode = 1;
              return;
            }
            out.heading(`Rule: ${rule.id}`);
            out.json(rule);
            break;
          }

          case 'layers': {
            out.heading('Resolved layer stack');

            const { detectProject } = await import('../../detect/index.js');
            const project = await detectProject(cwd);

            const { LayerManager } = await import('../../rules/layers.js');
            const layerManager = new LayerManager();
            for (const rule of rules) {
              layerManager.addLayer(rule);
            }

            const applicable = layerManager.getApplicable(
              project.languages,
              project.frameworks,
            );

            if (applicable.length === 0) {
              out.info('No applicable layers for current project');
            } else {
              out.table(
                ['Order', 'ID', 'Layer', 'Specificity'],
                applicable.map((r, i) => [
                  String(i + 1),
                  r.id,
                  r.layer,
                  String(r.specificity),
                ]),
              );

              // Show resolved result
              const { RuleEngine } = await import('../../rules/engine.js');
              const engine = new RuleEngine();
              const resolved = engine.resolve(applicable);
              out.info(`Resolved ${resolved.sections.size} section(s) from ${resolved.layers.length} layer(s)`);
            }
            break;
          }

          default:
            out.error(`Unknown action: ${action}. Use list, show, or layers.`);
            process.exitCode = 1;
        }
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
