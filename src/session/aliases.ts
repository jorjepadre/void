/**
 * SessionAliases — human-friendly names for session IDs.
 * Supports 'latest', 'active', custom aliases, and raw ID lookup.
 */

import type { SessionStore } from './store.js';

export class SessionAliases {
  private readonly _aliases = new Map<string, string>();

  /**
   * Sets an alias name for a session ID.
   */
  set(name: string, sessionId: string): void {
    this._aliases.set(name, sessionId);
  }

  /**
   * Gets the session ID for an alias, or undefined if not found.
   */
  get(name: string): string | undefined {
    return this._aliases.get(name);
  }

  /**
   * Resolves a name or ID to a session ID.
   * - 'latest': finds the most recent session in the store
   * - 'active': finds the currently active session
   * - Otherwise: tries alias map, then raw ID lookup
   * Returns null if nothing matches.
   */
  resolve(nameOrId: string, store: SessionStore): string | null {
    if (nameOrId === 'latest') {
      const sessions = store.listSessions({ limit: 1 });
      return sessions[0]?.id ?? null;
    }

    if (nameOrId === 'active') {
      const active = store.listSessions({ status: 'active', limit: 1 });
      return active[0]?.id ?? null;
    }

    // Try alias
    const aliased = this._aliases.get(nameOrId);
    if (aliased) return aliased;

    // Try raw ID
    const session = store.getSession(nameOrId);
    return session?.id ?? null;
  }

  /**
   * Lists all registered aliases.
   */
  list(): Array<{ name: string; sessionId: string }> {
    const result: Array<{ name: string; sessionId: string }> = [];
    for (const [name, sessionId] of this._aliases) {
      result.push({ name, sessionId });
    }
    return result;
  }
}
