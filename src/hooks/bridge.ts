/**
 * HookBridge — converts hook definitions between Void's internal format
 * and harness-specific formats (Claude Code settings.json, generic JSON).
 */

import type { HookDefinition, HookInput, HookOutput } from '../types/hook.js';

interface ClaudeCodeHookEntry {
  type: string;
  command: string;
}

interface ClaudeCodeMatcherGroup {
  matcher: Record<string, unknown>;
  hooks: ClaudeCodeHookEntry[];
}

export class HookBridge {
  /**
   * Converts hook definitions to Claude Code settings.json format.
   * Groups hooks by event type.
   */
  generateClaudeCodeHooks(
    hooks: HookDefinition[],
  ): Record<string, ClaudeCodeMatcherGroup[]> {
    const result: Record<string, ClaudeCodeMatcherGroup[]> = {};

    for (const hook of hooks) {
      if (!hook.enabled) continue;

      const matcher: Record<string, unknown> = {};
      if (hook.matcher?.tool_name) matcher['tool_name'] = hook.matcher.tool_name;
      if (hook.matcher?.file_path) matcher['file_path'] = hook.matcher.file_path;
      if (hook.matcher?.command) matcher['command'] = hook.matcher.command;
      if (hook.matcher?.exit_code !== undefined) {
        matcher['exit_code'] = hook.matcher.exit_code;
      }
      if (hook.matcher?.metadata) matcher['metadata'] = hook.matcher.metadata;

      const entry: ClaudeCodeMatcherGroup = {
        matcher,
        hooks: [
          {
            type: 'command',
            command: `void hook run ${hook.id}`,
          },
        ],
      };

      const existing = result[hook.event];
      if (existing) {
        existing.push(entry);
      } else {
        result[hook.event] = [entry];
      }
    }

    return result;
  }

  /**
   * Generic JSON format for non-Claude-Code harnesses.
   */
  generateGenericHooks(
    hooks: HookDefinition[],
  ): Record<string, unknown> {
    return {
      hooks: hooks
        .filter((h) => h.enabled)
        .map((hook) => ({
          id: hook.id,
          event: hook.event,
          matcher: hook.matcher ?? null,
          priority: hook.priority,
          timeout_ms: hook.timeout_ms,
          command: hook.command,
          description: hook.description,
          profiles: hook.profiles,
        })),
    };
  }

  /**
   * Parse JSON hook input from stdin (sent by the harness).
   */
  parseHookInput(stdin: string): HookInput {
    const parsed = JSON.parse(stdin) as HookInput;

    // Validate required fields
    if (!parsed.session_id || typeof parsed.session_id !== 'string') {
      throw new Error('Invalid hook input: missing session_id');
    }
    if (!parsed.hook_event_name || typeof parsed.hook_event_name !== 'string') {
      throw new Error('Invalid hook input: missing hook_event_name');
    }
    if (!parsed.cwd || typeof parsed.cwd !== 'string') {
      throw new Error('Invalid hook input: missing cwd');
    }

    return parsed;
  }

  /**
   * Format hook output as JSON for stdout (returned to the harness).
   */
  formatHookOutput(output: HookOutput): string {
    return JSON.stringify({
      decision: output.decision,
      ...(output.reason !== undefined && { reason: output.reason }),
      ...(output.modified_input !== undefined && {
        modified_input: output.modified_input,
      }),
    });
  }
}
