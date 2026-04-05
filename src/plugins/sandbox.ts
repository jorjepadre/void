/**
 * PluginSandbox — capability-based permission boundary for plugins.
 * Validates actions against declared capabilities and restricts filesystem access.
 */

import { resolve } from 'node:path';
import type { PluginManifest } from '../types/plugin.js';

/**
 * Maps capabilities to the actions they grant.
 */
const CAPABILITY_ACTIONS: Record<string, string[]> = {
  'fs:read': ['file.read', 'dir.list'],
  'fs:write': ['file.write', 'file.delete', 'dir.create', 'dir.delete'],
  'net:http': ['http.get', 'http.post', 'http.put', 'http.delete'],
  'process:spawn': ['process.exec', 'process.spawn'],
  'memory:read': ['memory.get', 'memory.search'],
  'memory:write': ['memory.set', 'memory.delete'],
  'hooks:register': ['hook.register', 'hook.unregister'],
  'tools:register': ['tool.register', 'tool.unregister'],
  'swarm:submit': ['swarm.submit', 'swarm.status'],
};

export class PluginSandbox {
  private readonly manifest: PluginManifest;
  private readonly workspacePath: string;
  private readonly allowedActions: Set<string>;

  constructor(manifest: PluginManifest, workspacePath: string) {
    this.manifest = manifest;
    this.workspacePath = resolve(workspacePath);

    // Build the set of allowed actions from declared capabilities
    this.allowedActions = new Set<string>();
    for (const cap of manifest.capabilities) {
      const actions = CAPABILITY_ACTIONS[cap];
      if (actions) {
        for (const action of actions) {
          this.allowedActions.add(action);
        }
      }
      // Also allow the capability name itself as an action
      this.allowedActions.add(cap);
    }
  }

  /**
   * Check whether the plugin declared a given capability.
   */
  hasCapability(cap: string): boolean {
    return this.manifest.capabilities.includes(cap);
  }

  /**
   * Validate whether an action is permitted by the plugin's declared capabilities.
   */
  validateAction(action: string): boolean {
    return this.allowedActions.has(action);
  }

  /**
   * Return the filesystem paths this plugin is allowed to access:
   * its own plugin directory and the workspace root.
   */
  getScopedPaths(): string[] {
    // Plugin gets access to its own directory (derived from id convention)
    // and the workspace path.
    // Defense-in-depth: reject path traversal attempts in plugin id
    if (this.manifest.id.includes('..') || this.manifest.id.includes('/') || this.manifest.id.includes('\\')) {
      throw new Error(`Invalid plugin id (path traversal): ${this.manifest.id}`);
    }
    const pluginsRoot = resolve(this.workspacePath, 'plugins');
    const pluginDir = resolve(pluginsRoot, this.manifest.id);
    if (!pluginDir.startsWith(pluginsRoot + '/') && pluginDir !== pluginsRoot) {
      throw new Error(`Plugin directory escapes plugins root: ${pluginDir}`);
    }
    return [pluginDir, this.workspacePath];
  }
}
