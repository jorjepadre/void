---
id: domains/performance
name: Performance Optimization
version: "1.0.0"
description: Profiling, optimization, caching, and measuring performance.
language: null
tags: [performance, optimization, profiling, caching]
depends_on: []
capabilities: [profiling, optimization, caching]
parameters: []
tools: []
constraints: []
---

# Performance Optimization

A measured approach to making software faster, cheaper, and more scalable.

## Principles

- **Measure first.** Intuition is wrong more often than right.
- **Optimize the bottleneck.** Everything else is a waste.
- **Profile realistic workloads.** Synthetic benchmarks lie.
- **Prefer big-O wins over micro-optimizations.**
- **Readability first; optimize only when needed.**

## Where Time Goes

In most systems, in rough order:
1. Network IO (database, external APIs)
2. Disk IO
3. Memory allocation / GC
4. CPU computation
5. Lock contention / synchronization

Know your layer before optimizing.

## Profiling

- **CPU**: flame graphs show where cycles go. Tools: perf, pprof, py-spy, async-profiler.
- **Memory**: heap dumps and allocation profiles. Tools: heaptrack, pprof, VisualVM.
- **IO**: tracing (OpenTelemetry), APM tools, DB slow query logs.
- **Distributed**: traces show end-to-end latency across services.

Run profiles under realistic load, not microbenchmarks.

## Common Wins

### Database
- Add missing indexes. Check slow query log.
- Fix N+1 with batching or eager loading.
- Paginate unbounded result sets.
- Use read replicas for read-heavy workloads.

### Caching
- Cache at the right layer: HTTP, CDN, application, DB.
- Cache invalidation is hard — prefer TTL + background refresh.
- Cache stampede: use locks, request coalescing, or stale-while-revalidate.
- Don't cache what's cheap to compute.

### Concurrency
- Parallelize independent work.
- Async IO for IO-heavy workloads; threads for CPU-heavy.
- Bounded concurrency: unlimited parallelism creates contention.

### Algorithms and Data Structures
- Right data structure for the access pattern (hash vs tree vs array).
- Batch small operations.
- Avoid repeated work: memoize pure, expensive computations.

### Network
- HTTP/2 or HTTP/3.
- Compression (gzip, brotli).
- Connection pooling.
- Reduce round trips (batch endpoints, GraphQL, BFF).

## Caching Strategies

- **Cache-aside** — app reads cache, falls back to source, writes through.
- **Write-through** — writes go to cache and source together.
- **Write-behind** — writes to cache, async to source. Durability risk.
- **Refresh-ahead** — refresh hot entries before they expire.

## When NOT to Optimize

- Code path is rarely executed.
- Savings are imperceptible to users.
- Refactor would obscure logic.
- Bottleneck is elsewhere.

## Measuring Improvements

- Baseline with current numbers before changing anything.
- Same workload, same environment.
- Statistical significance matters — run multiple iterations.
- Report p50, p95, p99, not just averages.

## Memory and GC

- Watch for allocations in hot paths.
- Object pools for expensive-to-create objects.
- Understand your runtime's GC (generational, concurrent, stop-the-world).
- Tune GC only with data.

## Scaling

- Vertical scaling: simpler, bounded.
- Horizontal scaling: more ops overhead, requires stateless or partitioned design.
- Database bottlenecks don't scale by adding app servers.

## Common Pitfalls

- Premature optimization of non-bottlenecks.
- Micro-benchmarks without realistic conditions.
- Caching everywhere causing correctness bugs.
- Ignoring tail latency (p99).
- Local dev performance ≠ production performance.

## SLOs and Budgets

- Define latency and error budgets per endpoint.
- Alert when budgets are consumed, not on arbitrary thresholds.
- Performance regressions caught in CI via benchmarks on critical paths.
