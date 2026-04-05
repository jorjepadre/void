/**
 * HookRegistry — manages registration, lookup, and loading
 * of hook definitions from in-memory and YAML files.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import YAML from 'yaml';
import { HookDefinitionSchema } from '../config/schemas.js';
import type { HookDefinition, HookEventType } from '../types/hook.js';

export class HookRegistry {
  private readonly _hooks = new Map<string, HookDefinition>();

  /**
   * Register a hook definition. Overwrites if the id already exists.
   */
  register(hook: HookDefinition): void {
    this._hooks.set(hook.id, hook);
  }

  /**
   * Remove a hook by id.
   */
  unregister(id: string): void {
    this._hooks.delete(id);
  }

  /**
   * Get a single hook by id.
   */
  get(id: string): HookDefinition | undefined {
    return this._hooks.get(id);
  }

  /**
   * Get all registered hooks.
   */
  getAll(): HookDefinition[] {
    return [...this._hooks.values()];
  }

  /**
   * Get all hooks that listen for a specific event type.
   */
  getByEvent(event: HookEventType): HookDefinition[] {
    return this.getAll().filter((h) => h.event === event);
  }

  /**
   * Load hook definitions from YAML files in a directory.
   * Supports .yml and .yaml extensions. Each file may contain
   * a single hook object or an array of hooks.
   */
  async loadFromDirectory(dirPath: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dirPath);
    } catch {
      // Directory doesn't exist or isn't readable — skip silently
      return;
    }

    const yamlFiles = entries.filter((entry) => {
      const ext = extname(entry).toLowerCase();
      return ext === '.yml' || ext === '.yaml';
    });

    for (const file of yamlFiles) {
      const filePath = join(dirPath, file);
      try {
        const content = await readFile(filePath, 'utf-8');
        const parsed: unknown = YAML.parse(content);

        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          const result = HookDefinitionSchema.safeParse(item);
          if (result.success) {
            this._hooks.set(result.data.id, result.data);
          }
        }
      } catch {
        // Invalid YAML or parse error — skip file
      }
    }
  }
}
