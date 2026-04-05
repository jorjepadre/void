/**
 * GateReporter — formats gate results into human-readable summaries
 * and structured JSON output.
 */

import type { GateResult, GateViolation } from '../types/gate.js';

const SEVERITY_ICONS: Record<string, string> = {
  error: '[ERROR]',
  warning: '[WARN]',
  info: '[INFO]',
};

export class GateReporter {
  /**
   * Format an array of gate results into a human-readable summary.
   */
  format(results: GateResult[]): string {
    const totalViolations = results.reduce(
      (sum, r) => sum + r.violations.length,
      0,
    );
    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;
    const autoFixed = results.filter((r) => r.auto_fixed).length;

    const lines: string[] = [];
    lines.push(`Gate Results: ${passed} passed, ${failed} failed, ${totalViolations} violations`);

    if (autoFixed > 0) {
      lines.push(`  ${autoFixed} auto-fixed`);
    }

    for (const result of results) {
      if (result.violations.length === 0) continue;
      lines.push('');
      for (const violation of result.violations) {
        lines.push(this.formatViolation(violation));
      }
    }

    return lines.join('\n');
  }

  /**
   * Format a single violation into a readable line.
   */
  formatViolation(v: GateViolation): string {
    const icon = SEVERITY_ICONS[v.severity] ?? '[?]';
    const location = v.file
      ? v.line !== undefined
        ? ` ${v.file}:${v.line}`
        : ` ${v.file}`
      : '';
    return `  ${icon} ${v.rule}:${location} ${v.message}`;
  }

  /**
   * Serialize gate results to a JSON string.
   */
  toJson(results: GateResult[]): string {
    return JSON.stringify(results, null, 2);
  }
}
