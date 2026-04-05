/**
 * WorkspaceManager — manages the .void/ directory structure and workspace paths.
 * Provides safe path resolution for all workspace operations.
 */

import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { WorkspaceSandbox } from '../security/sandbox.js';

export class WorkspaceManager {
  private readonly _root: string;
  private readonly _sandbox: WorkspaceSandbox;

  private constructor(rootPath: string) {
    this._root = resolve(rootPath);
    this._sandbox = new WorkspaceSandbox(this._root);
  }

  /**
   * Initializes a workspace at the given root path.
   * Creates the .void/ directory structure if it doesn't exist.
   */
  static async init(rootPath: string): Promise<WorkspaceManager> {
    const manager = new WorkspaceManager(rootPath);

    // Create the core directory structure
    const dirs = [
      '.void',
      '.void/sessions',
      '.void/memory',
      '.void/cache',
      'skills',
      'agents',
      'commands',
      'rules',
      'hooks',
    ];

    for (const dir of dirs) {
      const fullPath = resolve(manager._root, dir);
      if (!existsSync(fullPath)) {
        await mkdir(fullPath, { recursive: true });
      }
    }

    return manager;
  }

  /** The absolute root path of the workspace. */
  get root(): string {
    return this._root;
  }

  /** The sandbox instance for this workspace. */
  get sandbox(): WorkspaceSandbox {
    return this._sandbox;
  }

  /**
   * Returns the path to the SQLite database.
   */
  getDbPath(): string {
    return resolve(this._root, '.void', 'void.db');
  }

  /**
   * Returns the path to the workspace config file.
   */
  getConfigPath(): string {
    return resolve(this._root, 'void.config.yaml');
  }

  /**
   * Returns the path to the skills directory.
   */
  getSkillsDir(): string {
    return resolve(this._root, 'skills');
  }

  /**
   * Creates a directory within the workspace and returns its absolute path.
   * Validates the path stays within workspace boundaries.
   */
  async ensureDir(relativePath: string): Promise<string> {
    // Validate the path is within workspace
    const fullPath = this._sandbox.resolve(relativePath);
    if (!existsSync(fullPath)) {
      await mkdir(fullPath, { recursive: true });
    }
    return fullPath;
  }
}
