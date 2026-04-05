---
id: frameworks/flask
name: Flask Patterns
version: "1.0.0"
description: Flask application patterns with blueprints, extensions, and testing.
language: python
tags: [flask, python, web, backend]
depends_on: [languages/python]
capabilities: [routing, blueprints, testing]
parameters: []
tools: []
constraints: []
---

# Flask Patterns

Flask for simple, flexible web applications and APIs.

## Application Factory

- Construct the app in a factory function so tests can configure it independently:

```python
def create_app(config=None):
    app = Flask(__name__)
    app.config.from_object(config or ProductionConfig)
    db.init_app(app)
    app.register_blueprint(users_bp, url_prefix="/users")
    return app
```

## Blueprints

- One blueprint per feature/bounded context.
- Keep views thin: parse input, call a service, return a response.
- Register blueprints in the factory, not at import time.

## Configuration

- Class-based config (`DevConfig`, `ProdConfig`) selected via env var.
- Secrets from environment; never commit them.

## Extensions

- Flask-SQLAlchemy for ORM; Flask-Migrate (Alembic) for migrations.
- Flask-Login for sessions; Flask-JWT-Extended for tokens.
- Flask-Limiter for rate limiting.

## Request Handling

- Use `request.get_json(force=False, silent=True)` and validate explicitly.
- Validate with marshmallow or pydantic; return consistent error responses.
- Return `jsonify` for JSON; use response classes for control over headers/status.

## Error Handling

- `@app.errorhandler(HTTPException)` for HTTP errors.
- `@app.errorhandler(Exception)` as last resort, logging the traceback.
- Map domain exceptions to HTTP responses in one place.

## Testing

- `app.test_client()` for request-level tests.
- `pytest` fixtures that create an app with test config and a fresh DB.
- Avoid global app state; rely on factory + fixtures.

## Async and Background Work

- Flask is WSGI (sync). For async endpoints, consider Quart (Flask-API-compatible).
- Background jobs via Celery, RQ, or dramatiq.

## Deployment

- Behind gunicorn or uWSGI; reverse proxy via nginx/Caddy.
- Configure worker count based on CPU and request profile.

## Common Pitfalls

- Global `app` objects make testing painful — use the factory.
- Long-running work in request handlers — offload to workers.
- Unbounded query results — always paginate.
- Missing CSRF protection on form endpoints (Flask-WTF).

## Security

- `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_HTTPONLY`, `SESSION_COOKIE_SAMESITE` in prod.
- Escape template output (Jinja autoescapes HTML by default; watch JS/URL contexts).
- Parameterized SQL — never string-format queries.
