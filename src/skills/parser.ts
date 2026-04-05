/**
 * Skill parser — reads a markdown skill file, extracts YAML frontmatter,
 * and returns a validated SkillDefinition.
 */

import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import { SkillDefinitionSchema } from '../config/schemas.js';
import type { SkillDefinition } from '../types/skill.js';

export class SkillParseError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SkillParseError';
  }
}

/**
 * Parses a markdown skill file into a validated SkillDefinition.
 *
 * The file must contain YAML frontmatter with skill metadata.
 * The markdown body becomes the systemPrompt field.
 */
export async function parseSkill(filePath: string): Promise<SkillDefinition> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new SkillParseError(`Failed to read skill file: ${filePath}`, filePath, err);
  }

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch (err) {
    throw new SkillParseError(`Failed to parse frontmatter in: ${filePath}`, filePath, err);
  }

  const frontmatter = parsed.data as Record<string, unknown>;
  const body = parsed.content.trim();

  // Merge frontmatter with the body as systemPrompt
  const skillData = {
    ...frontmatter,
    systemPrompt: body || frontmatter.systemPrompt || '',
  };

  try {
    return SkillDefinitionSchema.parse(skillData);
  } catch (err) {
    throw new SkillParseError(
      `Validation failed for skill file: ${filePath}`,
      filePath,
      err,
    );
  }
}
