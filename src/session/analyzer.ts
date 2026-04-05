/**
 * SessionAnalyzer — detects learned patterns from session event streams.
 * Identifies repeated tool sequences, error-resolution patterns, and workflows.
 */

import crypto from 'node:crypto';
import type { SessionEvent, LearnedPattern, LearnedPatternType } from '../types/session.js';

/**
 * Minimum consecutive tools that constitute a "sequence".
 */
const MIN_SEQUENCE_LENGTH = 3;

/**
 * Minimum occurrences for a sequence to become a pattern.
 */
const MIN_OCCURRENCES = 2;

/**
 * Maps occurrence count to confidence score.
 */
function occurrenceConfidence(count: number): number {
  if (count >= 5) return 0.9;
  if (count >= 3) return 0.7;
  if (count >= 2) return 0.5;
  return 0;
}

export class SessionAnalyzer {
  /**
   * Analyzes a stream of session events and returns detected patterns.
   */
  analyzeSession(events: SessionEvent[]): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];
    const now = new Date().toISOString();

    const toolSequencePatterns = this._detectToolSequences(events);
    for (const [description, count] of toolSequencePatterns) {
      patterns.push(this._makePattern('tool_sequence', description, count, now, events[0]?.session_id ?? ''));
    }

    const errorPatterns = this._detectErrorResolutions(events);
    for (const [description, count] of errorPatterns) {
      patterns.push(this._makePattern('error_resolution', description, count, now, events[0]?.session_id ?? ''));
    }

    const workflowPatterns = this._detectWorkflows(events);
    for (const [description, count] of workflowPatterns) {
      patterns.push(this._makePattern('workflow', description, count, now, events[0]?.session_id ?? ''));
    }

    return patterns;
  }

  /**
   * Detects repeated tool sequences: 3+ consecutive tools used in the same
   * order 2+ times.
   */
  private _detectToolSequences(events: SessionEvent[]): Map<string, number> {
    const toolEvents = events.filter(
      (e) => e.event_type === 'tool_use' && e.tool_name
    );

    const toolNames = toolEvents.map((e) => e.tool_name!);
    const sequenceCounts = new Map<string, number>();

    // Sliding window: check all subsequences of length MIN_SEQUENCE_LENGTH..toolNames.length
    for (let len = MIN_SEQUENCE_LENGTH; len <= Math.min(toolNames.length, 10); len++) {
      for (let i = 0; i <= toolNames.length - len; i++) {
        const seq = toolNames.slice(i, i + len).join(' -> ');
        sequenceCounts.set(seq, (sequenceCounts.get(seq) ?? 0) + 1);
      }
    }

    // Filter to sequences that appear MIN_OCCURRENCES times
    const results = new Map<string, number>();
    for (const [seq, count] of sequenceCounts) {
      if (count >= MIN_OCCURRENCES) {
        results.set(`Tool sequence: ${seq}`, count);
      }
    }

    return results;
  }

  /**
   * Detects error-resolution patterns: a tool fails, then a specific sequence
   * of tools resolves the situation (followed by a success).
   */
  private _detectErrorResolutions(events: SessionEvent[]): Map<string, number> {
    const resolutions = new Map<string, number>();

    for (let i = 0; i < events.length; i++) {
      const evt = events[i]!;
      if (evt.event_type !== 'tool_use' || evt.success) continue;

      // Found a failure — look for the resolution sequence
      const failedTool = evt.tool_name ?? 'unknown';
      const fixSequence: string[] = [];

      for (let j = i + 1; j < events.length && j < i + 10; j++) {
        const next = events[j]!;
        if (next.event_type !== 'tool_use') continue;

        fixSequence.push(next.tool_name ?? 'unknown');

        if (next.success) {
          // Found a successful resolution
          if (fixSequence.length >= 1) {
            const key = `Error in ${failedTool} resolved by: ${fixSequence.join(' -> ')}`;
            resolutions.set(key, (resolutions.get(key) ?? 0) + 1);
          }
          break;
        }
      }
    }

    // Filter to those that occur MIN_OCCURRENCES times
    const results = new Map<string, number>();
    for (const [desc, count] of resolutions) {
      if (count >= MIN_OCCURRENCES) {
        results.set(desc, count);
      }
    }

    return results;
  }

  /**
   * Detects workflow patterns: consistent start-to-end tool chains.
   * Groups events into "runs" delimited by non-tool events, then finds
   * repeated full chains.
   */
  private _detectWorkflows(events: SessionEvent[]): Map<string, number> {
    const toolEvents = events.filter(
      (e) => e.event_type === 'tool_use' && e.tool_name
    );

    if (toolEvents.length < MIN_SEQUENCE_LENGTH) return new Map();

    // Break into runs separated by gaps > 60s or non-tool events
    const runs: string[][] = [];
    let currentRun: string[] = [];

    for (let i = 0; i < toolEvents.length; i++) {
      const evt = toolEvents[i]!;

      if (i > 0) {
        const prev = toolEvents[i - 1]!;
        const gap =
          new Date(evt.timestamp).getTime() -
          new Date(prev.timestamp).getTime();

        if (gap > 60_000) {
          if (currentRun.length >= MIN_SEQUENCE_LENGTH) {
            runs.push(currentRun);
          }
          currentRun = [];
        }
      }

      currentRun.push(evt.tool_name!);
    }

    if (currentRun.length >= MIN_SEQUENCE_LENGTH) {
      runs.push(currentRun);
    }

    // Count identical runs
    const runCounts = new Map<string, number>();
    for (const run of runs) {
      const key = run.join(' -> ');
      runCounts.set(key, (runCounts.get(key) ?? 0) + 1);
    }

    const results = new Map<string, number>();
    for (const [chain, count] of runCounts) {
      if (count >= MIN_OCCURRENCES) {
        results.set(`Workflow: ${chain}`, count);
      }
    }

    return results;
  }

  private _makePattern(
    patternType: LearnedPatternType,
    description: string,
    count: number,
    createdAt: string,
    sourceSession: string
  ): LearnedPattern {
    return {
      id: crypto.randomUUID(),
      source_session: sourceSession,
      pattern_type: patternType,
      description,
      confidence: occurrenceConfidence(count),
      usage_count: count,
      skill_generated: false,
      created_at: createdAt,
    };
  }
}
