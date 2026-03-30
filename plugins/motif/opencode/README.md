# Motif for OpenCode

OpenCode configuration for the motif 4-stage development workflow.

## Setup

### 1. Install the motif skill

```bash
npx skills add zackbart/motif
```

### 2. Merge the OpenCode config

Copy the relevant sections from this directory's `opencode.json` into your project's `opencode.json`:

- **`agent`** - adds 7 subagents (researcher, critic, codex-critic, cursor-critic, builder, validator, web-researcher)
- **`command`** - adds the `/dev` command
- **`plugin`** - registers the motif plugin for state management
- **`mcp`** - adds Context7 for documentation lookups (optional)

The `plugin.ts` file and `agents/` directory should be placed where your `opencode.json` can reference them. You can either:

1. **Copy** `opencode/` contents into your project root
2. **Symlink** from your project to the motif installation: `ln -s ~/.opencode/skills/motif/opencode/agents .opencode/agents/motif`

### 3. Adjust paths

If you place the files somewhere other than the project root, update the `{file:}` references in `opencode.json` to match.

## Usage

```
/dev <task description>                           # Normal flow
/dev --critic claude --auto <task description>    # Fully autonomous
/dev fix the login bug, use claude critic         # Natural language
/dev --resume                                     # Resume interrupted workflow
```

## What's included

| File | Purpose |
|------|---------|
| `opencode.json` | Agent definitions, /dev command, MCP config |
| `plugin.ts` | State management tools + interrupted workflow detection |
| `agents/researcher.md` | Read-only codebase exploration (Stage 1) |
| `agents/critic.md` | Adversarial plan review via Claude (Stage 2) |
| `agents/codex-critic.md` | Plan review relay via Codex CLI / gpt-5.4 (Stage 2) |
| `agents/cursor-critic.md` | Plan review relay via Cursor Agent / gpt-5.4 (Stage 2) |
| `agents/builder.md` | Write-capable task execution (Stage 3) |
| `agents/validator.md` | Independent build audit (Stage 4) |
| `agents/web-researcher.md` | Deep web research for external knowledge (on-demand) |

## Configuration notes

- Uses the `permission` system (replaces deprecated `tools` config)
- Each agent has a `steps` limit matching Claude Code's `maxTurns`
- Model: `anthropic/claude-sonnet-4-6-20250514` (Sonnet 4.6)
- Plugin uses structured logging via `client.app.log()`

## Known limitations vs Claude Code

| Feature | Claude Code | OpenCode |
|---------|-------------|----------|
| Parallel builders | Yes (via Agent tool) | Sequential |
| Task tracking | Native task tools | Via .motif/state.json |
| Approval gate | AskUserQuestion tool | Conversational pause |
| Session hooks | SessionStart hook | Plugin event handler |
| Skill invocation | Skill tool (session-level) | Read SKILL.md directly |
| Context7 MCP | In agent tool list | Via global MCP config |
