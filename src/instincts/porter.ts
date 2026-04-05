/**
 * InstinctPorter — import/export instincts to/from YAML files.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { stringify as yamlStringify, parse as yamlParse } from 'yaml';
import { z } from 'zod';
import type { Instinct } from '../types/instinct.js';

/**
 * Full instinct validation schema matching the rich Instinct interface.
 * Different from the simplified InstinctSchema in config/schemas.ts.
 */
const PortableInstinctSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  version: z.string().default('1.0.0'),
  trigger: z.object({
    type: z.enum(['pattern', 'event', 'context']),
    condition: z.string().min(1),
    parameters: z.record(z.string(), z.unknown()).optional(),
  }),
  confidence: z.number().min(0).max(1).default(0.5),
  domain_tags: z.array(z.string()).default([]),
  action: z.string().min(1),
  created_at: z.string().default(() => new Date().toISOString()),
  last_applied: z.string().optional(),
  usage_count: z.number().int().nonnegative().default(0),
});

export class InstinctPorter {
  /**
   * Exports instincts to a YAML file.
   */
  async exportInstincts(instincts: Instinct[], filePath: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const content = yamlStringify({ instincts });
    await writeFile(filePath, content, 'utf-8');
  }

  /**
   * Imports instincts from a YAML file, validating each entry.
   */
  async importInstincts(filePath: string): Promise<Instinct[]> {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = yamlParse(raw) as { instincts?: unknown[] } | undefined;

    if (!parsed?.instincts || !Array.isArray(parsed.instincts)) {
      return [];
    }

    const results: Instinct[] = [];
    for (const entry of parsed.instincts) {
      const validated = PortableInstinctSchema.parse(entry);
      results.push(validated as Instinct);
    }

    return results;
  }

  /**
   * Merges imported instincts with existing ones.
   * For matching IDs, keeps the version with higher confidence.
   */
  merge(existing: Instinct[], imported: Instinct[]): Instinct[] {
    const byId = new Map<string, Instinct>();

    for (const instinct of existing) {
      byId.set(instinct.id, instinct);
    }

    for (const instinct of imported) {
      const current = byId.get(instinct.id);
      if (current == null || instinct.confidence > current.confidence) {
        byId.set(instinct.id, instinct);
      }
    }

    return [...byId.values()];
  }
}
