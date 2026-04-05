/**
 * LLMProvider — abstract base class for all LLM provider adapters.
 * Defines the standard interface for model listing, availability checks,
 * and completion requests.
 */

import type { ProviderType, ModelConfig } from '../types/provider.js';

export interface CompletionRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
  tools?: unknown[];
}

export interface CompletionResponse {
  content: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  finishReason: string;
}

export abstract class LLMProvider {
  abstract readonly type: ProviderType;
  abstract readonly displayName: string;

  /**
   * Checks if the provider is available (API key present, endpoint reachable).
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Returns the list of models supported by this provider.
   */
  abstract listModels(): ModelConfig[];

  /**
   * Sends a completion request to the provider's API.
   */
  abstract complete(opts: CompletionRequest): Promise<CompletionResponse>;
}
