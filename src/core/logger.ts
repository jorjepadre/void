/**
 * VoidLogger — structured logging with automatic secret redaction.
 * Writes to stderr to avoid interfering with JSON stdio transport for hooks.
 */

import type { SecretRedactor } from '../security/secrets.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class VoidLogger {
  private readonly _redactor: SecretRedactor;
  private readonly _level: LogLevel;
  private readonly _prefix: string;

  constructor(redactor: SecretRedactor, options?: LoggerOptions) {
    this._redactor = redactor;
    this._level = options?.level ?? 'info';
    this._prefix = options?.prefix ?? 'VOID';
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this._log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this._log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this._log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this._log('error', message, data);
  }

  /**
   * Creates a child logger with an additional prefix segment.
   */
  child(prefix: string): VoidLogger {
    return new VoidLogger(this._redactor, {
      level: this._level,
      prefix: `${this._prefix}:${prefix}`,
    });
  }

  private _log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this._level]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const redactedMessage = this._redactor.redact(message);
    const levelTag = level.toUpperCase();

    let line = `[${this._prefix}] [${levelTag}] [${timestamp}] ${redactedMessage}`;

    if (data !== undefined) {
      const redactedData = this._redactor.redactObject(data);
      line += ` ${JSON.stringify(redactedData)}`;
    }

    process.stderr.write(line + '\n');
  }
}
