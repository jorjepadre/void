/**
 * Plugin types — extensibility system for Void.
 */

export type PluginState = 'installed' | 'active' | 'disabled' | 'error';

export interface PluginManifest {
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
