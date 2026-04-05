/**
 * Agent parser — reads a YAML agent definition file and returns
 * a validated AgentDefinition.
 */

import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { AgentDefinitionSchema } from '../config/schemas.js';
import type { AgentDefinition } from '../types/agent.js';

export class AgentParseError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AgentParseError';
  }
}

/**
 * Parses a YAML agent definition file into a validated AgentDefinition.
 */
export async function parseAgent(filePath: string): Promise<AgentDefinition> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new AgentParseError(`Failed to read agent file: ${filePath}`, filePath, err);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new AgentParseError(`Failed to parse YAML in: ${filePath}`, filePath, err);
  }

  if (parsed === undefined || parsed === null) {
    throw new AgentParseError(`Agent file is empty: ${filePath}`, filePath);
  }

  try {
    return AgentDefinitionSchema.parse(parsed);
  } catch (err) {
    throw new AgentParseError(
      `Validation failed for agent file: ${filePath}`,
      filePath,
      err,
    );
  }
}
