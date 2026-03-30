# Motif — Claude Code Plugin

A cross-platform development workflow plugin. Version 0.9.5.

## Project structure

- `skills/` — universal skills (work via npx skills and as slash commands)
  - `dev/` — 4-stage workflow orchestrator (Research, Plan, Build, Validate)
- `agents/` — Claude Code subagents (Sonnet)
  - `researcher.md` — codebase exploration (Stage 1: Research) — read-only, has Context7 MCP
  - `codex-critic.md` — adversarial plan review via Codex CLI/gpt-5.4 (Stage 2: Plan, user-selected) — read-only
  - `cursor-critic.md` — adversarial plan review via Cursor Agent CLI/gpt-5.4 (Stage 2: Plan, user-selected) — read-only
  - `critic.md` — adversarial plan review via Claude (Stage 2: Plan, user-selected) — read-only
  - `builder.md` — task execution (Stage 3: Build) — write-capable, has Context7 MCP
  - `validator.md` — independent build audit (Stage 4: Validate) — read-only
  - `web-researcher.md` — deep web research for external knowledge (not part of 4-stage flow, spawned on demand)
  - `references/critic-process.md` — shared critic review methodology (single source of truth)
- `hooks/hooks.json` — SessionStart hook for workflow reminders and interruption detection
- `AGENTS.md` — Codex CLI session priming (mirrors CLAUDE.md intent)
- `.claude-plugin/` — plugin.json and marketplace.json manifests
- `opencode/` — OpenCode configuration (agents, plugin, commands)
  - `opencode.json` — agent definitions, /dev command, MCP config (template for users)
  - `plugin.ts` — state management tools + interrupted workflow detection
  - `agents/` — OpenCode-format subagent prompts (researcher, critic, builder, validator, codex-critic, cursor-critic)
  - `README.md` — setup instructions for OpenCode users

## Conventions

- Skills use YAML frontmatter with: `name`, `description`, `allowed-tools`, `argument-hint`, `disable-model-invocation`
- Subagents use YAML frontmatter with: `name`, `description`, `tools`, `model`, `maxTurns`
- All subagents default to `model: sonnet` to keep costs down
- Read-only subagents get `tools: Read, Grep, Glob, Bash` — no Write or Edit
- The `builder` and `researcher` subagents also have Context7 MCP tools for external library doc lookups (conditional — gracefully skipped if unavailable)
- The `builder` subagent has `Write, Edit` access for task execution during Build
- Subagents cannot use the `Skill` tool — only the orchestrator (main conversation) can
- The critic review process is defined in `agents/references/critic-process.md` as the source of truth for development — but each critic agent inlines its own copy since the reference file isn't available at runtime in user projects
- Skills that delegate to subagents should pass a full briefing, not duplicate the subagent's instructions
- Subagents read `.motif/context.md` for shared workflow context
- The dev workflow supports `--critic` and `--auto` flags (or natural language equivalents) for fully autonomous runs
- The orchestrator can skip research when it already has sufficient context from the conversation
- Version is tracked in five places: `plugin.json`, `marketplace.json`, `skills/dev/SKILL.md`, `CLAUDE.md`, `opencode/opencode.json` — keep them in sync

## When editing this project

- Bump version in all five locations when making significant changes
- Keep AGENTS.md in sync with CLAUDE.md for Codex CLI compatibility
- Skills should be cross-platform — don't assume Claude Code-specific features in skill instructions
- Claude Code subagents live in `agents/`, OpenCode subagents live in `opencode/agents/` — keep prompt content in sync when editing agent behavior
- Test skill discoverability with `npx skills add --list /path/to/motif`
- README.md project structure section should reflect actual directory layout
