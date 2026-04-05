---
id: frameworks/bun
name: Bun Runtime Patterns
version: "1.0.0"
description: Patterns for building with the Bun JavaScript runtime and toolchain.
language: typescript
tags: [bun, runtime, javascript, typescript]
depends_on: [languages/typescript]
capabilities: [runtime, bundling, testing]
parameters: []
tools: []
constraints: []
---

# Bun Runtime Patterns

Using Bun as a JavaScript/TypeScript runtime, bundler, package manager, and test runner.

## Getting Started

- `bun init` scaffolds a project with TypeScript and tsconfig.
- `bun install` is fast and uses a binary lockfile (`bun.lockb`).
- `bun run <script>` executes `package.json` scripts; `bun <file.ts>` runs TS directly — no build step.

## HTTP Servers

- `Bun.serve({ fetch, port })` is the native server — no Express needed for simple cases.
- Built-in WebSocket support in the same server.

```typescript
Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") return new Response("ok");
    return new Response("Not found", { status: 404 });
  },
});
```

- For larger apps: Hono, Elysia, or Express all work under Bun.

## File IO

- `Bun.file(path)` returns a lazy `Blob`; `.text()`, `.json()`, `.arrayBuffer()` read it.
- `Bun.write(path, data)` replaces `fs.writeFile` with a faster path.
- Node `fs`/`fs/promises` also work.

## Testing

- `bun test` runs Jest-compatible tests with built-in expect and mocks.
- `describe`/`test`/`expect` imports from `bun:test`.
- Fast startup makes TDD loops snappy.

## Bundling

- `bun build ./entry.ts --outdir ./dist` bundles for production.
- Supports tree-shaking, minification, and source maps.
- Target browser, bun, or node runtimes.

## Package Management

- Drop-in for `npm install`; compatible with `package.json`.
- Workspaces via `workspaces` field.
- `bun add`, `bun remove`, `bun update`.

## Compatibility

- Most Node APIs work out of the box (`node:fs`, `node:path`, etc.).
- Native ESM and CJS interop.
- Some C++ native modules may not load — check compatibility for critical deps.

## Performance

- Bun is fast at startup and IO-heavy workloads.
- Built-in SQLite (`bun:sqlite`) and FFI.
- Hot reload with `bun --hot run server.ts`.

## Common Pitfalls

- Using Node-only APIs without verifying Bun compatibility.
- Assuming native modules are supported — verify against your dep list.
- Mixing `bun` and `npm` installs can produce inconsistent node_modules.

## Production Considerations

- Single binary; easy Docker images with `oven/bun` base.
- Smaller and faster cold starts than Node in many scenarios.
- Monitor with standard tooling — Bun exposes Node-like process APIs.
