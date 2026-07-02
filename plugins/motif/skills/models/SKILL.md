---
name: models
description: >
  Model-routing policy for orchestrating work across models (gpt-5.5, sonnet-5,
  opus-4.8, fable-5). Use when choosing which model to run a task, subagent, or
  workflow on — "which model for this", "route this work", "what should I
  delegate", "cheapest model that meets the bar", "which model is best at X" — or
  when the user invokes /motif:models. Active by default on Fable sessions
  (injected at session start); on other models it fires only on an explicit
  routing question or /motif:models.
license: MIT
compatibility: >
  Claude models (sonnet-5, opus-4.8, fable-5) run via the Agent/Workflow `model`
  parameter. gpt-5.5 is reachable only through the Codex CLI (`codex exec` /
  `codex review`), which honors ~/.codex/config.toml.
metadata:
  author: zackbart
  version: "0.11.0"
argument-hint: ""
allowed-tools: "Read, Grep, Glob, Bash"
disable-model-invocation: false
---

# Models — routing policy

You are orchestrating work across several models. Pick the model per task using
the rankings below. **Higher = better on every axis.** Cost reflects what you
actually pay (OpenAI's limits are generous), not list price. Intelligence = how
hard a problem you can hand the model unsupervised. Taste = UI/UX, code quality,
API design, and copy.

| model    | cost | intelligence | taste |
|----------|------|--------------|-------|
| gpt-5.5  | 9    | 8            | 5     |
| sonnet-5 | 5    | 5            | 7     |
| opus-4.8 | 4    | 7            | 8     |
| fable-5  | 2    | 9            | 9     |

## How to apply

- **Defaults, not limits.** You have standing permission to override them: if a
  cheaper model's output doesn't meet the bar, rerun or redo the work with a
  smarter model without asking. Judge the output, not the price tag — escalating
  costs less than shipping mediocre work.
- **Cost is a tie-breaker only.** When axes conflict for anything that ships:
  **intelligence > taste > cost.**
- **Bulk / mechanical work** (clear-spec implementation, data analysis,
  migrations): **gpt-5.5** — it's effectively free.
- **Anything user-facing** (UI, copy, API design) needs **taste ≥ 7** →
  opus-4.8 or fable-5.
- **Reviews** of plans/implementations: **fable-5 or opus-4.8**, optionally
  gpt-5.5 as an extra independent perspective.
- **Token-hungry work** (computer use, whole-codebase analysis, verification
  sweeps): push to gpt-5.5 and report results back — don't burn Fable tokens on
  it.
- **Never use Haiku.**

## Reaching each model

- **Claude models** (sonnet-5, opus-4.8, fable-5): the Agent / Workflow `model`
  parameter.
- **gpt-5.5**: only through the Codex CLI. Run
  `codex exec -s read-only --cd "$(pwd)" -` with a self-contained prompt for
  investigation / analysis / implementation, or `codex review` for reviews. It
  defaults to gpt-5.5 via `~/.codex/config.toml` — don't pass `-m`. For a quick
  second opinion the `ask-codex` skill wraps this. (If dedicated
  codex-implementation / codex-review / codex-computer-use skills exist, prefer
  them.)
- **gpt-5.5 inside a Workflow**: the Workflow `model` param only takes Claude
  models. Spawn a thin `model: sonnet, effort: low` agent that writes a
  self-contained codex prompt, runs `codex exec`, and returns the result — add
  this hop only when you actually need gpt-5.5 mid-workflow.
