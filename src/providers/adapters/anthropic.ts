/**
 * AnthropicProvider — LLM provider adapter for Anthropic's Claude API.
 * Uses native fetch for HTTP requests to api.anthropic.com.
 */

import type { ProviderType, ModelConfig } from '../../types/provider.js';
import { LLMProvider, type CompletionRequest, type CompletionResponse } from '../base.js';

const API_BASE = 'https://api.anthropic.com';
const API_VERSION = '2023-06-01';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text?: string }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicError {
  type: string;
  error: {
    type: string;
    message: string;
  };
}

const MODELS: ModelConfig[] = [
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    maxTokens: 32768,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    capabilities: ['coding', 'analysis', 'creative', 'agentic'],
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    maxTokens: 16384,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    capabilities: ['coding', 'analysis', 'creative', 'agentic'],
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    maxTokens: 8192,
    costPer1kInput: 0.001,
    costPer1kOutput: 0.005,
    capabilities: ['coding', 'analysis', 'fast'],
  },
];

export class AnthropicProvider extends LLMProvider {
  readonly type: ProviderType = 'anthropic';
  readonly displayName = 'Anthropic';

  private readonly _baseUrl: string;

  constructor(baseUrl?: string) {
    super();
    this._baseUrl = baseUrl ?? API_BASE;
  }

  async isAvailable(): Promise<boolean> {
    return typeof process.env['ANTHROPIC_API_KEY'] === 'string' &&
      process.env['ANTHROPIC_API_KEY'].length > 0;
  }

  listModels(): ModelConfig[] {
    return [...MODELS];
  }

  async complete(opts: CompletionRequest): Promise<CompletionResponse> {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    // Extract system message and convert remaining to Anthropic format
    let systemPrompt: string | undefined;
    const messages: AnthropicMessage[] = [];

    for (const msg of opts.messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
      } else {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    const body: Record<string, unknown> = {
      model: opts.model,
      messages,
      max_tokens: opts.maxTokens ?? 4096,
    };

    if (systemPrompt) {
      body['system'] = systemPrompt;
    }

    if (opts.temperature !== undefined) {
      body['temperature'] = opts.temperature;
    }

    if (opts.tools && opts.tools.length > 0) {
      body['tools'] = opts.tools;
    }

    const response = await fetch(`${this._baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = (await response.json()) as AnthropicError;
      throw new Error(
        `Anthropic API error (${response.status}): ${errorBody.error?.message ?? 'Unknown error'}`
      );
    }

    const data = (await response.json()) as AnthropicResponse;

    const textContent = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('');

    return {
      content: textContent,
      model: data.model,
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      },
      finishReason: data.stop_reason,
    };
  }
}
