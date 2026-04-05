---
id: languages/kotlin
name: Kotlin Patterns
version: "1.0.0"
description: Kotlin idioms with coroutines, null safety, and DSLs.
language: kotlin
tags: [kotlin, patterns, coroutines]
depends_on: []
capabilities: [coroutines, null-safety, dsl]
parameters: []
tools: []
constraints: []
---

# Kotlin Patterns

Idiomatic Kotlin that leans on the type system, coroutines, and expressiveness.

## Null Safety

- Use nullable types (`T?`) explicitly; avoid `!!` outside tests.
- Prefer `?.let { }` and `?:` Elvis over null checks followed by `!!`.
- `lateinit` for DI-provided fields; `Delegates.notNull()` for primitives.
- Validate at boundaries; inside the domain, use non-null types.

## Data Classes and Sealed Hierarchies

- `data class` for value objects; copy with `.copy(...)`.
- `sealed interface`/`sealed class` for closed ADTs; exhaustive `when` enforces handling every case.
- `value class` (inline) for zero-cost wrappers around primitives: `value class UserId(val raw: String)`.

## Collections and Sequences

- Collection operators allocate intermediate lists; use `asSequence()` for long pipelines or huge inputs.
- `mapNotNull`, `groupBy`, `associateBy`, `fold` cover most patterns.
- Prefer immutable interfaces (`List`, `Map`, `Set`) in APIs.

## Coroutines

- Structured concurrency: launch inside a `CoroutineScope` tied to a lifecycle.
- `suspend` functions are main-safe when they use `withContext(Dispatchers.IO)` for blocking calls.
- Use `coroutineScope { }` / `supervisorScope { }` for parallel decomposition with proper cancellation.
- `Flow` for async streams; `StateFlow`/`SharedFlow` for state and events.

```kotlin
suspend fun loadUser(id: String): User = coroutineScope {
    val profile = async { userRepo.get(id) }
    val prefs = async { prefsRepo.get(id) }
    User(profile.await(), prefs.await())
}
```

## Error Handling

- Exceptions for exceptional cases; `Result<T>` or sealed `Either`-like types for expected failures.
- Don't catch `CancellationException` without re-throwing — it breaks coroutine cancellation.
- `runCatching` is handy but don't swallow errors silently.

## Scope Functions

- `let` — transform nullable; `run` — compute a result with a receiver; `apply` — configure and return the receiver; `also` — side-effect and return; `with` — non-null receiver compute.
- Don't chain three scope functions; extract a method.

## DSL Builders

- `@DslMarker` to prevent scope leakage.
- Lambdas with receiver make builder code read like configuration.

## Testing

- JUnit 5 with Kotest or Kotlin-test matchers.
- `kotlinx-coroutines-test` with `runTest` and `TestDispatcher` for deterministic coroutine tests.
- MockK for Kotlin-friendly mocking; prefer fakes.

## Common Pitfalls

- `object` singletons have lifecycle surprises — they aren't DI-friendly.
- `lazy { }` is thread-safe by default; specify `LazyThreadSafetyMode.NONE` on hot paths where single-thread is guaranteed.
- Extension functions on nullable receivers are fine but can hide null handling from callers.
- Inline functions with large bodies bloat bytecode; only inline when justified (reified generics, lambda overhead).

## Tooling

- `ktlint` / `detekt` for style and static analysis.
- Gradle Kotlin DSL.
