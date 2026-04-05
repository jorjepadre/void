---
id: frameworks/spring-boot
name: Spring Boot Patterns
version: "1.0.0"
description: Spring Boot patterns for REST APIs, data access, and testing.
language: java
tags: [spring-boot, java, backend, api]
depends_on: [languages/java]
capabilities: [rest-api, jpa, dependency-injection]
parameters: []
tools: []
constraints: []
---

# Spring Boot Patterns

Building Spring Boot services with Java 17+ and modern patterns.

## Project Structure

- Package by feature: `com.example.users`, `com.example.orders`.
- Each feature package has controller, service, repository, domain model, and DTOs.
- Avoid layered packages (`controllers/`, `services/`) for anything beyond small apps.

## Controllers

- `@RestController` with constructor injection of services.
- Request/response DTOs separate from entities.
- Bean Validation (`@Valid`, `@NotBlank`, `@Email`) on request bodies.
- Return `ResponseEntity<T>` when you need to control status/headers.

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService users;
    public UserController(UserService users) { this.users = users; }

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserCreate req) {
        var user = users.create(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(user));
    }
}
```

## Services

- `@Service` beans hold business logic. Constructor injection with final fields.
- `@Transactional` at the service layer, not in controllers or repositories.
- Keep methods focused; extract helpers rather than growing a service.

## Persistence

- Spring Data JPA repositories for CRUD; custom queries with `@Query` or a repository impl.
- Avoid OneToMany eager fetching; use `@EntityGraph` or fetch joins.
- Use DTO projections for read-heavy endpoints.
- Flyway or Liquibase for migrations, committed with the code that needs them.

## Error Handling

- `@ControllerAdvice` with `@ExceptionHandler` methods maps exceptions to responses.
- Return Problem Details (RFC 7807) for consistency.
- Domain exceptions extend a base type; handler maps them in one place.

## Configuration

- `application.yml` + profile-specific overrides (`application-prod.yml`).
- Typed config with `@ConfigurationProperties` + `@Validated`.
- Secrets from env vars or a vault, never committed.

## Security

- Spring Security with method-level `@PreAuthorize` or a security filter chain.
- JWT or session cookies; OAuth2 resource server for API auth.
- CSRF enabled for browser flows; disabled for stateless APIs with token auth.

## Testing

- `@SpringBootTest` for integration; slice tests (`@WebMvcTest`, `@DataJpaTest`) for speed.
- Testcontainers for real DB/broker in CI.
- AssertJ + JUnit 5.

## Observability

- Actuator endpoints (`/health`, `/metrics`, `/info`) enabled and secured.
- Micrometer for metrics; OpenTelemetry for traces.

## Common Pitfalls

- `@Transactional` on private methods or self-invocation — doesn't apply.
- Lazy loading outside a transaction (`LazyInitializationException`).
- Exposing entities directly in controllers — breaks encapsulation and invites N+1.
- Field injection (`@Autowired` field) makes testing harder.
