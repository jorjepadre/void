/**
 * Claude Code harness adapter.
 */

import { join } from 'node:path';
import type { HarnessType } from '../../types/harness.js';
import type { ResolvedRuleSet } from '../../types/rule.js';
import type { HookDefinition } from '../../types/hook.js';
import type { CommandDefinition } from '../../types/command.js';
import { RuleRenderer } from '../../rules/renderer.js';
import { BaseHarnessAdapter } from '../adapter.js';
import { claudeCodeTemplate } from '../templates/claude-code.js';

export class ClaudeCodeAdapter extends BaseHarnessAdapter {
  readonly type: HarnessType = 'claude-code';
  readonly displayName = 'Claude Code';

  private readonly renderer = new RuleRenderer();

  async detect(workspacePath: string): Promise<boolean> {
    return (
      this.dirExists(join(workspacePath, '.claude')) ||
      this.fileExists(join(workspacePath, 'CLAUDE.md'))
    );
  }

  async init(workspacePath: string, options?: Record<string, unknown>): Promise<void> {
    await super.init(workspacePath, options);
    const claudeDir = join(workspacePath, '.claude');
    await this.ensureDir(join(claudeDir, 'commands'));

    const settingsPath = join(claudeDir, 'settings.json');
    if (!this.fileExists(settingsPath)) {
      await this.writeJson(settingsPath, claudeCodeTemplate());
    }

    const claudeMd = join(workspacePath, 'CLAUDE.md');
    if (!this.fileExists(claudeMd)) {
      await this.writeFile(claudeMd, '# Project Rules\n\nAdd project-specific rules here.\n');
    }
  }

  async installRules(workspacePath: string, rules: ResolvedRuleSet): Promise<void> {
    const content = this.renderer.renderForHarness(rules, 'claude-code');
    await this.writeFile(join(workspacePath, 'CLAUDE.md'), content);
  }

  async installHooks(workspacePath: string, hooks: HookDefinition[]): Promise<void> {
    const settingsPath = this.getConfigPath(workspacePath);
    const settings = (await this.readJson<Record<string, unknown>>(settingsPath)) ?? {};

    const hooksConfig: Record<string, unknown[]> = {};

    for (const hook of hooks) {
      if (!hook.enabled) continue;

      const entry: Record<string, unknown> = {
        command: hook.command,
        timeout_ms: hook.timeout_ms,
      };

      if (hook.matcher) {
        if (hook.matcher.tool_name) entry['matcher'] = { tool_name: hook.matcher.tool_name };
        if (hook.matcher.file_path) entry['matcher'] = { ...entry['matcher'] as object, file_path: hook.matcher.file_path };
      }

      const key = hook.event;
      if (!hooksConfig[key]) hooksConfig[key] = [];
      hooksConfig[key].push(entry);
    }

    settings['hooks'] = hooksConfig;
    await this.writeJson(settingsPath, settings);
  }

  async installCommands(workspacePath: string, commands: CommandDefinition[]): Promise<void> {
    const commandsDir = join(workspacePath, '.claude', 'commands');
    await this.ensureDir(commandsDir);

    for (const cmd of commands) {
      const filename = `${cmd.slash_command.replace(/^\//, '')}.md`;
      const lines: string[] = [
        `# ${cmd.name}`,
        '',
        cmd.description,
        '',
      ];

      if (cmd.parameters.length > 0) {
        lines.push('## Parameters');
        lines.push('');
        for (const param of cmd.parameters) {
          const req = param.required ? '(required)' : '(optional)';
          lines.push(`- **${param.name}** ${req}: ${param.description}`);
        }
        lines.push('');
      }

      if (cmd.steps.length > 0) {
        lines.push('## Steps');
        lines.push('');
        for (const [i, step] of cmd.steps.entries()) {
          lines.push(`${i + 1}. Agent \`${step.agent}\` — ${step.action}`);
        }
        lines.push('');
      }

      await this.writeFile(join(commandsDir, filename), lines.join('\n'));
    }
  }

  getConfigPath(workspacePath: string): string {
    return join(workspacePath, '.claude', 'settings.json');
  }

  getRulePaths(workspacePath: string): string[] {
    return [
      join(workspacePath, 'CLAUDE.md'),
      join(workspacePath, '.claude', 'rules'),
    ];
  }
}
