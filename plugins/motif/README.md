# Motif

A structured 4-stage development workflow for AI coding agents: **Research → Plan → Build → Validate**.

Works with any agent that supports the [Agent Skills](https://agentskills.io) standard - including [Claude Code](https://claude.com/claude-code), [OpenAI Codex CLI](https://github.com/openai/codex), [Cursor](https://cursor.com), and [40+ other platforms](https://agentskills.io/home).

Motif ensures you research before coding, plan with tradeoff analysis, track tasks explicitly, and validate against the original goal.

## Installation

### Any Agent (via npx skills)

```bash
npx skills add zackbart/motif
```

This installs skills to whichever agent platforms you have installed.

### Claude Code (full plugin)

First, add the marketplace:

```
/plugin marketplace add zackbart/motif
```

Then install the plugin:

```
/plugin install motif@motif
```

Or use the interactive plugin browser - run `/plugin`, go to **Discover**, and install from there.

This gives you all skills plus dedicated subagents (researcher, critic, builder, validator), session hooks, and workflow state persistence.

### OpenCode

```bash
npx skills add zackbart/motif
```

Then merge the config from `opencode/opencode.json` into your project's `opencode.json` (agent definitions, /dev command, plugin, MCP). See [`opencode/README.md`](opencode/README.md) for detailed setup.

### Codex CLI

```bash
git clone https://github.com/zackbart/motif.git ~/.agents/skills/motif
```

## Usage

Invoke skills using your agent's skill invocation method:

```
/motif:dev <task description>        # Claude Code
/dev <task description>              # OpenCode
$dev <task description>              # Codex CLI
```

For fully autonomous runs (no interactive prompts):

```
/motif:dev --auto <task>                           # Claude Code
/dev --auto <task>                                 # OpenCode
```

Or use natural language:

```
/motif:dev fix the login bug, auto approve
```

To resume an interrupted workflow:

```
/motif:dev --resume                  # Claude Code
/dev --resume                        # OpenCode
$dev --resume                        # Codex CLI
```

## Workflow Stages

The plan (Stage 2) is the single approval gate - once approved, Build and Validate run autonomously.

### 1. Research

Read-only codebase exploration. Depth scales automatically based on task complexity (light / medium / heavy). The orchestrator can skip research entirely when it already has sufficient context from the conversation. On Claude Code and OpenCode, delegated to a dedicated research subagent.

### 2. Plan

Implementation plan based on research findings. Medium and heavy tasks include tradeoff analysis and risk assessment.

For medium/heavy tasks, multiple Claude critics run in parallel (2 for medium, 3 for heavy). Their findings are merged and deduplicated before triage. Use `--critic skip` to bypass.

### 3. Build

Decomposes the plan into tasks, then executes them autonomously. On Claude Code, independent tasks run in parallel via builder subagents.

### 4. Validate

Independent audit of the completed work against the original task. On Claude Code and OpenCode, delegated to the validator subagent which checks diffs, runs tests, and traces callers for regressions.

## State Persistence

Workflow state is saved to a `.motif/` directory in the project root during execution. This enables resuming interrupted workflows with `--resume`. The directory is automatically cleaned up on successful completion - nothing persists after a finished workflow.

### State Schema

`.motif/state.json` tracks the current workflow state:

```json
{
  "stage": "build",
  "task": "Add user authentication",
  "complexity": "medium",
  "startedAt": "2026-03-25T10:00:00Z",
  "autoApprove": false,
  "criticChoice": "claude",
  "tasks": [
    { "id": "task-1", "description": "Add auth middleware", "status": "completed" },
    { "id": "task-2", "description": "Add login endpoint", "status": "in-progress" }
  ]
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
| `tasks` | Array of task objects with id, description, and status (`pending`/`in-progress`/`completed`/`failed`). Populated during Build, used for resume. |

This schema is designed for consumption by external tools (e.g., [claude-hud](https://github.com/zackbart/claude-hud) statusline integration).

## Claude Code Extras

When installed as a Claude Code plugin, motif includes additional features:

| Feature | Description |
|---------|-------------|
| Research subagent | Dedicated Sonnet agent for codebase exploration (Stage 1) |
| Critic subagents | Parallel adversarial plan review — 2 for medium, 3 for heavy (Stage 2) |
| Builder subagent | Write-capable Sonnet agent for parallel task execution (Stage 3) |
| Validator subagent | Independent Sonnet agent that audits builds against the original goal (Stage 4) |
| Web researcher | Deep web research agent for external knowledge (spawned on demand, not part of 4-stage flow) |
| State persistence | Workflow state in `.motif/` - resume interrupted workflows with `--resume` |
| Session hooks | Detects interrupted workflows on session start |

## Platform Compatibility

| Feature | Claude Code | OpenCode | Codex CLI | Other Agents |
|---------|-------------|----------|-----------|--------------|
| 4-stage workflow | Yes | Yes | Yes | Yes |
| Subagents | researcher, critic, builder, validator | researcher, critic, builder, validator | Inline | Inline |
| Parallel critics | Yes (2 medium, 3 heavy) | Sequential | No | No |
| Parallel builders | Yes | Sequential | No | No |
| Task tracking | Native task tools | .motif/state.json | update_plan | Platform-dependent |
| State persistence | Yes | Yes | Yes | Yes |
| Interruption detection | SessionStart hook | Plugin event handler | Manual | Manual |
| Distribution | Plugin marketplace | npx skills + config | Git clone | npx skills |

## Project Structure

```
skills/dev/              # Core 4-stage workflow (universal skill)
agents/                  # Claude Code subagents (Sonnet)
  researcher.md          # Codebase exploration (Stage 1: Research) - read-only
  critic.md              # Adversarial plan review via Claude (Stage 2) - read-only
  builder.md             # Task execution (Stage 3: Build) - write-capable
  validator.md           # Independent build audit (Stage 4: Validate) - read-only
  web-researcher.md      # Deep web research (on-demand) - read-only
  references/            # Shared agent reference docs (critic process)
opencode/                # OpenCode configuration
  opencode.json          # Agent definitions, /dev command, MCP config
  plugin.ts              # State management tools + workflow detection
  agents/                # OpenCode-format subagent prompts
hooks/                   # Session lifecycle hooks (Claude Code)
AGENTS.md                # Session priming (Codex CLI)
.claude-plugin/          # Plugin manifest and marketplace config
```

## License

MIT
