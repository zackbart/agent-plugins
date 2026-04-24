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
  version: "0.9.16"
argument-hint: "<task description> [--critic skip] [--auto] [--codex-critic | --no-codex-critic] | --resume"
allowed-tools: "Read, Grep, Glob, Bash, Write, Edit, Agent, TaskCreate, TaskUpdate, TaskList, TaskGet, AskUserQuestion"
---

# Motif Development Workflow

4-stage development process: Research → Plan → Build → Validate. The plan is the single approval gate. Once approved, Build and Validate run autonomously.

## Resume Support

If the argument is `--resume`, check for `.motif/state.json`:
- If it exists, read it and `.motif/context.md`. For Build-stage resumes, compare the `## Tasks` section in `context.md` against `git diff --name-only <baseCommit>` to determine which tasks are already complete. Re-create native tasks (TaskCreate) for incomplete work and mark completed ones immediately. Present the saved state and offer to resume or start fresh (starting fresh deletes `.motif/` first).
- If it doesn't exist, tell the user there's no workflow to resume.

On any new workflow start, delete `.motif/` if it exists from a previous run.

## Argument Parsing

Parse optional flags from the argument string (flags and natural language are equivalent):

- **Critic:** `--critic skip` or "skip the critic" (critics run automatically for medium/heavy tasks unless skipped)
- **Auto-approve:** `--auto` or "auto approve", "just run it", "hands off"
- **Codex second opinion:** `--codex-critic` / "use codex to critique", "gpt second opinion" (force on); `--no-codex-critic` / "skip codex", "no second opinion" (force off). Natural language always overrides the complexity default below.

Strip configuration to get the raw task description. Store parsed values in `.motif/state.json`.

## Workflow Initialization

1. Create `.motif/` directory
2. Write `.motif/.active` (empty flag file)
3. Write `.motif/state.json`:
   ```json
   { "stage": "research", "task": "<description>", "complexity": null, "startedAt": "<ISO>", "stageStartedAt": "<ISO>", "baseCommit": "<git rev-parse HEAD>", "autoApprove": false, "criticChoice": null, "codexCritic": null }
   ```
   Save `baseCommit` so the validator can diff against the pre-workflow state.
4. Write `.motif/context.md` with sections in this fixed order:
   ```markdown
   # Motif Workflow Context
   **Task:** <task description>
   **Started:** <timestamp>
   ## Research
   ## Plan
   ```

Suggest adding `.motif/` to `.gitignore` if not already there.

## Complexity Assessment

Assess task complexity:

- **Light** (quick fix, config change): minimal research, brief plan
- **Medium** (feature, moderate refactor): standard research, full plan
- **Heavy** (large refactor, new system): deep research, thorough plan with tradeoffs

State your assessment. Update state.json with the complexity.

### Critic Selection (medium/heavy only)

Light tasks always skip the critic.

Critic count scales with complexity:
- **Medium**: 2 Claude critics in parallel
- **Heavy**: 3 Claude critics in parallel

If `--critic skip` was provided, skip all critics regardless of complexity.

Otherwise, critics run automatically — no user prompt needed. Each independent Claude critic run surfaces different findings due to sampling variance.

**Fallback:** If a critic fails (empty/truncated return message), its slot is lost — do not retry. The remaining critics' findings are sufficient. If ALL critics fail, note that critic review was lost and proceed to the approval gate without it.

### Codex Second Opinion

After Claude critics merge (or, if Claude critics are skipped on a light task, after the plan is drafted), a second-opinion pass via the Codex CLI can catch what Claude missed or disagrees with — a cross-model signal.

Resolve whether to run it using this precedence (highest wins — apply in order and stop at first match):
1. `--critic skip` (or "skip the critic") — skip codex along with all other critics
2. `--no-codex-critic` (or "skip codex", "no second opinion") — force off. Wins over `--codex-critic` if both are somehow present; explicit off always beats explicit on.
3. `--codex-critic` (or "use codex to critique", "gpt second opinion") — force on. Runs even on light tasks when explicitly requested.
4. Complexity default — **heavy: on**, medium: off, light: off

Persist the resolved decision as `codexCritic: "on" | "off"` in `state.json`.

See "Codex Second Opinion Pass" below for invocation and merge behavior.

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
> **Critic notes:** *(if critics ran)* Accepted/rejected points in 1 line each, noting critic agreement where applicable. Only list items that changed the plan.
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
- **Instruction to discover available skills** — the researcher should scan for installed skills, plugins, and slash commands that might be relevant to the task (skills-lock.json, .claude/skills/, CLAUDE.md references, enabled plugins)

The researcher returns its findings in its return message. **Wait for it to complete.** Do not start planning until research findings are in hand.

**Truncation detection:** If the return message is empty, very short (under ~100 characters), or ends abruptly mid-sentence without the expected summary line ("> Found [N] relevant files..."), treat it as truncated. Research inline to fill the gaps — you already have the task context, so focus on the specific files and patterns the researcher was trying to find.

