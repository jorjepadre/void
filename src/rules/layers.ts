/**
 * LayerManager — manages an ordered collection of rule definitions
 * and provides filtering by detected stack (languages, frameworks).
 */

import type { RuleDefinition } from '../types/rule.js';

export class LayerManager {
  private rules: RuleDefinition[] = [];

  /**
   * Adds a rule definition to the managed layers.
   */
  addLayer(rule: RuleDefinition): void {
    this.rules.push(rule);
  }

  /**
   * Returns all layers sorted by specificity (ascending).
   */
  getLayers(): RuleDefinition[] {
    return [...this.rules].sort((a, b) => a.specificity - b.specificity);
  }

  /**
   * Returns rules applicable to the detected stack.
   *
   * A rule is applicable if:
   * - It is a 'common' layer (always applies)
   * - It is a 'language' layer and its id or sections reference a detected language
   * - It is a 'framework' layer and its id or sections reference a detected framework
   * - It is a 'project' layer (always applies — project-specific overrides)
   *
   * Language and framework matching is done by checking if the rule ID
   * contains the language/framework name (case-insensitive).
   */
  getApplicable(
    languages: string[],
    frameworks: string[],
  ): RuleDefinition[] {
    const langSet = new Set(languages.map((l) => l.toLowerCase()));
    const fwSet = new Set(frameworks.map((f) => f.toLowerCase()));

    return this.getLayers().filter((rule) => {
      switch (rule.layer) {
        case 'common':
          return true;

        case 'language':
          return matchesAny(rule, langSet);

        case 'framework':
          return matchesAny(rule, fwSet);

        case 'project':
          return true;

        default:
          return false;
      }
    });
  }

  /**
   * Removes all layers.
   */
  clear(): void {
    this.rules = [];
  }

  /**
   * Returns the number of managed layers.
   */
  get size(): number {
    return this.rules.length;
  }
}

/**
 * Checks if a rule's ID or section names match any of the provided identifiers.
 */
function matchesAny(
  rule: RuleDefinition,
  identifiers: Set<string>,
): boolean {
  const ruleId = rule.id.toLowerCase();

  // Check if the rule ID contains any identifier
  for (const id of identifiers) {
    if (ruleId.includes(id)) {
      return true;
    }
  }

  // Check if any section name contains an identifier
  const sectionNames = Object.keys(rule.sections).map((s) => s.toLowerCase());
  for (const sectionName of sectionNames) {
    for (const id of identifiers) {
      if (sectionName.includes(id)) {
        return true;
      }
    }
  }

  return false;
}
