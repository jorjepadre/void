/**
 * Command parser — reads a YAML command definition file and returns
 * a validated CommandDefinition.
 */

import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { CommandDefinitionSchema } from '../config/schemas.js';
import type { CommandDefinition } from '../types/command.js';

export class CommandParseError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CommandParseError';
  }
}

/**
 * Parses a YAML command definition file into a validated CommandDefinition.
 */
export async function parseCommand(filePath: string): Promise<CommandDefinition> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new CommandParseError(`Failed to read command file: ${filePath}`, filePath, err);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new CommandParseError(`Failed to parse YAML in: ${filePath}`, filePath, err);
  }

  if (parsed === undefined || parsed === null) {
    throw new CommandParseError(`Command file is empty: ${filePath}`, filePath);
  }

  try {
    return CommandDefinitionSchema.parse(parsed);
  } catch (err) {
    throw new CommandParseError(
      `Validation failed for command file: ${filePath}`,
      filePath,
      err,
    );
  }
}
