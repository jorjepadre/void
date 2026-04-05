---
id: languages/dart
name: Dart Patterns
version: "1.0.0"
description: Dart idioms for null safety, async, and Flutter-friendly code.
language: dart
tags: [dart, flutter, patterns]
depends_on: []
capabilities: [null-safety, async, streams]
parameters: []
tools: []
constraints: []
---

# Dart Patterns

Idiomatic Dart for Flutter and server-side applications.

## Null Safety

- Sound null safety is the default; embrace nullable types (`T?`) only where genuinely nullable.
- Use `late` for fields initialized after construction but before first read; avoid `late` if you can make it nullable or provide a default.
- `!` only when the invariant is documented; prefer `??`, `?.`, and `if (x != null)` narrowing.

## Classes and Records

- Prefer immutable classes with `final` fields and `const` constructors where possible.
- Dart 3 records `(String, int)` and pattern matching reduce boilerplate.
- Sealed classes (Dart 3) for closed ADTs with exhaustive `switch`.

```dart
sealed class Result<T> {}
class Ok<T> extends Result<T> { final T value; Ok(this.value); }
class Err<T> extends Result<T> { final Object error; Err(this.error); }
```

## Async

- `Future<T>` with `async`/`await`; `Stream<T>` for sequences.
- `Future.wait` for parallel futures; catch partial failures explicitly.
- Cancel streams via subscription.cancel; use `StreamController.broadcast` for multi-subscriber streams.
- Avoid uncaught async errors: wrap top-level tasks in `runZonedGuarded` or async try/catch.

## Collections

- Collection-if and collection-for for conditional/expanded literals.
- Spread operator (`...`, `...?`) for merging.
- `Iterable` methods (`where`, `map`, `fold`) are lazy; call `.toList()` to materialize.

## Error Handling

- Throw `Exception`/`Error` subclasses; never throw strings.
- Domain errors as typed exceptions; let bugs throw `Error`.
- Don't catch `Error` types — they indicate programmer mistakes.

## Flutter-Adjacent Patterns

- Widgets should be tiny and composable.
- Prefer `const` constructors for widgets to skip rebuilds.
- State management via Riverpod, Bloc, or Provider — pick one per project.

## Testing

- `package:test` with grouped tests; `package:flutter_test` for widget tests.
- Fakes via abstract classes; mocks with `mockito` or `mocktail`.
- Golden tests for pixel-level widget regressions.

## Common Pitfalls

- `print` for production logging — use a logging package.
- Synchronous long work on the main isolate blocks UI; use `compute` or isolates.
- `setState` after dispose; guard with `if (mounted)` in async callbacks.

## Tooling

- `dart analyze` with `package:lints/recommended.yaml` or stricter.
- `dart format` in pre-commit.
