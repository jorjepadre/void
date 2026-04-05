/**
 * Harness types — AI tool adapter abstraction.
 */

import type { ResolvedRuleSet } from './rule.js';
import type { HookDefinition } from './hook.js';
import type { CommandDefinition } from './command.js';

export type HarnessType =
  | 'claude-code'
  | 'codex'
  | 'cursor'
  | 'cowork'
  | 'gemini'
  | 'kiro'
  | 'opencode'
  | 'generic';

export interface HarnessAdapter {
  readonly type: HarnessType;
  readonly displayName: string;
  detect(workspacePath: string): Promise<boolean>;
  init(workspacePath: string, options?: Record<string, unknown>): Promise<void>;
  installRules(workspacePath: string, rules: ResolvedRuleSet): Promise<void>;
  installHooks(workspacePath: string, hooks: HookDefinition[]): Promise<void>;
  installCommands(workspacePath: string, commands: CommandDefinition[]): Promise<void>;
  getConfigPath(workspacePath: string): string;
  getRulePaths(workspacePath: string): string[];
  uninstall(workspacePath: string, components: string[]): Promise<void>;
}
