---
id: languages/rust
name: Rust Patterns
version: "1.0.0"
description: Idiomatic Rust with ownership, error handling, traits, and async patterns.
language: rust
tags: [rust, patterns, ownership]
depends_on: []
capabilities: [ownership, error-handling, async]
parameters: []
tools: []
constraints: []
---

# Rust Patterns

Building safe, performant Rust that works with the borrow checker instead of against it.

## Ownership and Borrowing

- Take `&T` when you only read; `&mut T` when you mutate; `T` when you need ownership or to move it on.
- Return owned values unless the caller clearly benefits from a borrow tied to an input.
- Use `Cow<'_, T>` when a function may or may not need to allocate.
- Reach for `Rc`/`Arc` only when ownership is genuinely shared; prefer single-owner designs.

## Error Handling

- `Result<T, E>` for recoverable errors; `panic!` for broken invariants.
- Define a crate-level error enum with `thiserror` for libraries.
- Use `anyhow::Result` in binaries and tests where typed errors aren't needed.
- Propagate with `?`; add context with `.context("fetching user")` (anyhow) or a wrapping variant.
- Avoid `unwrap()` outside tests and `main` examples. `expect("reason")` documents invariants when you must.

## Traits and Generics

- Prefer generics (`fn f<T: Trait>`) for monomorphized code on hot paths; `dyn Trait` when size or indirection matters.
- Keep trait definitions minimal; split orthogonal behaviors into separate traits.
- Use blanket impls sparingly; they can conflict with downstream crates.
- Newtype pattern (`struct UserId(String)`) to give domain meaning to primitives.

## Async

- `tokio` is the default runtime for most servers; `async-std` and others exist for niche cases.
- Don't hold a `MutexGuard` across `.await`; use `tokio::sync::Mutex` or restructure.
- `Send` bounds on futures trip callers; avoid `Rc`/`RefCell` in async code, prefer `Arc` and `tokio::sync` primitives.
- Spawn with `tokio::spawn` for independent work; use `JoinSet` or `FuturesUnordered` for many concurrent tasks.

## Lifetimes

- Elide when possible; annotate only where the compiler cannot infer.
- A struct holding a reference usually wants to be a short-lived view, not a long-lived owner.
- If lifetimes get gnarly, consider owning the data instead (`String` vs `&str`, `Vec<T>` vs `&[T]`).

## Testing

- Unit tests in a `#[cfg(test)] mod tests` block at the bottom of each file.
- Integration tests in `tests/`; they exercise the public API only.
- `cargo test -- --nocapture` to see println output when debugging.
- Use `proptest` or `quickcheck` for properties on pure logic; `insta` for snapshot tests.

## Common Pitfalls

- Fighting the borrow checker usually means the data model needs a rethink. Consider cloning at a boundary or splitting a struct.
- `String` vs `&str`: APIs take `&str` (or `impl AsRef<str>`); store `String`.
- `Vec<T>` iteration with `.iter()` yields `&T`; `.into_iter()` yields `T` and consumes.
- `Clone` is fine at boundaries; don't contort code to save a clone on a cold path.
- `impl Trait` in return position hides types but pins you to one concrete type per call site.

## Performance

- Measure with `cargo bench` / `criterion` before optimizing.
- `#[inline]` on small hot functions crossing crates; let the compiler handle the rest.
- Prefer iterators over index loops — they optimize as well or better and are clearer.

## Tooling

- `cargo clippy -- -D warnings` in CI.
- `cargo fmt` pre-commit.
- `cargo deny` for license and vulnerability policy.
