/**
 * PluginRegistry — in-memory store for registered plugins and their state.
 */

import type { PluginManifest, PluginState } from '../types/plugin.js';

interface PluginEntry {
  manifest: PluginManifest;
  state: PluginState;
}

export class PluginRegistry {
  private readonly plugins = new Map<string, PluginEntry>();

  /**
   * Register a plugin manifest. Initial state is 'installed'.
   */
  register(manifest: PluginManifest): void {
    this.plugins.set(manifest.id, {
      manifest,
      state: 'installed',
    });
  }

  /**
   * Remove a plugin from the registry.
   */
  unregister(id: string): void {
    this.plugins.delete(id);
  }

  /**
   * Get a plugin entry by id, or undefined if not found.
   */
  get(id: string): { manifest: PluginManifest; state: PluginState } | undefined {
    return this.plugins.get(id);
  }

  /**
   * Return all registered plugin entries.
   */
  getAll(): Array<{ manifest: PluginManifest; state: PluginState }> {
    return Array.from(this.plugins.values());
  }

  /**
   * Return manifests of all plugins in 'active' state.
   */
  getActive(): PluginManifest[] {
    const active: PluginManifest[] = [];
    for (const entry of this.plugins.values()) {
      if (entry.state === 'active') {
        active.push(entry.manifest);
      }
    }
    return active;
  }

  /**
   * Update a plugin's state. Throws if plugin not found.
   */
  setState(id: string, state: PluginState): void {
    const entry = this.plugins.get(id);
    if (!entry) {
      throw new Error(`Plugin not found: ${id}`);
    }
    entry.state = state;
  }

  /**
   * Find all plugins that declare a given capability.
   */
  findByCapability(capability: string): PluginManifest[] {
    const results: PluginManifest[] = [];
    for (const entry of this.plugins.values()) {
      if (entry.manifest.capabilities.includes(capability)) {
        results.push(entry.manifest);
      }
    }
    return results;
  }
}
