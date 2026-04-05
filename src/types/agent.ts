/**
 * Agent types — defines agent definitions, runtime state, and instances.
 */

export interface AgentDefinition {
  id: string;
  name: string;
  version: string;
  language?: string | null;
  tags: string[];
  depends_on: string[];
  capabilities: string[];
  system_prompt: string;
  parameters: Record<string, unknown>;
}

export type AgentState = 'idle' | 'working' | 'error' | 'stopped';

export interface AgentInstance {
  config: AgentDefinition;
  state: AgentState;
  assignedTasks: string[];
  startedAt: string;
  lastActiveAt: string;
  errorMessage?: string;
}
