/**
 * TaskQueue — priority queue for Task objects.
 * Lower priority number = higher priority (0 is highest).
 * Internally maintains a sorted array, re-sorted on each insert.
 */

import type { Task, TaskStatus, TaskResult } from '../types/task.js';

export class TaskQueue {
  private _tasks: Task[] = [];

  /**
   * Inserts a task, maintaining priority order (ascending — 0 first).
   */
  enqueue(task: Task): void {
    this._tasks.push(task);
    this._tasks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Removes and returns the highest priority task.
   */
  dequeue(): Task | undefined {
    return this._tasks.shift();
  }

  /**
   * Returns the highest priority task without removing it.
   */
  peek(): Task | undefined {
    return this._tasks[0];
  }

  /**
   * Returns the number of tasks in the queue.
   */
  size(): number {
    return this._tasks.length;
  }

  /**
   * Finds a task by ID.
   */
  getById(id: string): Task | undefined {
    return this._tasks.find((t) => t.id === id);
  }

  /**
   * Updates the status of a task. Optionally sets the result.
   */
  updateStatus(id: string, status: TaskStatus, result?: TaskResult): void {
    const task = this._tasks.find((t) => t.id === id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }
    task.status = status;
    task.updatedAt = new Date().toISOString();
    if (result !== undefined) {
      task.result = result;
    }
  }

  /**
   * Returns all tasks with status 'pending'.
   */
  getPending(): Task[] {
    return this._tasks.filter((t) => t.status === 'pending');
  }

  /**
   * Returns all tasks assigned to a specific agent.
   */
  getByAgent(agentId: string): Task[] {
    return this._tasks.filter((t) => t.assignedAgent === agentId);
  }
}
