---
id: languages/cpp
name: C++ Patterns
version: "1.0.0"
description: Modern C++ (17/20) covering RAII, smart pointers, move semantics, and testing.
language: cpp
tags: [cpp, c++, patterns]
depends_on: []
capabilities: [raii, move-semantics, templates]
parameters: []
tools: []
constraints: []
---

# C++ Patterns

Modern C++ (17/20) focused on safety, clarity, and zero-cost abstractions.

## RAII

- Every resource is owned by an object with a destructor that releases it.
- No raw `new`/`delete` in application code. `std::make_unique`, `std::make_shared`.
- Smart pointers express ownership:
  - `unique_ptr<T>` — sole ownership, move-only.
  - `shared_ptr<T>` — shared ownership (costs atomic refcount; prefer unique when possible).
  - `weak_ptr<T>` — non-owning observer of a shared pointer.
- File handles, locks, sockets all wrapped in RAII types.

## Value Semantics and Move

- Prefer value types and pass by const reference (`const T&`) for inputs.
- Return by value; the compiler elides copies (RVO/NRVO, guaranteed in many cases since C++17).
- Implement the Rule of Zero: let the compiler generate special members when you hold only RAII members.
- If you define any of destructor/copy/move, define or delete all (Rule of Five).

## const-correctness

- Mark member functions `const` when they don't modify observable state.
- Pass by `const T&` unless you need a copy or a move target.
- `constexpr` for compile-time computation; `consteval` (C++20) when you require it.

## Templates and Concepts (C++20)

- Use concepts to constrain templates and produce readable errors.
- Prefer `auto` in return types when the type is obvious; spell it out when it matters for APIs.
- Avoid SFINAE hacks when concepts work.

```cpp
template<std::ranges::input_range R>
auto sum(R&& r) {
    using T = std::ranges::range_value_t<R>;
    return std::accumulate(std::ranges::begin(r), std::ranges::end(r), T{});
}
```

## Error Handling

- Exceptions for exceptional failures; return types (`std::optional`, `std::expected` in C++23, or custom variants) for expected failures.
- Never let exceptions cross C API boundaries.
- Mark `noexcept` functions that genuinely cannot throw; it enables optimizations and correctness guarantees.

## Concurrency

- `std::jthread` (C++20) with cooperative cancellation.
- `std::atomic` for lock-free primitives; `std::mutex` + `std::lock_guard`/`std::unique_lock` for critical sections.
- Avoid data races — the standard says behavior is undefined.
- Consider thread-safe queues and executor libraries rather than ad-hoc synchronization.

## Testing

- GoogleTest or Catch2 with small, named test cases.
- Fakes over mocks; dependency injection via templates or interfaces.
- Sanitizers in CI: AddressSanitizer, UBSan, ThreadSanitizer.

## Common Pitfalls

- Dangling references from returning references to locals.
- `auto` deducing references incorrectly (`auto x = vec[0];` copies; `auto& x = vec[0];` references).
- Iterator invalidation after container mutation.
- Implicit conversions and narrowing; use `{}` initialization to catch them.
- Uninitialized members — always initialize in the class body.

## Tooling

- clang-tidy with a strict config.
- clang-format in pre-commit.
- CMake with modern target-based configuration.
