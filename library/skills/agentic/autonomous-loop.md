---
id: agentic/autonomous-loop
name: Autonomous Task Loop
version: "1.0.0"
description: Self-directed loops for agents to decompose, execute, and verify tasks.
language: null
tags: [agent, autonomous, loop, orchestration]
depends_on: []
capabilities: [task-decomposition, self-direction, verification]
parameters: []
tools: []
constraints: []
---

# Autonomous Task Loop

A pattern for agents that decompose a goal, execute steps, and verify outcomes without constant supervision.

## Core Loop

```
while not done:
    1. Observe — gather state relevant to the goal
    2. Plan — decide the next step (or revise the plan)
    3. Act — execute one step via tools
    4. Verify — check outcome against expected effect
    5. Reflect — update plan, retry, or mark done
```

Each iteration is small enough to recover from. Never make an irreversible commit without verification.

## Preconditions

Before starting the loop, the agent should have:
- A clear goal stated as an outcome, not a procedure.
- Explicit success criteria (tests to pass, files present, metrics met).
- Defined tool set with scoped permissions.
- A budget (time, iterations, or cost).

## Planning

- Decompose into leaf tasks the agent can execute in one tool call.
- Prefer a shallow plan refined over time to a deep plan committed upfront.
- Keep a todo list externalized — it doubles as memory when the context fills.

## Acting

- One verifiable action per step.
- Use idempotent operations where possible.
- For destructive operations (delete, overwrite, deploy), require explicit preconditions.

## Verifying

Every step ends with verification:
- File change → read back and confirm content.
- Test run → parse results, not "it probably passed."
- Build → check exit code and output.
- Deploy → hit health endpoint.

Unverified success is a failure mode.

## Reflection

When a step fails:
1. Classify: transient vs persistent, environment vs logic.
2. Decide: retry, adjust, escalate, abort.
3. Update the plan with what was learned.

When a step succeeds but doesn't move the goal, revisit the plan — the hypothesis was wrong.

## Stopping Conditions

Stop when:
- Success criteria all met.
- Budget exhausted.
- Stuck (same failure twice in a row with no new information).
- Human input required (blocked on external decision).

Never loop forever on the same error.

## Memory

- Persist decisions and outcomes across iterations.
- Summarize long traces to fit context.
- Keep a running "what I tried and why it failed" log to avoid repetition.

## Safety Rails

- Bounded iterations per goal.
- Require explicit confirmation for high-impact actions.
- Whitelist tool actions per task type.
- Dry-run mode for planning without side effects.

## Escalation

When the agent can't proceed:
- Explain clearly what was tried, what failed, and why.
- Present options with trade-offs.
- Ask one specific question rather than a vague "help."

## Anti-Patterns

- Planning the entire solution before executing anything.
- Skipping verification because "it should work."
- Retrying the same failing action without change.
- Losing track of what was done across context windows.
- Proceeding past partial failures.

## Evaluation

Track per task:
- Time to completion.
- Iteration count.
- Tool calls and cost.
- Verification pass rate.
- Intervention rate (human assists per task).

Improve loops by examining intervention triggers — those are the loop's weaknesses.
