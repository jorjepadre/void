/**
 * WorkspaceSandbox — filesystem containment for agent operations.
 * Ensures all file access stays within the designated workspace root.
 */

import { realpathSync, mkdirSync, existsSync } from 'node:fs';
import { resolve as pathResolve, relative, normalize } from 'node:path';

export class WorkspaceSandbox {
  private readonly _root: string;
  private readonly _allowedPaths: ReadonlySet<string>;

  constructor(rootPath: string, allowedPaths?: string[]) {
    // Resolve the root to an absolute real path, creating it if needed
    if (!existsSync(rootPath)) {
      mkdirSync(rootPath, { recursive: true });
    }
    this._root = realpathSync(pathResolve(rootPath));

    // Resolve each allowed path to its real absolute form
    const resolved = new Set<string>();
    if (allowedPaths) {
      for (const p of allowedPaths) {
        if (existsSync(p)) {
          resolved.add(realpathSync(pathResolve(p)));
        } else {
          resolved.add(pathResolve(p));
        }
      }
    }
    this._allowedPaths = resolved;
  }

  /** The resolved root path of this sandbox. */
  get root(): string {
    return this._root;
  }

  /**
   * Resolves a path within the sandbox. Throws if the resolved path escapes
   * the sandbox root or any explicitly allowed path.
   */
  resolve(targetPath: string): string {
    const normalized = normalize(targetPath);

    // Reject null bytes
    if (normalized.includes('\0')) {
      throw new SandboxError(`Path contains null bytes: ${targetPath}`);
    }

    // First resolve against the root
    const joined = pathResolve(this._root, normalized);

    // If the path exists on disk, resolve symlinks to get the real path
    let real: string;
    if (existsSync(joined)) {
      real = realpathSync(joined);
    } else {
      // For paths that don't exist yet, ensure the resolved form is still inside root.
      // Check for .. traversal after resolution.
      real = joined;
    }

    // Check: resolved path must start with root or an allowed path
    if (this._isWithinBoundary(real)) {
      return real;
    }

    throw new SandboxError(
      `Path "${targetPath}" resolves to "${real}" which escapes sandbox root "${this._root}"`
    );
  }

  /**
   * Checks if a path is within the sandbox boundary without throwing.
   */
  isAllowed(targetPath: string): boolean {
    try {
      this.resolve(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Creates a sub-sandbox scoped to a specific agent's directory.
   * The agent directory is created under root/agents/{agentId}.
   */
  scopeForAgent(agentId: string): WorkspaceSandbox {
    if (!/^[a-zA-Z0-9_-]+$/.test(agentId)) {
      throw new SandboxError(
        `Invalid agent ID "${agentId}": must be alphanumeric with hyphens/underscores`
      );
    }
    const agentDir = pathResolve(this._root, 'agents', agentId);
    mkdirSync(agentDir, { recursive: true });
    return new WorkspaceSandbox(agentDir);
  }

  /**
   * Checks whether a real path falls within the sandbox root or an allowed path.
   */
  private _isWithinBoundary(realPath: string): boolean {
    // Check root
    if (realPath === this._root || realPath.startsWith(this._root + '/')) {
      return true;
    }

    // Check explicitly allowed paths
    for (const allowed of this._allowedPaths) {
      if (realPath === allowed || realPath.startsWith(allowed + '/')) {
        return true;
      }
    }

    // Also verify no sneaky .. remains after resolution
    const rel = relative(this._root, realPath);
    if (!rel.startsWith('..') && !rel.startsWith('/')) {
      return true;
    }

    return false;
  }
}

export class SandboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SandboxError';
  }
}
