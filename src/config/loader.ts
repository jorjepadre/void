/**
 * ConfigLoader — loads and validates Void configuration from YAML or JSON files.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { type ZodType, type ZodTypeDef, ZodError } from 'zod';
import { VoidConfigSchema, type VoidConfig } from './schemas.js';

export class ConfigLoadError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ConfigLoadError';
  }
}

/**
 * Loads the Void config from a workspace directory.
 * Searches for void.config.yaml first, then void.config.json.
 * Returns a validated VoidConfig with all defaults applied.
 */
export async function loadConfig(workspacePath: string): Promise<VoidConfig> {
  const root = resolve(workspacePath);
  const yamlPath = resolve(root, 'void.config.yaml');
  const jsonPath = resolve(root, 'void.config.json');

  if (existsSync(yamlPath)) {
    return loadYaml<VoidConfig>(yamlPath, VoidConfigSchema);
  }

  if (existsSync(jsonPath)) {
    return loadJson<VoidConfig>(jsonPath, VoidConfigSchema);
  }

  // No config file found — return defaults
  return VoidConfigSchema.parse({}) as VoidConfig;
}

/**
 * Loads and validates a YAML file against a Zod schema.
 */
export async function loadYaml<T>(
  filePath: string,
  schema: ZodType<T, ZodTypeDef, unknown>
): Promise<T> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new ConfigLoadError(`Failed to read YAML file: ${filePath}`, err);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new ConfigLoadError(`Failed to parse YAML in ${filePath}`, err);
  }

  // Handle empty YAML files (parse returns undefined/null)
  if (parsed === undefined || parsed === null) {
    parsed = {};
  }

  try {
    return schema.parse(parsed);
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n');
      throw new ConfigLoadError(
        `Validation failed for ${filePath}:\n${issues}`,
        err
      );
    }
    throw err;
  }
}

/**
 * Loads and validates a JSON file against a Zod schema.
 */
export async function loadJson<T>(
  filePath: string,
  schema: ZodType<T, ZodTypeDef, unknown>
): Promise<T> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new ConfigLoadError(`Failed to read JSON file: ${filePath}`, err);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ConfigLoadError(`Failed to parse JSON in ${filePath}`, err);
  }

  try {
    return schema.parse(parsed);
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n');
      throw new ConfigLoadError(
        `Validation failed for ${filePath}:\n${issues}`,
        err
      );
    }
    throw err;
  }
}
