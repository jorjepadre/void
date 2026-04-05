/**
 * Default template for Claude Code settings.json.
 */

export function claudeCodeTemplate(): Record<string, unknown> {
  return {
    permissions: {
      allow: [],
      deny: [],
    },
    hooks: {
      PreToolUse: [],
      PostToolUse: [],
    },
    env: {},
  };
}
