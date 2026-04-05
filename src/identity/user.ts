/**
 * UserIdentityManager — loads, saves, and updates user identity from .void/identity.json.
 */

import { existsSync } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import type { UserIdentity } from '../types/identity.js';
import { UserIdentitySchema } from '../config/schemas.js';

const IDENTITY_FILE = '.void/identity.json';

function defaultIdentity(): UserIdentity {
  return UserIdentitySchema.parse({});
}

export class UserIdentityManager {
  /**
   * Loads user identity from .void/identity.json in the given workspace.
   * Returns sensible defaults if the file does not exist.
   */
  async load(workspacePath: string): Promise<UserIdentity> {
    const filePath = resolve(workspacePath, IDENTITY_FILE);

    if (!existsSync(filePath)) {
      return defaultIdentity();
    }

    let raw: string;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch {
      return defaultIdentity();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return defaultIdentity();
    }

    return UserIdentitySchema.parse(parsed);
  }

  /**
   * Validates and saves user identity to .void/identity.json.
   */
  async save(workspacePath: string, identity: UserIdentity): Promise<void> {
    const validated = UserIdentitySchema.parse(identity);
    const filePath = resolve(workspacePath, IDENTITY_FILE);

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(validated, null, 2) + '\n', 'utf-8');
  }

  /**
   * Merges partial updates into the existing identity and saves.
   */
  async update(workspacePath: string, partial: Partial<UserIdentity>): Promise<UserIdentity> {
    const existing = await this.load(workspacePath);
    const merged: UserIdentity = { ...existing, ...partial };
    await this.save(workspacePath, merged);
    return merged;
  }
}
