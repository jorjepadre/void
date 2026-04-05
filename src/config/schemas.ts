/**
 * Zod schemas — all configuration validation schemas for Void.
 * Single source of truth for config file parsing and validation.
 */

import { z } from 'zod';

// ─── Primitives ────────────────────────────────────────────────────────────

export const IdentifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);

// PathIdSchema — allows category/name format (e.g., "languages/typescript")
// for skills, agents, commands, rules. Forbids .. and leading/trailing slashes.
export const PathIdSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/, 'ID must be path-like: segments separated by /');

export const NamespaceSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[a-zA-Z0-9.-]+$/);

export const SemverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/);

// ─── Provider & Routing ────────────────────────────────────────────────────

export const ProviderTypeSchema = z.enum([
  'anthropic',
  'openai',
  'google',
  'ollama',
]);

export const ModelConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  maxTokens: z.number().int().positive(),
  costPer1kInput: z.number().nonnegative(),
  costPer1kOutput: z.number().nonnegative(),
  capabilities: z.array(z.string()).default([]),
});

export const ProviderConfigSchema = z.object({
  type: ProviderTypeSchema,
  apiKey: z.string().default(''),
  baseUrl: z.string().url().optional(),
  models: z.array(ModelConfigSchema).default([]),
});

export const ModelRouteSchema = z.object({
  task_type: z.string().min(1),
  preferred_provider: ProviderTypeSchema,
  preferred_model: z.string().min(1),
  fallback_provider: ProviderTypeSchema.optional(),
  fallback_model: z.string().optional(),
  max_cost_per_1k: z.number().positive().optional(),
});

// ─── Identity ──────────────────────────────────────────────────────────────

export const TechnicalLevelSchema = z.enum([
  'beginner',
  'intermediate',
  'senior',
  'expert',
]);

export const PreferredStyleSchema = z.object({
  verbosity: z.string().default('normal'),
  codeComments: z.string().default('moderate'),
  explanations: z.string().default('concise'),
});

export const UserIdentitySchema = z.object({
  version: z.string().default('1.0.0'),
  technicalLevel: TechnicalLevelSchema.default('intermediate'),
  preferredStyle: PreferredStyleSchema.default({}),
  domains: z.array(z.string()).default([]),
  createdAt: z.string().default(() => new Date().toISOString()),
});

export const TeamConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  sharedSkills: z.array(z.string()).default([]),
  sharedCommands: z.array(z.string()).default([]),
  conventions: z.record(z.string(), z.string()).default({}),
});

// ─── Hooks ─────────────────────────────────────────────────────────────────

export const HookEventTypeSchema = z.enum([
  'PreToolUse',
  'PostToolUse',
  'SessionStart',
  'SessionEnd',
  'PreCompact',
  'SubagentStop',
  'UserPromptSubmit',
  'Notification',
  'Stop',
]);

export const HookProfileNameSchema = z.enum(['minimal', 'standard', 'strict']);

export const HookMatcherSchema = z.object({
  tool_name: z.string().optional(),
  file_path: z.string().optional(),
  command: z.string().optional(),
  exit_code: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const HookDefinitionSchema = z.object({
  id: IdentifierSchema,
  event: HookEventTypeSchema,
  matcher: HookMatcherSchema.optional(),
  priority: z.number().int().min(0).max(1000).default(100),
  timeout_ms: z.number().int().positive().default(30000),
  command: z.string().min(1),
  description: z.string().default(''),
  profiles: z.array(HookProfileNameSchema).default(['standard']),
  enabled: z.boolean().default(true),
});

// ─── Skills ────────────────────────────────────────────────────────────────

export const SkillParamTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'enum',
]);

export const SkillParamSchema = z.object({
  name: z.string().min(1),
  type: SkillParamTypeSchema,
  required: z.boolean().default(false),
  default: z.unknown().optional(),
  description: z.string().default(''),
  values: z.array(z.string()).optional(),
});

