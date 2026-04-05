/**
 * SwarmCoordinator — the brain of the swarm system.
 * Orchestrates agents, tasks, claims, and scheduling in a periodic tick loop.
 */

import type { AgentManager } from '../core/agent.js';
import type { TaskQueue } from '../core/task-queue.js';
import type { VoidLogger } from '../core/logger.js';
import type { VoidEventBus } from '../hooks/events.js';
import type { Task } from '../types/task.js';
import type { TaskScheduler } from './scheduler.js';
import type { ClaimManager } from './claims.js';
import { SwarmStateMachine } from './state.js';
import type { SwarmState } from './state.js';
import { randomUUID } from 'node:crypto';

export interface SwarmConfig {
  maxAgents: number;
  strategy: string;
  timeout: number;
}

export class SwarmCoordinator {
  private readonly _agents: AgentManager;
  private readonly _queue: TaskQueue;
  private readonly _scheduler: TaskScheduler;
  private readonly _claims: ClaimManager;
  private readonly _state: SwarmStateMachine;
  private readonly _events: VoidEventBus;
  private readonly _logger: VoidLogger;
  private _tickTimer: ReturnType<typeof setInterval> | null = null;
  private _config: SwarmConfig | null = null;

  constructor(
    agents: AgentManager,
    queue: TaskQueue,
    scheduler: TaskScheduler,
    claims: ClaimManager,
    state: SwarmStateMachine,
    events: VoidEventBus,
    logger: VoidLogger
  ) {
    this._agents = agents;
    this._queue = queue;
    this._scheduler = scheduler;
    this._claims = claims;
    this._state = state;
    this._events = events;
    this._logger = logger;
  }

  /**
   * Starts the swarm coordinator. Transitions to running and begins the tick loop.
   */
  async start(config: SwarmConfig): Promise<void> {
    this._config = config;
    this._state.transition('starting');
    this._logger.info('Swarm starting', {
      maxAgents: config.maxAgents,
      strategy: config.strategy,
      timeout: config.timeout,
    });

    this._state.transition('running');

    this._tickTimer = setInterval(() => {
      void this.tick().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this._logger.error('Tick error', { error: message });
      });
    }, config.timeout);

    this._logger.info('Swarm running');
  }

  /**
   * Stops the swarm coordinator. Terminates all agents and transitions to idle.
   */
  async stop(): Promise<void> {
    if (this._tickTimer) {
      clearInterval(this._tickTimer);
      this._tickTimer = null;
    }

    this._state.transition('stopping');
    this._logger.info('Swarm stopping');

    this._agents.terminateAll();

    this._state.transition('idle');
    this._logger.info('Swarm stopped');
  }

  /**
   * Submits a new task to the swarm. Creates the task and enqueues it.
   */
  submitTask(
    description: string,
    skill: string,
    input?: Record<string, unknown>,
    priority?: number
  ): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
      description,
      skill,
      priority: priority ?? 5,
      input: input ?? {},
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    this._queue.enqueue(task);

    this._logger.info('Task submitted', {
      taskId: task.id,
      skill,
      priority: task.priority,
    });

    return task;
  }

  /**
   * One iteration of the swarm loop: reclaim expired claims, schedule pending tasks, emit events.
   */
  async tick(): Promise<void> {
    // 1. Reclaim expired task claims
    const freed = this._claims.reclaimExpired();
    if (freed.length > 0) {
      this._logger.info('Reclaimed expired claims', { count: freed.length, taskIds: freed });
      for (const taskId of freed) {
        this._queue.updateStatus(taskId, 'pending');
      }
    }

    // 2. Schedule pending tasks
    const pending = this._queue.getPending();
    if (pending.length === 0) {
      return;
    }

    const allAgents = this._agents.listAgents();
    const strategy = this._config?.strategy ?? 'roundRobin';

    let assignments: Map<string, string>;
    if (strategy === 'priority') {
      assignments = this._scheduler.priority(pending, allAgents);
    } else {
      assignments = this._scheduler.roundRobin(pending, allAgents);
    }

    // 3. Apply assignments
    for (const [taskId, agentId] of assignments) {
      const claimed = this._claims.claim(taskId, agentId, this._config?.timeout);
      if (claimed) {
        this._queue.updateStatus(taskId, 'assigned');
        this._agents.updateState(agentId, 'working');
        this._logger.debug('Task assigned', { taskId, agentId });

        // Emit notification event
        this._events.emit('Notification', {
          session_id: 'swarm',
          hook_event_name: 'Notification',
          tool_name: 'swarm:assign',
          tool_input: { taskId, agentId },
          cwd: process.cwd(),
        });
      }
    }
  }

  /**
   * Returns the current swarm status snapshot.
   */
  getStatus(): {
    state: SwarmState;
    agents: number;
    pendingTasks: number;
    activeTasks: number;
  } {
    return {
      state: this._state.getState(),
      agents: this._agents.listAgents().length,
      pendingTasks: this._queue.getPending().length,
      activeTasks: this._queue.size() - this._queue.getPending().length,
    };
  }
}
