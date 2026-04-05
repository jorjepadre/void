/**
 * ModelRouter — routes completion requests to the best available provider/model
 * based on task type, cost constraints, and provider availability.
 */

import type { ModelRoute } from '../types/provider.js';
import type { LLMProvider } from './base.js';

export class ModelRouter {
  private readonly _providers: Map<string, LLMProvider>;
  private readonly _routes: ModelRoute[];

  constructor(providers: LLMProvider[], routes: ModelRoute[]) {
    this._providers = new Map();
    for (const p of providers) {
      this._providers.set(p.type, p);
    }
    this._routes = routes;
  }

  /**
   * Finds the best available provider and model for the given task type.
   * Walks the routing table in order, checking provider availability and cost.
   * Falls back through preferred -> fallback for each matching route.
   */
  async route(
    taskType: string,
    opts?: { maxCost?: number }
  ): Promise<{ provider: LLMProvider; model: string }> {
    // Find all routes matching this task type
    const matchingRoutes = this._routes.filter((r) => r.task_type === taskType);

    // Also include wildcard routes
    const wildcardRoutes = this._routes.filter((r) => r.task_type === '*');

    const candidates = [...matchingRoutes, ...wildcardRoutes];

    for (const route of candidates) {
      // Check cost constraint
      if (opts?.maxCost !== undefined && route.max_cost_per_1k !== undefined) {
        if (route.max_cost_per_1k > opts.maxCost) continue;
      }

      // Try preferred provider
      const preferred = this._providers.get(route.preferred_provider);
      if (preferred && (await preferred.isAvailable())) {
        const model = this._findModel(preferred, route.preferred_model, opts?.maxCost);
        if (model) {
          return { provider: preferred, model };
        }
      }

      // Try fallback provider
      if (route.fallback_provider && route.fallback_model) {
        const fallback = this._providers.get(route.fallback_provider);
        if (fallback && (await fallback.isAvailable())) {
          const model = this._findModel(fallback, route.fallback_model, opts?.maxCost);
          if (model) {
            return { provider: fallback, model };
          }
        }
      }
    }

    // Last resort: find any available provider with any model under cost
    for (const [_type, provider] of this._providers) {
      if (await provider.isAvailable()) {
        const models = provider.listModels();
        const cheapest = this._cheapestModel(models, opts?.maxCost);
        if (cheapest) {
          return { provider, model: cheapest };
        }
      }
    }

    throw new Error(
      `No available provider found for task type "${taskType}"` +
        (opts?.maxCost !== undefined ? ` within cost limit ${opts.maxCost}` : '')
    );
  }

  /**
   * Finds a specific model on a provider, respecting cost limits.
   */
  private _findModel(
    provider: LLMProvider,
    modelId: string,
    maxCost?: number
  ): string | null {
    const models = provider.listModels();
    const model = models.find((m) => m.id === modelId);

    if (!model) {
      // Model not in list but might still work (e.g., Ollama dynamic models)
      return modelId;
    }

    if (maxCost !== undefined) {
      const avgCost = (model.costPer1kInput + model.costPer1kOutput) / 2;
      if (avgCost > maxCost) return null;
    }

    return model.id;
  }

  /**
   * Finds the cheapest model within cost constraint.
   */
  private _cheapestModel(
    models: Array<{ id: string; costPer1kInput: number; costPer1kOutput: number }>,
    maxCost?: number
  ): string | null {
    let cheapest: { id: string; cost: number } | null = null;

    for (const m of models) {
      const avgCost = (m.costPer1kInput + m.costPer1kOutput) / 2;

      if (maxCost !== undefined && avgCost > maxCost) continue;

      if (!cheapest || avgCost < cheapest.cost) {
        cheapest = { id: m.id, cost: avgCost };
      }
    }

    return cheapest?.id ?? null;
  }
}
