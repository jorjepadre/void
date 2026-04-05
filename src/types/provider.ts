/**
 * Provider types — LLM provider configuration and routing.
 */

export type ProviderType = 'anthropic' | 'openai' | 'google' | 'ollama';

export interface ModelConfig {
  id: string;
  name: string;
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  capabilities: string[];
}

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  baseUrl?: string;
  models: ModelConfig[];
}

export interface ModelRoute {
  task_type: string;
  preferred_provider: ProviderType;
  preferred_model: string;
  fallback_provider?: ProviderType;
  fallback_model?: string;
  max_cost_per_1k?: number;
}
