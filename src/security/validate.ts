/**
 * Shared validation utilities — input sanitization and format checking.
 */

import { normalize } from 'node:path';

/**
 * Normalizes a filesystem path and rejects dangerous inputs.
 * Throws on null bytes or empty paths.
 */
export function sanitizePath(input: string): string {
  if (input.length === 0) {
    throw new ValidationError('Path must not be empty');
  }

  if (input.includes('\0')) {
    throw new ValidationError('Path contains null bytes');
  }

  return normalize(input);
}

/**
 * Checks if a string is a valid identifier (used for agent IDs, skill IDs, etc.).
 * Allows alphanumeric characters, hyphens, and underscores. 1-128 chars.
 */
export function isValidIdentifier(input: string): boolean {
  if (input.length < 1 || input.length > 128) {
    return false;
  }
  return /^[a-zA-Z0-9_-]+$/.test(input);
}

/**
 * Checks if a string is a valid namespace (used for memory namespaces, config sections).
 * Allows alphanumeric characters, dots, and hyphens. 1-256 chars.
 */
export function isValidNamespace(input: string): boolean {
  if (input.length < 1 || input.length > 256) {
    return false;
  }
  return /^[a-zA-Z0-9.-]+$/.test(input);
}

/**
 * Truncates text to a maximum length, appending ellipsis if truncated.
 */
export function truncate(text: string, maxLength: number): string {
  if (maxLength < 0) {
    throw new ValidationError('maxLength must be non-negative');
  }
  if (text.length <= maxLength) {
    return text;
  }
  if (maxLength <= 3) {
    return text.slice(0, maxLength);
  }
  return text.slice(0, maxLength - 3) + '...';
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
