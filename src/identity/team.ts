/**
 * TeamConfigManager — loads, saves, and manages shared team configuration.
 */

import { existsSync } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import type { TeamConfig } from '../types/identity.js';
import { TeamConfigSchema } from '../config/schemas.js';

const TEAM_FILE = '.void/team.json';

function defaultTeamConfig(): TeamConfig {
  return TeamConfigSchema.parse({});
}

export class TeamConfigManager {
  /**
   * Loads team configuration from .void/team.json in the given workspace.
   * Returns defaults if the file does not exist.
   */
  async load(workspacePath: string): Promise<TeamConfig> {
    const filePath = resolve(workspacePath, TEAM_FILE);

    if (!existsSync(filePath)) {
      return defaultTeamConfig();
    }

    let raw: string;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch {
      return defaultTeamConfig();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return defaultTeamConfig();
    }

    return TeamConfigSchema.parse(parsed);
  }

  /**
   * Validates and saves team configuration to .void/team.json.
   */
  async save(workspacePath: string, config: TeamConfig): Promise<void> {
    const validated = TeamConfigSchema.parse(config);
    const filePath = resolve(workspacePath, TEAM_FILE);

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(validated, null, 2) + '\n', 'utf-8');
  }

  /**
   * Adds a shared skill ID to the team config if not already present.
   */
  async addSharedSkill(workspacePath: string, skillId: string): Promise<void> {
    const config = await this.load(workspacePath);

    if (!config.sharedSkills.includes(skillId)) {
      config.sharedSkills.push(skillId);
      await this.save(workspacePath, config);
    }
  }

  /**
   * Adds a shared command ID to the team config if not already present.
   */
  async addSharedCommand(workspacePath: string, commandId: string): Promise<void> {
    const config = await this.load(workspacePath);

    if (!config.sharedCommands.includes(commandId)) {
      config.sharedCommands.push(commandId);
      await this.save(workspacePath, config);
    }
  }
}
