---
id: domains/database-patterns
name: Database Patterns
version: "1.0.0"
description: Schema design, migrations, indexing, and query optimization.
language: null
tags: [database, sql, migrations, indexing]
depends_on: []
capabilities: [schema-design, migrations, indexing]
parameters: []
tools: []
constraints: []
---

# Database Patterns

Schema, migration, and query patterns for reliable, performant relational databases.

## Schema Design

- Model the domain; don't prematurely denormalize.
- Primary keys: UUIDs (v7 or ULID for sortable) or monotonic IDs. Choose based on distribution needs.
- Foreign keys with explicit `ON DELETE` behavior (`RESTRICT`, `CASCADE`, `SET NULL`).
- Not-null by default; make fields nullable only when the domain requires it.
- Use enums/lookup tables for closed value sets; not free-form strings.
- Timestamps: `created_at`, `updated_at` with `TIMESTAMPTZ` (Postgres) or UTC.

## Indexing

- Index foreign keys, columns used in `WHERE`, `ORDER BY`, and join predicates.
- Composite indexes: column order matches query predicates (equality before range).
- Partial indexes for sparse predicates: `WHERE deleted_at IS NULL`.
- Covering indexes (`INCLUDE` in Postgres) for hot read paths.
- Monitor unused indexes; they cost writes.
- Measure before adding — `EXPLAIN ANALYZE` reveals what's actually happening.

## Migrations

- Every schema change is a migration, version-controlled, reviewed.
- Reversible when possible; `down` migrations tested.
- Keep migrations small and focused; combine only when they're a single logical change.
- Never edit an applied migration — add a new one.

### Zero-Downtime Migrations

Deploys with a running application demand expand/contract:

1. **Expand** — add new schema (nullable columns, new tables) without breaking old code.
2. **Backfill** — populate data in batches; verify consistency.
3. **Dual-write** — old and new code paths both work.
4. **Switch** — make new path primary.
5. **Contract** — remove old schema after all writers are updated.

Avoid in hot paths: adding NOT NULL with a default on large tables, renaming columns, changing types.

## Transactions

- Keep transactions short. Long transactions block writers and bloat WAL.
- Isolation levels: understand the default (Postgres: READ COMMITTED, MySQL: REPEATABLE READ).
- Use SERIALIZABLE for correctness-critical multi-row logic; accept the retry cost.
- Avoid external IO inside transactions (HTTP calls, email, queues).

## Query Optimization

- `EXPLAIN ANALYZE` before optimizing. Don't guess.
- Avoid `SELECT *` on wide tables; fetch only needed columns.
- Beware N+1; batch with `IN (...)` or joins.
- Use window functions instead of correlated subqueries where applicable.
- Paginate with cursors (keyset pagination) on large tables; offset gets slow fast.

## Connections

- Connection pooling (pgbouncer, PgBouncer-compatible) to avoid exhausting DB connections.
- Pool size sized to workload, not maximum theoretical.
- Set statement timeouts to prevent runaway queries.

## Soft Delete

- `deleted_at TIMESTAMPTZ` column with partial indexes filtering it out.
- Consistently filter in queries (scopes/views).
- Understand the trade-offs: audit value vs query complexity.

## Auditing and History

- Append-only audit tables for regulated data.
- Temporal tables or event sourcing for full history.
- Triggers are powerful but hard to debug; prefer application-level emission when possible.

## NoSQL Considerations

For document/key-value stores:
- Model around access patterns, not entities.
- Denormalize deliberately; accept data duplication as the cost of read scaling.
- Understand consistency guarantees (eventual, strong, causal) of your store.

## Common Pitfalls

- Missing indexes on foreign keys.
- Boolean columns that should be enums.
- Dates without timezones.
- Using floats for money.
- Unbounded `LIKE '%x%'` without trigram or full-text indexes.
- Running migrations manually in production.
