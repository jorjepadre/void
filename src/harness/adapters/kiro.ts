/**
 * Kiro harness adapter.
 */

import { join } from 'node:path';
import type { HarnessType } from '../../types/harness.js';
import type { ResolvedRuleSet } from '../../types/rule.js';
import type { HookDefinition } from '../../types/hook.js';
import type { CommandDefinition } from '../../types/command.js';
import { RuleRenderer } from '../../rules/renderer.js';
import { BaseHarnessAdapter } from '../adapter.js';
import { kiroTemplate } from '../templates/kiro.js';

export class KiroAdapter extends BaseHarnessAdapter {
  readonly type: HarnessType = 'kiro';
  readonly displayName = 'Kiro';

  private readonly renderer = new RuleRenderer();

  async detect(workspacePath: string): Promise<boolean> {
    return this.dirExists(join(workspacePath, '.kiro'));
  }

  async init(workspacePath: string, options?: Record<string, unknown>): Promise<void> {
    await super.init(workspacePath, options);
    const kiroDir = join(workspacePath, '.kiro');
    await this.ensureDir(join(kiroDir, 'agents'));
    await this.ensureDir(join(kiroDir, 'hooks'));
    await this.ensureDir(join(kiroDir, 'steering'));

    const rulesPath = join(kiroDir, 'steering', 'rules.md');
    if (!this.fileExists(rulesPath)) {
      await this.writeFile(rulesPath, kiroTemplate());
    }
  }

  async installRules(workspacePath: string, rules: ResolvedRuleSet): Promise<void> {
    const content = this.renderer.renderForHarness(rules, 'kiro');
    await this.writeFile(join(workspacePath, '.kiro', 'steering', 'rules.md'), content);
  }

  async installHooks(workspacePath: string, hooks: HookDefinition[]): Promise<void> {
    const hooksDir = join(workspacePath, '.kiro', 'hooks');
    await this.ensureDir(hooksDir);

    for (const hook of hooks) {
      if (!hook.enabled) continue;

      const filename = `${hook.id}.json`;
      const hookConfig = {
        id: hook.id,
        event: hook.event,
        command: hook.command,
        description: hook.description,
        priority: hook.priority,
        timeout_ms: hook.timeout_ms,
        matcher: hook.matcher ?? null,
        profiles: hook.profiles,
      };

      await this.writeJson(join(hooksDir, filename), hookConfig);
    }
  }

  async installCommands(workspacePath: string, commands: CommandDefinition[]): Promise<void> {
    const agentsDir = join(workspacePath, '.kiro', 'agents');
    await this.ensureDir(agentsDir);

    for (const cmd of commands) {
      const filename = `${cmd.id}.md`;
      const lines = [
        `# ${cmd.name}`,
        '',
        cmd.description,
        '',
        `Version: ${cmd.version}`,
        `Slash command: \`${cmd.slash_command}\``,
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

      lines.push('## Steps');
      lines.push('');
      for (const [i, step] of cmd.steps.entries()) {
        lines.push(`${i + 1}. Agent \`${step.agent}\` — ${step.action}`);
      }
      lines.push('');

      await this.writeFile(join(agentsDir, filename), lines.join('\n'));
    }
  }

  getConfigPath(workspacePath: string): string {
    return join(workspacePath, '.kiro', 'steering', 'rules.md');
  }

  getRulePaths(workspacePath: string): string[] {
    return [join(workspacePath, '.kiro', 'steering', 'rules.md')];
  }
}
