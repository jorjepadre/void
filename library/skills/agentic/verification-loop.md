---
id: agentic/verification-loop
name: Verification Loop
version: "1.0.0"
description: Generator-checker pattern for verifying agent outputs against criteria.
language: null
tags: [agent, verification, quality, checker]
depends_on: []
capabilities: [verification, quality-gate]
parameters: []
tools: []
constraints: []
---

# Verification Loop

A pattern that separates generation from checking — the generator produces, the checker judges, and iteration closes the gap.

## Why Separate Checker

Generators are optimized to produce plausible output. Checkers are optimized to find flaws. When the same agent generates and evaluates, it anchors on its own output. A distinct checker role surfaces issues the generator missed.

## Loop Structure

```
for attempt in range(max_attempts):
    output = generator.produce(task, feedback)
    verdict = checker.evaluate(output, criteria)
    if verdict.passes:
        return output
    feedback = verdict.reasons
return best_so_far
```

## Checker Design

The checker should:
- Apply explicit, enumerable criteria.
- Return a structured verdict: pass/fail per criterion.
- Cite specific problems with pointers (line, section, test name).
- Suggest what would fix each failure.

The checker should not:
- Rewrite the output.
- Accept partial passes silently.
- Rubber-stamp after fatigue.

## Criteria Authoring

Good criteria are:
- **Verifiable** — can produce a yes/no answer.
- **Independent** — one thing per criterion.
- **Weighted** — mark which are blocking vs advisory.
- **Scoped** — about this output, not tangential quality.

Examples:
- "All tests pass when the suite is run."
- "No new lint warnings introduced."
- "Every new public function has a doc comment."
- "Error paths are tested."

## Iteration Strategy

- Pass feedback back to the generator as structured text, not free-form.
- Limit attempts (3–5) to avoid loops on unfixable issues.
- Track which criteria flip between attempts — if a criterion keeps failing and passing, the generator is thrashing.

## When the Generator Can't Satisfy

- Criterion may be too strict or ambiguous — refine it.
- Generator may lack context — provide more.
- Task may be beyond current capability — escalate.

## Multi-Level Checking

For complex outputs, layer checkers:
1. Syntactic (parses, compiles).
2. Static (types, lints, security scans).
3. Semantic (tests pass, behaves correctly).
4. Structural (architecture, conventions).
5. Stylistic (readability, idiom).

Fail fast: higher layers only run if lower layers pass.

## Self-Checking Within the Generator

Before handing off to an external checker:
- Generator runs a quick self-review against the criteria.
- Catches obvious mistakes cheaply.
- Not a substitute for an independent checker.

## Logging and Learning

- Record every verdict: which criteria failed, on which attempt.
- Analyze trends: which criteria fail most often?
- Feed back into generator prompts or training.

## Common Pitfalls

- Checker too lenient — passes broken output.
- Checker too strict — infinite rejection on tolerable imperfections.
- Feedback too vague — generator can't act on it.
- No cap on iterations — runaway loops.
- Checker and generator share bias (same model, same prompt lineage).

## Pairing with GAN-Style Harness

The verification loop is the backbone of adversarial quality loops: a generator pushes, a checker pushes back, and the output converges to meet real criteria.
