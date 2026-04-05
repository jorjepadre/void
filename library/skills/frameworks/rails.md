---
id: frameworks/rails
name: Ruby on Rails Patterns
version: "1.0.0"
description: Rails patterns for MVC, ActiveRecord, background jobs, and testing.
language: ruby
tags: [rails, ruby, framework, backend]
depends_on: []
capabilities: [mvc, activerecord, jobs]
parameters: []
tools: []
constraints: []
---

# Ruby on Rails Patterns

Rails conventions applied with discipline for maintainable apps.

## Architecture

- Fat models, skinny controllers — but not so fat they become god objects.
- Extract service objects for multi-model operations and external integrations.
- Presenters/decorators for view logic.

```ruby
class SignupUser
  def initialize(repo:, mailer:) @repo, @mailer = repo, mailer end
  def call(params)
    user = @repo.create!(params)
    @mailer.welcome(user).deliver_later
    user
  end
end
```

## ActiveRecord

- Preload associations with `includes` to avoid N+1.
- Scopes for reusable query predicates.
- Validations in the model; enforce critical ones in the DB too.
- Use `upsert_all`, `insert_all` for bulk writes.

## Controllers

- One controller per resource; non-REST actions often hint at a new resource.
- Strong parameters at every entry point.
- Keep controller actions under ~10 lines — delegate to services.

## Background Jobs

- ActiveJob with Sidekiq, GoodJob, or SolidQueue.
- Idempotent jobs; pass IDs, not full objects.
- Job retries with exponential backoff; track failed jobs.

## Views and Turbo

- Hotwire (Turbo + Stimulus) for progressive enhancement.
- Partials for reusable fragments.
- Avoid heavy logic in ERB — push to helpers or presenters.

## Migrations

- Reversible migrations when possible.
- Add indexes for every foreign key.
- For zero-downtime: add, backfill, switch, remove across multiple deploys.

## Testing

- RSpec or Minitest; pick one and stick with it.
- Model specs for logic; request specs for controllers; system specs for E2E.
- FactoryBot for test data; avoid fixtures for anything non-trivial.
- Stub external services; don't hit real APIs in tests.

## Security

- `strong_parameters` everywhere.
- `has_secure_password` with bcrypt.
- CSRF protection enabled by default for HTML forms.
- Brakeman in CI for static security analysis.

## Performance

- Cache fragments and HTTP responses.
- `bullet` gem in dev to catch N+1.
- Profile with `rack-mini-profiler` and APM.

## Common Pitfalls

- Callbacks proliferating and running in surprising orders.
- Circular model associations causing load-order issues.
- Overusing concerns — can hide coupling.
- Trusting user input without strong parameters.
