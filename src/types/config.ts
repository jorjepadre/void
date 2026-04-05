/**
 * Config types — top-level Void configuration.
 */

import type { MCPServerConfig } from './mcp.js';
import type { HookDefinition, HookProfileName } from './hook.js';
import type { SkillDefinition } from './skill.js';
import type { ProviderConfig, ModelRoute } from './provider.js';
import type { UserIdentity, TeamConfig } from './identity.js';

export interface SwarmConfig {
  max_agents: number;
  default_timeout: number;
  task_queue_size: number;
}

export interface MemoryConfig {
  backend: string;
  path: string;
  max_entries: number;
}

export interface MCPConfig {
  servers: MCPServerConfig[];
}

export interface SkillsConfig {
  paths: string[];
  skills: SkillDefinition[];
}

export interface HooksConfig {
  profile: HookProfileName;
  hooks: HookDefinition[];
}

export interface SecurityConfig {
  secret_scanning: boolean;
  allowed_commands: string[];
  blocked_paths: string[];
  max_file_size: number;
}

export interface ProvidersConfig {
  providers: ProviderConfig[];
  routes: ModelRoute[];
}

export interface IdentityConfig {
  user?: UserIdentity;
  team?: TeamConfig;
}

export interface VoidConfig {
  version: string;
  workspace: string;
  swarm: SwarmConfig;
  memory: MemoryConfig;
  mcp: MCPConfig;
  skills: SkillsConfig;
  hooks: HooksConfig;
  security: SecurityConfig;
  providers: ProvidersConfig;
  identity: IdentityConfig;
}
