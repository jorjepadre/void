/**
 * OpenCode harness adapter.
 */

import { join } from 'node:path';
import type { HarnessType } from '../../types/harness.js';
import type { ResolvedRuleSet } from '../../types/rule.js';
import type { HookDefinition } from '../../types/hook.js';
import type { CommandDefinition } from '../../types/command.js';
import { RuleRenderer } from '../../rules/renderer.js';
import { BaseHarnessAdapter } from '../adapter.js';
import { opencodeTemplate } from '../templates/opencode.js';

export class OpenCodeAdapter extends BaseHarnessAdapter {
  readonly type: HarnessType = 'opencode';
  readonly displayName = 'OpenCode';

  private readonly renderer = new RuleRenderer();

  async detect(workspacePath: string): Promise<boolean> {
    return this.dirExists(join(workspacePath, '.opencode'));
  }

  async init(workspacePath: string, options?: Record<string, unknown>): Promise<void> {
    await super.init(workspacePath, options);
    const ocDir = join(workspacePath, '.opencode');
    await this.ensureDir(join(ocDir, 'plugins'));
    await this.ensureDir(join(ocDir, 'prompts'));
    await this.ensureDir(join(ocDir, 'tools'));

    const instructionsPath = join(ocDir, 'instructions.md');
    if (!this.fileExists(instructionsPath)) {
      await this.writeFile(instructionsPath, opencodeTemplate());
    }
  }

  async installRules(workspacePath: string, rules: ResolvedRuleSet): Promise<void> {
    const content = this.renderer.renderForHarness(rules, 'opencode');
    await this.writeFile(join(workspacePath, '.opencode', 'instructions.md'), content);
  }

  async installHooks(workspacePath: string, hooks: HookDefinition[]): Promise<void> {
    const pluginsDir = join(workspacePath, '.opencode', 'plugins');
    await this.ensureDir(pluginsDir);

    for (const hook of hooks) {
      if (!hook.enabled) continue;

      const filename = `${hook.id}.ts`;
      const lines = [
        `/**`,
        ` * Void hook plugin: ${hook.description}`,
        ` * Event: ${hook.event}`,
        ` * Priority: ${hook.priority}`,
        ` */`,
        '',
        `export const event = '${hook.event}' as const;`,
        `export const priority = ${hook.priority};`,
        `export const timeout_ms = ${hook.timeout_ms};`,
        '',
      ];

      if (hook.matcher) {
        lines.push(`export const matcher = ${JSON.stringify(hook.matcher, null, 2)};`);
        lines.push('');
      }

      lines.push(
        `export async function handler(): Promise<{ decision: string; reason?: string }> {`,
        `  const { spawn } = await import('node:child_process');`,
        `  const parts = ${JSON.stringify(hook.command)}.split(' ');`,
        `  const [cmd, ...args] = parts;`,
        `  return await new Promise((resolve) => {`,
        `    const proc = spawn(cmd, args, { stdio: 'pipe', timeout: ${hook.timeout_ms}, shell: false });`,
        `    proc.on('exit', (code) => {`,
        `      resolve(code === 0 ? { decision: 'allow' } : { decision: 'block', reason: 'hook exited with code ' + code });`,
        `    });`,
        `    proc.on('error', (err) => resolve({ decision: 'block', reason: err.message }));`,
        `  });`,
        `}`,
        '',
      );

      await this.writeFile(join(pluginsDir, filename), lines.join('\n'));
    }
  }

  async installCommands(workspacePath: string, commands: CommandDefinition[]): Promise<void> {
    const promptsDir = join(workspacePath, '.opencode', 'prompts');
    await this.ensureDir(promptsDir);

    for (const cmd of commands) {
      const filename = `${cmd.id}.md`;
      const lines = [
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

      lines.push('## Steps');
      lines.push('');
      for (const [i, step] of cmd.steps.entries()) {
        lines.push(`${i + 1}. Agent \`${step.agent}\` — ${step.action}`);
      }
      lines.push('');

      await this.writeFile(join(promptsDir, filename), lines.join('\n'));
    }
  }

  getConfigPath(workspacePath: string): string {
    return join(workspacePath, '.opencode', 'instructions.md');
  }

  getRulePaths(workspacePath: string): string[] {
    return [join(workspacePath, '.opencode', 'instructions.md')];
  }
}
