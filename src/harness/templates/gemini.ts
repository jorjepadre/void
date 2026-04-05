/**
 * Default template for .gemini/guide.md.
 */

export function geminiTemplate(): string {
  return [
    '# Gemini Guide',
    '',
    'Project rules and conventions for Gemini.',
    '',
    '## General',
    '',
    '- Follow project coding standards.',
    '- Write clean, well-documented code.',
    '',
  ].join('\n');
}
