---
name: dev
description: >
  Personal development workflow orchestrator. Use when starting any development
  task — bug fixes, features, refactors, or explorations. Runs a 4-stage process:
  Research, Plan, Build, Validate. The plan is the single approval gate — once
  approved, everything else runs autonomously.
license: MIT
compatibility: >
  Works with any agent that supports the Agent Skills standard. On Claude Code,
  stages delegate to dedicated subagents (researcher, critic, builder, validator)
  for rigorous execution. Without subagent support, the orchestrator handles all
  stages directly.
metadata:
  author: zackbart
  version: "0.9.2"
argument-hint: "<task description> [--critic codex|cursor|claude|skip] [--auto] | --resume"
allowed-tools: "Read, Grep, Glob, Bash, Write, Edit, Agent, TaskCreate, TaskUpdate, TaskList, TaskGet, AskUserQuestion"
---

# Motif Development Workflow

4-stage development process: Research → Plan → Build → Validate. The plan is the single approval gate. Once approved, Build and Validate run autonomously.

## Resume Support

If the argument is `--resume`, check for `.motif/state.json`:
- If it exists, read it and `.motif/context.md`. For Build-stage resumes, check which builder output files (`.motif/builder-*-output.md`) exist to determine completed tasks. Present the saved state and offer to resume or start fresh (starting fresh deletes `.motif/` first).
- If it doesn't exist, tell the user there's no workflow to resume.

On any new workflow start, delete `.motif/` if it exists from a previous run.

## Argument Parsing

Parse optional flags from the argument string (flags and natural language are equivalent):

- **Critic:** `--critic codex|cursor|claude|skip` or "use claude critic", "skip the critic"
- **Auto-approve:** `--auto` or "auto approve", "just run it", "hands off"

Strip configuration to get the raw task description. Store parsed values in `.motif/state.json`.

## Workflow Initialization

1. Create `.motif/` directory
2. Write `.motif/.active` (empty flag file)
3. Write `.motif/state.json`:
   ```json
   { "stage": "research", "task": "<description>", "complexity": null, "startedAt": "<ISO>", "autoApprove": false, "criticChoice": null, "tasks": [] }
   ```
4. Write `.motif/context.md` with sections in this fixed order:
   ```markdown
   # Motif Workflow Context
   **Task:** <task description>
   **Started:** <timestamp>
   ## Research
   ## Plan
   ## Tasks
   ```

Suggest adding `.motif/` to `.gitignore` if not already there.

## Complexity Assessment

Assess task complexity:

- **Light** (quick fix, config change): minimal research, brief plan, 1-3 tasks
- **Medium** (feature, moderate refactor): standard research, full plan, 3-8 tasks
- **Heavy** (large refactor, new system): deep research, thorough plan with tradeoffs, 8+ tasks

State your assessment. Update state.json with the complexity.

### Critic Selection (medium/heavy only)

Light tasks always skip the critic.

If `--critic` was provided, use that choice. Otherwise, use `AskUserQuestion` to prompt the user. First, detect which external CLIs are available (check for `codex` and `cursor` in PATH). Then present only the available options:

> **Which critic should review the plan?**
> - **Codex critic (gpt-5.4)** — via Codex CLI *(only shown if codex is installed)*
> - **Cursor critic (gpt-5.4)** — via Cursor Agent CLI *(only shown if cursor is installed)*
> - **Claude critic** — built-in subagent
> - **Skip critic**

This is a configuration step, not a pause point — the only true pause is after Plan.

**Fallback:** If the chosen critic fails for any reason (CLI not found, authentication error, timeout, empty/truncated output), automatically fall back to the Claude critic and note the fallback to the user. Claude critic is the always-available safety net.

---

## Approval Gate

The only pause point is after Plan.

**If `--auto`:** Show the plan summary below, log "Auto-approved", continue to Build.

**Otherwise:** Present the plan at a moderate level of detail — enough for the user to judge correctness without drowning in implementation specifics. Use this format:

> ### Plan Summary
>
> **Approach:** 1-3 sentences on the overall strategy — what's changing and why this approach.
>
> **Changes:**
> - `path/to/file.ext` — what's being done to it (1 line each)
> - `path/to/other.ext` — ...
>
> **Testing:** How the changes will be verified (1-2 lines).
>
> **Tradeoffs:** *(medium/heavy only)* The key alternative considered and why this approach wins (2-3 lines max).
>
> **Critic notes:** *(if critic ran)* Accepted/rejected points in 1 line each. Only list items that changed the plan.
>
> ---
> - **go** — approve and execute
> - **redo** — re-plan with feedback
> - **stop** — end here
>
> Or discuss until satisfied.

Keep it scannable. No code snippets, no implementation details like function signatures or line-by-line diffs — that's the builder's job. The user should be able to read the summary in under 30 seconds and know whether the plan is headed in the right direction.

---

## Stage 1: Research

Read-only codebase exploration. No file modifications.

### Skip Research

Skip the researcher ONLY when ALL of these are true:
1. The task explicitly names all files to change
2. The task is light complexity
3. No integration points need to be discovered

When in doubt, run the researcher — it's cheap. Write a brief summary to `.motif/context.md` under `## Research` from existing knowledge.

### Running Research

