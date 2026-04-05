/**
 * Hook types — lifecycle event interception and modification.
 */

export type HookEventType =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'SessionStart'
  | 'SessionEnd'
  | 'PreCompact'
  | 'SubagentStop'
  | 'UserPromptSubmit'
  | 'Notification'
  | 'Stop';

export interface HookMatcher {
  tool_name?: string;
  file_path?: string;
  command?: string;
  exit_code?: number;
  metadata?: Record<string, unknown>;
}

export type HookProfileName = 'minimal' | 'standard' | 'strict';

export interface HookDefinition {
  id: string;
  event: HookEventType;
  matcher?: HookMatcher;
  priority: number;
  timeout_ms: number;
  command: string;
  description: string;
  profiles: HookProfileName[];
  enabled: boolean;
}

export interface HookInput {
  session_id: string;
  hook_event_name: HookEventType;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: unknown;
  tool_success?: boolean;
  cwd: string;
}

export type HookDecision = 'allow' | 'block' | 'skip';

export interface HookOutput {
  decision: HookDecision;
  reason?: string;
  modified_input?: Record<string, unknown>;
}
