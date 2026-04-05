/**
 * WorkerManager — registry and lifecycle manager for Worker instances.
 * Start, stop, and query workers individually or in bulk.
 */

import type { Worker } from './base.js';

const DEFAULT_INTERVAL_MS = 60_000;

export class WorkerManager {
  private readonly _workers = new Map<string, Worker>();

  /**
   * Registers a worker. Throws if a worker with the same ID already exists.
   */
  register(worker: Worker): void {
    if (this._workers.has(worker.id)) {
      throw new Error(`Worker already registered: ${worker.id}`);
    }
    this._workers.set(worker.id, worker);
  }

  /**
   * Starts all registered workers at the specified interval.
   */
  startAll(intervalMs?: number): void {
    const ms = intervalMs ?? DEFAULT_INTERVAL_MS;
    for (const worker of this._workers.values()) {
      if (!worker.isRunning()) {
        worker.start(ms);
      }
    }
  }

  /**
   * Stops all registered workers.
   */
  stopAll(): void {
    for (const worker of this._workers.values()) {
      worker.stop();
    }
  }

  /**
   * Starts a single worker by ID.
   */
  start(workerId: string, intervalMs?: number): void {
    const worker = this._workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker not found: ${workerId}`);
    }
    worker.start(intervalMs ?? DEFAULT_INTERVAL_MS);
  }

  /**
   * Stops a single worker by ID.
   */
  stop(workerId: string): void {
    const worker = this._workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker not found: ${workerId}`);
    }
    worker.stop();
  }

  /**
   * Returns status information for all registered workers.
   */
  getStatus(): Array<{
    id: string;
    name: string;
    running: boolean;
    lastRun: number | null;
    runCount: number;
  }> {
    return Array.from(this._workers.values()).map((w) => ({
      id: w.id,
      name: w.name,
      running: w.isRunning(),
      lastRun: w.getLastRun(),
      runCount: w.getRunCount(),
    }));
  }

  /**
   * Returns a worker by ID, or undefined if not found.
   */
  getWorker(id: string): Worker | undefined {
    return this._workers.get(id);
  }
}
