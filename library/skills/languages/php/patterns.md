---
id: languages/php
name: PHP Patterns
version: "1.0.0"
description: Modern PHP (8.x) idioms, types, and error handling.
language: php
tags: [php, patterns]
depends_on: []
capabilities: [types, oop, testing]
parameters: []
tools: []
constraints: []
---

# PHP Patterns

Modern PHP 8.x for maintainable, typed applications.

## Types

- Declare parameter and return types on every function.
- Use `readonly` properties (PHP 8.1+) for immutable data.
- Constructor property promotion keeps DTOs concise:

```php
final class User {
    public function __construct(
        public readonly string $id,
        public readonly string $email,
    ) {}
}
```

- Enums (PHP 8.1+) replace constant groupings. Backed enums for serialization.
- Union and intersection types where a single type is too narrow.

## Error Handling

- Throw typed exceptions extending domain base classes.
- Never silence errors with `@`; fix the root cause.
- `Throwable` at top-level handlers only; catch specific exceptions in domain code.
- Use `\ErrorException` conversion via `set_error_handler` to unify handling.

## Null Safety

- Nullable types with `?T`; null coalescing (`??`) and null-safe operator (`?->`).
- Prefer `Option`-style wrappers or explicit checks over scattered `null` returns.

## Composer and Autoloading

- PSR-4 autoloading; keep namespaces aligned with directory structure.
- Pin exact versions for libraries you integrate tightly with; ranges for stable ones.
- `composer.lock` committed for applications.

## Frameworks

- Laravel, Symfony, or framework-agnostic with DI container (e.g., PHP-DI).
- Keep controllers thin; push logic into services.
- Repositories for persistence; avoid ActiveRecord calls in domain logic.

## Testing

- PHPUnit with data providers for parameterized tests.
- Fakes over heavy mocking; Prophecy or Mockery only when needed.
- Integration tests with real DB via transactions rolled back per test.

## Security

- Prepared statements (PDO, ORM) — never concatenate SQL.
- Escape output contextually (HTML, JS, URL, CSS).
- Validate and sanitize all external input.
- Hash passwords with `password_hash` and `PASSWORD_BCRYPT`/`PASSWORD_ARGON2ID`.

## Common Pitfalls

- Loose comparison (`==`) with mixed types. Use `===`.
- Global state via `$GLOBALS` or statics breaks testing.
- Large controllers doing business logic. Extract services.
- Untyped array "DTOs" — use objects.

## Tooling

- PHPStan or Psalm at level 8 or max.
- PHP-CS-Fixer or PHP_CodeSniffer in CI.
- Rector for automated refactors.
