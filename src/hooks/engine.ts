/**
 * HookEngine — orchestrates hook execution for lifecycle events.
 * Filters hooks by profile, event type, matcher, and flags,
 * then executes them sequentially in priority order.
 */

import type { HookEventType, HookInput, HookOutput, HookDefinition } from '../types/hook.js';
import { safeSpawn } from '../security/process.js';
import { matchesHook } from './matcher.js';
import type { HookProfileManager } from './profiles.js';
import type { HookFlags } from './flags.js';
import type { VoidEventBus } from './events.js';

const DEFAULT_OUTPUT: HookOutput = { decision: 'allow' };

export class HookEngine {
  constructor(
    private readonly _profileManager: HookProfileManager,
    private readonly _flags: HookFlags,
    private readonly _eventBus: VoidEventBus,
  ) {}

  /**
   * Execute all matching hooks for an event.
   * 1. Get hooks for active profile
   * 2. Filter by event type match
   * 3. Filter by matcher match
   * 4. Filter by flag enabled
   * 5. Sort by priority (highest first)
   * 6. Execute each hook's command sequentially
   * 7. If any returns 'block', stop and return block
   * 8. Return final decision
   */
  async execute(event: HookEventType, input: HookInput): Promise<HookOutput> {
    // Emit event on bus
    this._eventBus.emit(event, input);

    // 1. Get hooks for active profile (already filters enabled)
    const profileHooks = this._profileManager.getHooksForProfile();

    // 2 + 3. Filter by event type and matcher
    const matched = profileHooks.filter((hook) => matchesHook(hook, input));

    // 4. Filter by flag enabled
    const enabled = matched.filter((hook) => this._flags.isEnabled(hook.id));

    // 5. Sort by priority (highest first)
    enabled.sort((a, b) => b.priority - a.priority);

    // 6. Execute sequentially
    let lastOutput: HookOutput = { ...DEFAULT_OUTPUT };

    for (const hook of enabled) {
      const output = await this.executeHookCommand(hook, input);

      // 7. If block, stop immediately
      if (output.decision === 'block') {
        return output;
      }

      lastOutput = output;
    }

    // 8. Return final decision
    return lastOutput;
  }

  /**
   * Execute a single hook's command.
   * Passes input as JSON on stdin, reads JSON output from stdout.
   * On error: returns { decision: 'allow', reason: 'hook error: ...' }
   */
  async executeHookCommand(
    hook: HookDefinition,
    input: HookInput,
  ): Promise<HookOutput> {
    try {
      const parts = hook.command.split(/\s+/).filter(Boolean);
      const cmd = parts[0];
      const args = parts.slice(1);

      if (!cmd) {
        return { decision: 'allow', reason: 'hook error: empty command' };
      }

      const child = safeSpawn(cmd, args, {
        timeout: hook.timeout_ms,
      });

      const inputJson = JSON.stringify(input);

      return await new Promise<HookOutput>((resolve) => {
        let stdout = '';
        let stderr = '';
        let timedOut = false;

        const timer = setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
        }, hook.timeout_ms);

        child.stdout?.on('data', (chunk: Buffer) => {
          stdout += chunk.toString();
        });

        child.stderr?.on('data', (chunk: Buffer) => {
          stderr += chunk.toString();
        });

        child.on('error', (err: Error) => {
          clearTimeout(timer);
          resolve({
            decision: 'allow',
            reason: `hook error: ${err.message}`,
          });
        });

        child.on('close', (code: number | null) => {
          clearTimeout(timer);

          if (timedOut) {
            resolve({
              decision: 'allow',
              reason: `hook error: timed out after ${hook.timeout_ms}ms`,
            });
            return;
          }

          if (code !== 0) {
            resolve({
              decision: 'allow',
              reason: `hook error: exited with code ${code}${stderr ? ' — ' + stderr.trim() : ''}`,
            });
            return;
          }

          try {
            const parsed = JSON.parse(stdout) as HookOutput;
            resolve({
              decision: parsed.decision ?? 'allow',
              reason: parsed.reason,
              modified_input: parsed.modified_input,
            });
          } catch {
            resolve({
              decision: 'allow',
              reason: `hook error: invalid JSON output — ${stdout.slice(0, 200)}`,
            });
          }
        });

        // Write input to stdin
        child.stdin?.write(inputJson);
        child.stdin?.end();
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { decision: 'allow', reason: `hook error: ${message}` };
    }
  }
}
