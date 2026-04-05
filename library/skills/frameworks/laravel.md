---
id: frameworks/laravel
name: Laravel Patterns
version: "1.0.0"
description: Laravel patterns for Eloquent, controllers, queues, and testing.
language: php
tags: [laravel, php, framework, backend]
depends_on: [languages/php]
capabilities: [eloquent, routing, queues]
parameters: []
tools: []
constraints: []
---

# Laravel Patterns

Laravel for rapid, maintainable PHP applications.

## Architecture

- Thin controllers, fat services (or actions).
- Single-action controllers (`__invoke`) for focused endpoints.
- Form Requests for validation; keep controllers free of validation code.

```php
class StoreUserRequest extends FormRequest {
    public function rules(): array {
        return [
            'email' => ['required', 'email', 'unique:users'],
            'password' => ['required', 'min:12'],
        ];
    }
}
```

## Eloquent

- Eager load relations with `with()` to avoid N+1.
- Scopes for reusable query fragments.
- Casts (`$casts`) for dates, enums, JSON columns.
- Prefer query builders over raw SQL; parameterize when you must write raw.

## Service Container

- Bind interfaces to implementations in service providers.
- Constructor injection in controllers and services.
- Singleton only for stateless or globally shared resources.

## Queues and Jobs

- Dispatch heavy work to queues; keep request handlers fast.
- Idempotent jobs — safe to retry.
- `ShouldBeUnique` for jobs that must not run concurrently.
- Monitor failed jobs; set sensible retry policies.

## API Resources

- API Resources (`JsonResource`) shape responses consistently.
- Separate API versions via route prefixes and namespaced resources.

## Validation and Errors

- Form Requests for request validation.
- Exception handler maps domain exceptions to HTTP responses.
- Return consistent error envelopes.

## Testing

- Feature tests hit real routes with `$this->post(...)`.
- `RefreshDatabase` trait for isolated DB state.
- Factories for test data via `User::factory()->create()`.
- HTTP fakes (`Http::fake(...)`) for external service tests.

## Security

- Policies and Gates for authorization — never check roles ad-hoc.
- `@csrf` on forms; API tokens via Sanctum.
- Rate limit auth endpoints.
- Escape output in Blade; be careful with `{!! !!}`.

## Performance

- Cache expensive queries with `remember()`.
- Use `chunk`/`cursor` for large result sets.
- Index columns used in where/join/order.

## Common Pitfalls

- Mass assignment without `$fillable`/`$guarded` protection.
- Lazy loading in loops (N+1); enable `Model::preventLazyLoading()` in dev.
- Long-running sync jobs — move to queues.
- Business logic scattered across models — extract to services/actions.
