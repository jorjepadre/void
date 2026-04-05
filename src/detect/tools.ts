/**
 * Tool detection — identifies package managers, formatters, and other
 * development tools present in a workspace.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface PackageManagerSignal {
  name: string;
  lockfile: string;
}

/**
 * Order matters — first match wins. Bun and pnpm checked before yarn/npm
 * since projects may have multiple lockfiles from migration.
 */
const PACKAGE_MANAGER_SIGNALS: PackageManagerSignal[] = [
  { name: 'bun', lockfile: 'bun.lockb' },
  { name: 'pnpm', lockfile: 'pnpm-lock.yaml' },
  { name: 'yarn', lockfile: 'yarn.lock' },
  { name: 'npm', lockfile: 'package-lock.json' },
];

/**
 * Detects the package manager used in a workspace by checking for lockfiles.
 * Returns the first match in priority order, or 'npm' as default fallback.
 */
export async function detectPackageManager(workspacePath: string): Promise<string> {
  const root = resolve(workspacePath);

  for (const signal of PACKAGE_MANAGER_SIGNALS) {
    if (existsSync(resolve(root, signal.lockfile))) {
      return signal.name;
    }
  }

  // If package.json exists but no lockfile, default to npm
  if (existsSync(resolve(root, 'package.json'))) {
    return 'npm';
  }

  // Check for non-JS package managers
  if (existsSync(resolve(root, 'Pipfile.lock'))) return 'pipenv';
  if (existsSync(resolve(root, 'poetry.lock'))) return 'poetry';
  if (existsSync(resolve(root, 'uv.lock'))) return 'uv';
  if (existsSync(resolve(root, 'go.sum'))) return 'go';
  if (existsSync(resolve(root, 'Cargo.lock'))) return 'cargo';
  if (existsSync(resolve(root, 'Gemfile.lock'))) return 'bundler';
  if (existsSync(resolve(root, 'composer.lock'))) return 'composer';

  return 'unknown';
}

interface FormatterSignal {
  name: string;
  files: string[];
  globs?: string[];
}

const FORMATTER_SIGNALS: FormatterSignal[] = [
  { name: 'biome', files: ['biome.json', 'biome.jsonc'] },
  {
    name: 'prettier',
    files: ['.prettierrc', '.prettierrc.json', '.prettierrc.yaml', '.prettierrc.yml', '.prettierrc.js', '.prettierrc.cjs', '.prettierrc.mjs', 'prettier.config.js', 'prettier.config.cjs', 'prettier.config.mjs'],
  },
  { name: 'dprint', files: ['dprint.json', '.dprint.json'] },
  { name: 'black', files: ['.black'], globs: ['pyproject.toml'] },
  { name: 'rustfmt', files: ['rustfmt.toml', '.rustfmt.toml'] },
  { name: 'gofmt', files: [] }, // go fmt is built-in; detected via go.mod presence
  { name: 'editorconfig', files: ['.editorconfig'] },
];

/**
 * Detects the code formatter configured in a workspace.
 * Returns the first match or null if none found.
 */
export async function detectFormatter(workspacePath: string): Promise<string | null> {
  const root = resolve(workspacePath);

  for (const signal of FORMATTER_SIGNALS) {
    // Skip gofmt — it's implicit, not a config file
    if (signal.name === 'gofmt') continue;

    for (const file of signal.files) {
      if (existsSync(resolve(root, file))) {
        // Special case: pyproject.toml needs to actually contain [tool.black]
        if (signal.name === 'black' && file === 'pyproject.toml') {
          continue; // handled below via globs
        }
        return signal.name;
      }
    }

    if (signal.globs) {
      for (const pattern of signal.globs) {
        const filePath = resolve(root, pattern);
        if (existsSync(filePath)) {
          try {
            const { readFile } = await import('node:fs/promises');
            const content = await readFile(filePath, 'utf-8');
            if (signal.name === 'black' && content.includes('[tool.black]')) {
              return 'black';
            }
          } catch {
            // Ignore read errors
          }
        }
      }
    }
  }

  return null;
}
