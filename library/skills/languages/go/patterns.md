---
id: languages/go
name: Go Patterns
version: "1.0.0"
description: Idiomatic Go covering interfaces, errors, concurrency, and testing.
language: go
tags: [go, golang, patterns]
depends_on: []
capabilities: [concurrency, error-handling, interfaces]
parameters: []
tools: []
constraints: []
---

# Go Patterns

Guidance for writing idiomatic, simple, testable Go.

## Idioms

- Accept interfaces, return structs.
- Keep interfaces small (1–3 methods) and define them where they are consumed, not where implementations live.
- Prefer composition over inheritance; embed types judiciously.
- Zero values should be useful; design types so `var x T` is ready to use when possible.
- Package names are short, lowercase, singular, and match the directory.

## Errors

- Errors are values. Return them; don't panic for expected failures.
- Wrap with `%w` and context: `fmt.Errorf("fetching user %s: %w", id, err)`.
- Use `errors.Is` for sentinel checks and `errors.As` for typed extraction.
- Define sentinel errors (`var ErrNotFound = errors.New("not found")`) for conditions callers switch on.
- Only `panic` for programmer errors (invariants, init failures). Recover only at goroutine boundaries.

## Concurrency

- Don't communicate by sharing memory; share memory by communicating.
- Every goroutine needs a clear lifetime owner. Pass `context.Context` as the first parameter.
- Buffered channels should have a capacity justified by the design, not a guess.
- Use `sync.Mutex` when a channel would be contorted. Prefer `sync.RWMutex` only if you've profiled contention.
- `errgroup.Group` for bounded parallel work with cancellation and error propagation.

```go
g, ctx := errgroup.WithContext(ctx)
for _, id := range ids {
    id := id
    g.Go(func() error { return process(ctx, id) })
}
if err := g.Wait(); err != nil { return err }
```

## Context

- `context.Context` flows through every request-scoped call. Never store it in a struct.
- Use `context.WithTimeout` at entry points; respect `ctx.Done()` in loops.
- Don't use context.Value for optional parameters — only for request-scoped, process-wide concerns (request ID, auth).

## Testing

- Table-driven tests with `t.Run(name, ...)` for subtests.
- Use `t.Helper()` in assertion helpers for clean failure traces.
- `testing.TB` as parameter type lets helpers work in tests and benchmarks.
- Avoid mocks where possible; use in-memory implementations of your own interfaces.
- `go test -race` in CI.

## API Shape

- Return early; avoid deep nesting. Guard clauses over `else` branches.
- Functions that can fail return `(T, error)`. Never a `T` with a separate "ok" bool unless mirroring map/type-assert semantics.
- Exported identifiers need doc comments starting with the name.

## Common Pitfalls

- Loop variable capture in goroutines (pre-1.22): reassign `id := id` inside the loop.
- `nil` interface vs `nil` concrete type: a typed nil inside an interface is not equal to `nil`.
- Goroutine leaks: always have a path for goroutines to exit (context cancel, closed channel).
- Slice aliasing: `append` may or may not allocate; copy explicitly when giving out a slice.
- Defer in loops accumulates until the function returns; refactor into a helper.

## Tooling

- `gofmt`, `goimports`, `go vet`, `staticcheck`, `golangci-lint`.
- `go mod tidy` as part of pre-commit.
