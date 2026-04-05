---
id: domains/ci-cd
name: CI/CD Pipelines
version: "1.0.0"
description: Pipeline design, artifacts, secrets, and deployment automation.
language: null
tags: [ci-cd, pipelines, devops]
depends_on: []
capabilities: [pipeline-design, artifact-management]
parameters: []
tools: []
constraints: []
---

# CI/CD Pipelines

Designing pipelines that are fast, safe, and trustworthy.

## Goals

- Give developers fast feedback on changes.
- Build deployable artifacts once and promote them.
- Enforce quality gates automatically.
- Deploy with confidence and repeatability.

## Pipeline Stages

1. **Lint & Format** — fast static checks.
2. **Build** — compile/transpile artifacts.
3. **Unit Tests** — fast, parallelizable.
4. **Integration Tests** — slower, with real dependencies via containers.
5. **Security Scans** — SAST, dependency CVEs, container scanning.
6. **Package** — container images, bundles, signed.
7. **Deploy to Staging** — automatic on main.
8. **E2E / Smoke Tests** — against staging.
9. **Deploy to Production** — gated or automatic per policy.

Each stage fails fast; don't run later stages if earlier ones failed.

## Build Once, Promote Many

- Build artifacts (container image, binary, bundle) once.
- Tag by commit SHA.
- Promote the same artifact through environments.
- Never rebuild for prod what was tested in staging.

## Caching

- Cache language dependencies (npm, pip, maven, cargo).
- Cache Docker layers via registry or BuildKit mounts.
- Cache test results when inputs are unchanged.
- Invalidate on lockfile changes.

## Parallelism

- Run independent stages in parallel.
- Shard tests across runners.
- Fan out, fan in at quality gates.

## Secrets Management

- Never in repo, never in logs.
- Use the platform's secret store (GitHub Secrets, GitLab variables, Vault).
- Scope secrets to environments — staging can't read prod.
- Rotate on rotation schedule and on exposure.

## Environments

- Dev → Staging → Production with increasing restrictions.
- Staging mirrors prod config (or very close).
- Per-PR ephemeral environments for feature previews.

## Quality Gates

- Tests must pass.
- Coverage threshold for new code (not blanket thresholds).
- Security scans without critical findings.
- Linting and formatting enforced.
- PR requires review + passing CI before merge.

## Deployment Automation

- Staging deploys on merge to main.
- Production: automatic with safety checks, or manual approval for regulated contexts.
- Rollback is one click or one command.
- Every deploy emits an event with the commit, actor, and timestamp.

## Pipeline as Code

- Pipeline definitions in the repo (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`).
- Reviewed like application code.
- Reusable workflows/templates for common patterns.

## Observability

- Metrics: pipeline duration, success rate, flaky test rate.
- Alert on broken main, slow trends, repeated failures.
- Track DORA metrics: deploy frequency, lead time, change failure rate, MTTR.

## Monorepo vs Polyrepo

- Monorepo: trigger jobs only for changed paths (path filters, `nx`, `turbo`, Bazel).
- Polyrepo: straightforward per-repo pipelines; coordinate with release trains.

## Common Pitfalls

- Rebuilding artifacts per environment (drift, unreproducible).
- Flaky tests blocking merges; fix or quarantine.
- Pipelines taking 30+ minutes → parallelize and cache.
- Manual steps masquerading as automation.
- No clear owner for broken pipelines.

## Release Artifacts

- Semantic version tags on releases.
- Changelogs generated from conventional commits.
- SBOM (Software Bill of Materials) for compliance.
- Signed artifacts for supply chain security.

## Disaster Recovery

- Regular restore drills from backups.
- Pipeline can rebuild from source if the registry is lost.
- Document runbooks for common failures.
