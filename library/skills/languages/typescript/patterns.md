---
id: languages/typescript
name: TypeScript Patterns
version: "1.0.0"
description: Idiomatic TypeScript patterns covering types, generics, error handling, and testing.
language: typescript
tags: [typescript, language, patterns]
depends_on: []
capabilities: [type-design, generics, error-handling]
parameters: []
tools: []
constraints: []
---

# TypeScript Patterns

Guidance for writing idiomatic, type-safe TypeScript that leverages the type system without overengineering.

## Type System Usage

- Prefer `interface` for object shapes that may be extended or declaration-merged. Use `type` for unions, intersections, mapped, and conditional types.
- Lean on structural typing; accept the minimal shape a function needs rather than a named class.
- Use `readonly` on arrays and object properties to enforce immutability intent at the boundary.
- Avoid `any`. Reach for `unknown` at untrusted boundaries and narrow with type guards.
- Use discriminated unions for state machines and API responses:

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

## Generics

- Constrain generics (`<T extends ...>`) so inference stays useful and misuse is caught.
- Name type parameters meaningfully when they aren't purely positional (e.g., `TPayload`, `TError`).
- Prefer overloads for public APIs with divergent return types based on input; use conditional types when overloads explode.

## Error Handling

- Throw only for truly exceptional cases. For expected failures, return `Result` or a tagged error union so callers must handle them.
- Wrap async boundaries in try/catch and convert thrown values to typed errors; never assume a caught value is an `Error` instance.
- Prefer custom error classes with a `kind` discriminator over error subclass hierarchies.

## Null and Undefined

- Enable `strictNullChecks` (via `strict: true`) and treat `null`/`undefined` as explicit states.
- Use optional chaining and nullish coalescing; avoid `||` for defaults when `0`, `""`, or `false` are valid values.
- Prefer `T | undefined` over `T | null` unless interop requires `null`.

## Async Patterns

- Use `async`/`await` over raw promise chains.
- Run independent async work in parallel with `Promise.all`; use `Promise.allSettled` when partial failures are acceptable.
- Always await or return promises in async functions to avoid silent unhandled rejections.

## Modules and Organization

- Use named exports; reserve default exports for framework conventions (e.g., Next.js pages).
- Keep barrel files (`index.ts`) shallow to avoid circular imports and slow builds.
- Colocate types with the code that owns them; lift to a shared `types.ts` only when genuinely shared.

## Testing

- Test public APIs, not implementation details. Type-level tests (`expectTypeOf`, `@ts-expect-error`) catch regressions in public types.
- Use factory functions for test fixtures so changes to types surface as compile errors in tests.
- Prefer dependency injection over module mocking; pass collaborators as parameters.

## Common Pitfalls

- Overusing `as` casts hides real bugs. Investigate why TypeScript objects before casting.
- Enum quirks: `const enum` inlines but breaks isolated modules; prefer string literal unions or plain objects with `as const`.
- `Object.keys` returns `string[]`, not keyof. Use a typed helper when you need `keyof T`.
- Mutating a `readonly` array via a cast compiles but breaks invariants; treat `readonly` as a contract.
- Index signatures (`Record<string, T>`) return `T`, not `T | undefined`; enable `noUncheckedIndexedAccess` for safety.

## Tooling

- Enable `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`.
- Run `tsc --noEmit` in CI alongside lint and tests.
- Use `satisfies` to validate a value against a type without widening it.
