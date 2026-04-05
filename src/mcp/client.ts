/**
 * MCPClientManager — connects to one or more MCP servers and exposes their tools.
 * Uses @modelcontextprotocol/sdk Client + StdioClientTransport.
 */

import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import type { MCPServerConfig, MCPTool } from '../types/mcp.js';

interface ServerConnection {
  config: MCPServerConfig;
  client: Client;
  transport: StdioClientTransport;
  tools: MCPTool[];
}

export class MCPClientManager {
  private readonly servers: MCPServerConfig[];
  private readonly connections = new Map<string, ServerConnection>();

  constructor(servers: MCPServerConfig[]) {
    this.servers = servers;
  }

  /**
   * Connect to all configured MCP servers.
   */
  async connectAll(): Promise<void> {
    const errors: Array<{ name: string; error: unknown }> = [];
    for (const server of this.servers) {
      try {
        await this.connect(server.name);
      } catch (err) {
        errors.push({ name: server.name, error: err });
      }
    }
    if (errors.length > 0) {
      const summary = errors
        .map((e) => `  ${e.name}: ${String(e.error)}`)
        .join('\n');
      throw new Error(`Failed to connect to MCP servers:\n${summary}`);
    }
  }

  /**
   * Connect to a single MCP server by name.
   */
  async connect(name: string): Promise<void> {
    if (this.connections.has(name)) return;

    const config = this.servers.find((s) => s.name === name);
    if (!config) {
      throw new Error(`MCP server config not found: ${name}`);
    }

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env,
    });

    const client = new Client(
      { name: 'void-agent', version: '0.1.0' },
      { capabilities: {} }
    );

    await client.connect(transport);

    // Discover tools
    const toolsResult = await client.listTools();
    const tools: MCPTool[] = (toolsResult.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description ?? '',
      inputSchema: (t.inputSchema ?? {}) as Record<string, unknown>,
      serverName: name,
    }));

    this.connections.set(name, { config, client, transport, tools });
  }

  /**
   * Disconnect from a single MCP server.
   */
  async disconnect(name: string): Promise<void> {
    const conn = this.connections.get(name);
    if (!conn) return;

    try {
      await conn.client.close();
    } catch {
      // Best-effort cleanup
    }
    this.connections.delete(name);
  }

  /**
   * Disconnect from all connected MCP servers.
   */
  async disconnectAll(): Promise<void> {
    const names = [...this.connections.keys()];
    for (const name of names) {
      await this.disconnect(name);
    }
  }

  /**
   * List all tools across all connected servers.
   */
  listTools(): MCPTool[] {
    const allTools: MCPTool[] = [];
    for (const conn of this.connections.values()) {
      allTools.push(...conn.tools);
    }
    return allTools;
  }

  /**
   * List tools for a specific connected server.
   */
  getToolsForServer(name: string): MCPTool[] {
    const conn = this.connections.get(name);
    return conn ? [...conn.tools] : [];
  }

  /**
   * Call a tool on a specific server.
   */
  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const conn = this.connections.get(serverName);
    if (!conn) {
      throw new Error(`MCP server not connected: ${serverName}`);
    }

    const result = await conn.client.callTool({ name: toolName, arguments: args });
    return result;
  }

  /**
   * Get names of all currently connected servers.
   */
  getConnectedServers(): string[] {
    return [...this.connections.keys()];
  }

  /**
   * Check if a server is currently connected.
   */
  isConnected(name: string): boolean {
    return this.connections.has(name);
  }
}
