---
id: languages/csharp
name: C# Patterns
version: "1.0.0"
description: Modern C# with records, async, LINQ, and nullable reference types.
language: csharp
tags: [csharp, dotnet, patterns]
depends_on: []
capabilities: [async, linq, records]
parameters: []
tools: []
constraints: []
---

# C# Patterns

Modern C# (10+) on .NET 6+ with an eye toward clarity, async correctness, and type safety.

## Language Features

- Records for immutable data: `public record User(string Id, string Email);`
- `init` setters for construction-only mutation.
- Pattern matching with `switch` expressions.
- Top-level statements in small programs.
- File-scoped namespaces reduce indentation.

## Nullable Reference Types

- Enable `<Nullable>enable</Nullable>` project-wide.
- Treat warnings as errors for nullability.
- Mark parameters, fields, and returns explicitly: `string?` vs `string`.
- Use `ArgumentNullException.ThrowIfNull(x)` at public boundaries.

## Async

- `async`/`await` from top to bottom; avoid `.Result` and `.Wait()` (deadlocks in some sync contexts).
- `ConfigureAwait(false)` in library code; app code in ASP.NET Core doesn't need it.
- `Task.WhenAll` for parallel awaits; `Task.WhenAny` for races.
- `CancellationToken` as the last parameter on async APIs.
- `ValueTask<T>` only when profiling shows allocation pressure.

## LINQ

- Favor method syntax for chains; query syntax when joins/groupings read better.
- `ToListAsync`/`ToArrayAsync` with EF Core; don't iterate lazily across DB boundaries.
- Avoid multiple enumerations of `IEnumerable`; materialize once if the source is expensive.

## Dependency Injection

- Constructor injection; register lifetimes deliberately (singleton, scoped, transient).
- Options pattern (`IOptions<T>`) for config.
- Keep services small; prefer composition over god-services.

## Error Handling

- Exceptions for exceptional conditions; avoid using them for control flow.
- Define domain exception types; don't throw raw `Exception`.
- Global exception handling middleware in ASP.NET Core maps to problem details.

## Testing

- xUnit with theory data for parameterized tests.
- FluentAssertions for readable assertions.
- NSubstitute or Moq for mocks; prefer fakes where feasible.
- WebApplicationFactory for ASP.NET integration tests.

## EF Core

- `AsNoTracking()` for read-only queries.
- Explicit `Include` over lazy loading.
- Migrations reviewed like code; never auto-apply in production without control.

## Common Pitfalls

- Captured variables in closures over loop indices (largely fixed post-C# 5, but watch `foreach` semantics).
- Async void except for event handlers.
- Disposing shared `HttpClient` per request — use `IHttpClientFactory`.
- `struct` with mutable fields — avoid; prefer `readonly struct`.

## Tooling

- `dotnet format`, Roslyn analyzers, StyleCop.
- Nullable + warnings as errors.