Without a researcher subagent, research directly.

### Post-Research

Replace the `## Research` section in `.motif/context.md` with findings, including any discovered skills and tools. Update state.json: set stage to `"plan"` and `stageStartedAt` to the current ISO timestamp.

If research discovered relevant skills (e.g., testing skills, linting skills, deployment skills), note them in context so the builder and validator can leverage them.

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

Build a complete briefing — each critic starts cold:
1. The plan (full approach, files, techniques)
2. Assumptions
3. Project context (language, framework, primary dependencies, testing framework, conventions from research)
4. File paths the plan touches
5. Tell the critic to read `.motif/context.md`
6. If `ethos/` exists, tell the critic to read it and flag any plan decisions that conflict with stated principles or non-goals

**Spawn all critics in parallel** — use a single message with multiple Agent tool calls. Each gets the same briefing. **Wait for all to complete.** Do not proceed to Stage 3 or spawn builders until all critic outputs have been read, triaged, the plan updated, and the user has approved (or auto-approve is set).

**Truncation detection:** A critic's return message is truncated if it is empty, very short (under ~100 characters), or ends abruptly mid-sentence without the expected summary line ("> Found [N] blockers..."). Drop failed critics silently — the remaining critics' findings are sufficient. If ALL critics fail, note that critic review was lost and proceed to the approval gate.

### Merging Critic Findings

Collect all critic outputs and merge into a single deduplicated list:
1. Gather all numbered findings from all critic responses
2. **Deduplicate** — if multiple critics flag the same issue (same file, same concern), keep the most specific version and note how many critics agreed (e.g., "[CONCERN] (2/3 critics)")
3. **Sort by severity** — blockers first, then concerns, then minor
4. Agreement between critics elevates confidence — if 2+ critics independently flag the same issue, weight it higher during triage

Triage the merged list: **ACCEPT** (state the plan change) or **REJECT** (provide evidence).

### Codex Second Opinion Pass

If `codexCritic` is `"on"` in `state.json`, run a single sequential pass via the Codex CLI after Claude critics merge (or, for light tasks where Claude critics were skipped, run it directly after the plan is drafted). Skip this subsection entirely when `codexCritic` is `"off"`.

Invoke `codex` non-interactively with the briefing piped on stdin. Capture stdout as the findings; discard stderr (Codex prints a session banner, input echo, and reasoning trace to stderr — only stdout holds the critic output):

```bash
printf '%s' "$BRIEFING" | codex exec -s read-only --cd "$(pwd)" - 2>/dev/null
```

**Wall-clock bound:** if the call does not return within ~5 minutes, kill the subprocess and treat it as a truncation/skip. When running through a tool harness that supports a timeout parameter, set it to 300000ms. On systems that have `timeout`/`gtimeout` on PATH, wrap the command as `timeout 300 bash -c '...'`.

Do NOT pass `-m` or any model/reasoning flags — honor whatever the user's `~/.codex/config.toml` already has configured.

**Briefing contents** — build a complete cold-start briefing:
1. The plan (full: approach, files, techniques) as-is after Claude triage
2. Assumptions
3. Project context (language, framework, primary dependencies, testing framework, conventions from research)
4. File paths the plan touches
5. The merged Claude findings (or "Claude critics were skipped for this task" if light), framed as: *"Claude's critics found these. What did they miss? What do you disagree with? What plan-level concerns remain?"*
6. Tell Codex to read `.motif/context.md` itself
7. If `ethos/` exists, tell Codex to read it and flag any plan decisions that conflict with stated principles or non-goals
8. **Output contract:** tell Codex to follow `agents/critic.md` exactly — it is the single source of truth for critic behavior. This includes: the 500-word hard cap, 8-finding cap, severity ordering (blockers → concerns → minor), no code blocks, file:line evidence required, the "No significant issues found" fallback when appropriate, and the required summary line `> Found [N] blockers, [N] concerns, [N] minor. Key finding: [1 sentence].`

**Merging Codex findings** — fold Codex's findings into the existing merged list, deduplicate across all sources (Claude + Codex), and re-triage. If a Codex finding agrees with a Claude finding on the same file/concern, elevate confidence and mark with source count (e.g., `[BLOCKER] (Claude 2/2 + Codex)`). Update the plan based on the re-triaged list before the approval gate.

**Failure handling — NEVER blocks approval:**
- `codex` not on PATH (exit 127 or `command not found`) → log "Codex critic skipped: not installed", continue to Post-Plan
- Non-zero exit → log "Codex critic skipped: exit <code>", continue
- Empty stdout, very short (under ~100 characters), or missing the `> Found [N]...` summary line → log "Codex critic skipped: truncated/incomplete", continue
- Wall-clock timeout (~5 min) → kill and log "Codex critic skipped: timeout", continue
- The Codex pass is additive insurance, not a gate. Any failure mode silently degrades to Claude-only critic review.

