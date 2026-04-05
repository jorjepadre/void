---
id: domains/docker
name: Docker Patterns
version: "1.0.0"
description: Container patterns, Dockerfile best practices, and image optimization.
language: null
tags: [docker, containers, devops]
depends_on: []
capabilities: [containerization, image-building]
parameters: []
tools: []
constraints: []
---

# Docker Patterns

Building small, secure, fast container images.

## Dockerfile Fundamentals

- Start from a minimal, maintained base image (distroless, alpine, slim).
- Pin base image tags to a digest or specific version; avoid `latest`.
- One logical purpose per image.
- Keep image layers cache-friendly by ordering commands from least to most frequently changing.

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs20
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER 1000
CMD ["dist/server.js"]
```

## Multi-Stage Builds

- Separate build tools from runtime.
- Final image contains only what's needed to run.
- Drastically reduces image size and attack surface.

## Layer Caching

- Copy dependency manifests first, install deps, then copy source.
- A source change won't invalidate the dependency install layer.
- Use `.dockerignore` to exclude `node_modules`, `.git`, `dist`, tests.

## Security

- Run as a non-root user. `USER 1000` or a named user.
- Minimize installed packages; audit with `trivy`, `grype`.
- Don't bake secrets into images — use build args for non-secret config, runtime env for secrets.
- Sign images (cosign) and verify at deploy time.
- Read-only root filesystem when the app supports it.

## Image Size

- Distroless or Alpine for runtime.
- `npm ci --omit=dev` / `pip install --no-cache-dir`.
- Clean up package manager caches (`apt clean`, `rm -rf /var/lib/apt/lists/*`).
- Single `RUN` with `&&` chaining for cleanup to happen in the same layer.

## Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1
```

- Expose a real health endpoint that checks dependencies.
- Keep the check fast and cheap.

## Configuration

- Config via environment variables following 12-factor.
- No baked-in config. Secrets come from a secret manager or orchestrator.
- Validate env at startup; fail fast if something is missing.

## Signals and Graceful Shutdown

- PID 1 handles signals. Use a proper init (`tini`, `dumb-init`) if your runtime doesn't.
- Handle SIGTERM to drain connections and finish in-flight work before exiting.
- Align app shutdown timeout with orchestrator's terminationGracePeriod.

## Composition

- docker-compose for local dev and small stacks.
- Orchestrators (Kubernetes, Nomad, ECS) for production.
- Keep the Dockerfile the same across environments; vary config, not build.

## Build Reproducibility

- Pin base images by digest.
- Pin system and language dependencies.
- Build in CI from a clean checkout.

## Common Pitfalls

- Running as root.
- Copying `.env` files into images.
- Using `latest` tags for bases.
- Large images hiding secrets in intermediate layers (use `--squash` or multi-stage).
- Ignoring `.dockerignore` and shipping huge contexts.
- No health check, or a health check that doesn't test real dependencies.

## Debugging Images

- `docker history <image>` — inspect layers.
- `docker run --rm -it <image> sh` — exec into alpine-based images.
- Distroless: use `:debug` variant for troubleshooting, then switch back.
