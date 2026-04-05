/**
 * Void — public API barrel export.
 * Exposes key classes and functions for programmatic use.
 */

// Memory
export { MemoryStore } from './memory/store.js';
export { MemorySearch } from './memory/search.js';

// Skills
export { SkillRegistry } from './skills/registry.js';

// Agents
export { AgentRegistry } from './agents/registry.js';

// Commands
export { CommandRegistry } from './commands/registry.js';

// Harness
export { HarnessRegistry, detectHarness } from './harness/index.js';

// Hooks
export { HookEngine } from './hooks/engine.js';
export { HookProfileManager } from './hooks/profiles.js';

// Swarm
export { SwarmCoordinator } from './swarm/coordinator.js';

// Sessions
export { SessionRecorder } from './session/recorder.js';
export { SessionLearner } from './session/learner.js';

// Instincts
export { InstinctEngine } from './instincts/engine.js';
export { InstinctStore } from './instincts/store.js';

// MCP
export { MCPClientManager } from './mcp/client.js';
export { VoidMCPServer } from './mcp/server.js';

// Config
export { loadConfig } from './config/loader.js';
export type { VoidConfig } from './config/schemas.js';

// Workspace
export { WorkspaceManager } from './core/workspace.js';
