---
id: frameworks/svelte
name: Svelte Patterns
version: "1.0.0"
description: Svelte/SvelteKit patterns with runes, stores, and SSR.
language: typescript
tags: [svelte, sveltekit, frontend]
depends_on: []
capabilities: [components, runes, ssr]
parameters: []
tools: []
constraints: []
---

# Svelte Patterns

Building Svelte 5 and SvelteKit apps with runes and file-based routing.

## Components

- Single-file components: `<script>`, `<style>`, markup.
- Keep components small and focused; compose aggressively.
- Use `<script lang="ts">` for type safety.

## Runes (Svelte 5)

- `$state` for reactive local state: `let count = $state(0)`.
- `$derived` replaces reactive statements: `let doubled = $derived(count * 2)`.
- `$effect` for side effects that sync with external systems.
- `$props` destructures and types component inputs.

```svelte
<script lang="ts">
  let { initial = 0 }: { initial?: number } = $props();
  let count = $state(initial);
  let doubled = $derived(count * 2);
</script>

<button onclick={() => count++}>
  {count} (doubled: {doubled})
</button>
```

## Stores (Legacy + Runes Interop)

- `writable`, `readable`, `derived` still work; runes are preferred for new code.
- `$store` auto-subscription in markup and scripts.

## SvelteKit Routing

- File-based routing in `src/routes/`: `+page.svelte`, `+layout.svelte`, `+page.server.ts`.
- Load functions (`+page.ts`, `+page.server.ts`) fetch data before render.
- Form actions in `+page.server.ts` handle POSTs with progressive enhancement.

## Server vs Client

- `.server.ts` modules run only on the server; safe for secrets and DB access.
- `+page.ts` load runs on both; use only for universal fetches.

## Forms

- `<form method="POST" use:enhance>` for progressive forms.
- Server actions validate and return typed errors.

## Styling

- Scoped `<style>` by default.
- Global styles via `:global(...)` selector or `app.css`.
- Tailwind, UnoCSS integrate cleanly.

## Testing

- Vitest + `@testing-library/svelte` for components.
- Playwright for E2E against the SvelteKit dev server.

## Performance

- SvelteKit does SSR + hydration by default; `export const prerender = true` for static pages.
- `export const ssr = false` for SPA-only routes (rarely needed).
- Code-split via dynamic imports for heavy components.

## Common Pitfalls

- Mutating `$state` objects works (deep reactivity); mutating plain objects does not.
- Effects that set state can loop — use `$derived` instead.
- Mixing runes and legacy reactive statements in the same component is confusing.
- Hydration mismatches from non-deterministic server rendering.
