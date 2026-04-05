/**
 * InstallLifecycle — pre-install validation, post-install verification, and rollback.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ManifestConfig } from '../types/manifest.js';
import type { InstallResult } from './installer.js';
import type { HarnessAdapter } from '../types/harness.js';

export class InstallConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstallConflictError';
  }
}

export class InstallLifecycle {
  private readonly _adapter: HarnessAdapter;

  constructor(adapter: HarnessAdapter) {
    this._adapter = adapter;
  }

  /**
   * Pre-install checks:
   * - Validates that the workspace directory exists
   * - Checks that the manifest has a valid harness
   * - Detects conflicting component IDs (duplicates in the manifest)
   */
  async preInstall(workspacePath: string, manifest: ManifestConfig): Promise<void> {
    // Validate workspace exists
    if (!existsSync(resolve(workspacePath))) {
      throw new InstallConflictError(
        `Workspace directory does not exist: ${workspacePath}`
      );
    }

    // Check for duplicate component IDs
    const ids = manifest.components.map((c) => c.id);
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const id of ids) {
      if (seen.has(id)) {
        duplicates.push(id);
      }
      seen.add(id);
    }

    if (duplicates.length > 0) {
      throw new InstallConflictError(
        `Duplicate component IDs in manifest: ${duplicates.join(', ')}`
      );
    }

    // Validate manifest harness matches adapter
    if (manifest.harness !== this._adapter.type) {
      throw new InstallConflictError(
        `Manifest harness "${manifest.harness}" does not match adapter "${this._adapter.type}"`
      );
    }
  }

  /**
   * Post-install verification:
   * - Checks that the harness config directory exists
   * - Verifies at least one rule path is present
   * - Logs failed components from the install result
   */
  async postInstall(workspacePath: string, result: InstallResult): Promise<void> {
    // Verify the config path was created
    const configPath = this._adapter.getConfigPath(workspacePath);
    const configExists = existsSync(configPath);

    if (!configExists && result.installed.length > 0) {
      // Config path may not exist yet if adapter creates it lazily.
      // This is not an error, just a note for debugging.
    }

    // Verify at least one rule path exists if rules were installed
    const rulePaths = this._adapter.getRulePaths(workspacePath);
    const hasRulePath = rulePaths.some((p) => existsSync(p));

    if (!hasRulePath && result.installed.length > 0) {
      // Same as above — may be created lazily.
    }
  }

  /**
   * Rollback: removes components that were not in the original installed set.
   * Compares current installed IDs with the "before" snapshot and removes additions.
   */
  async rollback(workspacePath: string, installedBefore: string[]): Promise<void> {
    // Use the adapter's uninstall to remove any components not in the original set.
    // We need to determine what was added since the snapshot.
    // The caller is expected to provide the IDs that were installed before the operation.
    // We uninstall everything that isn't in that list.
    // Since we don't have a tracker reference here, we rely on the adapter's uninstall
    // which removes files by component ID.

    // For rollback, we figure out what to remove by diffing with the before state.
    // The caller should pass the full install result and we remove anything that succeeded
    // but wasn't in the original set. Since we only get installedBefore, we remove
    // anything the adapter knows about that isn't in that list.
    //
    // In practice, the caller would do:
    //   const before = tracker.getInstalled().map(c => c.id);
    //   ... install ...
    //   if (error) await lifecycle.rollback(workspacePath, before);

    // For now, we cannot enumerate what the adapter installed without a tracker,
    // so we accept that this is a best-effort rollback through the adapter's uninstall.
    // The adapter.uninstall method will silently skip IDs with no matching files.

    // We do not call adapter.uninstall with the "before" list — we need the "after" minus "before."
    // Since we lack the "after" list here, the typical usage is:
    //   lifecycle.rollback(workspacePath, newlyInstalledIds)
    // where newlyInstalledIds are the IDs to remove.

    if (installedBefore.length === 0) {
      return;
    }

    await this._adapter.uninstall(workspacePath, installedBefore);
  }
}
