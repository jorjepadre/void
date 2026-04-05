/**
 * Skill types — reusable capabilities that agents can execute.
 */

export type SkillParamType = 'string' | 'number' | 'boolean' | 'enum';

export interface SkillParam {
  name: string;
  type: SkillParamType;
  required: boolean;
  default?: unknown;
  description: string;
  values?: string[];
}

export interface SkillDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  language?: string | null;
  tags: string[];
  depends_on: string[];
  capabilities: string[];
  parameters: SkillParam[];
  systemPrompt: string;
  tools: string[];
  constraints: string[];
}
