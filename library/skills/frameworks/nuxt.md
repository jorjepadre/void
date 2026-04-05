---
id: frameworks/nuxt
name: Nuxt Patterns
version: "1.0.0"
description: Nuxt 3/4 patterns for SSR, data fetching, and deployment.
language: typescript
tags: [nuxt, vue, ssr, frontend]
depends_on: [frameworks/vue]
capabilities: [ssr, file-routing, data-fetching]
parameters: []
tools: []
constraints: []
---

# Nuxt Patterns

Nuxt for full-stack Vue apps with SSR, file-based routing, and auto-imports.

## Project Structure

- `pages/` for file-based routing.
- `components/` auto-imported; subdirectories influence component names.
- `composables/` auto-imported; one composable per file.
- `server/` for API routes and Nitro handlers.
- `app.vue` is the root layout.

## Data Fetching

- `useFetch` for SSR-aware requests with caching.
- `useAsyncData` when you need custom logic beyond a single URL.
- `$fetch` for imperative calls (event handlers, actions).
- Keys matter — deduplicate by providing stable keys.

```vue
<script setup lang="ts">
const { data: user, error } = await useFetch(`/api/users/${id}`, { key: `user-${id}` });
</script>
```

## Server Routes

- `server/api/users.get.ts` exposes `GET /api/users`.
- Route params via `event.context.params`.
- Use H3 utilities: `readBody`, `getQuery`, `createError`.

## State Management

- `useState` for SSR-safe reactive state shared across components.
- Pinia via `@pinia/nuxt` for larger apps.
- Avoid module-level singletons — they break SSR isolation.

## Rendering Modes

- SSR by default; `ssr: false` for SPA.
- `nitro.prerender` for static routes.
- Hybrid rendering with `routeRules` for per-route control.

## Modules

- First-party modules for auth, content, images, i18n.
- `@nuxt/image` for automatic image optimization.
- `@nuxt/content` for markdown-based content.

## Middleware

- `middleware/` files run before navigation; route-level or global.
- Use for auth guards, redirects, and access control.

## Deployment

- Nitro targets: Node, Vercel, Netlify, Cloudflare Workers, Deno, static.
- `nuxt build` then `node .output/server/index.mjs` for Node deploys.

## Testing

- `@nuxt/test-utils` for integration tests with a real Nuxt runtime.
- Vitest + @vue/test-utils for component-level tests.

## Common Pitfalls

- Accessing `window` in SSR — guard with `import.meta.client` or `onMounted`.
- `useFetch` without a stable key hydration mismatches.
- Leaking server-only imports into client bundles.
- Over-fetching by calling `useFetch` in every component instead of lifting.

## Performance

- Lazy hydration and `<ClientOnly>` for client-only widgets.
- Image optimization via `@nuxt/image`.
- `payloadExtraction` for faster client navigation.
