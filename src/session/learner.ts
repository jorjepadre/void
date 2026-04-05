/**
 * SessionLearner — orchestrates learning from completed sessions.
 * Combines SessionAnalyzer for pattern detection and InstinctExtractor
 * for converting high-confidence patterns into behavioral instincts.
 */

import type { LearnedPattern } from '../types/session.js';
import type { Instinct } from '../types/instinct.js';
import type { SessionStore } from './store.js';
import type { SessionAnalyzer } from './analyzer.js';
import type { InstinctExtractor } from '../instincts/extractor.js';

export class SessionLearner {
  private readonly _store: SessionStore;
  private readonly _analyzer: SessionAnalyzer;
  private readonly _extractor: InstinctExtractor;

  constructor(
    store: SessionStore,
    analyzer: SessionAnalyzer,
    extractor: InstinctExtractor
  ) {
    this._store = store;
    this._analyzer = analyzer;
    this._extractor = extractor;
  }

  /**
   * Learns from a completed session by:
   * 1. Fetching all session events
   * 2. Running the analyzer to detect patterns
   * 3. Running the extractor to convert high-confidence patterns to instincts
   */
  async learnFromSession(
    sessionId: string
  ): Promise<{ patterns: LearnedPattern[]; instincts: Instinct[] }> {
    const events = this._store.getSessionEvents(sessionId);

    if (events.length === 0) {
      return { patterns: [], instincts: [] };
    }

    const patterns = this._analyzer.analyzeSession(events);
    const instincts = this._extractor.extractFromPatterns(patterns);

    return { patterns, instincts };
  }
}
