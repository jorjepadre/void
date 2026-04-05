---
id: frameworks/react
name: React Patterns
version: "1.0.0"
description: React component patterns, hooks, state management, and testing.
language: typescript
tags: [react, frontend, framework]
depends_on: []
capabilities: [components, hooks, state-management]
parameters: []
tools: []
constraints: []
---

# React Patterns

Building maintainable React apps with modern function components and hooks.

## Components

- Function components with hooks; avoid class components in new code.
- Keep components focused — one responsibility, ideally under 150 lines.
- Colocate styles, tests, and types with the component file.
- Props as typed interfaces; destructure in the signature.

## Hooks

- Custom hooks extract reusable stateful logic. Prefix with `use`.
- `useEffect` only for synchronizing with external systems. Derived data belongs in render or `useMemo`.
- Dependency arrays are honest — list every value from render scope that the effect reads.
- Avoid effects that set state based on props; compute during render instead.

```tsx
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

## State Management

- Local state (`useState`, `useReducer`) first. Lift only when multiple components need it.
- Context for truly global, rarely-changing values (theme, auth). Avoid as a general state bus.
- For complex shared state: Zustand, Jotai, Redux Toolkit, or TanStack Query for server state.
- Server state is not the same as client state. Use TanStack Query/SWR/RTK Query.

## Performance

- Profile before optimizing with React DevTools Profiler.
- `memo`, `useMemo`, `useCallback` for expensive computations or stable references passed to memoized children.
- List virtualization (`react-window`, `@tanstack/react-virtual`) for long lists.
- Code-split routes with lazy + Suspense.

## Forms

- React Hook Form or TanStack Form for complex forms; controlled components for simple ones.
- Validate with Zod/Valibot schemas shared between client and server.

## Testing

- React Testing Library — test behavior, not implementation details.
- Query by role/label first; test IDs as last resort.
- MSW (Mock Service Worker) for network mocking.
- Avoid snapshot tests for anything beyond small static components.

## Routing

- React Router, TanStack Router, or framework-level routing (Next.js, Remix).
- Keep route components thin; delegate data loading to loaders or queries.

## Common Pitfalls

- Stale closures in effects and handlers — use refs or functional updates.
- Missing keys in lists cause reconciliation bugs; use stable IDs, not array index.
- Mutating state directly breaks rendering. Always create new objects/arrays.
- Over-fetching via fragmented hooks; consolidate queries.

## Accessibility

- Semantic HTML first. Reach for ARIA only when native elements won't do.
- Keyboard navigation and focus management for modals/menus.
- `jest-axe` in tests to catch regressions.
