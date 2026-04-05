/**
 * Hook matcher evaluation — determines whether a hook definition
 * matches a given hook input based on matcher criteria.
 */

import type { HookDefinition, HookInput, HookMatcher } from '../types/hook.js';

/**
 * Simple glob-to-regex conversion supporting * and ** patterns.
 * - `*` matches any characters except /
 * - `**` matches any characters including /
 */
function globToRegex(glob: string): RegExp {
  let result = '';
  let i = 0;
  while (i < glob.length) {
    const char = glob[i]!;
    if (char === '*' && glob[i + 1] === '*') {
      result += '.*';
      i += 2;
      // Skip trailing slash after **
      if (glob[i] === '/') i++;
    } else if (char === '*') {
      result += '[^/]*';
      i++;
    } else if (char === '?') {
      result += '[^/]';
      i++;
    } else if ('.+^${}()|[]\\'.includes(char)) {
      result += '\\' + char;
      i++;
    } else {
      result += char;
      i++;
    }
  }
  return new RegExp('^' + result + '$');
}

function matchesMatcher(matcher: HookMatcher, input: HookInput): boolean {
  // tool_name: test as regex
  if (matcher.tool_name !== undefined) {
    if (!input.tool_name) return false;
    const regex = new RegExp(matcher.tool_name);
    if (!regex.test(input.tool_name)) return false;
  }

  // file_path: test as glob pattern
  if (matcher.file_path !== undefined) {
    const toolInput = input.tool_input;
    const filePath =
      toolInput && typeof toolInput['file_path'] === 'string'
        ? toolInput['file_path']
        : undefined;
    if (!filePath) return false;
    const globRegex = globToRegex(matcher.file_path);
    if (!globRegex.test(filePath)) return false;
  }

  // command: test as regex against input.tool_input.command
  if (matcher.command !== undefined) {
    const toolInput = input.tool_input;
    const command =
      toolInput && typeof toolInput['command'] === 'string'
        ? toolInput['command']
        : undefined;
    if (!command) return false;
    const regex = new RegExp(matcher.command);
    if (!regex.test(command)) return false;
  }

  // exit_code: exact match against tool_output
  if (matcher.exit_code !== undefined) {
    if (input.tool_output !== matcher.exit_code) return false;
  }

  // metadata: all key-value pairs must match
  if (matcher.metadata !== undefined) {
    const toolInput = input.tool_input ?? {};
    for (const [key, value] of Object.entries(matcher.metadata)) {
      if (toolInput[key] !== value) return false;
    }
  }

  return true;
}

/**
 * Determines whether a hook definition matches the given input.
 * If no matcher is defined, the hook matches all events of its type.
 */
export function matchesHook(hook: HookDefinition, input: HookInput): boolean {
  // Event type must match
  if (hook.event !== input.hook_event_name) return false;

  // No matcher means match all events of this type
  if (!hook.matcher) return true;

  return matchesMatcher(hook.matcher, input);
}
