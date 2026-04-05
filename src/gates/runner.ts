/**
 * GateRunner — executes quality and security gate checks.
 * Gates are registered check functions that evaluate a context
 * and return pass/fail results with violation details.
 */

import type { GateContext, GateResult } from '../types/gate.js';

type GateCheck = (ctx: GateContext) => Promise<GateResult>;

export class GateRunner {
  private readonly _checks = new Map<string, GateCheck>();

  /**
   * Register a named gate check function.
   */
  registerCheck(id: string, check: GateCheck): void {
    this._checks.set(id, check);
  }

  /**
   * Run a single gate check by id.
   * Throws if the check is not registered.
   */
  async run(checkId: string, context: GateContext): Promise<GateResult> {
    const check = this._checks.get(checkId);
    if (!check) {
      throw new Error(`Gate check not registered: ${checkId}`);
    }
    try {
      return await check(context);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        passed: false,
        violations: [
          {
            severity: 'error',
            message: `Gate check "${checkId}" threw: ${message}`,
            rule: checkId,
          },
        ],
        auto_fixed: false,
      };
    }
  }

  /**
   * Run all registered gate checks against the given context.
   */
  async runAll(context: GateContext): Promise<GateResult[]> {
    const results: GateResult[] = [];
    for (const [id] of this._checks) {
      const result = await this.run(id, context);
      results.push(result);
    }
    return results;
  }
}
