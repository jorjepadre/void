/**
 * Memory types — persistent key-value storage with namespacing and search.
 */

export interface MemoryEntry {
  key: string;
  value: unknown;
  namespace: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  agentId?: string;
}

export interface MemoryQuery {
  namespace?: string;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}
