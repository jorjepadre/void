/**
 * Generic (fallback) harness adapter.
 */

import { join } from 'node:path';
import type { HarnessType } from '../../types/harness.js';
import type { ResolvedRuleSet } from '../../types/rule.js';
import type { HookDefinition } from '../../types/hook.js';
import type { CommandDefinition } from '../../types/command.js';
import { RuleRenderer } from '../../rules/renderer.js';
import { BaseHarnessAdapter } from '../adapter.js';

export class GenericAdapter extends BaseHarnessAdapter {
  readonly type: HarnessType = 'generic';
  readonly displayName = 'Generic (Void)';

  private readonly renderer = new RuleRenderer();

  async detect(_workspacePath: string): Promise<boolean> {
    // Generic is the fallback — never auto-detected.
    return false;
  }

  async init(workspacePath: string, options?: Record<string, unknown>): Promise<void> {
    await super.init(workspacePath, options);
    const voidDir = join(workspacePath, '.void');
    await this.ensureDir(join(voidDir, 'rules'));
    await this.ensureDir(join(voidDir, 'hooks'));
    await this.ensureDir(join(voidDir, 'commands'));
  }

  async installRules(workspacePath: string, rules: ResolvedRuleSet): Promise<void> {
    const content = this.renderer.renderForHarness(rules, 'generic');
    await this.writeFile(join(workspacePath, '.void', 'rules', 'resolved.md'), content);
  }

  async installHooks(workspacePath: string, hooks: HookDefinition[]): Promise<void> {
    const hooksFile = join(workspacePath, '.void', 'hooks', 'hooks.json');

    const hooksData = hooks
      .filter((h) => h.enabled)
      .map((h) => ({
        id: h.id,
        event: h.event,
        command: h.command,
        description: h.description,
        priority: h.priority,
        timeout_ms: h.timeout_ms,
        matcher: h.matcher ?? null,
        profiles: h.profiles,
      }));

    await this.writeJson(hooksFile, { hooks: hooksData });
  }

  async installCommands(workspacePath: string, commands: CommandDefinition[]): Promise<void> {
    const commandsDir = join(workspacePath, '.void', 'commands');
    await this.ensureDir(commandsDir);

    for (const cmd of commands) {
      const filename = `${cmd.id}.json`;
      await this.writeJson(join(commandsDir, filename), {
        id: cmd.id,
        name: cmd.name,
        version: cmd.version,
        slash_command: cmd.slash_command,
        description: cmd.description,
        tags: cmd.tags,
        depends_on: cmd.depends_on,
        parameters: cmd.parameters,
        steps: cmd.steps,
      });
    }
  }

  getConfigPath(workspacePath: string): string {
    return join(workspacePath, '.void', 'config.json');
  }

  getRulePaths(workspacePath: string): string[] {
    return [join(workspacePath, '.void', 'rules')];
  }
}
