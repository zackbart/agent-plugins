# Motif for Codex

Codex CLI plugin packaging for the motif 4-stage development workflow.

## How it works

Codex plugins support skills, hooks, MCP servers, apps, and metadata — but not the per-agent subagent definitions Claude Code uses. Motif's `skills/dev/SKILL.md` is already cross-platform: when subagent support is unavailable, the orchestrator handles all four stages directly in the main context. Codex picks up the skill via the `skills` field in `.codex-plugin/plugin.json` at the motif plugin root.

`AGENTS.md` (symlinked to `CLAUDE.md`) primes Codex CLI sessions with the same conventions Claude Code uses.

## Install

### Repo-scoped

The marketplace is registered at `.agents/plugins/marketplace.json` in the repo root. From inside a clone of this repo:

```
codex plugin install motif
```

### Personal install from a clone

```
git clone https://github.com/zackbart/agent-plugins.git ~/src/agent-plugins
mkdir -p ~/.agents/plugins
ln -s ~/src/agent-plugins/.agents/plugins/marketplace.json ~/.agents/plugins/marketplace.json
codex plugin install motif
```

After install, Codex copies the plugin to `~/.codex/plugins/cache/agent-plugins/motif/local/`.

## Usage

The `dev` skill is invoked the same way as on any Agent Skills runtime:

```
Use the dev skill to <task description>
Use the dev skill to fix the login bug, auto approve
Use the dev skill --resume
```

Flags and natural language are equivalent — `--auto`, `--critic skip`, "just run it", "skip the critic" all work.

## What's included

| File | Purpose |
|------|---------|
| `.codex-plugin/plugin.json` | Codex plugin manifest |
| `skills/dev/SKILL.md` | The 4-stage workflow orchestrator |
| `AGENTS.md` | Codex CLI session priming (mirrors `CLAUDE.md`) |

### Optional: Context7 MCP

Motif's planner and validator gain accuracy when Context7 is available for library doc lookups. It is **not bundled** with this plugin — install it once at the user level via your Codex MCP config:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

The dev skill detects Context7 at runtime and uses it when present.

## Known limitations vs Claude Code

| Feature | Claude Code | Codex |
|---------|-------------|-------|
| Parallel critics | Yes (via Agent tool) | Inline, sequential |
| Parallel builders | Yes (via Agent tool) | Inline, sequential |
| Dedicated subagents | researcher / critic / builder / validator | Single context handles all stages |
| Task tracking | Native task tools | Via `.motif/state.json` |
| Approval gate | `AskUserQuestion` tool | Conversational pause |
| Session hooks | `SessionStart` hook reminds about workflow | `AGENTS.md` primes context instead |
| Skill invocation | `Skill` tool | Read `SKILL.md` directly |

The dev skill detects available capabilities and degrades gracefully — the 4-stage process runs end-to-end on Codex, just without parallelism.
