/**
 * Secret detection gate — scans content for leaked credentials
 * using SecretRedactor.detect(). Returns violations per finding.
 */

import type { GateContext, GateResult, GateViolation, GateViolationSeverity } from '../../types/gate.js';
import { SecretRedactor } from '../../security/secrets.js';

const redactor = new SecretRedactor();

/**
 * Maps secret pattern severity to gate violation severity.
 */
function mapSeverity(secretSeverity: string): GateViolationSeverity {
  if (secretSeverity === 'critical') return 'error';
  if (secretSeverity === 'high') return 'error';
  return 'warning';
}

export async function secretsCheck(ctx: GateContext): Promise<GateResult> {
  const content = ctx.content;
  if (!content) {
    return { passed: true, violations: [], auto_fixed: false };
  }

  const detected = redactor.detect(content);

  if (detected.length === 0) {
    return { passed: true, violations: [], auto_fixed: false };
  }

  const violations: GateViolation[] = detected.map((secret) => ({
    severity: mapSeverity(secret.severity),
    message: `Detected ${secret.name}: ${secret.match.slice(0, 8)}...`,
    file: ctx.file_path,
    rule: 'no-secrets',
  }));

  return {
    passed: false,
    violations,
    auto_fixed: false,
  };
}
