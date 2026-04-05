/**
 * Harness module — barrel export.
 */

export { BaseHarnessAdapter } from './adapter.js';
export { HarnessRegistry } from './registry.js';
export { detectHarness } from './detector.js';

export { ClaudeCodeAdapter } from './adapters/claude-code.js';
export { CodexAdapter } from './adapters/codex.js';
export { CursorAdapter } from './adapters/cursor.js';
export { CoworkAdapter } from './adapters/cowork.js';
export { GeminiAdapter } from './adapters/gemini.js';
export { KiroAdapter } from './adapters/kiro.js';
export { OpenCodeAdapter } from './adapters/opencode.js';
export { GenericAdapter } from './adapters/generic.js';
