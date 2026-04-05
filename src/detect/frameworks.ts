/**
 * Framework detection — identifies web/app frameworks by inspecting
 * dependency files (package.json, requirements.txt, etc.).
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface FrameworkSignal {
  framework: string;
  source: string;
  /** For package.json: dependency names to look for. */
  packages?: string[];
  /** For requirements.txt / pyproject.toml: pip package names. */
  pyPackages?: string[];
  /** For go.mod: module paths to look for. */
  goModules?: string[];
  /** For Cargo.toml: crate names. */
  crates?: string[];
  /** For Gemfile: gem names. */
  gems?: string[];
}

const FRAMEWORK_SIGNALS: FrameworkSignal[] = [
  // JavaScript/TypeScript frameworks
  { framework: 'react', source: 'package.json', packages: ['react'] },
  { framework: 'next', source: 'package.json', packages: ['next'] },
  { framework: 'vue', source: 'package.json', packages: ['vue'] },
  { framework: 'nuxt', source: 'package.json', packages: ['nuxt'] },
  { framework: 'svelte', source: 'package.json', packages: ['svelte'] },
  { framework: 'angular', source: 'package.json', packages: ['@angular/core'] },
  { framework: 'express', source: 'package.json', packages: ['express'] },
  { framework: 'fastify', source: 'package.json', packages: ['fastify'] },
  { framework: 'nestjs', source: 'package.json', packages: ['@nestjs/core'] },
  { framework: 'hono', source: 'package.json', packages: ['hono'] },
  { framework: 'astro', source: 'package.json', packages: ['astro'] },
  { framework: 'remix', source: 'package.json', packages: ['@remix-run/node', '@remix-run/react'] },
  { framework: 'electron', source: 'package.json', packages: ['electron'] },
  { framework: 'tauri', source: 'package.json', packages: ['@tauri-apps/api'] },

  // Python frameworks
  { framework: 'django', source: 'requirements.txt', pyPackages: ['django', 'Django'] },
  { framework: 'flask', source: 'requirements.txt', pyPackages: ['flask', 'Flask'] },
  { framework: 'fastapi', source: 'requirements.txt', pyPackages: ['fastapi', 'FastAPI'] },
  { framework: 'pytorch', source: 'requirements.txt', pyPackages: ['torch'] },
  { framework: 'tensorflow', source: 'requirements.txt', pyPackages: ['tensorflow'] },

  // Go frameworks
  { framework: 'gin', source: 'go.mod', goModules: ['github.com/gin-gonic/gin'] },
  { framework: 'fiber', source: 'go.mod', goModules: ['github.com/gofiber/fiber'] },
  { framework: 'echo', source: 'go.mod', goModules: ['github.com/labstack/echo'] },

  // Rust frameworks
  { framework: 'actix', source: 'Cargo.toml', crates: ['actix-web'] },
  { framework: 'axum', source: 'Cargo.toml', crates: ['axum'] },
  { framework: 'rocket', source: 'Cargo.toml', crates: ['rocket'] },

  // Ruby frameworks
  { framework: 'rails', source: 'Gemfile', gems: ['rails'] },
  { framework: 'sinatra', source: 'Gemfile', gems: ['sinatra'] },
];

/**
 * Detects frameworks in a workspace by inspecting dependency declarations.
 */
export async function detectFrameworks(workspacePath: string): Promise<string[]> {
  const root = resolve(workspacePath);
  const detected = new Set<string>();

  // Load package.json dependencies
  const packageJsonDeps = await loadPackageJsonDeps(root);

  // Load requirements.txt lines
  const requirementsLines = await loadTextLines(root, 'requirements.txt');

  // Load pyproject.toml content
  const pyprojectContent = await loadFileContent(root, 'pyproject.toml');

  // Load go.mod content
  const goModContent = await loadFileContent(root, 'go.mod');

  // Load Cargo.toml content
  const cargoContent = await loadFileContent(root, 'Cargo.toml');

  // Load Gemfile content
  const gemfileContent = await loadFileContent(root, 'Gemfile');

  for (const signal of FRAMEWORK_SIGNALS) {
    if (signal.packages && packageJsonDeps) {
      for (const pkg of signal.packages) {
        if (packageJsonDeps.has(pkg)) {
          detected.add(signal.framework);
          break;
        }
      }
    }

    if (signal.pyPackages) {
      // Check requirements.txt
      if (requirementsLines) {
        for (const pyPkg of signal.pyPackages) {
          const found = requirementsLines.some(
            (line) =>
              line.toLowerCase().startsWith(pyPkg.toLowerCase()) ||
              line.toLowerCase().startsWith(pyPkg.toLowerCase() + '==') ||
              line.toLowerCase().startsWith(pyPkg.toLowerCase() + '>=') ||
              line.toLowerCase().startsWith(pyPkg.toLowerCase() + '[')
          );
          if (found) {
            detected.add(signal.framework);
            break;
          }
        }
      }
      // Check pyproject.toml
      if (pyprojectContent) {
        for (const pyPkg of signal.pyPackages) {
          if (pyprojectContent.includes(pyPkg)) {
            detected.add(signal.framework);
            break;
          }
        }
      }
    }

    if (signal.goModules && goModContent) {
      for (const mod of signal.goModules) {
        if (goModContent.includes(mod)) {
          detected.add(signal.framework);
          break;
        }
      }
    }

    if (signal.crates && cargoContent) {
      for (const crate of signal.crates) {
        // Look for crate name in [dependencies] section
        if (cargoContent.includes(crate)) {
          detected.add(signal.framework);
          break;
        }
      }
    }

    if (signal.gems && gemfileContent) {
      for (const gem of signal.gems) {
        // Gemfile uses: gem 'name' or gem "name"
        const gemPattern = new RegExp(`gem\\s+['"]${gem}['"]`);
        if (gemPattern.test(gemfileContent)) {
          detected.add(signal.framework);
          break;
        }
      }
    }
  }

  return [...detected].sort();
}

async function loadPackageJsonDeps(root: string): Promise<Set<string> | null> {
  const pkgPath = resolve(root, 'package.json');
  if (!existsSync(pkgPath)) return null;

  try {
    const raw = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const deps = new Set<string>();

    for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
      const sectionDeps = pkg[section];
      if (sectionDeps && typeof sectionDeps === 'object') {
        for (const name of Object.keys(sectionDeps as Record<string, unknown>)) {
          deps.add(name);
        }
      }
    }
    return deps;
  } catch {
    return null;
  }
}

async function loadTextLines(root: string, filename: string): Promise<string[] | null> {
  const filePath = resolve(root, filename);
  if (!existsSync(filePath)) return null;

  try {
    const raw = await readFile(filePath, 'utf-8');
    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));
  } catch {
    return null;
  }
}

async function loadFileContent(root: string, filename: string): Promise<string | null> {
  const filePath = resolve(root, filename);
  if (!existsSync(filePath)) return null;

  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}
