---
id: domains/audit-verification
name: Audit Finding Verification
version: "1.0.0"
description: Methodology for verifying security findings before reporting them, to eliminate false positives.
language: null
tags: [security, audit, verification, review]
depends_on: []
capabilities: [finding-verification, false-positive-elimination]
parameters: []
tools: []
constraints: []
---

# Audit Finding Verification

Methodology for confirming that a suspected security finding is real before
reporting it. Designed to drive false-positive rates toward zero.

## Why This Skill Exists

Pattern-matching audits produce noise. A reviewer who flags every use of
`private` or every call to `new Wallet()` creates more work than they save.
This skill trains the reviewer to trace code paths end-to-end and only
surface findings with demonstrable impact.

## The Verification Loop

For every candidate finding:

### 1. Read the surrounding context
Do not stop at the flagged line. Read:
- The full function containing it
- The function's callers (at least one level up)
- Any middleware, decorators, or wrappers that process the data

### 2. Identify the data flow
Answer these questions explicitly:
- **Source**: Where does this data originate?
- **Transformations**: What happens to it between source and sink?
- **Sink**: Where does it end up?

Sources ranked by trust:
1. Hardcoded literals — trusted
2. Environment variables — trusted (assumed protected by deployment)
3. Internal config files — trusted
4. Internal APIs — mostly trusted
5. Database reads — conditionally trusted
6. External API responses — untrusted (validate shape)
7. User input — untrusted (always validate)

Sinks ranked by risk:
1. Stdout/stderr logs — moderate (can leak secrets)
2. Files on disk — moderate to high
3. Database writes — moderate
4. External API calls — moderate to high
5. Shell execution — critical
6. Dynamic code evaluation (`eval`, `Function`) — critical

### 3. Construct the exploit scenario
Write the attack out as a single sentence:
> "An attacker with [capability X] could [action Y] which would [impact Z]."

If you can't fill in the blanks with specifics, the finding is theoretical
and should either be downgraded to "info" or dropped.

### 4. Check for existing mitigations
Before claiming "missing X", prove X isn't present:
- Grep for validation patterns (`if`, `throw`, `return`, `guard`)
- Check middleware chains
- Look for library-level protections (ORMs, template engines with auto-escape)
- Check CSP / security headers at the framework level

### 5. Challenge your own finding
Ask:
- "What's the best argument against this being a finding?"
- "What runtime guarantees apply here?" (single-threaded, same-origin, etc.)
- "Does this code pattern exist elsewhere in the codebase? Is it flagged?"

## Common False Positives

Keep this list in mind. When you see these patterns, verify carefully before
flagging.

### Secrets Handling

| Pattern | Why it's often a false positive |
|---------|--------------------------------|
| `config.apiKey = requireEnv('API_KEY')` | Loading from env is correct |
| `new Client(config.secret)` | Passing to library constructor is correct |
| `this.key = key` (private field) | Class encapsulation is fine |
| `private readonly _key: string` | TypeScript private is adequate |

Only a real finding if the key is:
- Written to logs (`logger.info({...key...})`)
- Sent to external services beyond the intended recipient
- Written to disk unencrypted
- Embedded in error messages returned to clients
- Present in stack traces sent to monitoring

### Concurrency

| Pattern | Why it's often a false positive |
|---------|--------------------------------|
| `if (set.has(x)) return; set.add(x);` | Atomic in single-threaded JS (no await between) |
| `let counter++` on shared state | Only risky if async code yields mid-operation |
| `this.cache = { ...this.cache, ...new }` | Fine unless concurrent awaits exist |

Real race condition requires:
- An `await` between the check and the mutation
- Multiple call sites that can execute concurrently (Promise.all, event handlers)
- Shared mutable state visible across invocations

### Input Validation

| Pattern | Why it's often a false positive |
|---------|--------------------------------|
| Code has `if (x < 0 \|\| x > 100) throw` | It IS validated |
| TypeScript `param: number` | Compile-time type guarantee at the boundary |
| ORM method like `User.findById(id)` | ORM parameterizes the query |
| React `{userContent}` in JSX | Auto-escaped by React |

Real missing validation requires:
- No bounds/type/format check in the function
- No middleware that validates upstream
- No framework-level auto-escape for the sink

### Default Safety

| Pattern | Why it's often a false positive |
|---------|--------------------------------|
| `DRY_RUN` defaults to true | Safe-by-default is correct design |
| `READ_ONLY` defaults to true | Safe-by-default is correct design |
| `requireEnv(KEY)` when mode is "production" | Forces explicit opt-in |
| `confirm = false` by default | Good UX |

### Error Handling

| Pattern | Why it's often a false positive |
|---------|--------------------------------|
| `.catch(err => log.error(err))` on notification send | Cosmetic, don't crash main flow |
| `try { } catch { return null; }` for optional lookups | Valid "absent = null" pattern |
| `Promise.allSettled(...)` | Explicitly ignoring individual failures |

## Finding Quality Checklist

Before reporting, every finding must have:

- [ ] File path with line number
- [ ] Severity with justification
- [ ] Full data flow traced (source → sink)
- [ ] Concrete exploit scenario written as a sentence
- [ ] Attacker prerequisites listed
- [ ] Existing mitigations explicitly ruled out
- [ ] "Why this isn't a false positive" paragraph
- [ ] Concrete fix with code sample

## Severity Calibration

Err on the side of LOWER severity when verification is uncertain.

- **Critical**: exploited in the wild OR trivially exploitable with high impact
- **High**: realistic path to significant harm, worth pausing to fix
- **Medium**: plausible exploit with specific conditions, schedule for next sprint
- **Low**: hardening that improves resilience, no current exploit path
- **Info**: observation, not an action item

## When to Drop a Finding

Drop it if any of these are true:
- You can't write a concrete exploit sentence
- The "vulnerability" is prevented by language/runtime guarantees
- Existing mitigations fully address the concern
- The "fix" would add complexity without reducing risk
- A senior security engineer would push back on the finding

Dropping a finding is not failure. Reporting a fake finding is.
