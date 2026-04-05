/**
 * Format check gate — detects the project formatter (prettier or biome)
 * and runs it in check mode. Returns violations for unformatted files.
 */

import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { GateContext, GateResult, GateViolation } from '../../types/gate.js';
import { safeExecFile } from '../../security/process.js';

type FormatterKind = 'prettier' | 'biome' | null;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function detectFormatter(workspace: string): Promise<FormatterKind> {
  const biomeConfigs = ['biome.json', 'biome.jsonc'];
  for (const cfg of biomeConfigs) {
    if (await fileExists(join(workspace, cfg))) return 'biome';
  }

  const prettierConfigs = [
    '.prettierrc',
    '.prettierrc.js',
    '.prettierrc.cjs',
    '.prettierrc.json',
    '.prettierrc.yml',
    '.prettierrc.yaml',
    '.prettierrc.toml',
    'prettier.config.js',
    'prettier.config.cjs',
    'prettier.config.mjs',
  ];
  for (const cfg of prettierConfigs) {
    if (await fileExists(join(workspace, cfg))) return 'prettier';
  }

  return null;
}

function parsePrettierCheckOutput(output: string): string[] {
  // Prettier --check outputs file names that are not formatted
  // Format: Checking formatting...
  // [warn] file1.ts
  // [warn] file2.ts
  const unformatted: string[] = [];
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    const warnMatch = /^\[warn\]\s+(.+)$/.exec(trimmed);
    if (warnMatch && !warnMatch[1]!.startsWith('Code style')) {
      unformatted.push(warnMatch[1]!);
    }
  }
  return unformatted;
}

function parseBiomeFormatOutput(output: string): string[] {
  const unformatted: string[] = [];
  // Biome format --check lists files that would be changed
  const pattern = /^(.+?)\s+format/;
  for (const line of output.split('\n')) {
    const match = pattern.exec(line.trim());
    if (match) {
      unformatted.push(match[1]!);
    }
  }
  return unformatted;
}

export async function formatCheck(ctx: GateContext): Promise<GateResult> {
  const formatter = await detectFormatter(ctx.workspace);

  if (!formatter) {
    return { passed: true, violations: [], auto_fixed: false };
  }

  const targetFile = ctx.file_path;
  if (!targetFile) {
    return { passed: true, violations: [], auto_fixed: false };
  }

  let unformatted: string[] = [];

  try {
    if (formatter === 'prettier') {
      const result = await safeExecFile(
        'npx',
        ['prettier', '--check', targetFile],
        { cwd: ctx.workspace, timeout: 30_000, maxBuffer: 5 * 1024 * 1024 },
      );
      unformatted = parsePrettierCheckOutput(result.stdout + result.stderr);
    } else {
      const result = await safeExecFile(
        'npx',
        ['biome', 'format', '--check', targetFile],
        { cwd: ctx.workspace, timeout: 30_000, maxBuffer: 5 * 1024 * 1024 },
      );
      unformatted = parseBiomeFormatOutput(result.stdout + result.stderr);
    }
  } catch (err: unknown) {
    // Formatters exit non-zero when files need formatting
    if (err && typeof err === 'object' && 'stdout' in err) {
      const execErr = err as { stdout: string; stderr: string };
      if (formatter === 'prettier') {
        unformatted = parsePrettierCheckOutput(execErr.stdout + execErr.stderr);
      } else {
        unformatted = parseBiomeFormatOutput(execErr.stdout + execErr.stderr);
      }
      // If we couldn't parse anything, the file itself is likely unformatted
      if (unformatted.length === 0) {
        unformatted = [targetFile];
      }
    } else {
      const message = err instanceof Error ? err.message : String(err);
      return {
        passed: true,
        violations: [
          {
            severity: 'warning',
            message: `Format check failed to run: ${message}`,
            rule: 'format/runtime-error',
          },
        ],
        auto_fixed: false,
      };
    }
  }

  const violations: GateViolation[] = unformatted.map((file) => ({
    severity: 'warning' as const,
    message: 'File is not formatted',
    file,
    rule: `format/${formatter}`,
  }));

  return {
    passed: violations.length === 0,
    violations,
    auto_fixed: false,
  };
}
