/**
 * VoidMCPServer — exposes Void's capabilities as an MCP server.
 * External tools (Claude Desktop, other agents) can orchestrate Void through this interface.
 * Uses stdio transport for MCP protocol.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { z } from 'zod';

/**
 * Handler interface — consumers wire up the actual logic.
 * This decouples the MCP server from Void internals.
 */
export interface VoidMCPHandlers {
  submitTask(params: {
    description: string;
    skill: string;
    priority: number;
  }): Promise<{ taskId: string; status: string }>;

  memoryGet(params: {
    key: string;
    namespace: string;
  }): Promise<{ value: unknown }>;

  memorySet(params: {
    key: string;
    value: unknown;
    namespace: string;
    tags: string[];
  }): Promise<{ success: boolean }>;

  memorySearch(params: {
    query: string;
    namespace: string;
    limit: number;
  }): Promise<{ results: Array<{ key: string; value: unknown }> }>;

  listSkills(params: {
    language?: string;
    tags?: string[];
  }): Promise<{ skills: Array<{ name: string; description: string }> }>;

  listAgents(params: {
    status?: string;
  }): Promise<{ agents: Array<{ id: string; status: string; skill: string }> }>;

  swarmStatus(): Promise<{
    activeAgents: number;
    queuedTasks: number;
    completedTasks: number;
  }>;

  sessionList(): Promise<{
    sessions: Array<{ id: string; status: string; createdAt: string }>;
  }>;
}

export class VoidMCPServer {
  private readonly mcp: McpServer;
  private transport: StdioServerTransport | null = null;

  constructor(private readonly handlers: VoidMCPHandlers) {
    this.mcp = new McpServer(
      { name: 'void-agents', version: '0.1.0' },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.registerTools();
  }

  private registerTools(): void {
    this.mcp.tool(
      'void_submit_task',
      'Submit a task to the Void swarm for execution',
      {
        description: z.string().describe('Task description'),
        skill: z.string().describe('Skill to use for the task'),
        priority: z.number().int().min(0).max(10).default(5).describe('Task priority (0-10)'),
      },
      async ({ description, skill, priority }) => {
        const result = await this.handlers.submitTask({ description, skill, priority });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      }
    );

    this.mcp.tool(
      'void_memory_get',
      'Get a memory entry by key',
      {
        key: z.string().describe('Memory key'),
        namespace: z.string().default('default').describe('Memory namespace'),
      },
      async ({ key, namespace }) => {
        const result = await this.handlers.memoryGet({ key, namespace });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      }
    );

    this.mcp.tool(
      'void_memory_set',
      'Set a memory entry',
      {
        key: z.string().describe('Memory key'),
        value: z.string().describe('Memory value (JSON string)'),
        namespace: z.string().default('default').describe('Memory namespace'),
        tags: z.array(z.string()).default([]).describe('Tags for categorization'),
      },
      async ({ key, value, namespace, tags }) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(value);
        } catch {
          parsed = value;
        }
        const result = await this.handlers.memorySet({ key, value: parsed, namespace, tags });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      }
    );

    this.mcp.tool(
      'void_memory_search',
      'Search memory entries',
      {
        query: z.string().describe('Search query'),
        namespace: z.string().default('default').describe('Memory namespace'),
        limit: z.number().int().min(1).max(100).default(10).describe('Max results'),
      },
      async ({ query, namespace, limit }) => {
        const result = await this.handlers.memorySearch({ query, namespace, limit });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      }
    );

    this.mcp.tool(
      'void_list_skills',
      'List available skills',
      {
        language: z.string().optional().describe('Filter by language'),
        tags: z.array(z.string()).optional().describe('Filter by tags'),
      },
      async ({ language, tags }) => {
        const result = await this.handlers.listSkills({ language, tags });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      }
    );

    this.mcp.tool(
      'void_list_agents',
      'List agents and their status',
      {
        status: z.string().optional().describe('Filter by status'),
      },
      async ({ status }) => {
        const result = await this.handlers.listAgents({ status });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      }
    );

    this.mcp.tool(
      'void_swarm_status',
      'Get swarm status summary',
      {},
      async () => {
        const result = await this.handlers.swarmStatus();
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      }
    );

    this.mcp.tool(
      'void_session_list',
      'List active and recent sessions',
      {},
      async () => {
        const result = await this.handlers.sessionList();
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      }
    );
  }

  /**
   * Start the MCP server on stdio.
   */
  async start(): Promise<void> {
    this.transport = new StdioServerTransport();
    await this.mcp.connect(this.transport);
  }

  /**
   * Stop the MCP server.
   */
  async stop(): Promise<void> {
    await this.mcp.close();
    this.transport = null;
  }
}
