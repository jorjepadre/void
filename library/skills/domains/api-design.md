---
id: domains/api-design
name: API Design
version: "1.0.0"
description: REST, GraphQL, and gRPC API design principles and trade-offs.
language: null
tags: [api, rest, graphql, grpc, design]
depends_on: []
capabilities: [api-design, versioning, contracts]
parameters: []
tools: []
constraints: []
---

# API Design

Designing APIs that are clear, evolvable, and honest about their constraints.

## Principles

- APIs are user interfaces for developers. Optimize for clarity.
- Consistency beats cleverness.
- Be strict in what you emit, liberal in what you accept — within reason.
- Version from day one. It's cheaper than retrofitting.
- Document the contract, not the implementation.

## REST

- Resources are nouns, not verbs: `/users/{id}/orders`, not `/getUserOrders`.
- Use standard HTTP methods with their standard semantics: GET (safe, idempotent), POST (create), PUT (replace, idempotent), PATCH (partial), DELETE (idempotent).
- Status codes that match intent: 200/201/204, 400/401/403/404/409/422, 500/503.
- Return Problem Details (RFC 7807) for errors with consistent structure.
- Pagination: cursor-based for large or real-time datasets; offset for small, static lists.
- HATEOAS is optional; most APIs benefit more from clear docs.

```
POST /v1/orders
{ "items": [...] }
→ 201 Created
  Location: /v1/orders/abc123
  { "id": "abc123", "status": "pending", ... }
```

## GraphQL

- Schema-first design; treat the schema as the contract.
- Resolve N+1 with DataLoader batching.
- Paginate with Relay-style connections (`edges`, `pageInfo`, `cursor`).
- Persisted queries for public APIs — prevents schema probing and enables query allowlisting.
- Handle partial failures: return data and errors together.
- Avoid deep nested mutations; model mutations as discrete actions.

## gRPC

- Define services in `.proto`; generate typed clients/servers.
- Backward compatibility: never reuse field numbers, never change field types, only add.
- Use `Timestamp`, `Duration`, and well-known types rather than raw strings.
- Streaming (server/client/bidirectional) for large or real-time data.
- Deadlines on every RPC.

## Versioning

- URL versioning (`/v1/`, `/v2/`) is simple and explicit.
- Header versioning is cleaner but harder to discover.
- Never make breaking changes within a version.
- Deprecate with a sunset header and long migration window.

## Errors

- Stable error codes (strings or integers) callers can switch on.
- Human-readable messages for developers, not end users.
- Include a correlation ID in every response for debugging.
- Don't leak internals (stack traces, DB errors, PII) in production.

## Consistency

- Snake_case or camelCase — pick one and apply everywhere.
- Dates as ISO 8601 strings with timezone.
- Money as `{ amount: 1234, currency: "USD" }` with integer minor units.
- Lists with consistent envelopes (`{ data: [], pagination: {...} }`).

## Idempotency

- Idempotency keys on non-idempotent POST operations so clients can retry safely.
- Document retry semantics explicitly.

## Authentication / Authorization

- OAuth2/OIDC for user-facing APIs; API keys or mTLS for service-to-service.
- Short-lived tokens with refresh flows.
- Scopes/permissions clearly documented.

## Rate Limiting

- Communicate limits via headers (`X-RateLimit-Remaining`, `Retry-After`).
- 429 with structured error when exceeded.
- Per-key and per-endpoint limits.

## Documentation

- OpenAPI/AsyncAPI/GraphQL schema as the source of truth.
- Examples for every endpoint showing request and response.
- Changelogs with dates and severity.

## Evolution

- Additive changes only in a stable version.
- Feature flags for gradual rollouts.
- Deprecation notices in headers and docs.
- Retire old versions on announced schedules.
