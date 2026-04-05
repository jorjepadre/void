/**
 * HarnessRegistry — manages registration and lookup of harness adapters.
 */

import type { HarnessType, HarnessAdapter } from '../types/harness.js';
import { ClaudeCodeAdapter } from './adapters/claude-code.js';
import { CodexAdapter } from './adapters/codex.js';
import { CursorAdapter } from './adapters/cursor.js';
import { CoworkAdapter } from './adapters/cowork.js';
import { GeminiAdapter } from './adapters/gemini.js';
import { KiroAdapter } from './adapters/kiro.js';
import { OpenCodeAdapter } from './adapters/opencode.js';
import { GenericAdapter } from './adapters/generic.js';

export class HarnessRegistry {
  private readonly adapters = new Map<HarnessType, HarnessAdapter>();

  /** Register an adapter. Overwrites any existing adapter for the same type. */
  register(adapter: HarnessAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  /** Get an adapter by harness type. */
  get(type: HarnessType): HarnessAdapter | undefined {
    return this.adapters.get(type);
  }

  /** Get all registered adapters. */
  getAll(): HarnessAdapter[] {
    return Array.from(this.adapters.values());
  }

  /** Get the internal adapter map (used by detectHarness). */
  getAdapterMap(): Map<HarnessType, HarnessAdapter> {
    return this.adapters;
  }

  /** Create a registry with all 8 built-in adapters registered. */
  static createDefaultRegistry(): HarnessRegistry {
    const registry = new HarnessRegistry();
    registry.register(new ClaudeCodeAdapter());
    registry.register(new CodexAdapter());
    registry.register(new CursorAdapter());
    registry.register(new CoworkAdapter());
    registry.register(new GeminiAdapter());
    registry.register(new KiroAdapter());
    registry.register(new OpenCodeAdapter());
    registry.register(new GenericAdapter());
    return registry;
  }
}