// depends_on is either a flat array or a structured object with skills/agents/commands.
// We normalize both forms to a flat string[] for TypeScript type compatibility.
export const DependsOnSchema = z
  .union([
    z.array(z.string()),
    z
      .object({
        skills: z.array(z.string()).optional(),
        agents: z.array(z.string()).optional(),
        commands: z.array(z.string()).optional(),
      })
      .passthrough(),
  ])
  .default([])
  .transform((val): string[] => {
    if (Array.isArray(val)) return val;
    return [
      ...(val.skills ?? []),
      ...(val.agents ?? []),
      ...(val.commands ?? []),
    ];
  });

export const SkillDefinitionSchema = z.object({
  id: PathIdSchema,
  name: z.string().min(1),
  version: SemverSchema.default('0.1.0'),
  description: z.string().default(''),
  language: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  depends_on: DependsOnSchema,
  capabilities: z.array(z.string()).default([]),
  parameters: z.array(SkillParamSchema).default([]),
  systemPrompt: z.string().default(''),
  tools: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
});

// ─── Agents ────────────────────────────────────────────────────────────────

export const AgentDefinitionSchema = z.object({
  id: PathIdSchema,
  name: z.string().min(1),
  version: SemverSchema.default('0.1.0'),
  language: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  depends_on: DependsOnSchema,
  capabilities: z.array(z.string()).default([]),
  system_prompt: z.string().default(''),
  parameters: z.record(z.string(), z.unknown()).default({}),
});

// ─── Commands ──────────────────────────────────────────────────────────────

export const CommandParamSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'enum']),
  required: z.boolean().default(false),
  description: z.string().default(''),
  default: z.unknown().optional(),
  values: z.array(z.string()).optional(),
});

export const CommandStepSchema = z.object({
  agent: z.string().min(1),
  action: z.string().min(1),
  await_result: z.boolean().default(true),
  on_failure: z.string().optional(),
  max_retries: z.number().int().nonnegative().optional(),
});

export const CommandDefinitionSchema = z.object({
  id: PathIdSchema,
  name: z.string().min(1),
  version: SemverSchema.default('0.1.0'),
  slash_command: z.string().min(1),
  tags: z.array(z.string()).default([]),
  depends_on: DependsOnSchema,
  description: z.string().default(''),
  parameters: z.array(CommandParamSchema).default([]),
  steps: z.array(CommandStepSchema).default([]),
});

// ─── Rules ─────────────────────────────────────────────────────────────────

export const RuleLayerTypeSchema = z.enum([
  'common',
  'language',
  'framework',
  'project',
]);

export const RuleSectionSchema = z.object({
  weight: z.number().default(1),
  rules: z.array(z.string()).default([]),
  append: z.array(z.string()).optional(),
});

export const RuleDefinitionSchema = z.object({
  id: PathIdSchema,
  layer: RuleLayerTypeSchema,
  specificity: z.number().int().min(0).default(0),
  extends: z.string().nullable().optional(),
  sections: z.record(z.string(), RuleSectionSchema).default({}),
});

// ─── Instincts ─────────────────────────────────────────────────────────────

export const InstinctTriggerTypeSchema = z.enum(['pattern', 'event', 'context']);

export const InstinctTriggerSchema = z.object({
  type: InstinctTriggerTypeSchema,
  condition: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()).optional(),
});

export const InstinctSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  version: z.string().default('1.0.0'),
  trigger: InstinctTriggerSchema,
  confidence: z.number().min(0).max(1).default(0.5),
  domain_tags: z.array(z.string()).default([]),
  action: z.string().min(1),
  created_at: z.string(),
  last_applied: z.string().optional(),
  usage_count: z.number().int().min(0).default(0),
});

// ─── Audits ────────────────────────────────────────────────────────────────

export const FindingSeveritySchema = z.enum([
  'critical',
  'high',
  'medium',
  'low',
  'info',
]);

export const FindingStatusSchema = z.enum([
  'open',
  'fixed',
  'accepted',
  'wontfix',
  'false-positive',
]);

