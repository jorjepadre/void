/**
 * MonitorWorker — collects metrics and logs health status.
 * Reports on memory entry count, session count, agent count, and system health.
 */

import { Worker } from '../base.js';
import type { VoidLogger } from '../../core/logger.js';
import type { MemoryStore } from '../../memory/store.js';
import type { AgentManager } from '../../core/agent.js';

export class MonitorWorker extends Worker {
  readonly id = 'monitor';
  readonly name = 'Health Monitor';

  private readonly _logger: VoidLogger;
  private readonly _store: MemoryStore;
  private readonly _agents: AgentManager;

  constructor(logger: VoidLogger, store: MemoryStore, agents: AgentManager) {
    super();
    this._logger = logger;
    this._store = store;
    this._agents = agents;
  }

  async execute(): Promise<void> {
    // Collect memory metrics
    const allEntries = this._store.list(undefined, 1);
    const sessionEntries = this._store.list('sessions', 1);

    // Collect agent metrics
    const allAgents = this._agents.listAgents();
    const idleAgents = this._agents.listAgents('idle');
    const workingAgents = this._agents.listAgents('working');
    const errorAgents = this._agents.listAgents('error');

    // Collect process metrics
    const memUsage = process.memoryUsage();

    const metrics = {
      memoryEntries: allEntries.length,
      sessionCount: sessionEntries.length,
      agents: {
        total: allAgents.length,
        idle: idleAgents.length,
        working: workingAgents.length,
        error: errorAgents.length,
      },
      process: {
        heapUsedMb: Math.round(memUsage.heapUsed / 1_048_576),
        rssMb: Math.round(memUsage.rss / 1_048_576),
      },
    };

    // Store metrics snapshot in memory
    const key = `health-${Date.now()}`;
    this._store.set(key, JSON.stringify(metrics), {
      namespace: 'metrics',
      tags: ['health', 'auto'],
      ttl: 3_600_000, // 1 hour retention
    });

    this._logger.info('Monitor: health snapshot', metrics);
  }
}
