/**
 * Cursor harness adapter.
 */

import { join } from 'node:path';
import type { HarnessType } from '../../types/harness.js';
import type { ResolvedRuleSet } from '../../types/rule.js';
import type { HookDefinition } from '../../types/hook.js';
import type { CommandDefinition } from '../../types/command.js';
import { RuleRenderer } from '../../rules/renderer.js';
import { BaseHarnessAdapter } from '../adapter.js';
import { cursorTemplate } from '../templates/cursor.js';

export class CursorAdapter extends BaseHarnessAdapter {
  readonly type: HarnessType = 'cursor';
  readonly displayName = 'Cursor';

  private readonly renderer = new RuleRenderer();

  async detect(workspacePath: string): Promise<boolean> {
    return (
      this.dirExists(join(workspacePath, '.cursor')) ||
      this.fileExists(join(workspacePath, '.cursorrules'))
    );
  }

  async init(workspacePath: string, options?: Record<string, unknown>): Promise<void> {
    await super.init(workspacePath, options);
    await this.ensureDir(join(workspacePath, '.cursor', 'rules'));

    const rulesFile = join(workspacePath, '.cursorrules');
    if (!this.fileExists(rulesFile)) {
      await this.writeFile(rulesFile, cursorTemplate());
    }
  }

  async installRules(workspacePath: string, rules: ResolvedRuleSet): Promise<void> {
    const content = this.renderer.renderForHarness(rules, 'cursor');
    await this.writeFile(join(workspacePath, '.cursorrules'), content);
  }

  async installHooks(workspacePath: string, hooks: HookDefinition[]): Promise<void> {
    // Cursor doesn't have native hooks — generate shell wrapper scripts
    const hooksDir = join(workspacePath, '.cursor', 'hooks');
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
        `set -euo pipefail`,
        '',
      ];

      if (hook.matcher?.tool_name) {
        lines.push(`# Matcher: tool_name="${hook.matcher.tool_name}"`);
      }
      if (hook.matcher?.file_path) {
        lines.push(`# Matcher: file_path="${hook.matcher.file_path}"`);
      }

      lines.push('');
      lines.push(hook.command);
      lines.push('');

      await this.writeFile(join(hooksDir, scriptName), lines.join('\n'));
    }
  }

  async installCommands(workspacePath: string, commands: CommandDefinition[]): Promise<void> {
    // Cursor doesn't have a native command system — append to .cursorrules
    const rulesFile = join(workspacePath, '.cursorrules');
    const existing = this.fileExists(rulesFile)
      ? await this.readFileContent(rulesFile)
      : '';

    const sections: string[] = [existing.trimEnd()];

    for (const cmd of commands) {
      const lines = [
        '',
        `[command:${cmd.slash_command}]`,
        cmd.description,
        '',
      ];

      for (const [i, step] of cmd.steps.entries()) {
        lines.push(`${i + 1}. Agent \`${step.agent}\` — ${step.action}`);
      }

      sections.push(lines.join('\n'));
    }

    await this.writeFile(rulesFile, sections.join('\n') + '\n');
  }

  getConfigPath(workspacePath: string): string {
    return join(workspacePath, '.cursorrules');
  }

  getRulePaths(workspacePath: string): string[] {
    return [
      join(workspacePath, '.cursorrules'),
      join(workspacePath, '.cursor', 'rules'),
    ];
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
