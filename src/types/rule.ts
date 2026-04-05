/**
 * Rule types — layered rule resolution for coding standards and conventions.
 */

export type RuleLayerType = 'common' | 'language' | 'framework' | 'project';

export interface RuleSection {
  weight: number;
  rules: string[];
  append?: string[];
}

export interface RuleDefinition {
  id: string;
  layer: RuleLayerType;
  specificity: number;
  extends?: string | null;
  sections: Record<string, RuleSection>;
}

export interface ResolvedRuleSet {
  layers: RuleLayerType[];
  sections: Map<string, RuleSection>;
  metadata: Record<string, unknown>;
}
