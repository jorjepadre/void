/**
 * ClaudeHistoryAdapter — imports session data from Claude Code transcript files.
 * Reads JSON transcript files from ~/.claude/transcripts/ or a custom directory.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SessionRecord } from '../../types/session.js';

interface TranscriptFile {
  id?: string;
  created_at?: string;
  ended_at?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export class ClaudeHistoryAdapter {
  /**
   * Loads sessions from Claude Code transcript directory.
   * Parses each .json file into a SessionRecord.
   * Returns empty array if directory doesn't exist or is unreadable.
   */
  async loadSessions(transcriptsDir: string): Promise<SessionRecord[]> {
    let files: string[];
    try {
      const entries = await readdir(transcriptsDir);
      files = entries.filter((f) => f.endsWith('.json'));
    } catch {
      return [];
    }

    const sessions: SessionRecord[] = [];

    for (const file of files) {
      try {
        const content = await readFile(join(transcriptsDir, file), 'utf-8');
        const transcript = JSON.parse(content) as TranscriptFile;

        const id = transcript.id ?? file.replace(/\.json$/, '');
        const startedAt = transcript.created_at ?? new Date().toISOString();

        sessions.push({
          id,
          harness: 'claude-code',
          started_at: startedAt,
          ended_at: transcript.ended_at ?? undefined,
          status: normalizeStatus(transcript.status),
          metadata: {
            source: 'claude-history',
            original_file: file,
            ...transcript.metadata,
          },
        });
      } catch {
        // Skip unparseable files
      }
    }

    return sessions;
  }
}

function normalizeStatus(status: string | undefined): 'active' | 'completed' | 'aborted' {
  if (status === 'active' || status === 'completed' || status === 'aborted') {
    return status;
  }
  return 'completed';
}
