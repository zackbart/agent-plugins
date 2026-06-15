# Motif — Claude Code Plugin

A Claude Code development workflow plugin. Version 0.10.0.

Motif is a Claude Code plugin, but the `dev` skill itself is written to the
[Agent Skills](https://agentskills.io) standard and is runtime-agnostic — any
agent that reads the skill (Codex CLI, OpenCode, Cursor, …) can run the 4-stage
workflow. Motif ships no packaging for those runtimes; portability lives in the
skill prose, not in parallel manifests.

## Project structure

- `skills/` — universal skills (work via npx skills and as slash commands)
  - `dev/` — 4-stage workflow orchestrator (Research, Plan, Build, Validate); written to be portable across Agent Skills runtimes
  - `ask-codex/` — consult the Codex CLI for a second opinion on any question (shells out to the `codex` binary; runs on Claude Code)
- `agents/` — Claude Code subagents (Opus)
  - `researcher.md` — codebase exploration (Stage 1: Research) — read-only, has Context7 MCP
  - `critic.md` — adversarial plan review via Claude (Stage 2: Plan) — read-only, has Context7 MCP
  - `builder.md` — task execution (Stage 3: Build) — write-capable, has Context7 MCP
  - `validator.md` — independent build audit (Stage 4: Validate) — read-only, has Context7 MCP
  - `web-researcher.md` — deep web research for external knowledge (not part of 4-stage flow, spawned on demand)
  - `references/critic-process.md` — shared critic review methodology (single source of truth)
- `hooks/hooks.json` — SessionStart hook for workflow reminders and interruption detection
- `.claude-plugin/plugin.json` — plugin manifest for Claude Code

## Conventions

- Skills use YAML frontmatter with: `name`, `description`, `allowed-tools`, `argument-hint`, `disable-model-invocation`
- The `dev` skill must stay runtime-agnostic — describe capabilities (subagents, native task tracking, interactive approval) in terms of generic fallbacks so a non-Claude-Code agent can still execute it. Claude Code-specific tooling (`Agent`, `TaskCreate`/`TaskUpdate`, `AskUserQuestion`) is the preferred path, never the only path.
- Subagents use YAML frontmatter with: `name`, `description`, `tools`, `model`, `effort`, `maxTurns`
- Subagents are **model-tiered** by role: `sonnet` for the read-only `researcher` and `web-researcher` (exploration/synthesis is cheap), `opus` for `critic`, `builder`, and `validator` (judgment and code). All agents set `effort: high`. The dev skill's `--model` flag overrides the model per run.
- **Gotcha:** a global `CLAUDE_CODE_SUBAGENT_MODEL` env var (or settings.json value) set to a concrete model silently overrides every subagent's `model` frontmatter *and* the `--model` flag — all subagents run on that one model. It must be unset or `inherit` for the per-agent tiering to apply. Likewise a global `effortLevel` / `CLAUDE_CODE_EFFORT_LEVEL` can take precedence over the `effort` frontmatter.
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
- The dev workflow supports a sequential codex second-opinion pass after Claude critics merge — default on for every complexity (heavy, medium, and light); explicit `--no-codex-critic` / "skip codex" forces off, `--codex-critic` / "use codex to critique" forces on if otherwise disabled, and `--critic skip` skips it along with every other critic. Invokes `printf '%s' "$BRIEFING" | codex exec -s read-only --cd "$(pwd)" - 2>/dev/null` — stdout carries the findings, stderr is a session banner and must be discarded. The briefing instructs Codex to follow `agents/critic.md` exactly (the single source of truth for critic contract). Bounded at ~5 min wall-clock; any failure mode (missing binary, non-zero exit, timeout, truncated output) logs a skip and continues — never blocks approval. Respects the user's `~/.codex/config.toml` for model and reasoning; no `-m` flag is passed.
- The dev workflow supports `--critic` and `--auto` flags (or natural language equivalents) for fully autonomous runs
- The `ask-codex` skill exposes the codex consultation pattern as a standalone capability: smart-default cold-start briefing (question + conversation summary + git diff + file/context pointers), same `codex exec -s read-only` invocation, free-form output (no critic.md contract), `**Codex says:**` verbatim reply, fire-and-forget (no persistence). DIVERGES from Stage 2 by surfacing failures clearly instead of silent-skip — the user explicitly asked, so silent skip would be wrong. The codex second opinion is a *feature that runs on Claude Code* (it shells out to the `codex` binary); it is unrelated to packaging motif for the Codex runtime.
- The orchestrator can skip research when it already has sufficient context from the conversation
- Version is tracked in four places: `.claude-plugin/plugin.json`, root `marketplace.json`, `skills/dev/SKILL.md`, `CLAUDE.md` — keep them in sync

## When editing this project

- Bump version in all four locations when making significant changes
- Keep the `dev` skill cross-platform — don't assume Claude Code-specific features without a stated fallback in the skill prose
- Test skill discoverability with `npx skills add --list /path/to/motif`
- README.md project structure section should reflect actual directory layout
