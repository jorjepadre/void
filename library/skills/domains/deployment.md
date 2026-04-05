---
id: domains/deployment
name: Deployment Strategies
version: "1.0.0"
description: Blue-green, canary, rolling deployment patterns with rollback.
language: null
tags: [deployment, devops, release]
depends_on: []
capabilities: [deployment, rollback, release-management]
parameters: []
tools: []
constraints: []
---

# Deployment Strategies

Patterns for deploying software with minimal risk and clear recovery paths.

## Core Goals

- **Safety** — bad deploys should affect few users.
- **Observability** — detect problems fast.
- **Reversibility** — roll back in minutes, not hours.
- **Repeatability** — the same process every time, automated.

## Strategies

### Rolling Deploy

Replace instances one batch at a time. Default for Kubernetes and most orchestrators.

- Works when old and new versions can run side-by-side.
- Health checks gate each batch.
- Slow rollout limits blast radius.
- Rollback is another rolling deploy backward.

### Blue-Green

Two identical environments; switch traffic between them.

- Instant cutover; instant rollback by flipping the switch.
- Doubles infrastructure cost during deploys.
- Works well for monoliths and stateful systems with careful DB handling.
- Shared database: must run compatible schema versions.

### Canary

Release to a small percentage of traffic, monitor, expand.

- Start at 1%, then 5%, 25%, 50%, 100% as metrics hold.
- Requires traffic splitting (service mesh, LB, feature flags).
- Fast abort if error rates spike.
- Best for high-traffic services where issues surface quickly.

### Feature Flags

Deploy code disabled, enable gradually.

- Decouples deploy from release.
- Ramp by user, account, region, or percentage.
- Required housekeeping: remove flags after rollout.

## Pre-Deploy Checklist

- Migrations compatible with currently running code.
- Config changes reviewed and applied.
- Backups verified.
- Alerts and dashboards primed for the new build.
- Runbooks updated for new components.
- Rollback procedure tested.

## Observability During Deploy

Track these during and after every deploy:
- Error rate (4xx, 5xx, exceptions)
- Latency (p50, p95, p99)
- Throughput
- Saturation (CPU, memory, queue depth)
- Business metrics (signups, orders, core flows)

Set clear abort thresholds before starting.

## Rollback

- Rollback is a first-class operation, not a panic maneuver.
- Practice it regularly in non-production.
- Schema changes must be backward-compatible to enable code rollback.
- Keep previous artifacts available for a known period.

## Database Deploys

- Migrations separate from code deploys.
- Expand-contract for any breaking schema change.
- Never run long migrations during peak traffic.
- Test migrations on a prod-sized copy before running against production.

## Deployment Windows

- Automate to the point where deploys are boring and frequent.
- Avoid Friday-afternoon deploys unless you have 24/7 ops.
- Feature-flag risky changes so rollout is separate from deploy.

## Infrastructure as Code

- Define environments in code (Terraform, Pulumi, CDK).
- Review infra changes like code changes.
- Immutable infrastructure — rebuild instead of mutating.

## Common Pitfalls

- Rolling deploys with incompatible schema changes.
- Canary based on stale metrics — use real-time.
- No health checks, or health checks that always return 200.
- Config drift between environments.
- Manual deploy steps that fail under pressure.

## Post-Deploy

- Watch for an agreed-upon observation window before declaring success.
- Post-mortem any aborted deploys.
- Update runbooks with what you learned.
