/**
 * PluginLoader — reads and validates plugin manifests from the filesystem.
 */

import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { loadYaml } from '../config/loader.js';
import type { PluginManifest } from '../types/plugin.js';

// Plugin IDs: alphanumeric + hyphens/underscores, 1-128 chars, no path traversal
const PluginIdSchema = z.string().regex(
  /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/,
  'Plugin id must be alphanumeric with hyphens/underscores, no path characters',
);

const PluginManifestSchema = z.object({
  id: PluginIdSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string(),
  author: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  hooks: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
});

export class PluginLoader {
  /**
   * Reads plugin.yaml from a plugin directory and validates it.
   */
  async loadManifest(pluginDir: string): Promise<PluginManifest> {
    const manifestPath = join(pluginDir, 'plugin.yaml');
    return loadYaml<PluginManifest>(manifestPath, PluginManifestSchema);
  }

  /**
   * Scans all subdirectories of pluginsDir for plugin.yaml manifests.
   * Skips directories that lack a valid manifest (logs warning, does not throw).
   */
  async loadAllFromDir(pluginsDir: string): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = [];

    let entries: string[];
    try {
      entries = await readdir(pluginsDir);
    } catch {
      return manifests;
    }

    for (const entry of entries) {
      const entryPath = join(pluginsDir, entry);
      try {
        const info = await stat(entryPath);
        if (!info.isDirectory()) continue;
        const manifest = await this.loadManifest(entryPath);
        manifests.push(manifest);
      } catch {
        // Skip directories without valid plugin.yaml
      }
    }

    return manifests;
  }
}
