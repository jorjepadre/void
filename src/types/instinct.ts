/**
 * Instinct types — learned behavioral patterns that trigger automatically.
 */

export type InstinctTriggerType = 'pattern' | 'event' | 'context';

export interface InstinctTrigger {
  type: InstinctTriggerType;
  condition: string;
  parameters?: Record<string, unknown>;
}

export interface Instinct {
  id: string;
  name: string;
  description: string;
  version: string;
  trigger: InstinctTrigger;
  confidence: number;
  domain_tags: string[];
  action: string;
  created_at: string;
  last_applied?: string;
  usage_count: number;
}
