# Helm Plugin Spec

A Claude Code plugin for orchestrating fully autonomous agent sessions that take a task from discovery through to a merged PR without human interaction.

---

## Overview

Helm has two distinct layers:

1. **The Orchestrator** — a persistent Claude Code session the user talks to. It receives intent, spawns sessions, tracks their status, and surfaces completions or escalations. It never does implementation work.

2. **Spawned Sessions** — fully autonomous Claude Code sessions started in project directories. Each owns the full pipeline from discovery to PR. They never interact with the user directly.

These two layers are structurally separated: the orchestrator lives in its own directory, spawned sessions live in project directories.

---

## Directory Structure

```
helm/
├── CLAUDE.md                        # Orchestrator identity and routing
├── skills/
│   ├── orchestrator/
│   │   └── SKILL.md                 # Orchestrator behavior and spawn instructions
│   ├── bootstrap/
│   │   └── SKILL.md                 # Injected into every spawned session at start
│   └── escalation/
│       └── SKILL.md                 # Shared escalation format across all subagents
├── agents/
│   ├── discovery.md                 # Discovery subagent definition
│   ├── planning.md                  # Planning subagent definition
│   ├── implementation.md            # Implementation subagent definition
│   ├── testing.md                   # Testing subagent definition
│   └── pr.md                        # PR subagent definition
├── hooks/
│   └── post-spawn.sh               # Logs session state after orchestrator spawns
├── schemas/
│   └── context-packet.md           # Required fields for spawning a session
└── status/
    └── .sessions                    # Runtime file tracking active sessions and stages
```

---

## CLAUDE.md

The orchestrator CLAUDE.md is a lean routing table. It does two things: establishes identity, and loads the orchestrator skill.

```markdown
# Helm Orchestrator

You are the orchestrator. Read skills/orchestrator/SKILL.md before doing anything else.
```

That's it. All behavior lives in the skill.

---

## Skills

### orchestrator/SKILL.md

Defines the orchestrator's identity, constraints, and how to spawn a session.

**Identity**
- This session is the orchestrator. It does not write code, run tests, read codebases, or solve problems.
- Every user request results in a new Claude Code session. No exceptions.
- The orchestrator's only jobs: understand intent, build a context packet, spawn a session, track status, report back.

**Spawning a session**
1. Build a context packet (see schemas/context-packet.md)
2. Shell out via bash: `cd <project_dir> && claude --system-prompt "$(cat skills/bootstrap/SKILL.md)" "<task_summary>"`
3. Log the session to status/.sessions with: session ID, project dir, task summary, stage (discovery), timestamp

**Tracking**
- Read status/.sessions to report on active sessions when the user asks
- Check `.helm/status.json` in the target project directory to determine session state
- When a session escalates (status is `escalated`), surface `.helm/escalation.md` to the user and await instruction
- When a session completes (status is `complete`), notify the user with a summary and PR link from status.json

**Constraints**
- No bash commands against project directories (except reading `.helm/status.json`)
- No file reads outside the helm directory (except `.helm/` in target projects)
- No code generation of any kind

---

### bootstrap/SKILL.md

Injected into every spawned session at spawn time via `--system-prompt`. Defines the full pipeline contract.

**Identity**
- This session is fully autonomous. It does not ask the user for anything.
- It owns the complete pipeline: discovery → plan → implement → test → PR.
- If it cannot proceed, it escalates to the orchestrator using the escalation format, then stops.

**Pipeline stages**

Each stage has entry criteria, exit criteria, and a default retry budget. Retries are guidance, not hard limits — escalate when no progress is being made between attempts, not after a fixed count.

| Stage | Entry | Exit | Default retries |
|---|---|---|---|
| Discovery | Context packet received | Findings document written | 2 |
| Planning | Findings document exists | Implementation plan written with discrete steps | 2 |
| Implementation | Plan exists | All steps complete, code committed | 3 per step |
| Testing | Implementation complete | All tests pass | 3 |
| PR | Tests pass | PR open with description | 1 |

**On exhausting retries**
Use escalation/SKILL.md to report the blocker to the orchestrator. Include stage, attempts made, and what is needed to proceed. Then stop.

**Stage transitions**
Each stage writes its output to a known file in the project's `.helm/` directory so the next stage has a clear handoff artifact.

