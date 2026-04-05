/**
 * MCPHealthChecker — checks health of connected MCP servers.
 */

import type { MCPClientManager } from './client.js';

export interface HealthResult {
  healthy: boolean;
  latencyMs: number;
  toolCount: number;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 5000;

export class MCPHealthChecker {
  private readonly timeoutMs: number;

  constructor(timeoutMs?: number) {
    this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Check health of a single MCP server by name.
   * Verifies connectivity and tool listing within the timeout.
   */
  async check(serverName: string, client: MCPClientManager): Promise<HealthResult> {
    if (!client.isConnected(serverName)) {
      return {
        healthy: false,
        latencyMs: 0,
        toolCount: 0,
        error: `Server not connected: ${serverName}`,
      };
    }

    const start = performance.now();

    try {
      const tools = await Promise.race([
        Promise.resolve(client.getToolsForServer(serverName)),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timed out')), this.timeoutMs)
        ),
      ]);

      const latencyMs = Math.round(performance.now() - start);

      return {
        healthy: true,
        latencyMs,
        toolCount: tools.length,
      };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        healthy: false,
        latencyMs,
        toolCount: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Check health of all connected MCP servers.
   */
  async checkAll(client: MCPClientManager): Promise<Map<string, HealthResult>> {
    const results = new Map<string, HealthResult>();
    const servers = client.getConnectedServers();

    const checks = servers.map(async (name) => {
      const result = await this.check(name, client);
      results.set(name, result);
    });

    await Promise.all(checks);
    return results;
  }
}
