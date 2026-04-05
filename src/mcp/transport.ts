/**
 * MCP Transport utilities — spawns MCP server processes and manages their stdio streams.
 */

import type { ChildProcess } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import { safeSpawn } from '../security/process.js';

export interface StdioTransport {
  readable: Readable;
  writable: Writable;
  process: ChildProcess;
}

/**
 * Spawn an MCP server process and return its stdio streams for communication.
 * Uses safeSpawn for shell-injection protection.
 */
export function createStdioTransport(
  command: string,
  args: string[],
  env?: Record<string, string>
): StdioTransport {
  const mergedEnv: NodeJS.ProcessEnv = { ...process.env };
  if (env) {
    for (const [key, value] of Object.entries(env)) {
      mergedEnv[key] = value;
    }
  }

  const child = safeSpawn(command, args, { env: mergedEnv });

  if (!child.stdout || !child.stdin) {
    child.kill();
    throw new Error(
      `Failed to open stdio streams for MCP server process: ${command}`
    );
  }

  return {
    readable: child.stdout,
    writable: child.stdin,
    process: child,
  };
}

/**
 * Gracefully kill an MCP server process.
 * Sends SIGTERM first, then SIGKILL after a timeout.
 */
export function cleanupTransport(transport: { process: ChildProcess }): void {
  const proc = transport.process;
  if (proc.killed || proc.exitCode !== null) return;

  proc.kill('SIGTERM');

  // Force-kill after 5 seconds if still alive
  const killTimer = setTimeout(() => {
    if (!proc.killed && proc.exitCode === null) {
      proc.kill('SIGKILL');
    }
  }, 5000);

  // Unref so this timer does not keep the process alive
  killTimer.unref();
}
