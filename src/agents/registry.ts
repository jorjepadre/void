/**
 * AgentRegistry — scans directories for YAML agent definitions,
 * parses them, and provides lookup/filter operations.
 */

import fg from 'fast-glob';
import { parseAgent } from './parser.js';
import type { AgentDefinition } from '../types/agent.js';

export class AgentRegistry {
  private agents = new Map<string, AgentDefinition>();
  private _loaded = false;

  constructor(private readonly directories: string[]) {}

  /**
   * Scans all configured directories for .yaml/.yml agent files,
   * parses each one, and caches the result.
   */
  async load(): Promise<void> {
    this.agents.clear();

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
      files.map((file) => parseAgent(file)),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const agent = result.value;
        this.agents.set(agent.id, agent);
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
   * Returns an agent definition by ID, or undefined if not found.
   */
  get(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  /**
   * Returns true if an agent with the given ID exists.
   */
  has(id: string): boolean {
    return this.agents.has(id);
  }

  /**
   * Returns all registered agents.
   */
  getAll(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * Returns agents matching the given filter criteria.
   */
  list(filter?: {
    language?: string;
    tags?: string[];
    capabilities?: string[];
  }): AgentDefinition[] {
    let results = this.getAll();

    if (filter?.language) {
      const lang = filter.language.toLowerCase();
      results = results.filter(
        (a) => a.language?.toLowerCase() === lang,
      );
    }

    if (filter?.tags && filter.tags.length > 0) {
      const filterTags = new Set(filter.tags.map((t) => t.toLowerCase()));
      results = results.filter((a) =>
        a.tags.some((t) => filterTags.has(t.toLowerCase())),
      );
    }

    if (filter?.capabilities && filter.capabilities.length > 0) {
      const filterCaps = new Set(
        filter.capabilities.map((c) => c.toLowerCase()),
      );
      results = results.filter((a) =>
        a.capabilities.some((c) => filterCaps.has(c.toLowerCase())),
      );
    }

    return results;
  }
}
