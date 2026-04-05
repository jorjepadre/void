/**
 * Default template for .opencode/instructions.md.
 */

export function opencodeTemplate(): string {
  return [
    '# OpenCode Instructions',
    '',
    'Project rules and conventions for OpenCode.',
    '',
    '## General',
    '',
    '- Follow project coding standards.',
    '- Write clean, well-documented code.',
    '',
  ].join('\n');
}
