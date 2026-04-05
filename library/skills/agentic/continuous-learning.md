---
id: agentic/continuous-learning
name: Continuous Learning
version: "1.0.0"
description: Extracting patterns and lessons from sessions to improve future agent runs.
language: null
tags: [agent, learning, memory, patterns]
depends_on: []
capabilities: [pattern-extraction, memory, adaptation]
parameters: []
tools: []
constraints: []
---

# Continuous Learning

A pattern for agents to extract reusable lessons from sessions and apply them to future work.

## Why It Matters

Without learning, each session starts cold. The agent repeats mistakes, re-discovers context, and misses patterns that would have saved time. Continuous learning turns sessions into durable improvements.

## Capture

At meaningful moments, record:
- **Successes** — what worked, with enough context to repeat.
- **Failures** — what failed, why, what fixed it.
- **Decisions** — choices made and the reasoning.
- **Context** — environment, tool versions, constraints.

Timing matters. Capture immediately — memories fade fast.

## Structure

Store each lesson as a structured record:

```yaml
- id: <unique>
  context: <when this applies>
  observation: <what happened>
  lesson: <what to do next time>
  tags: [category, area]
  source: <session id / date>
```

Tags enable retrieval. Keep them consistent.

## Retrieval

Before acting on a new task:
1. Identify task type and context.
2. Retrieve relevant lessons.
3. Apply before generating a plan.

Retrieval precision matters more than recall. Too many irrelevant lessons pollutes context.

## Consolidation

Over time, lessons overlap or conflict. Periodically:
- Merge duplicates.
- Resolve contradictions with updated evidence.
- Promote frequently-used lessons to higher visibility.
- Retire obsolete lessons (tool changed, API deprecated).

## Pattern Extraction

Beyond individual lessons, extract patterns:
- Recurring sequences of actions that succeed (playbooks).
- Common failure modes (anti-patterns).
- Tools frequently used together.
- Context signals that predict task difficulty.

Patterns are second-order learning.

## Feedback Loops

For each task:
1. Did applied lessons help?
2. What new lessons emerged?
3. What lessons were wrong or incomplete?

Track lesson-outcome correlation. Lessons that never correlate with success get demoted.

## Integration Points

- Before planning: retrieve relevant lessons.
- During execution: match current state against known patterns.
- After completion: capture new lessons.
- Periodically: consolidate.

## Avoiding Pitfalls

- **Overfitting** — a lesson from one context applied to all.
- **Stale lessons** — APIs changed, lesson obsolete.
- **Lesson spam** — every trivial observation stored.
- **No retrieval** — lessons captured but never used.
- **Brittle tags** — inconsistent taxonomy makes retrieval useless.

## What's Worth Remembering

High-value lessons are:
- Non-obvious (the surprise matters).
- Reusable (applies to a class of tasks, not one).
- Actionable (changes behavior next time).
- Costly to rediscover.

Trivia isn't worth storing.

## Metrics

- Lesson hit rate (retrieved and used per task).
- Rediscovery rate (lessons that would have applied but weren't retrieved).
- Time-to-value on tasks with vs without learning applied.
- Lesson aging: how quickly they become obsolete.

## Privacy and Safety

- Strip secrets and PII from captured lessons.
- Scope lessons to project or user when appropriate.
- Audit what's stored.
