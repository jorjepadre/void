---
id: frameworks/vue
name: Vue Patterns
version: "1.0.0"
description: Vue 3 Composition API patterns with reactivity, composables, and testing.
language: typescript
tags: [vue, frontend, composition-api]
depends_on: []
capabilities: [composition-api, reactivity, components]
parameters: []
tools: []
constraints: []
---

# Vue Patterns

Vue 3 with the Composition API, `<script setup>`, and TypeScript.

## Components

- `<script setup lang="ts">` for concise, typed components.
- Single-file components with `<template>`, `<script>`, `<style scoped>`.
- Keep components small; extract composables for reusable logic.

```vue
<script setup lang="ts">
interface Props { initial?: number }
const { initial = 0 } = defineProps<Props>();
const count = ref(initial);
const doubled = computed(() => count.value * 2);
</script>

<template>
  <button @click="count++">{{ count }} (doubled: {{ doubled }})</button>
</template>
```

## Reactivity

- `ref` for primitives and objects you reassign; `reactive` for objects you mutate.
- `computed` for derived state.
- `watch` for side effects on specific sources; `watchEffect` for auto-tracked.
- Unwrap `.value` in script; templates unwrap automatically.

## Composables

- Prefix with `use`; return an object of refs and functions.
- Encapsulate stateful logic (fetching, forms, timers) for reuse across components.

## State Management

- Pinia for shared state; stores are typed, modular, and devtool-friendly.
- Keep stores small; avoid a monolithic global store.

## Routing

- Vue Router with typed routes.
- Route guards for auth; lazy-load route components for code splitting.

## SSR and Nuxt

- Nuxt for SSR, file-based routing, and auto-imports.
- `useFetch`/`useAsyncData` in Nuxt for SSR-aware data loading.

## Testing

- Vitest + `@vue/test-utils` for component tests.
- Mount components and assert on rendered output and emitted events.
- Playwright/Cypress for E2E.

## Performance

- `v-memo` for expensive list items that rarely change.
- `shallowRef`/`shallowReactive` for large structures where deep tracking is wasted.
- Async components and dynamic imports for code splitting.

## Common Pitfalls

- Destructuring `reactive` objects loses reactivity — use `toRefs`.
- Forgetting `.value` on refs in script.
- Mutating props directly — emit events or use `v-model`.
- Over-use of `watch` where `computed` would do.

## Tooling

- Volar for TS support.
- ESLint with `eslint-plugin-vue`.
