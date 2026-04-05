/**
 * Language detection — identifies programming languages in a workspace
 * by checking for well-known project/config files.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import fg from 'fast-glob';
const glob = fg;

interface LanguageSignal {
  language: string;
  files: string[];
  /** Glob patterns to check (relative to workspace). */
  globs?: string[];
}

const LANGUAGE_SIGNALS: LanguageSignal[] = [
  { language: 'typescript', files: ['tsconfig.json'] },
  { language: 'javascript', files: ['jsconfig.json'] },
  { language: 'python', files: ['pyproject.toml', 'setup.py', 'setup.cfg', 'Pipfile', 'requirements.txt'] },
  { language: 'go', files: ['go.mod'] },
  { language: 'rust', files: ['Cargo.toml'] },
  { language: 'java', files: ['pom.xml', 'build.gradle', 'build.gradle.kts'] },
  { language: 'swift', files: ['Package.swift'] },
  { language: 'cpp', files: ['CMakeLists.txt'] },
  { language: 'csharp', files: [], globs: ['*.csproj', '**/*.csproj'] },
  { language: 'dart', files: ['pubspec.yaml'] },
  { language: 'php', files: ['composer.json'] },
  { language: 'perl', files: ['cpanfile', 'Makefile.PL'] },
  { language: 'ruby', files: ['Gemfile'] },
  { language: 'elixir', files: ['mix.exs'] },
  { language: 'kotlin', files: ['build.gradle.kts'] },
  { language: 'scala', files: ['build.sbt'] },
  { language: 'zig', files: ['build.zig'] },
];

/**
 * Detects programming languages present in a workspace by checking
 * for characteristic project files.
 */
export async function detectLanguages(workspacePath: string): Promise<string[]> {
  const root = resolve(workspacePath);
  const detected = new Set<string>();

  for (const signal of LANGUAGE_SIGNALS) {
    // Check direct file existence
    for (const file of signal.files) {
      if (existsSync(resolve(root, file))) {
        detected.add(signal.language);
        break;
      }
    }

    // Check glob patterns if no direct file matched
    if (!detected.has(signal.language) && signal.globs) {
      for (const pattern of signal.globs) {
        const matches = await glob(pattern, {
          cwd: root,
          onlyFiles: true,
          deep: 2,
          absolute: false,
        });
        if (matches.length > 0) {
          detected.add(signal.language);
          break;
        }
      }
    }
  }

  return [...detected].sort();
}
