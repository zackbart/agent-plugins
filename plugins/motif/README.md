# Motif

A structured 4-stage development workflow for AI coding agents: **Research → Plan → Build → Validate**.

Motif ships as a [Claude Code](https://claude.com/claude-code) plugin, but the `dev` skill is written to the [Agent Skills](https://agentskills.io) standard — so any agent that can read a skill (Codex CLI, [Cursor](https://cursor.com), [40+ other platforms](https://agentskills.io/home)) can run the workflow too. On Claude Code you get the full experience: dedicated subagents, session hooks, and state persistence. Elsewhere, the orchestrator runs every stage inline.

Motif ensures you research before coding, plan with tradeoff analysis, track tasks explicitly, and validate against the original goal.

## Installation

### Claude Code (full plugin)

First, add the marketplace:

```
/plugin marketplace add zackbart/agent-plugins
```

Then install the plugin:

```
/plugin install motif@agent-plugins
```

Or use the interactive plugin browser — run `/plugin`, go to **Discover**, and install from there.

This gives you all skills plus dedicated subagents (researcher, critic, builder, validator), session hooks, and workflow state persistence.

### Any other Agent Skills runtime (via npx skills)

```bash
npx skills add zackbart/motif
```

This installs the `dev` skill to whichever agent platforms you have installed. Those agents run the workflow inline (no Claude Code subagents), driven entirely by the portable skill prose.

## Usage

Invoke the workflow using your agent's skill invocation method:

```
/motif:dev <task description>        # Claude Code
/dev <task description>              # other runtimes (varies by agent)
```

For fully autonomous runs (no interactive prompts):

```
/motif:dev --auto <task>
```

Or use natural language:

```
/motif:dev fix the login bug, auto approve
```

To resume an interrupted workflow:

```
/motif:dev --resume
```

## Workflow Stages

The plan (Stage 2) is the single approval gate — once approved, Build and Validate run autonomously.

### 1. Research

Read-only codebase exploration. Depth scales automatically based on task complexity (light / medium / heavy). The orchestrator can skip research entirely when it already has sufficient context from the conversation. On Claude Code, delegated to a dedicated research subagent; elsewhere, run inline.

### 2. Plan

Implementation plan based on research findings. Medium and heavy tasks include tradeoff analysis and risk assessment.

For medium/heavy tasks, multiple Claude critics run in parallel (2 for medium, 3 for heavy). Their findings are merged and deduplicated before triage. A cross-model second-opinion pass via the Codex CLI (if `codex` is on PATH) runs by default and is purely additive — any failure silently degrades to Claude-only review. Use `--critic skip` to bypass all critics, or `--no-codex-critic` to skip just the Codex pass.

### 3. Build

Decomposes the plan into tasks, then executes them autonomously. On Claude Code, independent tasks run in parallel via builder subagents; elsewhere, sequentially inline.

### 4. Validate

Independent audit of the completed work against the original task. On Claude Code, delegated to the validator subagent which checks diffs, runs tests, and traces callers for regressions.

## State Persistence

Workflow state is saved to a `.motif/` directory in the project root during execution. This enables resuming interrupted workflows with `--resume`. The directory is automatically cleaned up on successful completion — nothing persists after a finished workflow.

### State Schema

`.motif/state.json` tracks the current workflow state:

```json
{
  "stage": "build",
  "task": "Add user authentication",
  "complexity": "medium",
  "startedAt": "2026-03-25T10:00:00Z",
  "autoApprove": false,
  "criticChoice": null
}
```

| Field | Description |
|-------|-------------|
| `stage` | Current stage: `research`, `plan`, `build`, `validate` |
| `task` | The original task description |
| `complexity` | Task complexity: `light`, `medium`, `heavy` |
| `startedAt` | ISO timestamp of workflow start |
| `autoApprove` | If `true`, plan is auto-approved (set via `--auto` flag) |
| `criticChoice` | Pre-selected critic option: `skip` or `null` (auto) |

Task tracking uses the agent's native task tools when available (Claude Code: TaskCreate/TaskUpdate) during the Build stage; otherwise a markdown checklist. Either way the task list is persisted in `.motif/context.md` under `## Tasks` for resume support.

This schema is designed for consumption by external tools (e.g., [claude-hud](https://github.com/zackbart/claude-hud) statusline integration).

## Claude Code Extras

When installed as a Claude Code plugin, motif includes additional features beyond the portable skill:

| Feature | Description |
|---------|-------------|
| Research subagent | Dedicated Sonnet agent for codebase exploration (Stage 1) |
| Critic subagents | Parallel adversarial plan review — 2 for medium, 3 for heavy (Stage 2) |
| Codex second opinion | Cross-model critic pass via the `codex` CLI, merged into Claude critic findings (Stage 2) |
| Builder subagent | Write-capable Opus agent for parallel task execution (Stage 3) |
| Validator subagent | Independent Opus agent that audits builds against the original goal (Stage 4) |
| Web researcher | Deep web research agent for external knowledge (spawned on demand, not part of 4-stage flow) |
| `ask-codex` skill | Standalone second opinion from the Codex CLI, outside the workflow |
| State persistence | Workflow state in `.motif/` — resume interrupted workflows with `--resume` |
| Session hooks | Detects interrupted workflows on session start |

## Platform Compatibility

| Capability | Claude Code | Other Agent Skills runtimes |
|---------|-------------|--------------|
| 4-stage workflow | Yes | Yes |
| Subagents | researcher, critic, builder, validator | Inline (orchestrator runs each stage) |
| Parallel critics / builders | Yes | Sequential |
| Codex second opinion | Yes (if `codex` on PATH) | Available if the runtime can shell out to `codex` |
| Task tracking | Native task tools + context.md | Markdown checklist in context.md |
| State persistence | Yes | Yes |
| Interruption detection | SessionStart hook | Manual (`--resume`) |
| Distribution | Plugin marketplace | npx skills |

## Project Structure

```
skills/
  dev/                   # Core 4-stage workflow (portable Agent Skills skill)
  ask-codex/             # Standalone Codex second-opinion skill
agents/                  # Claude Code subagents (Sonnet for read-only, Opus for code/judgment)
  researcher.md          # Codebase exploration (Stage 1: Research) - read-only
  critic.md              # Adversarial plan review via Claude (Stage 2) - read-only
  builder.md             # Task execution (Stage 3: Build) - write-capable
  validator.md           # Independent build audit (Stage 4: Validate) - read-only
  web-researcher.md      # Deep web research (on-demand) - read-only
  references/            # Shared agent reference docs (critic process)
hooks/                   # Session lifecycle hooks (Claude Code)
.claude-plugin/          # Claude Code plugin manifest
```

## License

MIT
