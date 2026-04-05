/**
 * Gemini harness adapter.
 */

import { join } from 'node:path';
import type { HarnessType } from '../../types/harness.js';
import type { ResolvedRuleSet } from '../../types/rule.js';
import type { HookDefinition } from '../../types/hook.js';
import type { CommandDefinition } from '../../types/command.js';
import { RuleRenderer } from '../../rules/renderer.js';
import { BaseHarnessAdapter } from '../adapter.js';
import { geminiTemplate } from '../templates/gemini.js';

export class GeminiAdapter extends BaseHarnessAdapter {
  readonly type: HarnessType = 'gemini';
  readonly displayName = 'Gemini';

  private readonly renderer = new RuleRenderer();

  async detect(workspacePath: string): Promise<boolean> {
    return this.dirExists(join(workspacePath, '.gemini'));
  }

  async init(workspacePath: string, options?: Record<string, unknown>): Promise<void> {
    await super.init(workspacePath, options);
    const geminiDir = join(workspacePath, '.gemini');
    await this.ensureDir(geminiDir);
    await this.ensureDir(join(geminiDir, 'commands'));

    const guidePath = join(geminiDir, 'guide.md');
    if (!this.fileExists(guidePath)) {
      await this.writeFile(guidePath, geminiTemplate());
    }
  }

  async installRules(workspacePath: string, rules: ResolvedRuleSet): Promise<void> {
    const content = this.renderer.renderForHarness(rules, 'gemini');
    await this.writeFile(join(workspacePath, '.gemini', 'guide.md'), content);
  }

  async installHooks(workspacePath: string, hooks: HookDefinition[]): Promise<void> {
    // Gemini doesn't natively support hooks — generate shell scripts
    const hooksDir = join(workspacePath, '.gemini', 'hooks');
    await this.ensureDir(hooksDir);

    for (const hook of hooks) {
      if (!hook.enabled) continue;

      const scriptName = `${hook.id}.sh`;
      const lines = [
        '#!/usr/bin/env bash',
        `# Void hook: ${hook.description}`,
        `# Event: ${hook.event}`,
        `# Priority: ${hook.priority}`,
        `# Timeout: ${hook.timeout_ms}ms`,
        '',
        'set -euo pipefail',
        '',
      ];

      if (hook.matcher?.tool_name) {
        lines.push(`# Matcher: tool_name="${hook.matcher.tool_name}"`);
        lines.push('');
      }

      lines.push(hook.command);
      lines.push('');

      await this.writeFile(join(hooksDir, scriptName), lines.join('\n'));
    }
  }

  async installCommands(workspacePath: string, commands: CommandDefinition[]): Promise<void> {
    const commandsDir = join(workspacePath, '.gemini', 'commands');
    await this.ensureDir(commandsDir);

    for (const cmd of commands) {
      const filename = `${cmd.id}.md`;
      const lines = [
        `# ${cmd.name}`,
        '',
        cmd.description,
        '',
      ];

      for (const [i, step] of cmd.steps.entries()) {
        lines.push(`${i + 1}. Agent \`${step.agent}\` — ${step.action}`);
      }
      lines.push('');

      await this.writeFile(join(commandsDir, filename), lines.join('\n'));
    }
  }

  getConfigPath(workspacePath: string): string {
    return join(workspacePath, '.gemini', 'guide.md');
  }

  getRulePaths(workspacePath: string): string[] {
    return [join(workspacePath, '.gemini', 'guide.md')];
  }
}
