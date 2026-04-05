---
id: frameworks/nextjs
name: Next.js Patterns
version: "1.0.0"
description: Next.js App Router patterns for server components, data loading, and deployment.
language: typescript
tags: [nextjs, react, framework, ssr]
depends_on: [frameworks/react]
capabilities: [app-router, server-components, routing]
parameters: []
tools: []
constraints: []
---

# Next.js Patterns

Building apps with the Next.js App Router, server components, and modern data loading.

## App Router Structure

- `app/` directory with nested route segments; `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` per segment.
- Route groups `(group)/` for organizing without URL impact.
- Parallel routes (`@slot`) and intercepting routes (`(.)path`) for advanced layouts.

## Server vs Client Components

- Default to server components. Add `"use client"` only when you need state, effects, or browser APIs.
- Keep the client boundary small; pass server-fetched data as props.
- Server components can directly call the database, read files, and use secrets.

```tsx
// app/users/page.tsx — server component
export default async function UsersPage() {
  const users = await db.user.findMany();
  return <UserList users={users} />;
}
```

## Data Fetching

- `fetch` in server components with caching options: `{ cache: 'force-cache' | 'no-store', next: { revalidate: 60 } }`.
- `revalidatePath` / `revalidateTag` to invalidate on mutations.
- Avoid waterfalls: parallelize with `Promise.all` when requests are independent.

## Server Actions

- `"use server"` functions for mutations from forms and event handlers.
- Validate input with Zod; never trust the client.
- Return typed results; handle errors with try/catch at the action boundary.

## Streaming and Suspense

- Wrap slow sections in `<Suspense fallback={...}>` to stream the shell first.
- `loading.tsx` provides a default fallback for segment-level streaming.

## Metadata and SEO

- Export `metadata` or `generateMetadata` from segments.
- Structured data via JSON-LD `<script type="application/ld+json">`.
- `robots.txt` and `sitemap.xml` via `app/robots.ts`, `app/sitemap.ts`.

## Turbopack and Build

- `next dev --turbo` for faster HMR.
- `next build` analyzes bundle size; watch for runaway client components.

## Environment and Config

- Env vars prefixed `NEXT_PUBLIC_` are client-exposed; everything else is server-only.
- Validate env at startup with a Zod schema.

## Deployment

- Vercel is the reference platform; self-hosting via Node or standalone output works.
- Edge runtime for low-latency middleware and routes; Node runtime for full APIs.

## Testing

- Component tests with React Testing Library.
- E2E with Playwright against the dev or preview build.
- Server actions test directly as async functions.

## Common Pitfalls

- Importing server-only modules in client components. Use `server-only` package to catch at build time.
- Overusing `"use client"` bloats bundles.
- Forgetting `revalidate` means data goes stale silently.
- `cookies()` and `headers()` are dynamic — using them opts the route out of static rendering.
