/**
 * Agent compressor — produces a compact string representation
 * of an agent definition for fast context loading.
 */

import type { AgentDefinition } from '../types/agent.js';

const MAX_PROMPT_LENGTH = 4000;

/**
 * Compresses an agent definition to a compact, human-readable summary.
 *
 * - Strips excessive whitespace from system_prompt
 * - Truncates system_prompt if it exceeds 4000 chars
 * - Returns a condensed YAML-like summary string
 */
export function compressAgent(agent: AgentDefinition): string {
  const lines: string[] = [];

  lines.push(`id: ${agent.id}`);
  lines.push(`name: ${agent.name}`);
  lines.push(`version: ${agent.version}`);

  if (agent.language) {
    lines.push(`language: ${agent.language}`);
  }

  if (agent.tags.length > 0) {
    lines.push(`tags: [${agent.tags.join(', ')}]`);
  }

  if (agent.depends_on.length > 0) {
    lines.push(`depends_on: [${agent.depends_on.join(', ')}]`);
  }

  if (agent.capabilities.length > 0) {
    lines.push(`capabilities: [${agent.capabilities.join(', ')}]`);
  }

  const paramKeys = Object.keys(agent.parameters);
  if (paramKeys.length > 0) {
    lines.push(`parameters: {${paramKeys.join(', ')}}`);
  }

  // Compress the system prompt
  const compressedPrompt = compressPrompt(agent.system_prompt);
  if (compressedPrompt.length > 0) {
    lines.push(`system_prompt: |`);
    // Indent each line of the prompt by 2 spaces
    const promptLines = compressedPrompt.split('\n');
    for (const pl of promptLines) {
      lines.push(`  ${pl}`);
    }
  }

  return lines.join('\n');
}

/**
 * Strips unnecessary whitespace and truncates to MAX_PROMPT_LENGTH.
 */
function compressPrompt(prompt: string): string {
  // Collapse multiple blank lines into single blank lines
  let compressed = prompt.replace(/\n{3,}/g, '\n\n');

  // Collapse multiple spaces/tabs into single spaces (within lines)
  compressed = compressed
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n');

  // Trim leading/trailing whitespace
  compressed = compressed.trim();

  // Truncate if too long
  if (compressed.length > MAX_PROMPT_LENGTH) {
    compressed = compressed.slice(0, MAX_PROMPT_LENGTH - 3) + '...';
  }

  return compressed;
}
