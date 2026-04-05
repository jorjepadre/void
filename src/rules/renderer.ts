/**
 * RuleRenderer — renders a ResolvedRuleSet into harness-specific formats.
 */

import type { HarnessType } from '../types/harness.js';
import type { ResolvedRuleSet } from '../types/rule.js';

export class RuleRenderer {
  /**
   * Renders a resolved rule set for a specific harness type.
   *
   * - claude-code: Markdown with ## section headers
   * - cursor: .cursorrules format (key-value sections)
   * - generic/other: Markdown fallback
   */
  renderForHarness(ruleSet: ResolvedRuleSet, harnessType: HarnessType): string {
    switch (harnessType) {
      case 'claude-code':
        return this.renderMarkdown(ruleSet);

      case 'cursor':
        return this.renderCursorRules(ruleSet);

      case 'generic':
        return this.renderMarkdown(ruleSet);

      default:
        // codex, cowork, gemini, kiro, opencode — all fall back to markdown
        return this.renderMarkdown(ruleSet);
    }
  }

  /**
   * Renders as markdown with ## headers per section.
   * Used by claude-code, generic, and other harnesses.
   */
  private renderMarkdown(ruleSet: ResolvedRuleSet): string {
    const lines: string[] = [];

    if (ruleSet.layers.length > 0) {
      lines.push(`<!-- Layers: ${ruleSet.layers.join(', ')} -->`);
      lines.push('');
    }

    const sections = Array.from(ruleSet.sections.entries());

    for (const [name, section] of sections) {
      lines.push(`## ${formatSectionName(name)}`);
      lines.push('');

      for (const rule of section.rules) {
        lines.push(`- ${rule}`);
      }

      lines.push('');
    }

    return lines.join('\n').trimEnd() + '\n';
  }

  /**
   * Renders as .cursorrules format.
   * Each section becomes a block with the section name as a header,
   * followed by rule entries.
   */
  private renderCursorRules(ruleSet: ResolvedRuleSet): string {
    const lines: string[] = [];

    const sections = Array.from(ruleSet.sections.entries());

    for (const [name, section] of sections) {
      lines.push(`[${name}]`);

      for (const rule of section.rules) {
        lines.push(rule);
      }

      lines.push('');
    }

    return lines.join('\n').trimEnd() + '\n';
  }
}

/**
 * Converts a section key (e.g., "code_style") to a display name ("Code Style").
 */
function formatSectionName(name: string): string {
  return name
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
