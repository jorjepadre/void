/**
 * SessionRecorder — manages active session lifecycle and event recording.
 * Wraps SessionStore with convenience methods for recording and tracking.
 */

import crypto from 'node:crypto';
import type { SessionEvent } from '../types/session.js';
import type { SessionStore } from './store.js';

export class SessionRecorder {
  private readonly _store: SessionStore;
  private _activeSessionId: string | null = null;

  constructor(store: SessionStore) {
    this._store = store;
  }

  /**
   * Creates a new session and marks it as the active session.
   * Returns the generated session ID.
   */
  async startSession(
    harness: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const id = crypto.randomUUID();
    this._store.createSession(id, harness, metadata);
    this._activeSessionId = id;
    return id;
  }

  /**
   * Records an event to the specified session.
   * Automatically adds session_id and ISO timestamp.
   */
  async recordEvent(
    sessionId: string,
    event: Omit<SessionEvent, 'session_id' | 'timestamp'>
  ): Promise<void> {
    const fullEvent: SessionEvent = {
      ...event,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
    };
    this._store.addSessionEvent(fullEvent);
  }

  /**
   * Marks a session as completed and clears active session if it matches.
   */
  async endSession(sessionId: string): Promise<void> {
    this._store.endSession(sessionId, 'completed');
    if (this._activeSessionId === sessionId) {
      this._activeSessionId = null;
    }
  }

  /**
   * Marks a session as aborted and clears active session if it matches.
   */
  async abortSession(sessionId: string): Promise<void> {
    this._store.endSession(sessionId, 'aborted');
    if (this._activeSessionId === sessionId) {
      this._activeSessionId = null;
    }
  }

  /**
   * Returns the currently active session ID, or null if none.
   */
  getActiveSession(): string | null {
    return this._activeSessionId;
  }
}
