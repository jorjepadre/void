---
id: agentic/self-repair
name: Self-Repair
version: "1.0.0"
description: Error detection, diagnosis, and recovery patterns for resilient agents.
language: null
tags: [agent, resilience, recovery, error-handling]
depends_on: []
capabilities: [error-recovery, diagnosis, resilience]
parameters: []
tools: []
constraints: []
---

# Self-Repair

Patterns for agents that detect their own failures, diagnose them, and recover without human intervention when possible.

## Detection

The agent must *know* when something is wrong. Signals:
- Tool call returned an error code.
- Output didn't match expected shape or content.
- Post-condition checks failed.
- Environment diverged from expected state.
- Timeouts, rate limits, transient errors.

Silent failures are the worst. Verify every meaningful step.

## Classification

Before repairing, classify the failure:

- **Transient** — network blip, rate limit, race. Retry.
- **Environmental** — missing dependency, wrong path, permission. Fix or escalate.
- **Logical** — wrong approach, bad assumption. Revise plan.
- **Structural** — task is impossible as stated. Escalate.

Misclassification wastes effort. A logical bug retried endlessly is a loop.

## Repair Strategies

### Retry
- Only for transient failures.
- With backoff (exponential + jitter).
- Bounded attempts.
- Idempotent operations only.

### Alternative Path
- Different tool achieving the same result.
- Different decomposition of the task.
- Known workaround for a specific failure mode.

### Re-plan
- Current plan doesn't fit reality. Throw it out.
- Re-observe state, regenerate plan.
- Preserve what's already completed correctly.

### Undo
- Roll back partial changes to a consistent state.
- Then retry or re-plan from there.
- Requires tracking what was changed.

### Escalate
- Agent lacks the information, authority, or capability to proceed.
- Present: what failed, what was tried, what's needed.

## Post-Condition Checks

After every step:
- Read back what was written.
- Run tests if code was changed.
- Query state if database was updated.
- Hit health endpoints if services restarted.

Trust the system state, not the tool's success claim.

## Idempotency

Make operations idempotent so retries are safe:
- Upsert instead of insert.
- Check-then-act or compare-and-swap.
- Use idempotency keys for external APIs.

## State Tracking

Keep a log of actions and outcomes. When repair is needed:
- Where did we diverge from the plan?
- What's the last known good state?
- What actions are safe to retry?

## Loop Detection

Self-repair must not loop:
- Track repair attempts per failure signature.
- Detect when the same failure keeps recurring.
- Escalate after N attempts on the same signature.

Signature: error type + operation + key inputs. Not the full error message (which changes with timestamps etc.).

## Graceful Degradation

When full recovery isn't possible:
- Complete what can be completed.
- Report partial success honestly.
- Leave the system in a consistent, recoverable state.
- Never claim success for partial work.

## Anti-Patterns

- Catching and ignoring errors.
- Retrying non-idempotent operations.
- Infinite retry loops without backoff or caps.
- Proceeding past a failure on the assumption "it'll probably work out."
- Hiding failures in logs.

## Reporting

When repair succeeds, log:
- What failed.
- How it was diagnosed.
- Which repair worked.

When repair fails, surface:
- Timeline of failures and repair attempts.
- Current state of the system.
- What human intervention is needed.

## Learning From Failures

Every failure is a lesson:
- Add the failure signature to known patterns.
- Record the repair that worked.
- Update detection to catch it earlier next time.
