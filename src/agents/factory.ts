/**
 * AgentFactory — creates AgentInstance objects from registered definitions.
 */

import { randomUUID } from 'node:crypto';
import type { AgentDefinition, AgentInstance } from '../types/agent.js';
import type { AgentRegistry } from './registry.js';

export class AgentFactoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentFactoryError';
  }
}

export class AgentFactory {
  constructor(private readonly registry: AgentRegistry) {}

  /**
   * Creates a new AgentInstance from a registered definition.
   *
   * @param definitionId — ID of the agent definition in the registry
   * @param overrides — optional partial overrides merged onto the definition
   * @returns a new AgentInstance with a unique ID and idle state
   */
  create(
    definitionId: string,
    overrides?: Partial<AgentDefinition>,
  ): AgentInstance {
    const base = this.registry.get(definitionId);
    if (!base) {
      throw new AgentFactoryError(
        `Agent definition not found: "${definitionId}"`,
      );
    }

    // Merge overrides onto the base definition
    const config: AgentDefinition = {
      ...base,
      ...overrides,
      // Generate a unique instance ID while preserving the definition ID
      id: overrides?.id ?? `${base.id}-${randomUUID()}`,
      // Deep merge tags (union)
      tags: mergeTags(base.tags, overrides?.tags),
      // Deep merge capabilities (union)
      capabilities: mergeTags(base.capabilities, overrides?.capabilities),
      // Deep merge parameters
      parameters: {
        ...base.parameters,
        ...(overrides?.parameters ?? {}),
      },
    };

    const now = new Date().toISOString();

    return {
      config,
      state: 'idle',
      assignedTasks: [],
      startedAt: now,
      lastActiveAt: now,
    };
  }
}

/**
 * Merges two tag arrays into a deduplicated union.
 */
function mergeTags(
  base: string[],
  overrides?: string[],
): string[] {
  if (!overrides || overrides.length === 0) {
    return [...base];
  }
  return [...new Set([...base, ...overrides])];
}
