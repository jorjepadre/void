/**
 * MemoryGCWorker — garbage collects expired memory entries and compacts namespaces.
 * Runs the store's built-in GC and reports on namespace health.
 */

import { Worker } from '../base.js';
import type { VoidLogger } from '../../core/logger.js';
import type { MemoryStore } from '../../memory/store.js';

const KNOWN_NAMESPACES = [
  'default',
  'sessions',
  'instincts',
  'agents',
  'tasks',
  'metrics',
];

export class MemoryGCWorker extends Worker {
  readonly id = 'memory-gc';
  readonly name = 'Memory Garbage Collector';

  private readonly _logger: VoidLogger;
  private readonly _store: MemoryStore;

  constructor(logger: VoidLogger, store: MemoryStore) {
    super();
    this._logger = logger;
    this._store = store;
  }

  async execute(): Promise<void> {
    // Run garbage collection
    const removed = this._store.gc();

    // Check namespace sizes for compaction reporting
    const namespaceSizes: Record<string, number> = {};
    for (const ns of KNOWN_NAMESPACES) {
      const entries = this._store.list(ns, 1);
      namespaceSizes[ns] = entries.length;
    }

    if (removed > 0) {
      this._logger.info('MemoryGC: collected expired entries', {
        removed,
        namespaces: namespaceSizes,
      });
    } else {
      this._logger.debug('MemoryGC: no expired entries', {
        namespaces: namespaceSizes,
      });
    }
  }
}
