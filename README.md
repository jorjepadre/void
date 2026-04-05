# Void

**AI agent orchestration & harness optimization framework.**

Secure-by-design TypeScript framework that sits between you and AI coding tools
(Claude Code, Cursor, Codex, etc.). Provides reusable skills, specialized
agents, multi-step workflows, layered rules, quality gates, session learning,
and persistent audits — so you stop rewriting the same setup prompts in every
project.

## What It Does

- **Orchestrates multi-agent workflows** — command like `/tdd "feature"` runs a
  structured sequence: architect → TDD guide → coder → reviewer
- **Enforces quality gates automatically** — pre/post-tool hooks block secrets,
  dangerous commands, type errors, config file edits
- **Installs into any AI tool** — 8 harness adapters (Claude Code, Cursor,
  Codex, Gemini, Kiro, OpenCode, Cowork, generic)
- **Persists memory + sessions** — SQLite + FTS5 search, survives across
  sessions and projects
- **Tracks audit findings** — create, diff, export audits with status tracking
  (open/fixed/accepted/wontfix)
- **Routes across LLM providers** — Claude, GPT, Gemini, Ollama with failover
- **Behavioral inheritance (instincts)** — learned patterns with confidence
  scores, portable across projects

## Install

```bash
git clone https://github.com/<your-user>/void.git
cd void
npm install
npm run build

# Link globally
ln -sf "$(pwd)/dist/bin/void.js" ~/.local/bin/void  # or /usr/local/bin
```

Verify:
```bash
void --version
void --help
```

## Quick Start

```bash
# In any project
cd ~/my-project

# Initialize (auto-detects Claude Code / Cursor / etc.)
void init

# Install the developer profile (skills, agents, rules, hooks)
void install --profile developer

# Run a workflow
void cmd /tdd "add user authentication"

# Or use individual pieces
void skill list --language typescript
void agent list
void gate run secrets
void memory set architecture "microservices + postgres"
void audit create "security-baseline" --auditor manual
```

## Architecture

```
src/
├── types/         # 18 type definitions (strict TypeScript)
├── config/        # Zod schemas + YAML/JSON loader
├── security/      # Sandbox, secret redaction, safe process spawn, audit trail
├── core/          # Agent lifecycle, task queue, logger, workspace
├── memory/        # SQLite + FTS5 search with namespaces
├── harness/       # 8 adapters (Claude Code, Cursor, Codex, ...)
├── rules/         # CSS-specificity layered rules engine
├── hooks/         # Matcher-based hook system with profiles
├── skills/        # Markdown skill parser + registry
├── agents/        # YAML agent parser + registry
├── commands/      # YAML workflow parser + executor
├── swarm/         # Coordinator, scheduler, claims, protocol
├── session/       # Recording, analysis, learning with loop guards
├── manifest/      # Profile-based installation with dependency resolution
├── gates/         # 7 quality gate checks
├── audits/        # Persistent finding tracking with diff
├── providers/     # LLM abstraction (Claude, GPT, Gemini, Ollama)
├── identity/      # User identity + team config
├── instincts/     # Behavioral inheritance
├── plugins/       # Plugin loader + sandbox
├── workers/       # Background task workers (audit, optimize, verify, learn, gc, monitor)
├── mcp/           # MCP client/server for tool integration
├── notify/        # Desktop notifications
└── cli/           # 20 CLI commands

library/
├── skills/        # 45 markdown skills (12 languages, 16 frameworks, 10 domains, 7 agentic)
├── agents/        # 34 agent YAML files across 9 categories
├── commands/      # 75 workflow YAML files (15 workflows × ~5 language variants)
├── rules/         # 17 layered rule files (5 common + 12 languages)
├── hooks/         # 20 hook definitions + 3 profiles (minimal/standard/strict)
├── instincts/     # 4 built-in behavioral patterns
└── providers/     # Model routing table
```

## Security by Design

Void's own internals never use:
- `eval()` or `new Function()`
- `execSync()` / `exec()` with string arguments
- `shell: true` in subprocess spawning
- `curl | bash` installers
- `postinstall` scripts that install globally

All subprocess execution uses `execFile()` with argument arrays. All inputs
validated with Zod at module boundaries. Workspace paths sandboxed with
symlink-aware resolution. Secrets pattern-matched and redacted in logs.

## Commands

```
void init [--harness <type>] [--profile <name>]
void install --profile [core|developer|security|full|custom]
void uninstall <components...>

void run <description>
void cmd <command-name> [args...]
void swarm <start|stop|status>

void skill <list|show|validate|search|evolve>
void agent <list|show|create>
void rule <list|show|layers>
void hook <list|test|profile|run>
void gate <run|status|configure> [--save-audit <name>]
void audit <create|list|show|latest|compare|summary|add-finding|status|export|import|delete>

void memory <get|set|search|list|clear>
void session <list|show|replay|export|alias>
void config <show|validate|set>

void mcp <list|connect|tools|health>
void worker <list|start|stop|status>
void instinct <list|show|import|export|apply>
void plugin <list|install|remove|search>
void identity <show|set|team>
```

## Development

```bash
npm run typecheck      # strict TS check
npm run build          # compile to dist/
npm run test           # run vitest
npm run lint           # ESLint
npm run security:audit # scan for banned patterns
```

## License

MIT

## Credits

Inspired by prior-art agent orchestration research. Named after a small snail.
