/**
 * Worker — abstract base class for periodic background workers.
 * Subclasses implement execute() to define one execution cycle.
 */

export abstract class Worker {
  abstract readonly id: string;
  abstract readonly name: string;

  private _running = false;
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _lastRun: number | null = null;
  private _runCount = 0;

  /**
   * One execution cycle. Implemented by subclasses.
   */
  abstract execute(): Promise<void>;

  /**
   * Starts periodic execution at the given interval.
   */
  start(intervalMs: number): void {
    if (this._running) {
      return;
    }
    this._running = true;

    this._intervalId = setInterval(() => {
      void this._run();
    }, intervalMs);

    // Run immediately on start
    void this._run();
  }

  /**
   * Stops periodic execution.
   */
  stop(): void {
    if (!this._running) {
      return;
    }
    this._running = false;
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  /**
   * Returns whether the worker is currently running.
   */
  isRunning(): boolean {
    return this._running;
  }

  /**
   * Returns the timestamp of the last execution, or null if never run.
   */
  getLastRun(): number | null {
    return this._lastRun;
  }

  /**
   * Returns the total number of completed execution cycles.
   */
  getRunCount(): number {
    return this._runCount;
  }

  private async _run(): Promise<void> {
    try {
      await this.execute();
      this._lastRun = Date.now();
      this._runCount++;
    } catch {
      // Worker errors are silently absorbed to prevent crashing the loop.
      // Subclasses should handle their own error logging.
      this._lastRun = Date.now();
    }
  }
}
