/**
 * Rule loader — reads a YAML rule definition file and returns
 * a validated RuleDefinition.
 */

import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { RuleDefinitionSchema } from '../config/schemas.js';
import type { RuleDefinition } from '../types/rule.js';

export class RuleLoadError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'RuleLoadError';
  }
}

/**
 * Loads a YAML rule definition file into a validated RuleDefinition.
 */
export async function loadRule(filePath: string): Promise<RuleDefinition> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new RuleLoadError(`Failed to read rule file: ${filePath}`, filePath, err);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new RuleLoadError(`Failed to parse YAML in: ${filePath}`, filePath, err);
  }

  if (parsed === undefined || parsed === null) {
    throw new RuleLoadError(`Rule file is empty: ${filePath}`, filePath);
  }

  try {
    return RuleDefinitionSchema.parse(parsed);
  } catch (err) {
    throw new RuleLoadError(
      `Validation failed for rule file: ${filePath}`,
      filePath,
      err,
    );
  }
}
