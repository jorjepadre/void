/**
 * ToolBridge — bridges MCP tools into callable functions for agents,
 * and filters available tools by skill declarations.
 */

import type { MCPTool } from '../types/mcp.js';
import type { MCPClientManager } from './client.js';

export interface BridgedTool {
  name: string;
  description: string;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Wrap an MCP tool into a callable function that agents can invoke directly.
 * The returned execute function routes through the MCPClientManager.
 */
export function bridgeToolToAgent(
  tool: MCPTool,
  client: MCPClientManager
): BridgedTool {
  return {
    name: tool.name,
    description: tool.description,
    execute: async (args: Record<string, unknown>): Promise<unknown> => {
      return client.callTool(tool.serverName, tool.name, args);
    },
  };
}

/**
 * Filter available MCP tools to only those declared by a skill.
 * Matches by tool name (exact match).
 */
export function getToolsForSkill(
  skillTools: string[],
  allTools: MCPTool[]
): MCPTool[] {
  const wanted = new Set(skillTools);
  return allTools.filter((t) => wanted.has(t.name));
}
