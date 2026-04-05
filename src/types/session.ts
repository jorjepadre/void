/**
 * Session types — tracking, events, and learned patterns.
 */

export type SessionStatus = 'active' | 'completed' | 'aborted';

export interface SessionRecord {
  id: string;
  harness: string;
  started_at: string;
  ended_at?: string;
  status: SessionStatus;
  metadata: Record<string, unknown>;
}

export type SessionEventType =
  | 'tool_use'
  | 'hook_fire'
  | 'gate_check'
  | 'agent_action'
  | 'error';

export interface SessionEvent {
  session_id: string;
  event_type: SessionEventType;
  timestamp: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: unknown;
  duration_ms?: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export type LearnedPatternType =
  | 'tool_sequence'
  | 'error_resolution'
  | 'workflow';

export interface LearnedPattern {
  id: string;
  source_session: string;
  pattern_type: LearnedPatternType;
  description: string;
  confidence: number;
  usage_count: number;
  skill_generated: boolean;
  created_at: string;
}
