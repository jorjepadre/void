/**
 * InstinctExtractor — converts learned patterns into instincts.
 */

import { randomUUID } from 'node:crypto';
import type { Instinct, InstinctTriggerType } from '../types/instinct.js';
import type { LearnedPattern } from '../types/session.js';

/**
 * Maps a LearnedPatternType to an InstinctTriggerType.
 */
function patternTypeToTriggerType(patternType: string): InstinctTriggerType {
  switch (patternType) {
    case 'tool_sequence':
      return 'pattern';
    case 'error_resolution':
      return 'event';
    case 'workflow':
      return 'context';
    default:
      return 'pattern';
  }
}

export class InstinctExtractor {
  /**
   * Converts an array of learned patterns into instincts.
   *
   * - tool_sequence patterns become 'pattern' trigger instincts
   * - error_resolution patterns become 'event' trigger instincts
   * - workflow patterns become 'context' trigger instincts
   */
  extractFromPatterns(patterns: LearnedPattern[]): Instinct[] {
    return patterns.map((pattern) => {
      const triggerType = patternTypeToTriggerType(pattern.pattern_type);

      const instinct: Instinct = {
        id: randomUUID(),
        name: `instinct-${pattern.pattern_type}-${pattern.id}`,
        description: pattern.description,
        version: '1.0.0',
        trigger: {
          type: triggerType,
          condition: pattern.description,
          parameters: triggerType === 'context' ? { workflow: pattern.description } : undefined,
        },
        confidence: pattern.confidence,
        domain_tags: [],
        action: pattern.description,
        created_at: new Date().toISOString(),
        usage_count: 0,
      };

      return instinct;
    });
  }
}
