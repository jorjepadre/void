/**
 * Lint gate — detects the project linter (eslint or biome) and
 * delegates to it via safeExecFile. Parses output for violations.
 */

import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { GateContext, GateResult, GateViolation } from '../../types/gate.js';
import { safeExecFile } from '../../security/process.js';

type LinterKind = 'eslint' | 'biome' | null;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect which linter is configured in the workspace.
 */
async function detectLinter(workspace: string): Promise<LinterKind> {
  const biomeConfigs = ['biome.json', 'biome.jsonc'];
  for (const cfg of biomeConfigs) {
    if (await fileExists(join(workspace, cfg))) return 'biome';
  }

  const eslintConfigs = [
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.json',
    '.eslintrc.yml',
    '.eslintrc.yaml',
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs',
  ];
  for (const cfg of eslintConfigs) {
    if (await fileExists(join(workspace, cfg))) return 'eslint';
  }

  return null;
}

/**
 * Parse eslint output (default formatter) into violations.
 * Format: /path/to/file.ts
 *   line:col  error/warning  message  rule-name
 */
function parseEslintOutput(output: string, _file?: string): GateViolation[] {
  const violations: GateViolation[] = [];
  const linePattern = /^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(\S+)$/;
  let currentFile: string | undefined;

  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // File header line (absolute path)
    if (trimmed.startsWith('/') && !trimmed.includes('  ')) {
      currentFile = trimmed;
      continue;
    }

    const match = linePattern.exec(line);
    if (match) {
      const lineNum = parseInt(match[1]!, 10);
      const severity = match[3] === 'error' ? 'error' as const : 'warning' as const;
      const message = match[4]!;
      const rule = match[5]!;

      violations.push({
        severity,
        message,
        file: currentFile ?? _file,
        line: lineNum,
        rule: `eslint/${rule}`,
      });
    }
  }

  return violations;
}

/**
 * Parse biome check output into violations.
 */
function parseBiomeOutput(output: string): GateViolation[] {
  const violations: GateViolation[] = [];
  // Biome format: path/file.ts:line:col lint/rule ━━━━━━
  const pattern = /^(.+?):(\d+):\d+\s+(\S+)/;

  for (const line of output.split('\n')) {
    const match = pattern.exec(line.trim());
    if (match) {
      violations.push({
        severity: 'error',
        message: `Biome lint violation`,
        file: match[1],
        line: parseInt(match[2]!, 10),
        rule: `biome/${match[3]}`,
      });
    }
  }

  return violations;
}

export async function lintCheck(ctx: GateContext): Promise<GateResult> {
  const linter = await detectLinter(ctx.workspace);

  if (!linter) {
    return { passed: true, violations: [], auto_fixed: false };
  }

  const targetFile = ctx.file_path;
  if (!targetFile) {
    return { passed: true, violations: [], auto_fixed: false };
  }

  let violations: GateViolation[] = [];

  try {
    if (linter === 'eslint') {
      const result = await safeExecFile(
        'npx',
        ['eslint', '--no-color', '--format', 'stylish', targetFile],
        { cwd: ctx.workspace, timeout: 30_000, maxBuffer: 5 * 1024 * 1024 },
      );
      violations = parseEslintOutput(result.stdout, targetFile);
    } else {
      const result = await safeExecFile(
        'npx',
        ['biome', 'check', '--no-errors-on-unmatched', targetFile],
        { cwd: ctx.workspace, timeout: 30_000, maxBuffer: 5 * 1024 * 1024 },
      );
      violations = parseBiomeOutput(result.stdout + result.stderr);
    }
  } catch (err: unknown) {
    // Linters exit non-zero when violations are found
    if (err && typeof err === 'object' && 'stdout' in err) {
      const execErr = err as { stdout: string; stderr: string };
      if (linter === 'eslint') {
        violations = parseEslintOutput(execErr.stdout, targetFile);
      } else {
        violations = parseBiomeOutput(execErr.stdout + execErr.stderr);
      }
    } else {
      const message = err instanceof Error ? err.message : String(err);
      violations = [
        {
          severity: 'warning',
          message: `Lint check failed to run: ${message}`,
          rule: 'lint/runtime-error',
        },
      ];
    }
  }

  return {
    passed: violations.every((v) => v.severity !== 'error'),
    violations,
    auto_fixed: false,
  };
}
