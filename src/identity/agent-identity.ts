/**
 * AgentIdentityManager — creates, serializes, and deserializes agent identities.
 */

import { z } from 'zod';
import type { AgentIdentity } from '../types/identity.js';

const AgentIdentitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  personality: z.string().optional(),
  constraints: z.array(z.string()).optional(),
});

export class AgentIdentityManager {
  /**
   * Creates a new AgentIdentity with the given ID, name, and optional fields.
   */
  create(
    id: string,
    name: string,
    opts?: { personality?: string; constraints?: string[] }
  ): AgentIdentity {
    const identity: AgentIdentity = {
      id,
      name,
      personality: opts?.personality,
      constraints: opts?.constraints,
    };
    return identity;
  }

  /**
   * Serializes an AgentIdentity to a JSON string.
   */
  serialize(identity: AgentIdentity): string {
    return JSON.stringify(identity, null, 2);
  }

  /**
   * Deserializes a JSON string to a validated AgentIdentity.
   * Throws a ZodError if the JSON does not conform to the schema.
   */
  deserialize(json: string): AgentIdentity {
    const parsed: unknown = JSON.parse(json);
    return AgentIdentitySchema.parse(parsed);
  }
}
