---
id: languages/python
name: Python Patterns
version: "1.0.0"
description: Pythonic idioms, type hints, error handling, and testing patterns.
language: python
tags: [python, language, patterns]
depends_on: []
capabilities: [idiomatic-python, type-hints, testing]
parameters: []
tools: []
constraints: []
---

# Python Patterns

Writing Python that is clear, typed, and performant without fighting the language.

## Idioms

- Prefer list/dict/set comprehensions over `map`/`filter` with lambdas when readable.
- Use generators for large or streaming data to avoid loading everything into memory.
- Unpack with starred assignment (`first, *rest = xs`) rather than slicing.
- Use `enumerate` and `zip` instead of index arithmetic.
- `pathlib.Path` over `os.path` string manipulation.
- Context managers (`with`) for any acquired resource, including locks and DB transactions.

## Type Hints

- Annotate public functions and class attributes. Internal helpers can skip hints when obvious.
- Use `from __future__ import annotations` to enable postponed evaluation on older runtimes.
- Prefer `list[int]`, `dict[str, X]`, `X | None` (Python 3.10+) over the `typing` generics.
- `Protocol` for structural typing; `TypedDict` for JSON-shaped dicts; `dataclass` or `pydantic.BaseModel` for record types.
- Run `mypy --strict` or `pyright` in CI.

## Error Handling

- Catch the narrowest exception type possible. Bare `except:` swallows `KeyboardInterrupt` and real bugs.
- Raise exceptions with context: include what failed and the input that caused it.
- Use `raise X from e` to preserve the cause chain when re-raising.
- Define a small hierarchy of domain exceptions; don't reuse built-ins for domain errors.

## Dataclasses and Records

```python
from dataclasses import dataclass, field

@dataclass(frozen=True, slots=True)
class Order:
    id: str
    items: list[str] = field(default_factory=list)
```

- `frozen=True` for value objects; `slots=True` cuts memory and prevents typos.
- Prefer dataclasses over ad-hoc dicts for anything crossing a module boundary.

## Async

- `asyncio.gather` for parallel awaitables; wrap with `return_exceptions=True` when partial failure is OK.
- Don't block the loop: use `asyncio.to_thread` for CPU/blocking IO inside async code.
- Cancel propagation: catch `asyncio.CancelledError`, clean up, and re-raise.

## Testing

- `pytest` with fixtures; keep fixtures close to the tests that use them.
- Parametrize (`@pytest.mark.parametrize`) to cover matrices of inputs.
- Use `monkeypatch` and `tmp_path` built-ins before reaching for heavier mocking.
- Arrange-Act-Assert structure per test; one behavior per test.

## Packaging

- `pyproject.toml` with a single source of truth for deps, tools, and metadata.
- Pin direct dependencies with ranges; lock transitive deps with `uv.lock` or `poetry.lock`.
- Keep the importable package name and the distribution name in sync when possible.

## Performance

- Measure before optimizing (`cProfile`, `py-spy`).
- Use `functools.lru_cache` for pure functions with expensive computation.
- Vectorize hot loops with NumPy/Polars; avoid Python-level iteration over large arrays.
- Beware accidental O(n^2) patterns with `in` on lists inside loops; use sets/dicts.

## Common Pitfalls

- Mutable default arguments (`def f(x=[])`) share state across calls. Use `None` and assign inside.
- Late-binding closures in loops: bind via default argument (`lambda x=x: ...`).
- `is` vs `==`: `is` checks identity; use `==` for value comparison.
- Circular imports usually indicate a missing module; extract shared types.
