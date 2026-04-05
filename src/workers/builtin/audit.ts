/**
 * AuditWorker — scans workspace for secret patterns, logs violations to audit trail.
 * Checks common secret patterns in recently modified files.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { Worker } from '../base.js';
import type { VoidLogger } from '../../core/logger.js';

const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{8,}/i,
  /(?:secret|password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}/i,
  /(?:token)\s*[:=]\s*['"][^'"]{8,}/i,
  /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/,
  /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/,
  /ghp_[0-9a-zA-Z]{36}/,
  /sk-[a-zA-Z0-9]{32,}/,
];

const SCAN_EXTENSIONS = new Set([
  '.ts', '.js', '.json', '.yaml', '.yml', '.toml',
  '.env', '.cfg', '.conf', '.ini', '.sh', '.bash',
]);

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', '.void', 'coverage',
]);

export class AuditWorker extends Worker {
  readonly id = 'audit';
  readonly name = 'Audit Scanner';

  private readonly _logger: VoidLogger;
  private readonly _root: string;

  constructor(logger: VoidLogger, root: string) {
    super();
    this._logger = logger;
    this._root = root;
  }

  async execute(): Promise<void> {
    const violations: Array<{ file: string; line: number; pattern: string }> = [];
    await this._scanDir(this._root, violations, 0);

    if (violations.length > 0) {
      this._logger.warn('Audit: secret pattern violations detected', {
        count: violations.length,
        files: [...new Set(violations.map((v) => v.file))],
      });
    } else {
      this._logger.debug('Audit: scan clean');
    }
  }

  private async _scanDir(
    dir: string,
    violations: Array<{ file: string; line: number; pattern: string }>,
    depth: number
  ): Promise<void> {
    if (depth > 5) return;

    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry)) continue;

      const fullPath = resolve(dir, entry);
      let stats;
      try {
        stats = await stat(fullPath);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        await this._scanDir(fullPath, violations, depth + 1);
      } else if (stats.isFile() && SCAN_EXTENSIONS.has(extname(entry))) {
        await this._scanFile(fullPath, violations);
      }
    }
  }

  private async _scanFile(
    filePath: string,
    violations: Array<{ file: string; line: number; pattern: string }>
  ): Promise<void> {
    let content: string;
    try {
      content = await readFile(filePath, 'utf-8');
    } catch {
      return;
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) continue;
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(line)) {
          violations.push({
            file: filePath,
            line: i + 1,
            pattern: pattern.source.slice(0, 30),
          });
        }
      }
    }
  }
}
