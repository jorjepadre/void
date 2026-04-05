/**
 * ClaimManager — manages exclusive task claims with TTL and priority-based stealing.
 * Prevents multiple agents from working on the same task simultaneously.
 */

export interface TaskClaim {
  taskId: string;
  agentId: string;
  claimedAt: number;
  expiresAt: number;
  priority: number;
}

const DEFAULT_TTL_MS = 300_000; // 5 minutes

export class ClaimManager {
  private readonly _claims = new Map<string, TaskClaim>();

  /**
   * Claims a task for an agent. Returns false if already claimed and not expired.
   */
  claim(taskId: string, agentId: string, ttlMs?: number): boolean {
    const existing = this._claims.get(taskId);

    if (existing) {
      // Allow reclaim only if expired
      if (existing.expiresAt > Date.now()) {
        return false;
      }
    }

    const now = Date.now();
    const ttl = ttlMs ?? DEFAULT_TTL_MS;

    this._claims.set(taskId, {
      taskId,
      agentId,
      claimedAt: now,
      expiresAt: now + ttl,
      priority: 0,
    });

    return true;
  }

  /**
   * Releases a claim on a task.
   */
  release(taskId: string): void {
    this._claims.delete(taskId);
  }

  /**
   * Returns the claim for a task, or undefined if not claimed.
   */
  getClaim(taskId: string): TaskClaim | undefined {
    return this._claims.get(taskId);
  }

  /**
   * Returns all claims held by a specific agent.
   */
  getAgentClaims(agentId: string): TaskClaim[] {
    const result: TaskClaim[] = [];
    for (const claim of this._claims.values()) {
      if (claim.agentId === agentId) {
        result.push(claim);
      }
    }
    return result;
  }

  /**
   * Returns true if the task is claimed by the specified agent.
   */
  isClaimedBy(taskId: string, agentId: string): boolean {
    const claim = this._claims.get(taskId);
    return claim !== undefined && claim.agentId === agentId;
  }

  /**
   * Returns all expired claims.
   */
  getExpired(): TaskClaim[] {
    const now = Date.now();
    const expired: TaskClaim[] = [];
    for (const claim of this._claims.values()) {
      if (claim.expiresAt <= now) {
        expired.push(claim);
      }
    }
    return expired;
  }

  /**
   * Releases all expired claims. Returns freed task IDs.
   */
  reclaimExpired(): string[] {
    const expired = this.getExpired();
    const freed: string[] = [];
    for (const claim of expired) {
      this._claims.delete(claim.taskId);
      freed.push(claim.taskId);
    }
    return freed;
  }

  /**
   * Steals a task claim for a new agent. Only succeeds if the current claim
   * is expired or the new agent's task has higher priority (lower number).
   */
  steal(taskId: string, newAgentId: string): boolean {
    const existing = this._claims.get(taskId);

    if (!existing) {
      // No existing claim — just claim it
      return this.claim(taskId, newAgentId);
    }

    const now = Date.now();
    const isExpired = existing.expiresAt <= now;

    if (isExpired) {
      this._claims.delete(taskId);
      return this.claim(taskId, newAgentId);
    }

    // Steal only if new agent has higher priority (lower number)
    // We use 0 as default; real priority should be set by coordinator
    if (existing.priority > 0) {
      this._claims.set(taskId, {
        taskId,
        agentId: newAgentId,
        claimedAt: now,
        expiresAt: now + (existing.expiresAt - existing.claimedAt),
        priority: 0,
      });
      return true;
    }

    return false;
  }
}
