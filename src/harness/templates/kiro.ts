/**
 * Default template for .kiro/steering/rules.md.
 */

export function kiroTemplate(): string {
  return [
    '# Kiro Steering Rules',
    '',
    'Project rules and conventions for Kiro.',
    '',
    '## General',
    '',
    '- Follow project coding standards.',
    '- Write clean, well-documented code.',
    '',
  ].join('\n');
}
