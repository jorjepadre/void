/**
 * Safe process spawning — wraps child_process with security guards.
 * Rejects shell injection vectors and enforces argument validation.
 */

import {
  spawn,
  execFile,
  type ChildProcess,
  type SpawnOptions,
  type ExecFileOptions,
} from 'node:child_process';

export interface SafeSpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
  signal?: AbortSignal;
}

export interface SafeExecFileOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
  signal?: AbortSignal;
  maxBuffer?: number;
}

export interface ExecFileResult {
  stdout: string;
  stderr: string;
}

/**
 * Shell metacharacters that indicate injection attempts when present
 * in arguments. These should never appear in unquoted args passed to spawn.
 */
const SHELL_METACHAR_PATTERN = /[;|&`$(){}]/;

/**
 * Validates that a set of arguments does not contain shell metacharacters.
 * Throws ProcessSecurityError if any argument is suspect.
 */
function validateArgs(args: readonly string[]): void {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (SHELL_METACHAR_PATTERN.test(arg)) {
      throw new ProcessSecurityError(
        `Argument at index ${i} contains shell metacharacter: "${arg}". ` +
          'This may indicate a command injection attempt.'
      );
    }
  }
}

/**
 * Validates that the command itself is a simple name or path, not a shell expression.
 */
function validateCommand(command: string): void {
  if (SHELL_METACHAR_PATTERN.test(command)) {
    throw new ProcessSecurityError(
      `Command "${command}" contains shell metacharacters. ` +
        'Use a direct executable path instead.'
    );
  }
  if (command.length === 0) {
    throw new ProcessSecurityError('Command must not be empty.');
  }
}

/**
 * Spawns a child process with security validation.
 * Rejects shell: true and validates all arguments.
 */
export function safeSpawn(
  command: string,
  args: readonly string[],
  opts?: SafeSpawnOptions
): ChildProcess {
  validateCommand(command);
  validateArgs(args);

  const spawnOpts: SpawnOptions = {
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  };

  if (opts?.cwd) spawnOpts.cwd = opts.cwd;
  if (opts?.env) spawnOpts.env = opts.env;
  if (opts?.timeout) spawnOpts.timeout = opts.timeout;
  if (opts?.signal) spawnOpts.signal = opts.signal;

  return spawn(command, [...args], spawnOpts);
}

/**
 * Executes a file and returns stdout/stderr as a promise.
 * Applies the same security validation as safeSpawn.
 */
export function safeExecFile(
  command: string,
  args: readonly string[],
  opts?: SafeExecFileOptions
): Promise<ExecFileResult> {
  validateCommand(command);
  validateArgs(args);

  const execOpts: ExecFileOptions = {
    shell: false,
  };

  if (opts?.cwd) execOpts.cwd = opts.cwd;
  if (opts?.env) execOpts.env = opts.env;
  if (opts?.timeout) execOpts.timeout = opts.timeout;
  if (opts?.signal) execOpts.signal = opts.signal;
  if (opts?.maxBuffer) execOpts.maxBuffer = opts.maxBuffer;

  return new Promise<ExecFileResult>((resolve, reject) => {
    execFile(command, [...args], execOpts, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({
        stdout: typeof stdout === 'string' ? stdout : stdout.toString(),
        stderr: typeof stderr === 'string' ? stderr : stderr.toString(),
      });
    });
  });
}

export class ProcessSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProcessSecurityError';
  }
}
