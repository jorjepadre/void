/**
 * TmuxSessionAdapter — imports session data from running tmux sessions.
 * Uses safeExecFile to run `tmux list-sessions` and parse the output.
 */

import { safeExecFile } from '../../security/process.js';
import type { SessionRecord } from '../../types/session.js';

/**
 * Parses tmux list-sessions output lines.
 * Format: "session_name: N windows (created Day Mon DD HH:MM:SS YYYY) [WxH]"
 */
function parseTmuxLine(line: string): SessionRecord | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Extract session name (everything before the first colon)
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx < 0) return null;

  const sessionName = trimmed.slice(0, colonIdx);

  // Extract created date from parentheses
  const createdMatch = trimmed.match(/\(created ([^)]+)\)/);
  let startedAt: string;
  if (createdMatch?.[1]) {
    const parsed = new Date(createdMatch[1]);
    startedAt = isNaN(parsed.getTime())
      ? new Date().toISOString()
      : parsed.toISOString();
  } else {
    startedAt = new Date().toISOString();
  }

  // Extract window count
  const windowMatch = trimmed.match(/:\s*(\d+)\s+windows?/);
  const windowCount = windowMatch?.[1] ? parseInt(windowMatch[1], 10) : 0;

  return {
    id: `tmux-${sessionName}`,
    harness: 'tmux',
    started_at: startedAt,
    status: 'active',
    metadata: {
      source: 'tmux',
      session_name: sessionName,
      window_count: windowCount,
    },
  };
}

export class TmuxSessionAdapter {
  /**
   * Loads active tmux sessions by running `tmux list-sessions`.
   * Returns empty array if tmux is not available or not running.
   */
  async loadSessions(): Promise<SessionRecord[]> {
    try {
      const result = await safeExecFile('tmux', ['list-sessions'], {
        timeout: 5000,
      });

      const lines = result.stdout.split('\n');
      const sessions: SessionRecord[] = [];

      for (const line of lines) {
        const session = parseTmuxLine(line);
        if (session) sessions.push(session);
      }

      return sessions;
    } catch {
      // tmux not installed, not running, or no server
      return [];
    }
  }
}
