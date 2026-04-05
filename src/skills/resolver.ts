/**
 * Skill resolver — validates input parameters against a skill's definition,
 * applies defaults, and interpolates the final prompt.
 */

import type { SkillDefinition, SkillParam } from '../types/skill.js';

export interface ResolvedSkill {
  definition: SkillDefinition;
  resolvedParams: Record<string, unknown>;
  finalPrompt: string;
}

export class SkillResolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillResolveError';
  }
}

/**
 * Resolves a skill with the provided input parameters.
 *
 * - Validates that all required parameters are present
 * - Applies defaults for missing optional parameters
 * - Type-checks parameter values against their declared types
 * - Interpolates {{param}} placeholders in the system prompt
 */
export function resolveSkill(
  skill: SkillDefinition,
  input: Record<string, unknown>,
): ResolvedSkill {
  const resolvedParams: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const param of skill.parameters) {
    const value = input[param.name];

    if (value === undefined || value === null) {
      if (param.required) {
        errors.push(`Missing required parameter: ${param.name}`);
        continue;
      }
      // Apply default
      resolvedParams[param.name] = param.default ?? getTypeDefault(param);
      continue;
    }

    // Validate type
    const typeError = validateParamType(param, value);
    if (typeError) {
      errors.push(typeError);
      continue;
    }

    resolvedParams[param.name] = value;
  }

  if (errors.length > 0) {
    throw new SkillResolveError(
      `Parameter validation failed for skill "${skill.id}":\n` +
        errors.map((e) => `  - ${e}`).join('\n'),
    );
  }

  // Interpolate {{param}} placeholders in the system prompt
  const finalPrompt = interpolatePrompt(skill.systemPrompt, resolvedParams);

  return {
    definition: skill,
    resolvedParams,
    finalPrompt,
  };
}

/**
 * Returns a sensible default value based on parameter type.
 */
function getTypeDefault(param: SkillParam): unknown {
  switch (param.type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'enum':
      return param.values?.[0] ?? '';
  }
}

/**
 * Validates a value against the declared parameter type.
 * Returns an error string, or null if valid.
 */
function validateParamType(param: SkillParam, value: unknown): string | null {
  switch (param.type) {
    case 'string':
      if (typeof value !== 'string') {
        return `Parameter "${param.name}" must be a string, got ${typeof value}`;
      }
      break;
    case 'number':
      if (typeof value !== 'number') {
        return `Parameter "${param.name}" must be a number, got ${typeof value}`;
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        return `Parameter "${param.name}" must be a boolean, got ${typeof value}`;
      }
      break;
    case 'enum':
      if (typeof value !== 'string') {
        return `Parameter "${param.name}" must be a string (enum), got ${typeof value}`;
      }
      if (param.values && !param.values.includes(value)) {
        return `Parameter "${param.name}" must be one of [${param.values.join(', ')}], got "${value}"`;
      }
      break;
  }
  return null;
}

/**
 * Replaces {{paramName}} placeholders in the prompt with resolved values.
 */
function interpolatePrompt(
  template: string,
  params: Record<string, unknown>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (key in params) {
      return String(params[key]);
    }
    return `{{${key}}}`;
  });
}
