/**
 * Library locator — finds the content library bundled with the void package.
 * Used by CLI commands to load skills, agents, commands, rules, hooks, and instincts.
 */

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

/**
 * Locate the library/ directory by walking up from this module's location.
 * Works both in development (src/core/library.ts) and compiled (dist/src/core/library.js).
 */
export function findLibraryDir(): string | null {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, 'library');
    if (existsSync(join(candidate, 'skills')) && existsSync(join(candidate, 'agents'))) {
      return candidate;
    }
    dir = dirname(dir);
  }
  return null;
}

/**
 * Returns all skill search paths: library/skills/ followed by workspace-configured paths.
 */
export function resolveSkillPaths(workspacePath: string, configPaths: readonly string[]): string[] {
  const paths: string[] = [];
  const lib = findLibraryDir();
  if (lib) {
    paths.push(join(lib, 'skills'));
  }
  for (const p of configPaths) {
    paths.push(resolve(workspacePath, p));
  }
  return paths;
}

/**
 * Returns path to library/agents/ if found.
 */
export function resolveAgentPaths(workspacePath: string): string[] {
  const paths: string[] = [];
  const lib = findLibraryDir();
  if (lib) {
    paths.push(join(lib, 'agents'));
  }
  paths.push(resolve(workspacePath, 'agents'));
  return paths;
}

/**
 * Returns path to library/commands/ if found.
 */
export function resolveCommandPaths(workspacePath: string): string[] {
  const paths: string[] = [];
  const lib = findLibraryDir();
  if (lib) {
    paths.push(join(lib, 'commands'));
  }
  paths.push(resolve(workspacePath, 'commands'));
  return paths;
}

/**
 * Returns path to library/rules/ if found.
 */
export function resolveRulePaths(workspacePath: string): string[] {
  const paths: string[] = [];
  const lib = findLibraryDir();
  if (lib) {
    paths.push(join(lib, 'rules'));
  }
  paths.push(resolve(workspacePath, 'rules'));
  return paths;
}

/**
 * Returns path to library/hooks/definitions/ if found.
 */
export function resolveHookPaths(workspacePath: string): string[] {
  const paths: string[] = [];
  const lib = findLibraryDir();
  if (lib) {
    paths.push(join(lib, 'hooks', 'definitions'));
  }
  paths.push(resolve(workspacePath, 'hooks'));
  return paths;
}
