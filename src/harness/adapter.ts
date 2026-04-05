/**
 * BaseHarnessAdapter — abstract base class with common file-system helpers.
 */

import { mkdir, writeFile as fsWriteFile, readFile, unlink, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import type { HarnessType, HarnessAdapter } from '../types/harness.js';
import type { ResolvedRuleSet } from '../types/rule.js';
import type { HookDefinition } from '../types/hook.js';
import type { CommandDefinition } from '../types/command.js';

export abstract class BaseHarnessAdapter implements HarnessAdapter {
  abstract readonly type: HarnessType;
  abstract readonly displayName: string;

  abstract detect(workspacePath: string): Promise<boolean>;
  abstract installRules(workspacePath: string, rules: ResolvedRuleSet): Promise<void>;
  abstract installHooks(workspacePath: string, hooks: HookDefinition[]): Promise<void>;
  abstract installCommands(workspacePath: string, commands: CommandDefinition[]): Promise<void>;
  abstract getConfigPath(workspacePath: string): string;
  abstract getRulePaths(workspacePath: string): string[];

  /**
   * Default init — creates the harness config directory.
   * Subclasses should call super.init() then do harness-specific setup.
   */
  async init(workspacePath: string, _options?: Record<string, unknown>): Promise<void> {
    const configDir = dirname(this.getConfigPath(workspacePath));
    await this.ensureDir(configDir);
  }

  /**
   * Default uninstall — removes files associated with given component IDs.
   * Looks for files whose names match component IDs in the harness directories.
   */
  async uninstall(workspacePath: string, components: string[]): Promise<void> {
    const rulePaths = this.getRulePaths(workspacePath);
    const configPath = this.getConfigPath(workspacePath);

    for (const component of components) {
      // Try to remove component-specific rule files
      for (const rulePath of rulePaths) {
        const candidateFile = join(rulePath, `${component}.md`);
        if (existsSync(candidateFile)) {
          await unlink(candidateFile);
        }
      }

      // Try to remove from config directory
      const configDir = dirname(configPath);
      const candidates = [
        join(configDir, `${component}.md`),
        join(configDir, `${component}.json`),
        join(configDir, `${component}.yaml`),
        join(configDir, `${component}.ts`),
        join(configDir, `${component}.sh`),
      ];

      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          await unlink(candidate);
        }
      }
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  protected async ensureDir(dirPath: string): Promise<void> {
    await mkdir(dirPath, { recursive: true });
  }

  protected async writeFile(filePath: string, content: string): Promise<void> {
    await this.ensureDir(dirname(filePath));
    await fsWriteFile(filePath, content, 'utf-8');
  }

  protected async readJson<T = unknown>(filePath: string): Promise<T | undefined> {
    try {
      const raw = await readFile(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  protected async writeJson(filePath: string, data: unknown): Promise<void> {
    await this.ensureDir(dirname(filePath));
    await fsWriteFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  }

  protected async removeDir(dirPath: string): Promise<void> {
    if (existsSync(dirPath)) {
      await rm(dirPath, { recursive: true, force: true });
    }
  }

  protected dirExists(dirPath: string): boolean {
    return existsSync(dirPath);
  }

  protected fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }
}
