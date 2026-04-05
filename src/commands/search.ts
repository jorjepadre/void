/**
 * CommandSearcher — in-memory text search and tag/language filtering
 * over command definitions.
 */

import type { CommandDefinition } from '../types/command.js';

export class CommandSearcher {
  private commands: CommandDefinition[] = [];

  /**
   * Replaces the command corpus used for searching.
   */
  index(commands: CommandDefinition[]): void {
    this.commands = commands;
  }

  /**
   * Searches commands by matching the query against name, description,
   * tags, and slash_command. Returns results sorted by relevance.
   */
  search(query: string): CommandDefinition[] {
    if (!query.trim()) {
      return [];
    }

    const terms = tokenize(query);
    if (terms.length === 0) {
      return [];
    }

    const scored: Array<{ cmd: CommandDefinition; score: number }> = [];

    for (const cmd of this.commands) {
      const score = scoreCommand(cmd, terms);
      if (score > 0) {
        scored.push({ cmd, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.cmd);
  }

  /**
   * Returns all commands that have the specified tag.
   */
  findByTag(tag: string): CommandDefinition[] {
    const lower = tag.toLowerCase();
    return this.commands.filter((c) =>
      c.tags.some((t) => t.toLowerCase() === lower),
    );
  }

  /**
   * Returns all commands matching a language filter.
   * Checks tags for a language: prefix pattern (e.g., "lang:typescript").
   */
  findByLanguage(language: string): CommandDefinition[] {
    const lower = language.toLowerCase();
    const langTag = `lang:${lower}`;
    return this.commands.filter((c) =>
      c.tags.some(
        (t) =>
          t.toLowerCase() === lower ||
          t.toLowerCase() === langTag,
      ),
    );
  }
}

/**
 * Tokenizes a query string into lowercase terms.
 */
function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * Scores a command against search terms.
 */
function scoreCommand(cmd: CommandDefinition, terms: string[]): number {
  let total = 0;

  const id = cmd.id.toLowerCase();
  const name = cmd.name.toLowerCase();
  const desc = cmd.description.toLowerCase();
  const slash = cmd.slash_command.toLowerCase();
  const tags = cmd.tags.map((t) => t.toLowerCase());

  for (const term of terms) {
    // Slash command match (highest weight)
    if (slash === term || slash === `/${term}`) {
      total += 10;
    } else if (slash.includes(term)) {
      total += 5;
    }

    // ID match
    if (id === term) {
      total += 8;
    } else if (id.includes(term)) {
      total += 4;
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
  }

  return total;
}
