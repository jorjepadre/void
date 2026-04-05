/**
 * AgentManager — manages a pool of AgentInstance objects.
 * Handles spawning, state transitions, and lifecycle for all agents.
 */

import { randomUUID } from 'node:crypto';
import type { AgentDefinition, AgentState, AgentInstance } from '../types/agent.js';

export class AgentManager {
  private readonly _agents = new Map<string, AgentInstance>();

  /**
   * Spawns a new agent from a definition. Returns the created instance.
   */
  spawn(definition: AgentDefinition): AgentInstance {
    const id = randomUUID();
    const now = new Date().toISOString();

    const instance: AgentInstance = {
      config: { ...definition, id },
      state: 'idle',
      assignedTasks: [],
      startedAt: now,
      lastActiveAt: now,
    };

    this._agents.set(id, instance);
    return instance;
  }

  /**
   * Retrieves an agent by ID.
   */
  getAgent(id: string): AgentInstance | undefined {
    return this._agents.get(id);
  }

  /**
   * Lists all agents, optionally filtered by state.
   */
  listAgents(status?: AgentState): AgentInstance[] {
    const all = Array.from(this._agents.values());
    if (status === undefined) {
      return all;
    }
    return all.filter((a) => a.state === status);
  }

  /**
   * Updates the state of an agent.
   */
  updateState(id: string, state: AgentState): void {
    const agent = this._agents.get(id);
    if (!agent) {
      throw new Error(`Agent not found: ${id}`);
    }
    agent.state = state;
    agent.lastActiveAt = new Date().toISOString();
  }

  /**
   * Terminates an agent by setting its state to stopped.
   */
  terminate(id: string): void {
    this.updateState(id, 'stopped');
  }

  /**
   * Terminates all agents.
   */
  terminateAll(): void {
    for (const id of this._agents.keys()) {
      const agent = this._agents.get(id);
      if (agent && agent.state !== 'stopped') {
        agent.state = 'stopped';
        agent.lastActiveAt = new Date().toISOString();
      }
    }
  }
}
