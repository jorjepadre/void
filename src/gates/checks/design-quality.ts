/**
 * Design quality gate — detects generic template patterns in HTML/JSX
 * that indicate placeholder or boilerplate content that should be replaced.
 */

import type { GateContext, GateResult, GateViolation } from '../../types/gate.js';

interface QualityPattern {
  regex: RegExp;
  message: string;
  rule: string;
}

const QUALITY_PATTERNS: QualityPattern[] = [
  {
    regex: /\bLorem\s+ipsum\b/gi,
    message: 'Placeholder text "Lorem ipsum" detected',
    rule: 'design/no-lorem-ipsum',
  },
  {
    regex: /\bplaceholder\b/gi,
    message: 'Generic "placeholder" text detected',
    rule: 'design/no-placeholder',
  },
  {
    regex: /\bTODO:\s*replace\b/gi,
    message: '"TODO: replace" marker found',
    rule: 'design/no-todo-replace',
  },
  {
    regex: /\bFIXME:\s*replace\b/gi,
    message: '"FIXME: replace" marker found',
    rule: 'design/no-fixme-replace',
  },
  {
    regex: /\bXXX:\s*replace\b/gi,
    message: '"XXX: replace" marker found',
    rule: 'design/no-xxx-replace',
  },
  {
    regex: /className=["']container["']/g,
    message: 'Generic class name "container" — consider a more descriptive name',
    rule: 'design/no-generic-classname',
  },
  {
    regex: /className=["']wrapper["']/g,
    message: 'Generic class name "wrapper" — consider a more descriptive name',
    rule: 'design/no-generic-classname',
  },
  {
    regex: /className=["']content["']/g,
    message: 'Generic class name "content" — consider a more descriptive name',
    rule: 'design/no-generic-classname',
  },
  {
    regex: /\bexample\.com\b/gi,
    message: 'Placeholder domain "example.com" detected',
    rule: 'design/no-example-domain',
  },
  {
    regex: /\bJohn\s+Doe\b/gi,
    message: 'Placeholder name "John Doe" detected',
    rule: 'design/no-placeholder-name',
  },
  {
    regex: /src=["']https?:\/\/via\.placeholder\.com/g,
    message: 'Placeholder image URL detected',
    rule: 'design/no-placeholder-image',
  },
];

/**
 * Detect repeated boilerplate blocks (3+ identical consecutive non-empty lines).
 */
function detectRepeatedBoilerplate(
  lines: string[],
  filePath?: string,
): GateViolation[] {
  const violations: GateViolation[] = [];
  let repeatCount = 1;
  let prevLine = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) {
      prevLine = '';
      repeatCount = 1;
      continue;
    }

    if (line === prevLine) {
      repeatCount++;
      if (repeatCount === 3) {
        violations.push({
          severity: 'warning',
          message: `Repeated boilerplate detected (3+ identical lines)`,
          file: filePath,
          line: i + 1,
          rule: 'design/no-repeated-boilerplate',
        });
      }
    } else {
      repeatCount = 1;
    }
    prevLine = line;
  }

  return violations;
}

export async function designQualityCheck(
  ctx: GateContext,
): Promise<GateResult> {
  const content = ctx.content;
  if (!content) {
    return { passed: true, violations: [], auto_fixed: false };
  }

  // Only check HTML, JSX, TSX, and template files
  const filePath = ctx.file_path ?? '';
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const relevantExtensions = new Set([
    'html',
    'htm',
    'jsx',
    'tsx',
    'vue',
    'svelte',
    'astro',
    'hbs',
    'ejs',
    'pug',
  ]);

  if (filePath && !relevantExtensions.has(ext)) {
    return { passed: true, violations: [], auto_fixed: false };
  }

  const violations: GateViolation[] = [];
  const lines = content.split('\n');

  // Pattern matching
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const pattern of QUALITY_PATTERNS) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(line)) {
        violations.push({
          severity: 'warning',
          message: pattern.message,
          file: ctx.file_path,
          line: i + 1,
          rule: pattern.rule,
        });
      }
    }
  }

  // Repeated boilerplate
  violations.push(...detectRepeatedBoilerplate(lines, ctx.file_path));

  return {
    passed: true, // warnings only
    violations,
    auto_fixed: false,
  };
}
