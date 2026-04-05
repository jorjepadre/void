/**
 * Config protection gate — blocks modifications to critical project
 * configuration files (.eslintrc*, .prettierrc*, biome.json, tsconfig.json).
 */

import { basename } from 'node:path';
import type { GateContext, GateResult } from '../../types/gate.js';

/**
 * Config file patterns to protect. Checked against the basename.
 */
const PROTECTED_PATTERNS: RegExp[] = [
  /^\.eslintrc/,
  /^eslint\.config\./,
  /^\.prettierrc/,
  /^prettier\.config\./,
  /^biome\.jsonc?$/,
  /^tsconfig(\..+)?\.json$/,
  /^\.editorconfig$/,
  /^\.babelrc/,
  /^babel\.config\./,
  /^jest\.config\./,
  /^vitest\.config\./,
];

function isProtectedConfig(filePath: string): boolean {
  const name = basename(filePath);
  return PROTECTED_PATTERNS.some((p) => p.test(name));
}

export async function configProtectionCheck(ctx: GateContext): Promise<GateResult> {
  // Check file_path from context
  const filePath = ctx.file_path;
  if (filePath && isProtectedConfig(filePath)) {
    return {
      passed: false,
      violations: [
        {
          severity: 'error',
          message: `Modification of protected config file: ${basename(filePath)}`,
          file: filePath,
          rule: 'config-protection',
        },
      ],
      auto_fixed: false,
    };
  }

  // Also check tool_input for file_path targeting config files
  const toolFilePath = ctx.tool_input?.['file_path'];
  if (typeof toolFilePath === 'string' && isProtectedConfig(toolFilePath)) {
    return {
      passed: false,
      violations: [
        {
          severity: 'error',
          message: `Modification of protected config file: ${basename(toolFilePath)}`,
          file: toolFilePath,
          rule: 'config-protection',
        },
      ],
      auto_fixed: false,
    };
  }

  return { passed: true, violations: [], auto_fixed: false };
}
