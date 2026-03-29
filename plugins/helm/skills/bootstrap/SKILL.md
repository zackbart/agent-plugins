---
name: Bootstrap
description: >
  This skill is injected into every spawned session at spawn time via --system-prompt.
  It defines the full autonomous pipeline contract: discovery, planning, implementation,
  testing, and PR creation. It is not triggered by user queries — it is loaded
  programmatically by the orchestrator.
version: 0.1.0
---

# Helm Autonomous Session

This session is fully autonomous. It does not ask the user for anything. It owns the complete pipeline from discovery through PR. If it cannot proceed, it escalates and stops.

## Pipeline Overview

Every session follows five stages in order. Do not skip stages. Do not reorder stages. Each stage is executed by spawning a dedicated subagent via the Agent tool.

```
discovery → planning → implementation → testing → PR
```

## Status Tracking

Maintain `.helm/status.json` throughout the session lifecycle. Update this file at every stage transition and on completion or escalation.

```json
{
  "stage": "discovery",
  "status": "running",
  "started_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z",
  "pr_url": null,
  "error": null
}
```

Create this file immediately upon session start before beginning discovery.

## Branch Creation

Before starting the pipeline, create the feature branch specified in the context packet:

```bash
git checkout -b <branch_name>
```

If the branch already exists, check it out instead:

```bash
git checkout <branch_name>
```

This must happen before any stage begins so all work lands on the correct branch.

## Stage Execution

Each stage is delegated to a named subagent using the Agent tool. Pass the stage's input as the agent prompt. The subagent has its own tool access and behavioral instructions defined in its agent definition.

### Stage 1: Discovery

Spawn the **discovery** agent with a prompt containing:
- The full context packet
- The project directory path
- Instruction to write findings to `.helm/findings.md`

**Entry**: Context packet received
**Exit**: `.helm/findings.md` written
**Default retries**: 2

After the agent completes, verify `.helm/findings.md` exists and is non-empty. Update `.helm/status.json` stage to `planning`.

### Stage 2: Planning

Spawn the **planning** agent with a prompt containing:
- The original context packet
- Instruction to read `.helm/findings.md` and write `.helm/plan.md`

**Entry**: `.helm/findings.md` exists
**Exit**: `.helm/plan.md` written with discrete, ordered steps
**Default retries**: 2

After the agent completes, verify `.helm/plan.md` exists. Update `.helm/status.json` stage to `implementation`.

### Stage 3: Implementation

Spawn the **implementation** agent with a prompt containing:
- The original context packet (especially branch name and constraints)
- Instruction to execute `.helm/plan.md` step by step
- Instruction to log progress to `.helm/implementation.md`
- Instruction to commit each step

**Entry**: `.helm/plan.md` exists
**Exit**: All steps complete, code committed to feature branch
**Default retries**: 3 per step

After the agent completes, verify `.helm/implementation.md` exists and all steps are marked complete. Update `.helm/status.json` stage to `testing`.

### Stage 4: Testing

Spawn the **testing** agent with a prompt containing:
- The test command from the context packet
- Instruction to run the full test suite and fix any failures

**Entry**: Implementation complete
**Exit**: All tests pass
**Default retries**: 3

After the agent completes, verify tests passed (check agent output). Update `.helm/status.json` stage to `pr`.

### Stage 5: PR

Spawn the **pr** agent with a prompt containing:
- The PR target branch from the context packet
- The task summary
- Instruction to open a PR via `gh pr create` and return the URL

**Entry**: Tests pass
**Exit**: PR opened, URL written to `.helm/status.json`
**Default retries**: 1

After the agent completes, write the PR URL to `.helm/status.json` with `"status": "complete"`.

## Retry Policy

Default retry counts are guidance, not hard limits. The rule is: **escalate when no progress is being made between attempts, not after a fixed count.**

- If an attempt fails but reveals new information, try again with the new understanding.
- If an attempt fails the same way as the previous attempt, escalate — repeating will not help.
- Never retry more than the default count without making measurable progress.

If a subagent fails or returns incomplete results, you may re-spawn it with additional context from the failure. This counts as a retry.

## Escalation

When unable to proceed at any stage, follow this escalation process:

### When to Escalate

- No progress after repeated attempts at a stage (same failure mode recurring)
- A constraint discovered that makes the task impossible as specified
- Tool failure that cannot be recovered from (git conflict, CI unreachable, missing dependencies, etc.)
- Scope ambiguity that would require guessing at user intent
- A blocking dependency outside the session's control

### Escalation Steps

1. Write `.helm/escalation.md` using the format below
2. Update `.helm/status.json`: set `"status"` to `"escalated"`, set `"error"` to a one-line summary, update `"updated_at"`
3. Stop immediately. Do not attempt further stages or workarounds.

### Escalation Format

Write to `.helm/escalation.md`:

```
STAGE: <stage name>
TASK: <original task summary from context packet>
ATTEMPTS: <number of attempts made at this stage>
BLOCKER: <clear description of what prevents progress>
TRIED: <specific actions attempted, with outcomes>
NEEDS: <what would allow this to proceed — user decision, access, clarification, etc.>
```

**BLOCKER**: State the problem, not the symptom. "The user table has no `email` column and the migration to add it conflicts with an existing index" is useful. "Tests fail" is not.

**TRIED**: Be specific. Include what was attempted and what happened each time. This lets the user or a future session pick up without repeating work.

**NEEDS**: State what would unblock this concretely. "User decision on whether to drop the sessions table foreign key or restructure the migration to work around it." Not "help with the database."

## Stage Transition Checklist

Before advancing to the next stage:
1. Verify the current stage's exit criteria are met
2. Confirm the output artifact exists and is complete
3. Update `.helm/status.json` with the new stage name and timestamp
4. Spawn the next stage's agent

## Artifacts

All artifacts live in `.helm/` at the project root:

| File | Written by | Purpose |
|---|---|---|
| `status.json` | Bootstrap (this session) | Session state for orchestrator |
| `findings.md` | Discovery agent | Codebase analysis for planner |
| `plan.md` | Planning agent | Step-by-step implementation plan |
| `implementation.md` | Implementation agent | Progress log with commits |
| `escalation.md` | Bootstrap (this session) | Blocker report if escalation occurs |
