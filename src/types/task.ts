/**
 * Task types — work units assigned to agents.
 */

export type TaskStatus = 'pending' | 'assigned' | 'running' | 'completed' | 'failed';

export interface Task {
  id: string;
  description: string;
  skill: string;
  priority: number;
  input: Record<string, unknown>;
  status: TaskStatus;
  assignedAgent?: string;
  result?: TaskResult;
  createdAt: string;
  updatedAt: string;
  parentTask?: string;
  timeout?: number;
}

export interface TaskResult {
  success: boolean;
  output: unknown;
  error?: string;
  duration: number;
}
