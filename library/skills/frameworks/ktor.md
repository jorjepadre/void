---
id: frameworks/ktor
name: Ktor Patterns
version: "1.0.0"
description: Ktor server patterns with routing, plugins, and coroutines.
language: kotlin
tags: [ktor, kotlin, backend, async]
depends_on: [languages/kotlin]
capabilities: [routing, plugins, coroutines]
parameters: []
tools: []
constraints: []
---

# Ktor Patterns

Kotlin-native server-side framework built on coroutines.

## Application Structure

- `Application.module()` function wires plugins and routes.
- Feature modules as extension functions on `Application` or `Routing`.
- Keep `main.kt` minimal; delegate to feature modules.

```kotlin
fun Application.module() {
    configureSerialization()
    configureAuth()
    configureRouting()
}

fun Application.configureRouting() {
    routing {
        userRoutes()
        orderRoutes()
    }
}
```

## Routing

- Nest routes under `route("/api/v1")`.
- Extract path/query/body with typed helpers: `call.parameters`, `call.receive<T>()`.
- One handler per endpoint, delegate to a service.

## Plugins

- `ContentNegotiation` with kotlinx.serialization for JSON.
- `Authentication` with JWT, Basic, or OAuth.
- `CallLogging` and `CallId` for observability.
- `StatusPages` for centralized exception handling.

## Serialization

- kotlinx.serialization is Ktor-native. Annotate DTOs with `@Serializable`.
- Separate wire DTOs from domain models.

## Dependency Injection

- Ktor doesn't ship DI; use Koin or manual construction.
- Keep the wiring explicit and testable.

## Error Handling

```kotlin
install(StatusPages) {
    exception<NotFoundException> { call, _ ->
        call.respond(HttpStatusCode.NotFound, ErrorResponse("not found"))
    }
}
```

- Map domain exceptions centrally; don't scatter try/catch.

## Coroutines

- Handlers run in a coroutine scope per request.
- Use `withContext(Dispatchers.IO)` for blocking IO.
- Cancellation propagates if the client disconnects.

## Testing

- `testApplication { ... }` with `client` for in-memory tests.
- No need for mock HTTP layers; run the app in-process.

## Persistence

- Exposed (SQL DSL) or JetBrains Exposed DAO; alternatively, jOOQ or Hibernate.
- Wrap writes in `newSuspendedTransaction`.

## Deployment

- Fat jar via Gradle `shadow` plugin.
- Run under Netty, Jetty, or CIO engine; Netty is the default.

## Common Pitfalls

- Blocking the event loop in a coroutine — always switch to IO dispatcher.
- Missing `ContentNegotiation` means `call.receive<T>()` fails.
- Not closing resources — use `use {}` blocks.
