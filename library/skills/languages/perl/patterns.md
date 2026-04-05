---
id: languages/perl
name: Perl Patterns
version: "1.0.0"
description: Modern Perl idioms with strict/warnings, references, and testing.
language: perl
tags: [perl, patterns]
depends_on: []
capabilities: [scripting, text-processing, testing]
parameters: []
tools: []
constraints: []
---

# Perl Patterns

Writing maintainable, modern Perl (5.36+) for scripts and applications.

## Pragmas and Baseline

- Always `use strict; use warnings;` (or `use v5.36;` which enables both).
- `use utf8;` when source contains non-ASCII; set IO layers for files.
- `use experimental 'signatures';` (stable as of 5.36) for function signatures.

```perl
use v5.36;
use utf8;

sub greet ($name, $greeting = 'Hello') {
    return "$greeting, $name!";
}
```

## References and Data Structures

- Use references for anything beyond simple scalars passed between subs.
- Arrow notation: `$hash->{key}`, `$array->[0]`, `$ref->{users}[0]{name}`.
- Avoid implicit list flattening; pass arrays/hashes by reference.

## Object Orientation

- `Moo` or `Moose` for classes with attributes, roles, and types.
- `Object::Pad` or native `class` feature (5.38+ experimental) for newer style.
- Keep attributes typed with `isa` constraints.

## Error Handling

- `die` with an object or blessed reference, not a bare string, so callers can introspect.
- `Try::Tiny` or `Feature::Compat::Try` for safe try/catch.
- Don't rely on `$@` being set after eval without clearing it first.

## Regular Expressions

- `/x` modifier for commented, readable patterns.
- Named captures: `(?<name>...)` then `$+{name}`.
- Precompile with `qr//` when reused in loops.
- Avoid catastrophic backtracking; use possessive quantifiers or atomic groups.

## Testing

- `Test::More` for assertions; `Test2::V0` for modern test infrastructure.
- `prove` runs the test tree; integrate into CI.
- Fake filesystem with `Test::MockModule` or `File::Temp` for IO tests.
- Mock HTTP with `Test::LWP::UserAgent` or `HTTP::Tinyish` fakes.

## CPAN and Dependencies

- `cpanfile` for declaring dependencies; `carton` or `cpm` to install reproducibly.
- Pin versions for deployment; keep a lockfile under version control.

## Common Pitfalls

- Context: scalar vs list context changes return values. Use `scalar` or explicit list when needed.
- `@_` aliasing: modifying `$_[0]` modifies the caller's variable. Copy first.
- Autovivification creates nested structures silently; check `exists` before deep access.
- `local` vs `my`: `local` is dynamic scope, rarely what you want.

## Tooling

- `perltidy` for formatting.
- `perlcritic` at brutal/stern for linting.
- `Devel::Cover` for test coverage.
