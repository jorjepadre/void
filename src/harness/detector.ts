/**
 * Harness detector — probes workspace to determine which AI harness is active.
 */

import type { HarnessType, HarnessAdapter } from '../types/harness.js';

/** Detection priority order — most specific first, generic last. */
const DETECTION_ORDER: HarnessType[] = [
  'claude-code',
  'codex',
  'cursor',
  'kiro',
  'gemini',
  'opencode',
  'cowork',
  'generic',
];

/**
 * Detects the active harness for a workspace by trying each adapter's
 * detect() in priority order. Returns the first match, or 'generic' if none.
 */
export async function detectHarness(
  workspacePath: string,
  adapters: Map<HarnessType, HarnessAdapter>,
): Promise<HarnessType> {
  for (const type of DETECTION_ORDER) {
    if (type === 'generic') continue;

    const adapter = adapters.get(type);
    if (adapter && await adapter.detect(workspacePath)) {
      return type;
    }
  }

  return 'generic';
}
