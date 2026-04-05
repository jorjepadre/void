---
id: frameworks/express
name: Express Patterns
version: "1.0.0"
description: Express.js patterns for middleware, routing, and error handling.
language: typescript
tags: [express, nodejs, backend, api]
depends_on: [languages/typescript]
capabilities: [routing, middleware, api]
parameters: []
tools: []
constraints: []
---

# Express Patterns

Building Node.js APIs with Express, TypeScript, and modern async patterns.

## Project Structure

- Feature modules: `src/users/{router,service,repo,schema}.ts`.
- `app.ts` wires middleware and routers; `server.ts` starts the HTTP listener.
- Keep route handlers thin — parse, call service, respond.

## Middleware

- Order matters: logging, body parsing, auth, routing, error handling (last).
- Keep middleware small and single-purpose.
- Always call `next(err)` on failures — don't throw in async handlers without a wrapper.

```typescript
const asyncHandler = <T>(fn: (req: Request, res: Response) => Promise<T>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);
```

## Validation

- Zod/Valibot schemas at the boundary; infer TypeScript types from schemas.
- Validate `body`, `query`, and `params` separately.
- Reject early with a 400 and a structured error payload.

## Error Handling

- Centralized error middleware catches everything via `next(err)`.
- Custom error classes with status codes; map to HTTP in the handler.
- Don't leak stack traces to clients in production.

```typescript
app.use((err: Error, _req, res, _next) => {
  const status = err instanceof HttpError ? err.status : 500;
  res.status(status).json({ error: { message: err.message } });
});
```

## Authentication

- JWT middleware or session cookies (express-session + secure store).
- Attach `req.user` in auth middleware; downstream handlers rely on it.
- Rate limit auth endpoints with `express-rate-limit`.

## Database

- Connection pool initialized once at startup; injected or imported where needed.
- Prisma, Drizzle, Kysely, or TypeORM — pick one and stick with it.
- Transactions for multi-write operations.

## Testing

- `supertest` for HTTP-level tests against the app (no listener needed).
- Unit tests for services with in-memory fakes.
- Testcontainers for DB integration tests.

## Performance

- `compression` middleware for text responses.
- `helmet` for security headers.
- Reverse proxy (nginx, Caddy) in front for TLS and static assets.

## Common Pitfalls

- Unhandled promise rejections in async handlers — always wrap or use `express-async-errors`.
- Missing CORS config for browser clients.
- Synchronous blocking work in the event loop.
- Leaking DB connections — always release on error paths.

## Observability

- Structured logging (pino, winston) with request IDs.
- `/health` endpoint for liveness; `/ready` for readiness.
- Metrics via Prometheus client.
