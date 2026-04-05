/**
 * Command types — multi-step orchestrated workflows.
 */

export type CommandParamType = 'string' | 'number' | 'boolean' | 'enum';

export interface CommandParam {
  name: string;
  type: CommandParamType;
  required: boolean;
  description: string;
  default?: unknown;
  values?: string[];
}

export interface CommandStep {
  agent: string;
  action: string;
  await_result: boolean;
  on_failure?: string;
  max_retries?: number;
}

export interface CommandDefinition {
  id: string;
  name: string;
  version: string;
  slash_command: string;
  tags: string[];
  depends_on: string[];
  description: string;
  parameters: CommandParam[];
  steps: CommandStep[];
}
