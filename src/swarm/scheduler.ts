/**
 * TaskScheduler — strategies for assigning tasks to agents.
 * All methods return Map<taskId, agentId> representing assignments.
 */

import type { AgentInstance } from '../types/agent.js';
import type { Task } from '../types/task.js';

export interface SkillRegistry {
  get(id: string): { capabilities: string[] } | undefined;
}

export class TaskScheduler {
  /**
   * Round-robin: distributes tasks evenly across idle agents.
   */
  roundRobin(tasks: Task[], agents: AgentInstance[]): Map<string, string> {
    const assignments = new Map<string, string>();
    const idle = agents.filter((a) => a.state === 'idle');
    if (idle.length === 0) {
      return assignments;
    }

    let index = 0;
    for (const task of tasks) {
      const agent = idle[index % idle.length];
      if (agent) {
        assignments.set(task.id, agent.config.id);
        index++;
      }
    }

    return assignments;
  }

  /**
   * Priority: assigns highest-priority tasks to first available idle agents.
   * Tasks should already be sorted by priority (0 = highest).
   */
  priority(tasks: Task[], agents: AgentInstance[]): Map<string, string> {
    const assignments = new Map<string, string>();
    const idle = agents.filter((a) => a.state === 'idle');

    const sorted = [...tasks].sort((a, b) => a.priority - b.priority);
    const available = [...idle];

    for (const task of sorted) {
      if (available.length === 0) break;
      const agent = available.shift();
      if (agent) {
        assignments.set(task.id, agent.config.id);
      }
    }

    return assignments;
  }

  /**
   * Capability: matches task.skill to agent capabilities.
   * Uses a skill registry to look up required capabilities for each task's skill,
   * then assigns to agents whose definition includes those capabilities.
   */
  capability(
    tasks: Task[],
    agents: AgentInstance[],
    skillRegistry: SkillRegistry
  ): Map<string, string> {
    const assignments = new Map<string, string>();
    const idle = agents.filter((a) => a.state === 'idle');
    const availableSet = new Set(idle.map((a) => a.config.id));

    for (const task of tasks) {
      const skillDef = skillRegistry.get(task.skill);
      const requiredCapabilities = skillDef?.capabilities ?? [];

      // Find first idle agent that has all required capabilities
      for (const agent of idle) {
        if (!availableSet.has(agent.config.id)) continue;

        const agentCaps = new Set(agent.config.capabilities);
        const hasAll = requiredCapabilities.every((c) => agentCaps.has(c));

        if (hasAll) {
          assignments.set(task.id, agent.config.id);
          availableSet.delete(agent.config.id);
          break;
        }
      }
    }

    return assignments;
  }
}
