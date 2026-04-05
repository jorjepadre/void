/**
 * LearnWorker — analyzes recent sessions for patterns and extracts instincts.
 * Scans memory for session data and identifies recurring patterns worth promoting to instincts.
 */

import { Worker } from '../base.js';
import type { VoidLogger } from '../../core/logger.js';
import type { MemoryStore } from '../../memory/store.js';

export class LearnWorker extends Worker {
  readonly id = 'learn';
  readonly name = 'Pattern Learner';

  private readonly _logger: VoidLogger;
  private readonly _store: MemoryStore;

  constructor(logger: VoidLogger, store: MemoryStore) {
    super();
    this._logger = logger;
    this._store = store;
  }

  async execute(): Promise<void> {
    // Read recent session entries from memory
    const sessions = this._store.list('sessions', 50);
    const instincts = this._store.list('instincts', 100);

    const sessionCount = sessions.length;
    const instinctCount = instincts.length;

    // Analyze session data for recurring patterns
    const tagFrequency = new Map<string, number>();
    for (const entry of sessions) {
      for (const tag of entry.tags) {
        tagFrequency.set(tag, (tagFrequency.get(tag) ?? 0) + 1);
      }
    }

    // Identify high-frequency tags that might indicate patterns worth learning
    const threshold = Math.max(3, Math.floor(sessionCount * 0.3));
    const candidates: string[] = [];
    for (const [tag, count] of tagFrequency) {
      if (count >= threshold) {
        candidates.push(tag);
      }
    }

    if (candidates.length > 0) {
      this._logger.info('Learn: detected recurring patterns', {
        candidates,
        sessionCount,
        instinctCount,
      });

      // Store candidate patterns as potential instincts
      for (const candidate of candidates) {
        const key = `candidate-${candidate}`;
        this._store.set(key, JSON.stringify({ tag: candidate, detectedAt: Date.now() }), {
          namespace: 'instincts',
          tags: ['auto-detected'],
          ttl: 86_400_000, // 24 hours
        });
      }
    } else {
      this._logger.debug('Learn: no new patterns detected', {
        sessionCount,
        instinctCount,
      });
    }
  }
}
