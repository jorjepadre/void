/**
 * ManifestManager — loads and saves void.manifest.yaml workspace manifests.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { stringify as yamlStringify } from 'yaml';
import type { ManifestConfig } from '../types/manifest.js';
import { ManifestConfigSchema } from '../config/schemas.js';
import { loadYaml } from '../config/loader.js';

const MANIFEST_FILE = 'void.manifest.yaml';

export class ManifestManager {
  /**
   * Loads the manifest from void.manifest.yaml in the given workspace.
   * Returns null if the file does not exist.
   */
  async load(workspacePath: string): Promise<ManifestConfig | null> {
    const filePath = resolve(workspacePath, MANIFEST_FILE);

    if (!existsSync(filePath)) {
      return null;
    }

    return loadYaml<ManifestConfig>(filePath, ManifestConfigSchema);
  }

  /**
   * Validates and writes the manifest to void.manifest.yaml.
   */
  async save(workspacePath: string, manifest: ManifestConfig): Promise<void> {
    const validated = ManifestConfigSchema.parse(manifest);
    const filePath = resolve(workspacePath, MANIFEST_FILE);

    await mkdir(dirname(filePath), { recursive: true });
    const content = yamlStringify(validated);
    await writeFile(filePath, content, 'utf-8');
  }
}
