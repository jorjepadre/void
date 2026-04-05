/**
 * CommandRegistry — scans directories for YAML command definitions,
 * parses them, and provides lookup/filter operations.
 */

import fg from 'fast-glob';
import { parseCommand } from './parser.js';
import type { CommandDefinition } from '../types/command.js';

export class CommandRegistry {
  private commands = new Map<string, CommandDefinition>();
  private slashIndex = new Map<string, string>(); // slash_command -> id
  private _loaded = false;

  constructor(private readonly directories: string[]) {}

  /**
   * Scans all configured directories for .yaml/.yml command files,
   * parses each one, and caches the result.
   */
  async load(): Promise<void> {
    this.commands.clear();
    this.slashIndex.clear();

    const patterns = this.directories.flatMap((dir) => {
      const normalized = dir.replace(/\\/g, '/');
      return [
        `${normalized}/**/*.yaml`,
        `${normalized}/**/*.yml`,
      ];
    });

    const allFiles = await fg(patterns, {
      absolute: true,
      onlyFiles: true,
      dot: false,
    });
    // Skip catalog/index files
    const files = allFiles.filter((f) => !f.endsWith('_index.yaml') && !f.endsWith('_index.yml'));

    const results = await Promise.allSettled(
      files.map((file) => parseCommand(file)),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const cmd = result.value;
        this.commands.set(cmd.id, cmd);
        this.slashIndex.set(cmd.slash_command, cmd.id);
      }
    }

    this._loaded = true;
  }

  /**
   * Returns true if the registry has been loaded.
   */
  get isLoaded(): boolean {
    return this._loaded;
  }

  /**
   * Returns a command definition by ID, or undefined if not found.
   */
  get(id: string): CommandDefinition | undefined {
    return this.commands.get(id);
  }

  /**
   * Returns true if a command with the given ID exists.
   */
  has(id: string): boolean {
    return this.commands.has(id);
  }

  /**
   * Returns all registered commands.
   */
  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  /**
   * Returns commands matching the given filter criteria.
   */
  list(filter?: {
    tags?: string[];
  }): CommandDefinition[] {
    let results = this.getAll();

    if (filter?.tags && filter.tags.length > 0) {
      const filterTags = new Set(filter.tags.map((t) => t.toLowerCase()));
      results = results.filter((c) =>
        c.tags.some((t) => filterTags.has(t.toLowerCase())),
      );
    }

    return results;
  }

  /**
   * Looks up a command by its slash command string (e.g., "/tdd", "/plan").
   */
  getBySlashCommand(slashCmd: string): CommandDefinition | undefined {
    const id = this.slashIndex.get(slashCmd);
    if (!id) {
      return undefined;
    }
    return this.commands.get(id);
  }
}
