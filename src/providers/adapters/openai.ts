/**
 * OpenAIProvider — LLM provider adapter for OpenAI's chat completions API.
 * Uses native fetch for HTTP requests to api.openai.com.
 */

import type { ProviderType, ModelConfig } from '../../types/provider.js';
import { LLMProvider, type CompletionRequest, type CompletionResponse } from '../base.js';

const API_BASE = 'https://api.openai.com';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
  };
  finish_reason: string;
}

interface OpenAIResponse {
  id: string;
  object: string;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIError {
  error: {
    message: string;
    type: string;
    code: string | null;
  };
}

const MODELS: ModelConfig[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    maxTokens: 16384,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    capabilities: ['coding', 'analysis', 'creative', 'vision'],
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    maxTokens: 4096,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
    capabilities: ['coding', 'analysis', 'creative'],
  },
  {
    id: 'o1',
    name: 'o1',
    maxTokens: 32768,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.06,
    capabilities: ['reasoning', 'coding', 'analysis'],
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    maxTokens: 16384,
    costPer1kInput: 0.0011,
    costPer1kOutput: 0.0044,
    capabilities: ['reasoning', 'coding', 'fast'],
  },
];

export class OpenAIProvider extends LLMProvider {
  readonly type: ProviderType = 'openai';
  readonly displayName = 'OpenAI';

  private readonly _baseUrl: string;

  constructor(baseUrl?: string) {
    super();
    this._baseUrl = baseUrl ?? API_BASE;
  }

  async isAvailable(): Promise<boolean> {
    return typeof process.env['OPENAI_API_KEY'] === 'string' &&
      process.env['OPENAI_API_KEY'].length > 0;
  }

  listModels(): ModelConfig[] {
    return [...MODELS];
  }

  async complete(opts: CompletionRequest): Promise<CompletionResponse> {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const messages: OpenAIMessage[] = opts.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const body: Record<string, unknown> = {
      model: opts.model,
      messages,
    };

    if (opts.maxTokens !== undefined) {
      body['max_tokens'] = opts.maxTokens;
    }

    if (opts.temperature !== undefined) {
      body['temperature'] = opts.temperature;
    }

    if (opts.tools && opts.tools.length > 0) {
      body['tools'] = opts.tools;
    }

    const response = await fetch(`${this._baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = (await response.json()) as OpenAIError;
      throw new Error(
        `OpenAI API error (${response.status}): ${errorBody.error?.message ?? 'Unknown error'}`
      );
    }

    const data = (await response.json()) as OpenAIResponse;

    const choice = data.choices[0];
    if (!choice) {
      throw new Error('OpenAI returned no choices');
    }

    return {
      content: choice.message.content ?? '',
      model: data.model,
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      },
      finishReason: choice.finish_reason,
    };
  }
}
