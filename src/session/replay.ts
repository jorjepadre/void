/**
 * SessionReplay — exports session data in various formats.
 * Supports text replay, JSON export, CSV export, and summary generation.
 */

import type { SessionRecord, SessionEvent } from '../types/session.js';

export interface SessionSummary {
  duration: number;
  toolUseCounts: Record<string, number>;
  errorCount: number;
  successRate: number;
}

export class SessionReplay {
  /**
   * Produces a human-readable text replay of session events.
   */
  replay(events: SessionEvent[]): string {
    if (events.length === 0) return '(no events recorded)';

    const lines: string[] = ['=== Session Replay ===', ''];

    for (const evt of events) {
      const time = evt.timestamp;
      const status = evt.success ? 'OK' : 'FAIL';
      const tool = evt.tool_name ? ` [${evt.tool_name}]` : '';
      const duration = evt.duration_ms != null ? ` (${evt.duration_ms}ms)` : '';

      lines.push(`${time}  ${evt.event_type}${tool}  ${status}${duration}`);

      if (evt.tool_input) {
        lines.push(`  input: ${JSON.stringify(evt.tool_input)}`);
      }
      if (evt.tool_output !== undefined) {
        const output = JSON.stringify(evt.tool_output);
        const truncated = output.length > 200 ? output.slice(0, 200) + '...' : output;
        lines.push(`  output: ${truncated}`);
      }
      if (!evt.success && evt.metadata?.['error']) {
        lines.push(`  error: ${String(evt.metadata['error'])}`);
      }
    }

    lines.push('', '=== End Replay ===');
    return lines.join('\n');
  }

  /**
   * Full JSON export of the session record and its events.
   */
  exportJson(session: SessionRecord, events: SessionEvent[]): string {
    return JSON.stringify({ session, events }, null, 2);
  }

  /**
   * CSV export of session events.
   */
  exportCsv(events: SessionEvent[]): string {
    const headers = [
      'session_id',
      'event_type',
      'timestamp',
      'tool_name',
      'duration_ms',
      'success',
    ];

    const rows = events.map((evt) =>
      [
        csvEscape(evt.session_id),
        csvEscape(evt.event_type),
        csvEscape(evt.timestamp),
        csvEscape(evt.tool_name ?? ''),
        evt.duration_ms != null ? String(evt.duration_ms) : '',
        evt.success ? 'true' : 'false',
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Generates a summary of the session including duration, tool usage counts,
   * error count, and success rate.
   */
  getSummary(session: SessionRecord, events: SessionEvent[]): SessionSummary {
    const startMs = new Date(session.started_at).getTime();
    const endMs = session.ended_at
      ? new Date(session.ended_at).getTime()
      : Date.now();
    const duration = endMs - startMs;

    const toolUseCounts: Record<string, number> = {};
    let errorCount = 0;
    let successCount = 0;
    let totalCount = 0;

    for (const evt of events) {
      totalCount++;

      if (evt.success) {
        successCount++;
      } else {
        errorCount++;
      }

      if (evt.tool_name) {
        toolUseCounts[evt.tool_name] = (toolUseCounts[evt.tool_name] ?? 0) + 1;
      }
    }

    const successRate = totalCount > 0 ? successCount / totalCount : 1;

    return {
      duration,
      toolUseCounts,
      errorCount,
      successRate,
    };
  }
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
