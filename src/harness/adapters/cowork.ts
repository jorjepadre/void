/**
 * Cowork harness adapter.
 */

import { join } from 'node:path';
import type { HarnessType } from '../../types/harness.js';
import type { ResolvedRuleSet } from '../../types/rule.js';
import type { HookDefinition } from '../../types/hook.js';
import type { CommandDefinition } from '../../types/command.js';
import { RuleRenderer } from '../../rules/renderer.js';
import { BaseHarnessAdapter } from '../adapter.js';
import { coworkTemplate } from '../templates/cowork.js';

export class CoworkAdapter extends BaseHarnessAdapter {
  readonly type: HarnessType = 'cowork';
  readonly displayName = 'Cowork';

  private readonly renderer = new RuleRenderer();

  async detect(workspacePath: string): Promise<boolean> {
    return (
      this.fileExists(join(workspacePath, 'cowork.config.yaml')) ||
      this.dirExists(join(workspacePath, '.cowork'))
    );
  }

  async init(workspacePath: string, options?: Record<string, unknown>): Promise<void> {
    await super.init(workspacePath, options);
    await this.ensureDir(join(workspacePath, '.cowork', 'commands'));

    const configPath = join(workspacePath, 'cowork.config.yaml');
    if (!this.fileExists(configPath)) {
      await this.writeFile(configPath, coworkTemplate());
    }
  }

  async installRules(workspacePath: string, rules: ResolvedRuleSet): Promise<void> {
    const content = this.renderer.renderForHarness(rules, 'cowork');
    await this.writeFile(join(workspacePath, 'COWORK.md'), content);
  }

  async installHooks(workspacePath: string, hooks: HookDefinition[]): Promise<void> {
    const configPath = this.getConfigPath(workspacePath);
    const lines: string[] = ['hooks:'];

    for (const hook of hooks) {
      if (!hook.enabled) continue;
      lines.push(`  - id: "${hook.id}"`);
      lines.push(`    event: ${hook.event}`);
      lines.push(`    command: "${hook.command}"`);
      lines.push(`    timeout_ms: ${hook.timeout_ms}`);
      lines.push(`    priority: ${hook.priority}`);
      if (hook.matcher?.tool_name) {
        lines.push(`    matcher:`);
        lines.push(`      tool_name: "${hook.matcher.tool_name}"`);
      }
      lines.push('');
    }

    const existing = await this.readFileContent(configPath);
    const withoutHooks = existing.replace(/^hooks:[\s\S]*$/m, '').trimEnd();
    await this.writeFile(configPath, withoutHooks + '\n\n' + lines.join('\n') + '\n');
  }

  async installCommands(workspacePath: string, commands: CommandDefinition[]): Promise<void> {
    const commandsDir = join(workspacePath, '.cowork', 'commands');
    await this.ensureDir(commandsDir);

    for (const cmd of commands) {
      const filename = `${cmd.id}.md`;
      const lines = [
        `# ${cmd.name}`,
        '',
        cmd.description,
        '',
        `Slash command: \`${cmd.slash_command}\``,
        '',
      ];

      if (cmd.parameters.length > 0) {
        lines.push('## Parameters');
        lines.push('');
        for (const param of cmd.parameters) {
          lines.push(`- **${param.name}**: ${param.description}`);
        }
        lines.push('');
      }

      for (const [i, step] of cmd.steps.entries()) {
        lines.push(`${i + 1}. Agent \`${step.agent}\` — ${step.action}`);
      }
      lines.push('');

      await this.writeFile(join(commandsDir, filename), lines.join('\n'));
    }
  }

  getConfigPath(workspacePath: string): string {
    return join(workspacePath, 'cowork.config.yaml');
  }

  getRulePaths(workspacePath: string): string[] {
    return [join(workspacePath, 'COWORK.md')];
  }

  private async readFileContent(filePath: string): Promise<string> {
    try {
      const { readFile } = await import('node:fs/promises');
      return await readFile(filePath, 'utf-8');
    } catch {
      return '';
    }
  }
}