export const AuditSchema = z.object({
  id: z.string().min(1),
  project_path: z.string().min(1),
  name: z.string().min(1),
  auditor: z.string().nullable().optional(),
  created_at: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const AuditFindingSchema = z.object({
  id: z.string().min(1),
  audit_id: z.string().min(1),
  severity: FindingSeveritySchema,
  category: z.string().default(''),
  title: z.string().min(1),
  description: z.string().default(''),
  file_path: z.string().nullable().optional(),
  line_number: z.number().int().nullable().optional(),
  rule: z.string().nullable().optional(),
  status: FindingStatusSchema.default('open'),
  created_at: z.string(),
  resolved_at: z.string().nullable().optional(),
});

export const ImportAuditSchema = z.object({
  name: z.string().min(1),
  auditor: z.string().optional(),
  findings: z.array(
    z.object({
      severity: FindingSeveritySchema,
      category: z.string().default(''),
      title: z.string().min(1),
      description: z.string().default(''),
      file_path: z.string().nullable().optional(),
      line_number: z.number().int().nullable().optional(),
      rule: z.string().nullable().optional(),
      status: FindingStatusSchema.default('open'),
    }),
  ),
});

// ─── Manifest ──────────────────────────────────────────────────────────────

export const ManifestProfileNameSchema = z.enum([
  'core',
  'developer',
  'security',
  'full',
  'custom',
]);

export const ComponentTypeSchema = z.enum([
  'skill',
  'agent',
  'command',
  'rule',
  'hook',
]);

export const ComponentRefSchema = z.object({
  id: PathIdSchema,
  type: ComponentTypeSchema,
  version: SemverSchema,
  depends_on: z.array(z.string()).optional(),
});

export const ManifestConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  harness: z.string().default('claude-code'),
  profile: ManifestProfileNameSchema.default('developer'),
  installed_at: z.string().default(() => new Date().toISOString()),
  components: z.array(ComponentRefSchema).default([]),
});

// ─── Top-Level Config ──────────────────────────────────────────────────────

export const SwarmConfigSchema = z.object({
  max_agents: z.number().int().positive().default(5),
  default_timeout: z.number().int().positive().default(300000),
  task_queue_size: z.number().int().positive().default(100),
});

export const MemoryConfigSchema = z.object({
  backend: z.string().default('sqlite'),
  path: z.string().default('.void/memory'),
  max_entries: z.number().int().positive().default(10000),
});

export const MCPServerConfigSchema = z.object({
  name: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).default({}),
});

export const MCPConfigSchema = z.object({
  servers: z.array(MCPServerConfigSchema).default([]),
});

export const SkillsConfigSchema = z.object({
  paths: z.array(z.string()).default(['skills']),
  skills: z.array(SkillDefinitionSchema).default([]),
});

export const HooksConfigSchema = z.object({
  profile: HookProfileNameSchema.default('standard'),
  hooks: z.array(HookDefinitionSchema).default([]),
});

export const SecurityConfigSchema = z.object({
  secret_scanning: z.boolean().default(true),
  allowed_commands: z.array(z.string()).default([]),
  blocked_paths: z.array(z.string()).default([]),
  max_file_size: z.number().int().positive().default(10 * 1024 * 1024),
});

export const ProvidersConfigSchema = z.object({
  providers: z.array(ProviderConfigSchema).default([]),
  routes: z.array(ModelRouteSchema).default([]),
});

export const IdentityConfigSchema = z.object({
  user: UserIdentitySchema.optional(),
  team: TeamConfigSchema.optional(),
});

export const VoidConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  workspace: z.string().default('.'),
  swarm: SwarmConfigSchema.default({}),
  memory: MemoryConfigSchema.default({}),
  mcp: MCPConfigSchema.default({}),
  skills: SkillsConfigSchema.default({}),
  hooks: HooksConfigSchema.default({}),
  security: SecurityConfigSchema.default({}),
  providers: ProvidersConfigSchema.default({}),
  identity: IdentityConfigSchema.default({}),
});

// ─── Inferred types ────────────────────────────────────────────────────────

export type VoidConfig = z.infer<typeof VoidConfigSchema>;
export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;
export type CommandDefinition = z.infer<typeof CommandDefinitionSchema>;
export type HookDefinition = z.infer<typeof HookDefinitionSchema>;
export type RuleDefinition = z.infer<typeof RuleDefinitionSchema>;
export type ManifestConfig = z.infer<typeof ManifestConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type UserIdentity = z.infer<typeof UserIdentitySchema>;
export type TeamConfig = z.infer<typeof TeamConfigSchema>;
// Note: Instinct type comes from types/instinct.ts (canonical definition)
// InstinctSchema here is the runtime validator matching that type shape.
