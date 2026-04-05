/**
 * void skill — manage and inspect skills.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerSkill(program: Command): void {
  program
    .command('skill')
    .description('Manage and inspect skill definitions')
    .argument('<action>', 'Action: list, show, validate, search, or evolve')
    .argument('[name]', 'Skill name or ID')
    .option('--language <lang>', 'Filter by language')
    .option('--tags <tags>', 'Comma-separated tag filter')
    .action(async (
      action: string,
      name: string | undefined,
      opts: { language?: string; tags?: string },
    ) => {
      try {
        const cwd = process.cwd();
        const { loadConfig } = await import('../../config/loader.js');
        const config = await loadConfig(cwd);

        const { resolveSkillPaths } = await import('../../core/library.js');
        const skillPaths = resolveSkillPaths(cwd, config.skills.paths);
        const { SkillRegistry } = await import('../../skills/registry.js');
        const registry = new SkillRegistry(skillPaths);

        switch (action) {
          case 'list': {
            const spin = out.spinner('Loading skills...');
            await registry.load();
            spin.stop('Skills loaded');

            let skills = registry.getAll();

            if (opts.language) {
              skills = skills.filter((s) =>
                s.language === opts.language,
              );
            }
            if (opts.tags) {
              const filterTags = opts.tags.split(',').map((t) => t.trim());
              skills = skills.filter((s) =>
                filterTags.some((ft) => s.tags?.includes(ft) ?? false),
              );
            }

            if (skills.length === 0) {
              out.info('No skills found');
            } else {
              out.heading('Skills');
              out.table(
                ['ID', 'Name', 'Languages', 'Tags'],
                skills.map((s) => [
                  s.id,
                  s.name,
                  s.language ?? '',
                  (s.tags ?? []).join(', '),
                ]),
              );
            }
            break;
          }

          case 'show': {
            if (!name) {
              out.error('Skill name/ID is required for show');
              process.exitCode = 1;
              return;
            }
            await registry.load();
            const skill = registry.get(name);
            if (!skill) {
              out.error(`Skill not found: ${name}`);
              process.exitCode = 1;
              return;
            }
            out.heading(skill.name);
            out.json(skill);
            break;
          }

          case 'validate': {
            out.heading('Validating skills');
            const spin = out.spinner('Parsing skill files...');
            await registry.load();
            spin.stop('Validation complete');

            const skills = registry.getAll();
            out.success(`${skills.length} skills parsed successfully`);

            // Also attempt individual parsing to surface errors
            const { parseSkill } = await import('../../skills/parser.js');
            const fg = await import('fast-glob');
            const patterns = skillPaths.map((p) => p.replace(/\\/g, '/') + '/**/*.md');
            const files = await fg.default(patterns, { absolute: true, onlyFiles: true });
            let errors = 0;
            for (const file of files) {
              try {
                await parseSkill(file);
              } catch (err: unknown) {
                errors++;
                out.error(`${file}: ${err instanceof Error ? err.message : String(err)}`);
              }
            }
            if (errors === 0) {
              out.success('All skill files are valid');
            } else {
              out.warn(`${errors} file(s) had validation errors`);
            }
            break;
          }

          case 'search': {
            if (!name) {
              out.error('Search query is required');
              process.exitCode = 1;
              return;
            }
            await registry.load();
            const { SkillSearcher } = await import('../../skills/search.js');
            const searcher = new SkillSearcher();
            searcher.index(registry.getAll());
            const results = searcher.search(name);

            if (results.length === 0) {
              out.info('No matching skills found');
            } else {
              out.table(
                ['ID', 'Name', 'Tags'],
                results.map((s) => [s.id, s.name, (s.tags ?? []).join(', ')]),
              );
            }
            break;
          }

          case 'evolve': {
            if (!name) {
              out.error('Skill name/ID is required for evolve');
              process.exitCode = 1;
              return;
            }
            await registry.load();
            const skill = registry.get(name);
            if (!skill) {
              out.error(`Skill not found: ${name}`);
              process.exitCode = 1;
              return;
            }

            const { SkillEvolution } = await import('../../skills/evolution.js');
            const evolution = new SkillEvolution();
            evolution.register(skill.id, skill.version ?? '0.1.0');
            const health = evolution.getHealth(skill.id);

            out.heading(`Skill health: ${skill.name}`);
            out.table(
              ['Metric', 'Value'],
              [
                ['Version', health?.version ?? 'unknown'],
                ['Usage count', String(health?.usageCount ?? 0)],
                ['Last used', health?.lastUsed ?? 'never'],
              ],
            );
            break;
          }

          default:
            out.error(`Unknown action: ${action}. Use list, show, validate, search, or evolve.`);
            process.exitCode = 1;
        }
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
