/**
 * RuleEngine — resolves multiple rule definitions into a single
 * merged rule set using CSS-specificity-inspired layering.
 *
 * Algorithm:
 * 1. Sort rules by specificity (ascending — lowest first)
 * 2. For each section across all rules:
 *    - Higher-weight sections replace lower-weight sections
 *    - append entries are always added regardless of weight
 * 3. Return the merged ResolvedRuleSet
 */

import type {
  RuleDefinition,
  RuleSection,
  ResolvedRuleSet,
  RuleLayerType,
} from '../types/rule.js';

export class RuleEngine {
  /**
   * Resolves an array of rule definitions into a single merged rule set.
   *
   * Rules are sorted by specificity (ascending), then each section is
   * merged using weight-based replacement with appendable entries.
   */
  resolve(rules: RuleDefinition[]): ResolvedRuleSet {
    if (rules.length === 0) {
      return {
        layers: [],
        sections: new Map(),
        metadata: {},
      };
    }

    // Sort by specificity ascending (lower specificity applied first,
    // higher specificity overrides)
    const sorted = [...rules].sort((a, b) => a.specificity - b.specificity);

    // Track which layers contributed
    const layerSet = new Set<RuleLayerType>();
    const mergedSections = new Map<string, MergingSection>();

    for (const rule of sorted) {
      layerSet.add(rule.layer);

      for (const [sectionName, section] of Object.entries(rule.sections)) {
        const existing = mergedSections.get(sectionName);

        if (!existing || section.weight >= existing.weight) {
          // Higher or equal weight replaces the rules
          mergedSections.set(sectionName, {
            weight: section.weight,
            rules: [...section.rules],
            appended: [
              ...(existing?.appended ?? []),
              ...(section.append ?? []),
            ],
          });
        } else {
          // Lower weight: only append entries are added
          if (section.append && section.append.length > 0) {
            existing.appended.push(...section.append);
          }
        }
      }
    }

    // Convert merging sections to final RuleSection format
    const finalSections = new Map<string, RuleSection>();
    for (const [name, merging] of mergedSections) {
      const combinedRules = [...merging.rules, ...merging.appended];
      finalSections.set(name, {
        weight: merging.weight,
        rules: combinedRules,
      });
    }

    // Collect layers in specificity order (deduplicated, ordered)
    const layers: RuleLayerType[] = [];
    for (const rule of sorted) {
      if (!layers.includes(rule.layer)) {
        layers.push(rule.layer);
      }
    }

    return {
      layers,
      sections: finalSections,
      metadata: {
        ruleCount: rules.length,
        sectionCount: finalSections.size,
        resolvedAt: new Date().toISOString(),
      },
    };
  }
}

/**
 * Internal tracking structure used during the merge process.
 */
interface MergingSection {
  weight: number;
  rules: string[];
  appended: string[];
}
