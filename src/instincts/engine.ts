/**
 * InstinctEngine — evaluates instinct triggers against runtime context.
 */

import type { Instinct, InstinctTrigger } from '../types/instinct.js';

/**
 * Evaluates whether an instinct's trigger condition matches the given context.
 */
function evaluateTrigger(trigger: InstinctTrigger, context: Record<string, unknown>): boolean {
  switch (trigger.type) {
    case 'pattern': {
      // Regex match against context.content or context.event
      const target = (context['content'] as string | undefined)
        ?? (context['event'] as string | undefined);
      if (typeof target !== 'string') return false;
      try {
        const regex = new RegExp(trigger.condition);
        return regex.test(target);
      } catch {
        return false;
      }
    }

    case 'event': {
      // Exact match against context.event_type
      const eventType = context['event_type'];
      return typeof eventType === 'string' && eventType === trigger.condition;
    }

    case 'context': {
      // All trigger.parameters keys must exist in context with matching values
      const params = trigger.parameters;
      if (params == null) return false;
      for (const [key, value] of Object.entries(params)) {
        if (!(key in context)) return false;
        if (context[key] !== value) return false;
      }
      return true;
    }

    default:
      return false;
  }
}

export class InstinctEngine {
  /**
   * Checks if an instinct's trigger condition matches the provided context.
   */
  evaluate(instinct: Instinct, context: Record<string, unknown>): boolean {
    return evaluateTrigger(instinct.trigger, context);
  }

  /**
   * Returns true if the instinct's confidence is high enough for auto-application.
   */
  shouldAutoApply(instinct: Instinct): boolean {
    return instinct.confidence >= 0.8;
  }

  /**
   * Returns instincts that match the context but have confidence below 0.8 (suggestions).
   */
  getSuggestions(instincts: Instinct[], context: Record<string, unknown>): Instinct[] {
    return instincts.filter((instinct) => {
      if (instinct.confidence >= 0.8) return false;
      return this.evaluate(instinct, context);
    });
  }
}
