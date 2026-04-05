/**
 * Type check gate — runs `npx tsc --noEmit` via safeExecFile
 * and parses the output for TypeScript errors.
 */

import type { GateContext, GateResult, GateViolation } from '../../types/gate.js';
import { safeExecFile } from '../../security/process.js';

/**
 * Parse tsc output lines.
 * Format: src/file.ts(line,col): error TS1234: message
 */
function parseTscOutput(output: string): GateViolation[] {
  const violations: GateViolation[] = [];
  const pattern = /^(.+?)\((\d+),\d+\):\s+(error|warning)\s+TS(\d+):\s+(.+)$/;

  for (const line of output.split('\n')) {
    const match = pattern.exec(line.trim());
    if (match) {
      violations.push({
        severity: match[3] === 'error' ? 'error' : 'warning',
        message: match[5]!,
        file: match[1],
        line: parseInt(match[2]!, 10),
        rule: `ts/${match[4]}`,
      });
    }
  }

  return violations;
}

export async function typesCheck(ctx: GateContext): Promise<GateResult> {
  try {
    const result = await safeExecFile(
      'npx',
      ['tsc', '--noEmit'],
      { cwd: ctx.workspace, timeout: 60_000, maxBuffer: 10 * 1024 * 1024 },
    );
    const violations = parseTscOutput(result.stdout + result.stderr);
    return {
      passed: violations.length === 0,
      violations,
      auto_fixed: false,
    };
  } catch (err: unknown) {
    // tsc exits non-zero when there are errors
    if (err && typeof err === 'object' && 'stdout' in err) {
      const execErr = err as { stdout: string; stderr: string };
      const violations = parseTscOutput(execErr.stdout + execErr.stderr);
      return {
        passed: false,
        violations:
          violations.length > 0
            ? violations
            : [
                {
                  severity: 'error',
                  message: 'TypeScript compilation failed',
                  rule: 'ts/compile',
                },
              ],
        auto_fixed: false,
      };
    }

    const message = err instanceof Error ? err.message : String(err);
    return {
      passed: false,
      violations: [
        {
          severity: 'error',
          message: `Type check failed to run: ${message}`,
          rule: 'ts/runtime-error',
        },
      ],
      auto_fixed: false,
    };
  }
}
