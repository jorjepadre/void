/**
 * OllamaProvider — LLM provider adapter for local Ollama instances.
 * Queries the Ollama REST API at localhost:11434.
 */

import type { ProviderType, ModelConfig } from '../../types/provider.js';
import { LLMProvider, type CompletionRequest, type CompletionResponse } from '../base.js';

const DEFAULT_BASE = 'http://localhost:11434';

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider extends LLMProvider {
  readonly type: ProviderType = 'ollama';
  readonly displayName = 'Ollama';

  private readonly _baseUrl: string;
  private _cachedModels: ModelConfig[] | null = null;

  constructor(baseUrl?: string) {
    super();
    this._baseUrl = baseUrl ?? DEFAULT_BASE;
  }

  /**
   * Checks if Ollama is running by hitting the root endpoint.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this._baseUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Queries the /api/tags endpoint and returns available models.
   * Results are cached until the next availability check.
   */
  listModels(): ModelConfig[] {
    // Return cached if available; caller should use listModelsAsync for fresh data
    return this._cachedModels ?? [];
  }

  /**
   * Async model listing — fetches from Ollama API.
   */
  async listModelsAsync(): Promise<ModelConfig[]> {
    try {
      const response = await fetch(`${this._baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this._cachedModels = [];
        return [];
      }

      const data = (await response.json()) as OllamaTagsResponse;

      this._cachedModels = data.models.map((m) => ({
        id: m.name,
        name: m.name,
        maxTokens: 4096,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        capabilities: ['coding', 'analysis'],
      }));

      return this._cachedModels;
    } catch {
      this._cachedModels = [];
      return [];
    }
  }

  async complete(opts: CompletionRequest): Promise<CompletionResponse> {
    const messages: OllamaChatMessage[] = opts.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const body: Record<string, unknown> = {
      model: opts.model,
      messages,
      stream: false,
    };

    const options: Record<string, unknown> = {};
    if (opts.temperature !== undefined) {
      options['temperature'] = opts.temperature;
    }
    if (opts.maxTokens !== undefined) {
      options['num_predict'] = opts.maxTokens;
    }
    if (Object.keys(options).length > 0) {
      body['options'] = options;
    }

    const response = await fetch(`${this._baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Ollama API error (${response.status}): ${text}`
      );
    }

    const data = (await response.json()) as OllamaChatResponse;

    return {
      content: data.message.content,
      model: data.model,
      usage: {
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
      },
      finishReason: data.done ? 'stop' : 'length',
    };
  }
}
