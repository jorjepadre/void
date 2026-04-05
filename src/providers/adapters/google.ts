/**
 * GoogleProvider — LLM provider adapter for Google's Gemini API.
 * Uses native fetch for HTTP requests to generativelanguage.googleapis.com.
 */

import type { ProviderType, ModelConfig } from '../../types/provider.js';
import { LLMProvider, type CompletionRequest, type CompletionResponse } from '../base.js';

const API_BASE = 'https://generativelanguage.googleapis.com';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiCandidate {
  content: {
    parts: Array<{ text?: string }>;
    role: string;
  };
  finishReason: string;
}

interface GeminiResponse {
  candidates: GeminiCandidate[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion: string;
}

interface GeminiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

const MODELS: ModelConfig[] = [
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    maxTokens: 65536,
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.01,
    capabilities: ['coding', 'analysis', 'reasoning', 'creative'],
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    maxTokens: 65536,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    capabilities: ['coding', 'analysis', 'fast'],
  },
];

export class GoogleProvider extends LLMProvider {
  readonly type: ProviderType = 'google';
  readonly displayName = 'Google';

  private readonly _baseUrl: string;

  constructor(baseUrl?: string) {
    super();
    this._baseUrl = baseUrl ?? API_BASE;
  }

  async isAvailable(): Promise<boolean> {
    return typeof process.env['GOOGLE_API_KEY'] === 'string' &&
      process.env['GOOGLE_API_KEY'].length > 0;
  }

  listModels(): ModelConfig[] {
    return [...MODELS];
  }

  async complete(opts: CompletionRequest): Promise<CompletionResponse> {
    const apiKey = process.env['GOOGLE_API_KEY'];
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is not set');
    }

    // Convert messages to Gemini format
    // System messages become a systemInstruction, others become contents
    let systemInstruction: { parts: Array<{ text: string }> } | undefined;
    const contents: GeminiContent[] = [];

    for (const msg of opts.messages) {
      if (msg.role === 'system') {
        systemInstruction = { parts: [{ text: msg.content }] };
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    const body: Record<string, unknown> = {
      contents,
    };

    if (systemInstruction) {
      body['systemInstruction'] = systemInstruction;
    }

    const generationConfig: Record<string, unknown> = {};
    if (opts.maxTokens !== undefined) {
      generationConfig['maxOutputTokens'] = opts.maxTokens;
    }
    if (opts.temperature !== undefined) {
      generationConfig['temperature'] = opts.temperature;
    }
    if (Object.keys(generationConfig).length > 0) {
      body['generationConfig'] = generationConfig;
    }

    if (opts.tools && opts.tools.length > 0) {
      body['tools'] = opts.tools;
    }

    const url = `${this._baseUrl}/v1beta/models/${opts.model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = (await response.json()) as GeminiError;
      throw new Error(
        `Google API error (${response.status}): ${errorBody.error?.message ?? 'Unknown error'}`
      );
    }

    const data = (await response.json()) as GeminiResponse;

    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('Google API returned no candidates');
    }

    const textContent = candidate.content.parts
      .map((part) => part.text ?? '')
      .join('');

    return {
      content: textContent,
      model: data.modelVersion ?? opts.model,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
      finishReason: candidate.finishReason ?? 'STOP',
    };
  }
}
