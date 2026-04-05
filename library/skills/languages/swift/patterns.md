---
id: languages/swift
name: Swift Patterns
version: "1.0.0"
description: Swift idioms with optionals, protocols, concurrency, and value types.
language: swift
tags: [swift, patterns, concurrency]
depends_on: []
capabilities: [protocols, concurrency, value-types]
parameters: []
tools: []
constraints: []
---

# Swift Patterns

Writing idiomatic Swift with structured concurrency, protocols, and value semantics.

## Value vs Reference Types

- Prefer `struct` and `enum`; reach for `class` only when identity, shared mutable state, or Objective-C interop requires it.
- Value types make reasoning about state changes straightforward and avoid unintended sharing.
- `final class` by default when you do need a class; open subclassing is an opt-in API decision.

## Optionals

- `if let`, `guard let`, and optional chaining over force unwraps.
- `guard` at the top of a function to fail fast and keep the happy path unindented.
- Use `??` for defaults; prefer `Optional.map`/`flatMap` in expression position.
- Never force-unwrap (`!`) except in preconditions you've explicitly documented.

## Protocols

- Protocols define capabilities; extensions provide default implementations.
- `some Protocol` for opaque return types; `any Protocol` only when you need heterogeneous collections.
- Keep protocols focused — large protocols are hard to conform to and hard to mock.
- Protocol-oriented design: compose small protocols rather than deep inheritance.

## Concurrency (Swift 5.5+)

- `async`/`await` for asynchronous code; drop completion handlers in new APIs.
- `Task { }` to bridge sync to async; `Task.detached` only when you need to escape the current actor.
- `actor` for shared mutable state; methods are isolated automatically.
- `Sendable` conformance marks types safe to cross isolation boundaries; the compiler enforces this in strict mode.
- `TaskGroup` for dynamic parallelism with cancellation.

```swift
func loadAll(ids: [String]) async throws -> [User] {
    try await withThrowingTaskGroup(of: User.self) { group in
        for id in ids { group.addTask { try await load(id) } }
        return try await group.reduce(into: []) { $0.append($1) }
    }
}
```

## Error Handling

- Throwing functions with typed `Error` conformances.
- `Result<Success, Failure>` for stored or deferred outcomes.
- Define domain `enum` errors; avoid `NSError` bridging in new code.
- `do`/`catch` with specific pattern matches on error cases.

## Memory Management

- `weak` references in delegate patterns and closures to avoid retain cycles.
- `[weak self]` in long-lived closures; `[unowned self]` only when lifetime is guaranteed.
- Prefer struct-based observation over class delegates where possible.

## Testing

- XCTest with small, focused test methods.
- `async` test methods for concurrency; `XCTestExpectation` only for legacy callback APIs.
- Inject dependencies through initializers; protocol-based fakes are trivial.
- Snapshot testing for UI with SnapshotTesting.

## Common Pitfalls

- Capturing `self` strongly in `Task { }` or closures inside a class.
- `@MainActor` isolation leaks: calling isolated methods from non-isolated contexts requires `await`.
- `Array` copy-on-write is cheap but not free — avoid unnecessary mutation of shared arrays.
- Implicitly unwrapped optionals (`T!`) in storyboards creep into APIs; convert at boundaries.

## Tooling

- SwiftFormat and SwiftLint in pre-commit.
- Enable strict concurrency checking in build settings.
