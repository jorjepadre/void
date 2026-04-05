/**
 * CLI program setup — creates the Commander.js program and registers all subcommands.
 */

import { Command } from 'commander';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

import { registerInit } from './commands/init.js';
import { registerRun } from './commands/run.js';
import { registerInstall } from './commands/install.js';
import { registerUninstall } from './commands/uninstall.js';
import { registerSwarm } from './commands/swarm.js';
import { registerMemory } from './commands/memory.js';
import { registerSkill } from './commands/skill.js';
import { registerAgent } from './commands/agent.js';
import { registerCommandRun } from './commands/command-run.js';
import { registerHook } from './commands/hook.js';
import { registerRule } from './commands/rule.js';
import { registerSession } from './commands/session.js';
import { registerGate } from './commands/gate.js';
import { registerMcp } from './commands/mcp.js';
import { registerConfig } from './commands/config.js';
import { registerWorker } from './commands/worker.js';
import { registerInstinct } from './commands/instinct.js';
import { registerPlugin } from './commands/plugin.js';
import { registerIdentity } from './commands/identity.js';
import { registerAudit } from './commands/audit.js';

// Find package.json by walking up from this file's location
function findPackageJson(): { version: string; description: string } {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, 'package.json');
    if (existsSync(candidate)) {
      const content = readFileSync(candidate, 'utf8');
      const parsed = JSON.parse(content) as { name?: string; version: string; description: string };
      if (parsed.name === 'void-agents') return parsed;
    }
    dir = dirname(dir);
  }
  return { version: '0.1.0', description: 'AI agent orchestration framework' };
}

const _require = createRequire(import.meta.url);
void _require;
const pkg = findPackageJson();

function createProgram(): Command {
  const program = new Command();

  program
    .name('void')
    .version(pkg.version)
    .description(pkg.description);

  registerInit(program);
  registerRun(program);
  registerInstall(program);
  registerUninstall(program);
  registerSwarm(program);
  registerMemory(program);
  registerSkill(program);
  registerAgent(program);
  registerCommandRun(program);
  registerHook(program);
  registerRule(program);
  registerSession(program);
  registerGate(program);
  registerMcp(program);
  registerConfig(program);
  registerWorker(program);
  registerInstinct(program);
  registerPlugin(program);
  registerIdentity(program);
  registerAudit(program);

  return program;
}

export function run(): void {
  const program = createProgram();
  program.parseAsync(process.argv).catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}
