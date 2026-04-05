/**
 * Console.log detection gate — scans content for debugging statements
 * that should not be committed (console.log, console.debug, console.warn,
 * debugger). Excludes console.error which is acceptable.
 */

import type { GateContext, GateResult, GateViolation } from '../../types/gate.js';

interface ConsolePattern {
  regex: RegExp;
  name: string;
}

const CONSOLE_PATTERNS: ConsolePattern[] = [
  { regex: /\bconsole\.log\b/g, name: 'console.log' },
  { regex: /\bconsole\.debug\b/g, name: 'console.debug' },
  { regex: /\bconsole\.warn\b/g, name: 'console.warn' },
  { regex: /\bdebugger\b/g, name: 'debugger' },
];

export async function consoleCheck(ctx: GateContext): Promise<GateResult> {
  const content = ctx.content;
  if (!content) {
    return { passed: true, violations: [], auto_fixed: false };
  }

  const violations: GateViolation[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue;
    }

    for (const pattern of CONSOLE_PATTERNS) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(line)) {
        violations.push({
          severity: 'warning',
          message: `Found ${pattern.name} statement`,
          file: ctx.file_path,
          line: i + 1,
          rule: 'no-console',
        });
      }
    }
  }

  return {
    passed: true, // warnings only, never blocks
    violations,
    auto_fixed: false,
  };
}
