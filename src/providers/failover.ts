/**
 * FailoverProvider — wraps a primary and fallback LLM provider.
 * Tries the primary first; on failure, transparently falls back to the secondary.
 */

import type { ProviderType, ModelConfig } from '../types/provider.js';
import { LLMProvider, type CompletionRequest, type CompletionResponse } from './base.js';

export class FailoverProvider extends LLMProvider {
  readonly type: ProviderType;
  readonly displayName: string;

  private readonly _primary: LLMProvider;
  private readonly _fallback: LLMProvider;

  constructor(primary: LLMProvider, fallback: LLMProvider) {
    super();
    this._primary = primary;
    this._fallback = fallback;
    this.type = primary.type;
    this.displayName = `${primary.displayName} (failover: ${fallback.displayName})`;
  }

  /**
   * Returns true if either the primary or fallback provider is available.
   */
  async isAvailable(): Promise<boolean> {
    const [primaryAvail, fallbackAvail] = await Promise.all([
      this._primary.isAvailable().catch(() => false),
      this._fallback.isAvailable().catch(() => false),
    ]);
    return primaryAvail || fallbackAvail;
  }

  /**
   * Returns models from both providers, primary first.
   */
  listModels(): ModelConfig[] {
    const primaryModels = this._primary.listModels();
    const fallbackModels = this._fallback.listModels();
    const seen = new Set(primaryModels.map((m) => m.id));

    const merged = [...primaryModels];
    for (const m of fallbackModels) {
      if (!seen.has(m.id)) {
        merged.push(m);
      }
    }
    return merged;
  }

  /**
   * Tries the primary provider first. On any error, retries with the fallback.
   */
  async complete(opts: CompletionRequest): Promise<CompletionResponse> {
    try {
      return await this._primary.complete(opts);
    } catch (primaryError) {
      try {
        return await this._fallback.complete(opts);
      } catch (fallbackError) {
        // Both failed — throw a combined error
        const primaryMsg =
          primaryError instanceof Error ? primaryError.message : String(primaryError);
        const fallbackMsg =
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError);

        throw new Error(
          `Both providers failed. Primary (${this._primary.displayName}): ${primaryMsg}. ` +
            `Fallback (${this._fallback.displayName}): ${fallbackMsg}.`
        );
      }
    }
  }
}
