/**
 * Project detection — combines language, framework, and tooling detection
 * into a single workspace analysis result.
 */

import { detectLanguages } from './languages.js';
import { detectFrameworks } from './frameworks.js';
import { detectPackageManager, detectFormatter } from './tools.js';

export interface ProjectInfo {
  languages: string[];
  frameworks: string[];
  packageManager: string;
  formatter: string | null;
}

/**
 * Performs full project detection on a workspace directory.
 * Runs all detectors in parallel for speed.
 */
export async function detectProject(workspacePath: string): Promise<ProjectInfo> {
  const [languages, frameworks, packageManager, formatter] = await Promise.all([
    detectLanguages(workspacePath),
    detectFrameworks(workspacePath),
    detectPackageManager(workspacePath),
    detectFormatter(workspacePath),
  ]);

  return {
    languages,
    frameworks,
    packageManager,
    formatter,
  };
}

// Re-export individual detectors for direct use
export { detectLanguages } from './languages.js';
export { detectFrameworks } from './frameworks.js';
export { detectPackageManager, detectFormatter } from './tools.js';
