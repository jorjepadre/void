/**
 * OptimizeWorker — checks memory store size and runs garbage collection on expired entries.
 * Logs optimization actions taken.
 */

import { Worker } from '../base.js';
import type { VoidLogger } from '../../core/logger.js';
import type { MemoryStore } from '../../memory/store.js';

const WARN_THRESHOLD = 10_000;

export class OptimizeWorker extends Worker {
  readonly id = 'optimize';
  readonly name = 'Memory Optimizer';

  private readonly _logger: VoidLogger;
  private readonly _store: MemoryStore;

  constructor(logger: VoidLogger, store: MemoryStore) {
    super();
    this._logger = logger;
    this._store = store;
  }

  async execute(): Promise<void> {
    // Check total entry count
    const entries = this._store.list(undefined, 1, 0);
    const totalEstimate = entries.length;

    // Run garbage collection on expired entries
    const gcCount = this._store.gc();

    if (gcCount > 0) {
      this._logger.info('Optimize: garbage collected expired entries', {
        removed: gcCount,
      });
    }

    if (totalEstimate >= WARN_THRESHOLD) {
      this._logger.warn('Optimize: memory store size exceeds threshold', {
        estimated: totalEstimate,
        threshold: WARN_THRESHOLD,
      });
    }

    this._logger.debug('Optimize: cycle complete', {
      gcRemoved: gcCount,
    });
  }
}
