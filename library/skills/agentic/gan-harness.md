---
id: agentic/gan-harness
name: GAN-Style Quality Harness
version: "1.0.0"
description: Adversarial generator-critic loop for iteratively improving output quality.
language: null
tags: [agent, gan, adversarial, quality]
depends_on: [agentic/verification-loop]
capabilities: [adversarial-critique, quality-improvement]
parameters: []
tools: []
constraints: []
---

# GAN-Style Quality Harness

An adversarial loop: a **generator** produces artifacts, a **critic** attacks them, and iteration drives quality up.

## Why Adversarial

Generators trained on "make it look good" converge on the plausible. A critic trained on "find what's wrong" looks for concrete flaws. Setting them against each other exposes weaknesses a single pass would miss.

## Roles

### Generator
- Produces a candidate artifact (code, plan, document).
- Reads the critic's feedback from the previous round.
- Revises — doesn't rewrite from scratch unless structurally necessary.

### Critic
- Hunts for the strongest attack: what fails, what's fragile, what's missing.
- Ranks issues by severity.
- Is encouraged to be harsh — better to over-criticize than under.

### Judge (optional)
- Decides when to stop: enough issues fixed, diminishing returns, budget hit.
- Breaks ties when generator and critic disagree on whether an issue is real.

## Loop

```
artifact = generator.produce(task)
for round in range(max_rounds):
    attacks = critic.attack(artifact)
    if not attacks.any_blocking():
        return artifact
    artifact = generator.revise(artifact, attacks)
return artifact
```

## Attack Categories

A good critic looks across axes:
- **Correctness** — edge cases, wrong outputs, off-by-one.
- **Robustness** — what breaks under noise, failure, unusual inputs.
- **Security** — injection, auth bypass, leakage.
- **Maintainability** — confusing names, tight coupling, hidden state.
- **Performance** — worst case, memory, IO.
- **Assumptions** — what's implicitly assumed that could be wrong.

## Driving Hard Critique

Prompt the critic explicitly: "Find the strongest case against this. Assume it's flawed until proven otherwise. List concrete failure modes."

Soft prompts produce soft critiques.

## Calibration

Without a grounded reference, critics drift — either infinitely demanding or rubber-stamping. Calibrate with:
- Canonical examples of "ship" and "reject."
- External oracles (tests, linters, static analysis) feeding the critic facts.
- Multiple critics with diverse focuses; require quorum or rotate.

## Stop Conditions

- No blocking issues remain.
- Last N rounds made no progress.
- Budget exhausted.
- Generator explicitly concedes — critic found an unfixable flaw in the approach.

## Escalation From the Harness

When the loop doesn't converge, output:
- The final artifact.
- The unresolved critique.
- What was tried.
- Recommended next action (redesign, human review, accept risk).

## Integration Points

- Pre-commit on generated code.
- Plan review before execution.
- Document quality gates.
- Architectural decision validation.

## Common Pitfalls

- Same underlying model as generator and critic → same blind spots.
- Critic rewards itself for severity, leading to nitpicking noise.
- Generator learns to satisfy the critic without fixing real issues.
- No external ground truth → drift.

## Metrics

- Rounds to convergence.
- Blocking issues found per round (should decrease).
- Post-ship defect rate vs issues the critic caught.
- Agreement rate between independent critics.
