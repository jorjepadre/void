/**
 * SkillSearcher — in-memory text search over skill definitions.
 * Scores matches across name, description, tags, and capabilities.
 */

import type { SkillDefinition } from '../types/skill.js';

export class SkillSearcher {
  private skills: SkillDefinition[] = [];

  /**
   * Replaces the skill corpus used for searching.
   */
  index(skills: SkillDefinition[]): void {
    this.skills = skills;
  }

  /**
   * Searches skills by matching the query against name, description,
   * tags, and capabilities. Returns results sorted by relevance score.
   */
  search(query: string, limit = 20): SkillDefinition[] {
    if (!query.trim()) {
      return [];
    }

    const terms = tokenize(query);
    if (terms.length === 0) {
      return [];
    }

    const scored: Array<{ skill: SkillDefinition; score: number }> = [];

    for (const skill of this.skills) {
      const score = scoreSkill(skill, terms);
      if (score > 0) {
        scored.push({ skill, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.skill);
  }
}

/**
 * Tokenizes a query string into lowercase search terms.
 */
function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * Scores a skill against a set of search terms.
 * Higher weights for name and ID matches.
 */
function scoreSkill(skill: SkillDefinition, terms: string[]): number {
  let total = 0;

  const id = skill.id.toLowerCase();
  const name = skill.name.toLowerCase();
  const desc = skill.description.toLowerCase();
  const tags = skill.tags.map((t) => t.toLowerCase());
  const caps = skill.capabilities.map((c) => c.toLowerCase());

  for (const term of terms) {
    // ID exact match (highest weight)
    if (id === term) {
      total += 10;
    } else if (id.includes(term)) {
      total += 5;
    }

    // Name match
    if (name === term) {
      total += 8;
    } else if (name.includes(term)) {
      total += 4;
    }

    // Description match
    if (desc.includes(term)) {
      total += 2;
    }

    // Tags match
    for (const tag of tags) {
      if (tag === term) {
        total += 6;
      } else if (tag.includes(term)) {
        total += 3;
      }
    }

    // Capabilities match
    for (const cap of caps) {
      if (cap === term) {
        total += 5;
      } else if (cap.includes(term)) {
        total += 2;
      }
    }
  }

  return total;
}