```
.helm/
├── status.json        # Session state (stage, status, pr_url, error)
├── findings.md        # Discovery output
├── plan.md            # Planning output
├── implementation.md  # Step-by-step log updated as implementation progresses
└── escalation.md      # Written if escalation occurs
```

**Status tracking**
The spawned session maintains `.helm/status.json` throughout its lifecycle:

```json
{
  "stage": "discovery|planning|implementation|testing|pr",
  "status": "running|complete|escalated",
  "started_at": "<ISO timestamp>",
  "updated_at": "<ISO timestamp>",
  "pr_url": "<url, set when PR is opened>",
  "error": "<summary, set on escalation>"
}
```

Update this file at every stage transition and on completion or escalation. This is how the orchestrator knows what happened.

---

### escalation/SKILL.md

Shared across all stages. Defines a standard format for surfacing a blocker.

**When to escalate**
- No progress after repeated attempts at a stage
- Discovered a constraint that makes the task impossible as specified
- Tool failure that cannot be recovered from (git conflict, CI down, etc.)
- Scope ambiguity that would require guessing at user intent

**Escalation format**
Write to `.helm/escalation.md`:

```
STAGE: <stage name>
TASK: <original task summary>
ATTEMPTS: <n>
BLOCKER: <clear description of what went wrong>
TRIED: <what was attempted>
NEEDS: <what would allow this to proceed>
```

Then update `.helm/status.json` with `"status": "escalated"` and a brief `"error"` summary. The orchestrator will pick this up on its next status check.

---

### agents/discovery.md

- **Tool access**: Read-only. No writes, no bash commands that modify state.
- **Input**: Context packet
- **Job**: Explore the codebase, understand the relevant surface area, identify dependencies, constraints, and gotchas.
- **Output**: `findings.md` — structured document covering relevant files, current behavior, and anything the planner needs to know.

---

### agents/planning.md

- **Tool access**: Read-only.
- **Input**: `findings.md`
- **Job**: Produce a concrete, discrete implementation plan. Steps should be small enough that each one is independently verifiable.
- **Output**: `plan.md` — ordered list of steps with expected outcomes per step.

---

### agents/implementation.md

- **Tool access**: Full read/write. Bash access scoped to project directory.
- **Input**: `plan.md`
- **Job**: Execute the plan step by step. Log progress to `implementation.md` as steps complete. Do not spawn sub-subagents — execute all steps sequentially within this session.
- **Output**: All steps complete, code committed to a feature branch.

---

### agents/testing.md

- **Tool access**: Read/bash. Scoped to running the test suite.
- **Input**: Committed implementation
- **Job**: Run the full test suite. Interpret failures. Attempt fixes within budget. Commit fixes.
- **Output**: All tests passing.

---

### agents/pr.md

- **Tool access**: Bash (git/gh CLI only).
- **Input**: Passing test suite, feature branch
- **Job**: Open a PR with a clear title, description that summarizes what changed and why, and links to relevant context.
- **Output**: Open PR URL written to `.helm/status.json`.

---

## Hooks

### post-spawn.sh (PostToolUse)

Fires after the orchestrator uses bash to spawn a session. Appends a record to `status/.sessions`:

```
<timestamp> | <project_dir> | <task_summary> | stage:discovery
```

Gives the orchestrator a persistent state board it can read without relying on conversation memory.

---

## Schemas

### schemas/context-packet.md

Required fields the orchestrator must populate before spawning a session. The spawned session cannot run autonomously without all of these.

| Field | Description |
|---|---|
| `task` | Clear description of what needs to be done |
| `project_dir` | Absolute path to the project directory |
| `success_criteria` | What done looks like — tests pass, specific behavior works, etc. |
| `constraints` | Anything the session must not do — touch certain files, change APIs, etc. |
| `branch_name` | Feature branch to work on |
| `test_command` | How to run the test suite |
| `pr_target` | Branch the PR should target |

The orchestrator is responsible for extracting or inferring these from the user's request before spawning. If any required field cannot be determined, it asks the user before spawning.

---

## What This Plugin Is Not

- It does not replace motif. Motif is for augmenting how you work with Claude Code directly. Helm is for fully autonomous sessions that run without you.
- It does not include any custom scripts. All execution goes through Claude Code's native bash tool using standard CLI commands.
- It does not persist agent memory across sessions. Each spawned session is fresh. Context comes from the context packet and the `.helm/` handoff artifacts.
