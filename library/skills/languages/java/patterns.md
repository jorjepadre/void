---
id: languages/java
name: Java Patterns
version: "1.0.0"
description: Modern Java idioms for types, streams, concurrency, and testing.
language: java
tags: [java, patterns]
depends_on: []
capabilities: [oop, streams, concurrency]
parameters: []
tools: []
constraints: []
---

# Java Patterns

Writing modern Java (17+) that balances OOP rigor with recent language additions.

## Language Features (17+)

- Records for immutable data carriers: `record Point(int x, int y) {}`.
- Sealed interfaces/classes for closed hierarchies and exhaustive `switch`.
- Pattern matching in `switch` and `instanceof`.
- Text blocks for multi-line strings (SQL, JSON).
- `var` for local variables when the type is obvious from the initializer.

## Types and APIs

- Prefer immutable objects. Make fields `final`, collections unmodifiable.
- Use `Optional<T>` as return type only; never parameters or fields.
- Favor interfaces in public APIs; concrete classes in internals.
- `List.of`, `Map.of` for small immutable collections.

## Error Handling

- Checked exceptions for recoverable, expected conditions callers must handle; unchecked for programming errors.
- Don't wrap and rethrow without adding context.
- Never swallow exceptions silently; log with context or rethrow.
- Prefer custom domain exceptions over generic `RuntimeException`.

## Streams

- Streams for transformations, not side effects. `forEach` is usually a smell.
- Collect with `toList()` (Java 16+) rather than `Collectors.toList()`.
- Don't stream when a simple for-loop is clearer.
- Parallel streams only for CPU-bound work on large datasets; measure first.

## Concurrency

- Prefer `java.util.concurrent` primitives over raw threads and `synchronized`.
- `CompletableFuture` for async composition; `ExecutorService` for task pools.
- Virtual threads (Java 21+) for IO-heavy workloads: `Executors.newVirtualThreadPerTaskExecutor()`.
- Immutability eliminates most synchronization needs.

## Dependency Injection

- Constructor injection with `final` fields; avoid field injection.
- Keep components small and single-purpose.
- Avoid static singletons for anything with state or dependencies.

## Testing

- JUnit 5 with `@DisplayName` for readable reports.
- AssertJ for fluent assertions: `assertThat(list).containsExactly(a, b)`.
- Mockito only at true external boundaries; prefer fakes or real collaborators.
- `@ParameterizedTest` for input tables.
- Testcontainers for DB and integration tests.

## Build and Tooling

- Gradle with Kotlin DSL or Maven; commit wrapper.
- Static analysis: SpotBugs, ErrorProne, Checkstyle.
- Enable `-Werror` for new modules when feasible.

## Common Pitfalls

- `==` vs `.equals()` on boxed types and strings.
- Auto-boxing in loops creates garbage; use primitive streams (`IntStream`) on hot paths.
- `Date`/`Calendar` are legacy; use `java.time` (`Instant`, `LocalDate`, `ZonedDateTime`).
- Mutable static state breaks testability and thread safety.
- Exposing internal mutable collections — return defensive copies or unmodifiable views.

## Package Structure

- Package by feature, not by layer, for medium-to-large apps.
- Keep package-private defaults; export only what's needed.