**Recursive case:** If the motif skill itself is running inside a Codex CLI session, shelling out to `codex exec` spawns a fresh subprocess with its own context and session — this is expected and safe.

Update the plan before the approval gate.

### Post-Plan

Replace the `## Plan` section in `.motif/context.md` with the approved plan. Update state.json: set stage to `"build"` and `stageStartedAt` to the current ISO timestamp.

---

## Stage 3: Build

**SEQUENCING: Do NOT spawn any builder agents until Stage 2 is fully complete — all critic outputs have been read, merged, triaged, the plan updated, and the user has approved (or auto-approve is set). Never launch critics and builders in parallel.**

**Runs autonomously after plan approval.**

### Task Decomposition

**Do NOT use TaskCreate, TaskUpdate, TaskList, or TaskGet outside of Stage 3: Build. These tools are exclusively for tracking build implementation work.**

Break the plan into discrete implementation tasks. For each task:

1. **Call TaskCreate** with:
   - `subject`: imperative action (e.g., "Add validation to UserService.create")
   - `description`: what to implement and which files to touch
   - `activeForm`: present-continuous form for the spinner (e.g., "Adding validation to UserService")
2. **Set dependencies** — after creating all tasks, call TaskUpdate with `addBlockedBy` to link tasks that must run sequentially. Example: if task-2 depends on task-1's exports, call `TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })`.
3. **Include tests alongside the code they verify** — a task that adds a function should also add its tests, not as a separate task.

After all tasks are created, add a `## Tasks` section to `.motif/context.md` listing each task with its ID and description (this serves as the persistent record for `--resume`).

### Task Execution

For each task (respecting dependency order — never start a task whose `blockedBy` tasks are not yet completed):

1. **Call `TaskUpdate({ taskId, status: "in_progress" })`** before starting work
2. Implement the change (directly or via a builder subagent)
3. Run tests if applicable
4. **Call `TaskUpdate({ taskId, status: "completed" })`** on success, or `"in_progress"` with a new description on failure (keep it in_progress so you can retry or ask the user)
5. Update the task's status in the `## Tasks` section of `.motif/context.md` (for resume persistence)

### Parallel Execution (medium/heavy)

Spawn `builder` subagents for independent tasks. Tasks are independent ONLY if they modify entirely separate files and do not affect each other's imports, exports, or test files. If uncertain, run sequentially.

**Before spawning parallel builders**, verify no two tasks modify the same file. If they do, run those tasks sequentially.

Each builder gets:
- **Task assignment** — ID and description
- **Complexity level**
- **Pointer to `.motif/context.md`** — builder reads `## Plan` for approach and `## Research` for conventions
- **Delta context** — anything task-specific not already in context.md

For light tasks with a small plan, include the relevant plan excerpt directly in the builder briefing to save the builder from parsing context.md.

Each builder returns its report in the return message. **After each builder returns, the orchestrator must immediately call `TaskUpdate({ taskId, status: "completed" })` or keep it `"in_progress"` if the builder reported failure.** Builders cannot update tasks — only the orchestrator can. Also update the task status in `context.md`.

Keep dependent tasks sequential. Light tasks: work through one at a time.

### Builder Failure Handling

When a builder reports `Status: failed` in its return message:
- **Plan problem** (wrong assumption, missing dependency, design decision needed): stop and present the issue to the user with options: fix the plan, skip the task, or abort.
- **Routine failure** (test flake, lint issue, small scope miss): attempt a fix inline or spawn a new builder with the failure context.
- **Turn limit hit** (empty return, very short under ~100 characters, or ends abruptly without the expected summary line "> Status: [completed/failed]..."): attempt the task inline.

### When to Stop and Ask

- Design decision not covered by the plan
- Tests fail suggesting the plan is wrong
- The plan missed something significant

For routine issues, handle them and continue. After all tasks complete, proceed to Validate.

---

## Stage 4: Validate

Runs automatically after Build.

Remove `.motif/.active`. Update state.json: set stage to `"validate"` and `stageStartedAt` to the current ISO timestamp.

Spawn the `validator` subagent with:
1. Original task description
2. Complexity level
3. Pointer to `.motif/context.md`
4. Changed files list — run `git diff --name-only <baseCommit>` (from state.json) to get all changes since the workflow started
5. Toolchain commands — extract test/build/lint commands from research findings (in context.md under `## Research`)

It returns its report in the return message. **Truncation detection:** If the return message is empty, very short (under ~100 characters), or ends abruptly mid-sentence without the expected summary line ("> Verdict: [verdict]..."), treat it as truncated and run validation inline.

Present the report. If issues found:
- **fix** → reinstate `.motif/.active`, go back to Build
- **done** → accept current state

### Completion

Delete `.motif/` entirely. Tell the user the workflow is complete.
