/**
 * SkillRegistry — scans directories for markdown skill files,
 * parses them, and provides lookup/filter operations.
 */

import fg from 'fast-glob';
import { parseSkill } from './parser.js';
import type { SkillDefinition } from '../types/skill.js';

export class SkillRegistry {
  private skills = new Map<string, SkillDefinition>();
  private _loaded = false;

  constructor(private readonly directories: string[]) {}

  /**
   * Scans all configured directories for .md skill files,
   * parses each one, and caches the result.
   */
  async load(): Promise<void> {
    this.skills.clear();

    const patterns = this.directories.map((dir) =>
      dir.replace(/\\/g, '/') + '/**/*.md',
    );

    const allFiles = await fg(patterns, {
      absolute: true,
      onlyFiles: true,
      dot: false,
    });
    // Skip catalog/index files
    const files = allFiles.filter((f) => !f.endsWith('_index.md'));

    const results = await Promise.allSettled(
      files.map((file) => parseSkill(file)),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const skill = result.value;
        this.skills.set(skill.id, skill);
      }
      // Silently skip files that fail to parse — callers can
      // re-parse individual files to surface errors.
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
   * Returns a skill definition by ID, or undefined if not found.
   */
  get(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  /**
   * Returns true if a skill with the given ID exists.
   */
  has(id: string): boolean {
    return this.skills.has(id);
  }

  /**
   * Returns all registered skills.
   */
  getAll(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  /**
   * Returns skills matching the given filter criteria.
   */
  list(filter?: { language?: string; tags?: string[] }): SkillDefinition[] {
    let results = this.getAll();

    if (filter?.language) {
      const lang = filter.language.toLowerCase();
      results = results.filter(
        (s) => s.language?.toLowerCase() === lang,
      );
    }

    if (filter?.tags && filter.tags.length > 0) {
      const filterTags = new Set(filter.tags.map((t) => t.toLowerCase()));
      results = results.filter((s) =>
        s.tags.some((t) => filterTags.has(t.toLowerCase())),
      );
    }

    return results;
  }
}
