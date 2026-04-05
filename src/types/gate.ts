/**
 * Gate types — security and quality gates for tool use and file access.
 */

export type GateViolationSeverity = 'error' | 'warning' | 'info';

export interface GateContext {
  file_path?: string;
  content?: string;
  command?: string;
  tool_input?: Record<string, unknown>;
  workspace: string;
}

export interface GateViolation {
  severity: GateViolationSeverity;
  message: string;
  file?: string;
  line?: number;
  rule: string;
}

export interface GateResult {
  passed: boolean;
  violations: GateViolation[];
  auto_fixed: boolean;
}

export type SecretPatternSeverity = 'critical' | 'high';

export interface SecretPattern {
  name: string;
  pattern: string;
  severity: SecretPatternSeverity;
}