Delegate to the researcher subagent with:
- **Task description**
- **Complexity level**
- **Prior context** — summarize relevant info from the conversation (files mentioned, what they've tried, constraints stated) so the researcher doesn't re-discover what you already know

The researcher writes to `.motif/researcher-output.md`. Read that file for findings.

**If the output file doesn't exist**, fall back to the subagent's return message. If that's also empty or truncated, research inline.

Without a researcher subagent, research directly.

### Post-Research

Replace the `## Research` section in `.motif/context.md` with findings. Update state.json stage to `"plan"`.

If research surfaced genuine unknowns (multiple approaches, unclear scope), ask the user before proceeding. Skip for light tasks or clear findings.

---

## Stage 2: Plan

Produce an implementation plan from research findings.

### Ethos Check

Before planning, check if an `ethos/` directory exists in the project root. If it does, read `ethos/vision.md`, `ethos/principles.md`, and `ethos/non-goals.md`. Use these to inform tradeoff analysis, approach selection, and scope decisions in the plan. Don't mention ethos if the directory doesn't exist.

### Plan Contents

- **Approach** — what changes and how (specific techniques, not just "modify X")
- **Files** — created, modified, or deleted
- **Testing** — what to test, how to verify
- **Tradeoffs** (medium/heavy) — alternatives considered, why this wins

Scale depth to complexity. Light = a few sentences. Heavy = alternatives and risks.

### Critic Review (medium/heavy)

Build a complete briefing — the critic starts cold:
1. The plan (full approach, files, techniques)
2. Assumptions
3. Project context (language, framework, primary dependencies, testing framework, conventions from research)
4. File paths the plan touches
5. Tell the critic to read `.motif/context.md`
6. If `ethos/` exists, tell the critic to read it and flag any plan decisions that conflict with stated principles or non-goals

Spawn the chosen critic. It writes to `.motif/critic-output.md`. Read that file.

**If the critic fails** (no output file, empty/truncated return, CLI error) **and the chosen critic was not Claude**: automatically fall back to the Claude critic. Spawn it with the same briefing. Note the fallback to the user (e.g., "Codex critic failed — falling back to Claude critic").

**If the Claude critic also fails** (no output file, empty return): note that the critic review was lost and proceed to the approval gate without it.

Triage each point: **ACCEPT** (state the plan change) or **REJECT** (provide evidence). Update the plan before the approval gate.

### Post-Plan

Replace the `## Plan` section in `.motif/context.md` with the approved plan. Update state.json stage to `"build"`.

---

## Stage 3: Build

**Runs autonomously after plan approval.**

### Task Decomposition

Break the plan into tasks. Use task tracking tools (TaskCreate, TaskUpdate).

- Set dependencies where order matters
- Include tests alongside the code they verify
- Replace the `## Tasks` section in `.motif/context.md` with the task list
- Update state.json `tasks` array: `[{ "id": "task-1", "description": "...", "status": "pending", "outputFile": "builder-task-1-output.md" }, ...]`

### Task Execution

For each task:
1. Update state.json task status to `"in-progress"`
2. Implement the change
3. Run tests if applicable
4. Update state.json task status to `"completed"` or `"failed"`

### Parallel Execution (medium/heavy)

Spawn `builder` subagents for independent tasks. Tasks are independent ONLY if they modify entirely separate files and do not affect each other's imports, exports, or test files. If uncertain, run sequentially.

**Before spawning parallel builders**, verify no two tasks modify the same file. If they do, run those tasks sequentially.

Each builder gets:
- **Task assignment** — ID and description
- **Complexity level**
- **Pointer to `.motif/context.md`** — builder reads `## Plan` for approach and `## Research` for conventions
- **Output file name** — e.g., "write your report to `.motif/builder-task-1-output.md`"
- **Delta context** — anything task-specific not already in context.md

For light tasks with a small plan, include the relevant plan excerpt directly in the builder briefing to save the builder from parsing context.md.

Keep dependent tasks sequential. Light tasks: work through one at a time.

### Builder Failure Handling

When a builder reports `Status: failed`, read its output file for details:
- **Plan problem** (wrong assumption, missing dependency, design decision needed): stop and present the issue to the user with options: fix the plan, skip the task, or abort.
- **Routine failure** (test flake, lint issue, small scope miss): attempt a fix inline or spawn a new builder with the failure context.
- **Turn limit hit** (no output file, empty/truncated return): attempt the task inline.

### When to Stop and Ask

- Design decision not covered by the plan
- Tests fail suggesting the plan is wrong
- The plan missed something significant

For routine issues, handle them and continue. After all tasks complete, proceed to Validate.

---

## Stage 4: Validate

Runs automatically after Build.

Remove `.motif/.active`. Update state.json stage to `"validate"`.

Spawn the `validator` subagent with:
1. Original task description
2. Complexity level
3. Pointer to `.motif/context.md`
4. Changed files list — run `git diff --name-only` against the pre-build state, or aggregate from builder output files
5. Toolchain commands — extract test/build/lint commands from research findings (in context.md under `## Research`)

It writes to `.motif/validator-output.md`. Read that file.

**If the output file doesn't exist**, fall back to the subagent's return message. If that's also empty, run validation inline.

Present the report. If issues found:
- **fix** → reinstate `.motif/.active`, go back to Build
- **done** → accept current state

### Completion

Delete `.motif/` entirely. Tell the user the workflow is complete.
