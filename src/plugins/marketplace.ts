/**
 * PluginMarketplace — local catalog of available plugins.
 * Reads from library/plugins/_index.yaml if it exists.
 * No remote fetching in v1.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { PluginManifest } from '../types/plugin.js';

interface CatalogEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  capabilities: string[];
  hooks?: string[];
  tools?: string[];
  dependencies?: string[];
}

export class PluginMarketplace {
  private catalog: PluginManifest[] = [];
  private readonly catalogPath: string;

  constructor(catalogPath?: string) {
    this.catalogPath = catalogPath ?? 'library/plugins/_index.yaml';
  }

  /**
   * Load the catalog from disk. Call this before search/list/getInfo.
   */
  async load(): Promise<void> {
    if (!existsSync(this.catalogPath)) {
      this.catalog = [];
      return;
    }

    try {
      const raw = await readFile(this.catalogPath, 'utf-8');
      const parsed: unknown = parseYaml(raw);
      if (!Array.isArray(parsed)) {
        this.catalog = [];
        return;
      }
      this.catalog = (parsed as CatalogEntry[]).map((entry) => ({
        id: entry.id,
        name: entry.name,
        version: entry.version,
        description: entry.description,
        author: entry.author,
        capabilities: entry.capabilities ?? [],
        hooks: entry.hooks,
        tools: entry.tools,
        dependencies: entry.dependencies,
      }));
    } catch {
      this.catalog = [];
    }
  }

  /**
   * Search the catalog by name, description, or capability.
   */
  search(query: string): PluginManifest[] {
    const q = query.toLowerCase();
    return this.catalog.filter((p) => {
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.description.toLowerCase().includes(q)) return true;
      if (p.capabilities.some((c) => c.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  /**
   * List all plugins in the catalog.
   */
  list(): PluginManifest[] {
    return [...this.catalog];
  }

  /**
   * Get a single plugin's manifest by id.
   */
  getInfo(id: string): PluginManifest | undefined {
    return this.catalog.find((p) => p.id === id);
  }
}
