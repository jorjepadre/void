/**
 * LoopGuard — 5-layer anti-reentrance protection for session recording.
 * Prevents infinite loops from hooks triggering sessions that trigger hooks.
 */

export class LoopGuard {
  private readonly _throttleMap = new Map<string, number>();
  private readonly _guardedSessions = new Set<string>();

  /**
   * Layer 1: Checks if we are currently inside a hook execution context.
   * Uses the VOID_IN_HOOK environment variable set by the hook runner.
   */
  isInHookContext(): boolean {
    return process.env['VOID_IN_HOOK'] === '1';
  }

  /**
   * Layer 2: Rate-limits operations per key. Returns true if the key
   * has been called within the last intervalMs milliseconds.
   */
  isThrottled(key: string, intervalMs: number): boolean {
    const now = Date.now();
    const lastCall = this._throttleMap.get(key);

    if (lastCall !== undefined && now - lastCall < intervalMs) {
      return true;
    }

    this._throttleMap.set(key, now);
    return false;
  }

  /**
   * Layer 3: Probabilistic sampling. Returns true if a random value
   * falls within the sample rate (0 = never sample, 1 = always sample).
   */
  shouldSample(rate: number): boolean {
    if (rate <= 0) return false;
    if (rate >= 1) return true;
    return Math.random() < rate;
  }

  /**
   * Layer 4: Detects recursion via VOID_RECURSION_DEPTH env var.
   * Returns true if the current depth exceeds the safe threshold (3).
   */
  isRecursionDetected(): boolean {
    const depth = parseInt(process.env['VOID_RECURSION_DEPTH'] ?? '0', 10);
    return !isNaN(depth) && depth > 3;
  }

  /**
   * Layer 5: Prevents learning from learning sessions.
   * Sessions marked as guarded will not be processed.
   */
  isSessionGuarded(sessionId: string): boolean {
    return this._guardedSessions.has(sessionId);
  }

  /**
   * Marks a session as guarded (used when a learning session is created).
   */
  guardSession(sessionId: string): void {
    this._guardedSessions.add(sessionId);
  }

  /**
   * Removes a session's guard.
   */
  unguardSession(sessionId: string): void {
    this._guardedSessions.delete(sessionId);
  }

  /**
   * Master check: all 5 layers must pass for processing to proceed.
   * Returns true if it is safe to process the session.
   */
  shouldProcess(sessionId: string): boolean {
    // Layer 1: Not in hook context
    if (this.isInHookContext()) return false;

    // Layer 2: Not throttled (use session ID as key, 1s interval)
    if (this.isThrottled(`session:${sessionId}`, 1000)) return false;

    // Layer 3: Sampling always passes for real sessions (rate = 1)
    // Subclasses or callers can override this behavior
    if (!this.shouldSample(1)) return false;

    // Layer 4: No recursion detected
    if (this.isRecursionDetected()) return false;

    // Layer 5: Session not guarded
    if (this.isSessionGuarded(sessionId)) return false;

    return true;
  }
}
