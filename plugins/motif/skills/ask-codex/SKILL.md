---
name: ask-codex
description: >
  Consult the Codex CLI for a second opinion on any question — a sanity check,
  a code review, a design decision, a "what would another model say." Use when
  the user asks to "ask codex", "what does codex think", "get a second opinion",
  "cross-check with codex", "cross-check with gpt", or invokes /motif:ask-codex.
license: MIT
compatibility: >
  Requires the Codex CLI (`codex`) on PATH. Honors the user's
  ~/.codex/config.toml for model and reasoning settings.
metadata:
  author: zackbart
  version: "0.9.18"
argument-hint: "<question>"
allowed-tools: "Read, Grep, Glob, Bash"
disable-model-invocation: false
---

# Ask Codex

Consult the Codex CLI from inside a Claude session to get a second opinion. Codex sees none of the current conversation, so the value of this skill is in packaging a clean cold-start briefing and surfacing Codex's reply verbatim.

## When to invoke

Trigger on natural language: "ask codex about X", "what does codex think", "get a second opinion on Y", "cross-check this with codex", "have gpt review this", or explicit `/motif:ask-codex <question>`.

Do NOT invoke when the user is running the full `/motif:dev` workflow — Stage 2 of that skill already runs a structured codex critic pass with merge logic.

## Build the briefing

Codex starts with no context. Assemble a single string `$BRIEFING` containing the sections below. Skip any section that has nothing meaningful to include.

1. **The question, verbatim** — the user's actual ask, unedited. Lead with it.
2. **One-paragraph conversation summary** — what's been discussed, what's been tried, what the current working theory is. Write this in third person ("Claude has been investigating..."). Skip if the conversation is empty or the question is fully self-contained.
3. **Git diff** — run `git diff` (and `git diff --staged` if it has content). Include the output if it's relevant to the question. Skip if empty, or if the question is clearly unrelated to working-tree changes.
4. **File pointers** — list specific files Claude wants Codex to consider, with one-line descriptions. Do not inline file contents; let Codex read them.
5. **Project context pointers** — instruct Codex to read `.motif/context.md` if it exists, `ethos.md` if it exists (or the legacy `ethos/` directory as a fallback), and `CLAUDE.md` / `AGENTS.md` if they exist at the repo root.
6. **Tone nudge** — close with: *"Be rigorous and specific for technical questions; conversational for opinion questions. Reply in whatever format best answers the question — no required structure."*

Keep the briefing focused. A bloated briefing buries the question.

## Invoke Codex

Run the command exactly as written:

```bash
printf '%s' "$BRIEFING" | codex exec -s read-only --cd "$(pwd)" - 2>/dev/null
```

- `-s read-only` — Codex cannot modify files.
- `--cd "$(pwd)"` — anchors Codex's working directory to the user's repo.
- `-` — reads the briefing from stdin.
- `2>/dev/null` — discards Codex's session banner, input echo, and reasoning trace; only stdout holds the reply.
- Do NOT pass `-m` or any model/reasoning flags. Honor the user's `~/.codex/config.toml`.

**Wall-clock bound:** 5 minutes. When invoking via the Bash tool, set `timeout: 300000`. On systems with `timeout`/`gtimeout` available, wrap as `timeout 300 bash -c '...'`.

## Surface the reply

Print Codex's stdout verbatim under a `**Codex says:**` header. Do not synthesize, do not append Claude's own commentary, do not edit for length. The user invoked this skill specifically to hear from another model.

If the reply is long, it's long. Don't truncate.

## Failure handling

This skill diverges from the Stage 2 codex critic's silent-skip behavior. The user explicitly asked, so failures must be surfaced clearly:

- **`codex` not on PATH** (exit 127 or `command not found`) → tell the user: "Codex is not installed. Install it via the codex CLI's documented install path." Do not attempt the consultation.
- **Non-zero exit** → report the exit code and any non-empty stderr (re-run without `2>/dev/null` to capture it for the error report only).
- **Empty stdout** → tell the user: "Codex returned no output." Suggest re-trying.
- **Wall-clock timeout** (300s) → tell the user: "Codex timed out after 5 minutes." Suggest a more focused question.

Never silently skip. Never claim Codex weighed in when it didn't.

## Persistence

None. Do not write the briefing or reply to disk. The reply lands in the conversation and that's it.

## Recursive case

If the motif skill is itself running inside a Codex CLI session (e.g., the user is running Codex with the motif plugin), the `codex exec` invocation spawns a fresh subprocess with its own session and context. This is safe and produces a genuine second opinion — proceed normally.
