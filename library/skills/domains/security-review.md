---
id: domains/security-review
name: Security Review
version: "1.0.0"
description: Security-focused review covering OWASP risks, secrets, injection, and auth.
language: null
tags: [security, review, owasp]
depends_on: [domains/audit-verification]
capabilities: [security-audit, threat-modeling]
parameters: []
tools: []
constraints: []
---

# Security Review

A security-focused review pass to catch common classes of vulnerabilities before they ship.

## Rule Zero: Verify Before Reporting

**Every finding must be verified by reading actual code flow, not pattern
matching.** See the `audit-verification` skill for the methodology.

Never flag a line of code without:
1. Reading the full function that contains it
2. Tracing where the flagged data comes from (source)
3. Tracing where it goes (sink)
4. Writing a concrete exploit scenario as a sentence
5. Checking for existing mitigations
6. Considering runtime guarantees (e.g., single-threaded JavaScript)

If you can't complete steps 1–5, you don't have a finding. Drop it.

## Scope

Apply this review when:
- Adding authentication, authorization, or session handling
- Accepting user input that crosses a trust boundary
- Integrating third-party services or handling secrets
- Processing file uploads, deserialization, or templating
- Making changes to public APIs or network surfaces

## OWASP-Aligned Checklist

### Injection
- Parameterized queries for all SQL/NoSQL. No string concatenation with user input.
- Command execution: avoid shelling out; if unavoidable, pass arg arrays, never `sh -c`.
- Template injection: never feed user input into template engines.
- LDAP/XPath/header injection: validate and encode.

### Authentication
- Passwords hashed with bcrypt/argon2/scrypt — never MD5/SHA1.
- MFA available for sensitive accounts.
- Password reset flows use expiring single-use tokens.
- Rate limit login attempts and token use.

### Session / Token Handling
- Cookies: `Secure`, `HttpOnly`, `SameSite=Lax` or `Strict`.
- JWT: verify signature and algorithm; reject `alg: none`.
- Token rotation on privilege change; revocation on logout.

### Authorization
- Every endpoint checks authorization, not just authentication.
- Horizontal access control: users can only access their own resources.
- IDOR: don't trust IDs from clients without ownership checks.
- Admin endpoints gated and audited.

### Sensitive Data
- PII/PHI encrypted at rest where required.
- TLS everywhere in transit; HSTS enabled.
- Don't log secrets, tokens, passwords, card numbers, PHI.
- Redact sensitive fields in error responses.

### Input Validation
- Validate type, length, format, range at the boundary.
- Deny-by-default allowlists over denylists.
- File uploads: size limits, type checks, antivirus scan if public.

### Deserialization
- Don't deserialize untrusted data with unsafe formats (pickle, Java serialization).
- Use strict JSON schemas.

### CSRF / XSS
- CSRF tokens on state-changing endpoints for browser clients.
- Output encoding by context (HTML, attribute, JS, URL, CSS).
- Content Security Policy configured.

### Dependencies
- Lockfiles committed.
- Automated vulnerability scanning (Dependabot, Snyk, Trivy).
- Remove unused dependencies.

### Secrets Management
- No secrets in git, logs, or error messages.
- Rotate secrets on exposure.
- Use a secret manager (Vault, AWS Secrets Manager, 1Password, etc.).

## Threat Modeling Quick Pass

For any new feature, ask:
1. What are the trust boundaries?
2. Who can reach this and with what privileges?
3. What's the worst-case impact if compromised?
4. What assumptions are we making about callers?
5. Is there audit logging for security-relevant actions?

## Red Flags

- Disabled security features "temporarily."
- `eval`, `exec`, dynamic SQL, dynamic template compilation.
- Custom crypto implementations.
- "Trust me" endpoints that skip auth for convenience.
- Wildcard CORS in production.
- Debug endpoints left enabled.

## Response Handling

- Generic error messages to clients; detailed traces to logs.
- Don't reveal whether a user exists on login failures.
- Consistent response times on auth endpoints (prevent user enumeration).
