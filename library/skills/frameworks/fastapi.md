---
id: frameworks/fastapi
name: FastAPI Patterns
version: "1.0.0"
description: FastAPI patterns for async APIs, dependency injection, and validation.
language: python
tags: [fastapi, python, api, async]
depends_on: [languages/python]
capabilities: [async-api, dependency-injection, validation]
parameters: []
tools: []
constraints: []
---

# FastAPI Patterns

Building async Python APIs with FastAPI, Pydantic, and dependency injection.

## Project Layout

- Feature-oriented packages: `app/users/`, `app/orders/` each containing `router.py`, `schemas.py`, `service.py`, `models.py`.
- A slim `main.py` that wires routers, middleware, and startup/shutdown.

## Schemas (Pydantic)

- Separate input and output schemas (`UserCreate`, `UserRead`) — never reuse DB models as responses.
- Use `Field(..., examples=[...])` to enrich OpenAPI docs.
- Validators for cross-field rules; field validators for per-field.

```python
from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12)
```

## Dependency Injection

- `Depends(...)` for auth, DB sessions, and pluggable services.
- Factor shared dependencies into `dependencies.py` per feature.
- Override dependencies in tests via `app.dependency_overrides`.

## Async

- All handlers `async def` unless the work is strictly CPU-bound.
- Use async DB drivers (asyncpg, databases, SQLAlchemy async).
- Don't call blocking IO from async handlers; push to `asyncio.to_thread` or a worker.

## Error Handling

- Raise `HTTPException` for expected client errors.
- Custom exception handlers map domain exceptions to HTTP responses.
- Never leak internal errors or stack traces in production.

## Authentication

- OAuth2 password flow or JWT bearer tokens with `fastapi.security`.
- Verify tokens in a dependency; inject the current user into handlers.
- Rate limit auth endpoints with `slowapi` or infrastructure-level.

## Background Tasks

- `BackgroundTasks` for fire-and-forget post-response work.
- For durable or retriable work: Celery, arq, or a task queue.

## Testing

- `TestClient` (sync) or `httpx.AsyncClient` with `ASGITransport` for async tests.
- Spin up a test DB with transactions rolled back per test.
- Test OpenAPI schema stability for public APIs.

## OpenAPI and Docs

- Enrich with `summary`, `description`, `response_model`, and tags.
- Use `response_model_exclude_none=True` for consistent responses.
- Version your API under `/v1` paths from day one.

## Observability

- Structured logging with request IDs via middleware.
- OpenTelemetry for traces; Prometheus metrics via `prometheus-fastapi-instrumentator`.

## Common Pitfalls

- Blocking the event loop with sync IO inside `async def`.
- Returning ORM objects directly — use `response_model` or explicit conversion.
- Forgetting to close DB sessions — use dependency with `yield`.
- N+1 on list endpoints — preload relations.
