# Motif — Claude Code Plugin

A cross-platform development workflow plugin. Version 0.9.18.

## Project structure

- `skills/` — universal skills (work via npx skills and as slash commands)
  - `dev/` — 4-stage workflow orchestrator (Research, Plan, Build, Validate)
  - `ask-codex/` — consult the Codex CLI for a second opinion on any question (Claude Code only)
- `agents/` — Claude Code subagents (Opus)
  - `researcher.md` — codebase exploration (Stage 1: Research) — read-only, has Context7 MCP
  - `critic.md` — adversarial plan review via Claude (Stage 2: Plan) — read-only, has Context7 MCP
  - `builder.md` — task execution (Stage 3: Build) — write-capable, has Context7 MCP
  - `validator.md` — independent build audit (Stage 4: Validate) — read-only, has Context7 MCP
  - `web-researcher.md` — deep web research for external knowledge (not part of 4-stage flow, spawned on demand)
  - `references/critic-process.md` — shared critic review methodology (single source of truth)
- `hooks/hooks.json` — SessionStart hook for workflow reminders and interruption detection
- `AGENTS.md` — Codex CLI session priming (mirrors CLAUDE.md intent)
- `.claude-plugin/` — plugin.json and marketplace.json manifests for Claude Code
- `.codex-plugin/plugin.json` — Codex CLI plugin manifest (points at the same `skills/` dir)
- `codex/README.md` — setup instructions and limitations table for Codex users
- `opencode/` — OpenCode configuration (agents, plugin, commands)
  - `opencode.json` — agent definitions, /dev command, MCP config (template for users)
  - `plugin.ts` — state management tools + interrupted workflow detection
  - `agents/` — OpenCode-format subagent prompts (researcher, critic, builder, validator)
  - `README.md` — setup instructions for OpenCode users

## Conventions

- Skills use YAML frontmatter with: `name`, `description`, `allowed-tools`, `argument-hint`, `disable-model-invocation`
- Subagents use YAML frontmatter with: `name`, `description`, `tools`, `model`, `maxTurns`
- All subagents default to `model: opus` (web-researcher uses `inherit`)
- Read-only subagents get `tools: Read, Grep, Glob, Bash` — no Edit
- All subagents have Context7 MCP tools for external library doc lookups (conditional — gracefully skipped if unavailable)
- The `researcher` discovers available skills, plugins, and slash commands in the project and reports them in findings
- The `critic` uses Context7 to verify library/API assumptions in the plan
- The `validator` uses Context7 to verify correct API usage in implemented code
- The `web-researcher` checks Context7 first for library docs before falling back to web search
- The `builder` subagent has `Write, Edit` access for task execution during Build
- Subagents cannot use the `Skill` tool — only the orchestrator (main conversation) can
- The critic review process is defined in `agents/references/critic-process.md` as the source of truth
- Skills that delegate to subagents should pass a full briefing, not duplicate the subagent's instructions
- Subagents read `.motif/context.md` for shared workflow context
- Subagents return output directly in their return message — the orchestrator handles all file persistence
- The dev workflow spawns multiple Claude critics in parallel based on complexity: 2 for medium, 3 for heavy
- The dev workflow supports a sequential codex second-opinion pass after Claude critics merge — default on for heavy, off for medium and light; explicit `--codex-critic` / "use codex to critique" forces on (even on light tasks), `--no-codex-critic` / "skip codex" forces off, and `--critic skip` skips it along with every other critic. Invokes `printf '%s' "$BRIEFING" | codex exec -s read-only --cd "$(pwd)" - 2>/dev/null` — stdout carries the findings, stderr is a session banner and must be discarded. The briefing instructs Codex to follow `agents/critic.md` exactly (the single source of truth for critic contract). Bounded at ~5 min wall-clock; any failure mode (missing binary, non-zero exit, timeout, truncated output) logs a skip and continues — never blocks approval. Respects the user's `~/.codex/config.toml` for model and reasoning; no `-m` flag is passed.
- The dev workflow supports `--critic` and `--auto` flags (or natural language equivalents) for fully autonomous runs
- The `ask-codex` skill exposes the codex consultation pattern as a standalone capability: smart-default cold-start briefing (question + conversation summary + git diff + file/context pointers), same `codex exec -s read-only` invocation, free-form output (no critic.md contract), `**Codex says:**` verbatim reply, fire-and-forget (no persistence). DIVERGES from Stage 2 by surfacing failures clearly instead of silent-skip — the user explicitly asked, so silent skip would be wrong. Claude Code only for v1; not exposed via `.codex-plugin/plugin.json`.
- The orchestrator can skip research when it already has sufficient context from the conversation
- Version is tracked in six places: `.claude-plugin/plugin.json`, root `marketplace.json`, `skills/dev/SKILL.md`, `CLAUDE.md`, `opencode/opencode.json`, `.codex-plugin/plugin.json` — keep them in sync

## When editing this project

- Bump version in all six locations when making significant changes
- Keep AGENTS.md in sync with CLAUDE.md for Codex CLI compatibility
- Skills should be cross-platform — don't assume Claude Code-specific features in skill instructions
- The Codex plugin shares the same `skills/` directory as Claude Code — Codex packaging is just a manifest at `.codex-plugin/plugin.json`, no parallel skill copy
- Claude Code subagents live in `agents/`, OpenCode subagents live in `opencode/agents/` — keep prompt content in sync when editing agent behavior
- Test skill discoverability with `npx skills add --list /path/to/motif`
- README.md project structure section should reflect actual directory layout
