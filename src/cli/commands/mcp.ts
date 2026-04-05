/**
 * void mcp — manage MCP server connections and tools.
 */

import type { Command } from 'commander';
import * as out from '../output.js';

export function registerMcp(program: Command): void {
  program
    .command('mcp')
    .description('Manage MCP server connections')
    .argument('<action>', 'Action: list, connect, tools, or health')
    .argument('[server]', 'MCP server name')
    .action(async (action: string, server: string | undefined) => {
      try {
        const cwd = process.cwd();
        const { loadConfig } = await import('../../config/loader.js');
        const config = await loadConfig(cwd);

        const servers = config.mcp.servers;

        switch (action) {
          case 'list': {
            out.heading('MCP servers');
            if (servers.length === 0) {
              out.info('No MCP servers configured');
              out.info('Add servers to void.config.yaml under mcp.servers');
            } else {
              out.table(
                ['Name', 'Command', 'Args'],
                servers.map((s) => [s.name, s.command, s.args.join(' ')]),
              );
            }
            break;
          }

          case 'connect': {
            if (!server) {
              out.error('Server name is required for connect');
              process.exitCode = 1;
              return;
            }

            const serverConfig = servers.find((s) => s.name === server);
            if (!serverConfig) {
              out.error(`Server not found: ${server}`);
              out.info(`Available: ${servers.map((s) => s.name).join(', ') || 'none'}`);
              process.exitCode = 1;
              return;
            }

            const { MCPClientManager } = await import('../../mcp/client.js');
            const manager = new MCPClientManager(servers);

            const spin = out.spinner(`Connecting to ${server}...`);
            try {
              await manager.connect(server);
              spin.stop(`Connected to ${server}`);

              const tools = manager.getToolsForServer(server);
              out.success(`${tools.length} tool(s) available`);
            } catch (err: unknown) {
              spin.stop(`Failed to connect to ${server}`);
              out.error(err instanceof Error ? err.message : String(err));
              process.exitCode = 1;
            }
            break;
          }

          case 'tools': {
            if (servers.length === 0) {
              out.info('No MCP servers configured');
              return;
            }

            const { MCPClientManager } = await import('../../mcp/client.js');
            const manager = new MCPClientManager(servers);

            out.heading('MCP tools');
            const spin = out.spinner('Connecting to servers...');
            try {
              await manager.connectAll();
              spin.stop('Connected');

              // Collect tools from each server
              const allTools: Array<{ name: string; server: string; description: string }> = [];
              for (const s of servers) {
                const tools = manager.getToolsForServer(s.name);
                for (const t of tools) {
                  allTools.push({ name: t.name, server: s.name, description: t.description ?? '' });
                }
              }
              if (allTools.length === 0) {
                out.info('No tools available');
              } else {
                out.table(
                  ['Tool', 'Server', 'Description'],
                  allTools.map((t) => [t.name, t.server, t.description]),
                );
              }
            } catch (err: unknown) {
              spin.stop('Connection failed');
              out.error(err instanceof Error ? err.message : String(err));
              process.exitCode = 1;
            }
            break;
          }

          case 'health': {
            if (servers.length === 0) {
              out.info('No MCP servers configured');
              return;
            }

            out.heading('MCP health check');
            const { MCPClientManager } = await import('../../mcp/client.js');
            const { MCPHealthChecker } = await import('../../mcp/health.js');

            const manager = new MCPClientManager(servers);
            const checker = new MCPHealthChecker();

            const results: string[][] = [];
            for (const s of servers) {
              const result = await checker.check(s.name, manager);
              results.push([
                s.name,
                result.healthy ? 'healthy' : 'unhealthy',
                `${result.latencyMs}ms`,
                String(result.toolCount),
                result.error ?? '',
              ]);
            }

            out.table(
              ['Server', 'Status', 'Latency', 'Tools', 'Error'],
              results,
            );
            break;
          }

          default:
            out.error(`Unknown action: ${action}. Use list, connect, tools, or health.`);
            process.exitCode = 1;
        }
      } catch (err: unknown) {
        out.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
