# Helm

A Claude Code plugin for orchestrating fully autonomous agent sessions that take a task from discovery through to a merged PR without human interaction.

## How It Works

Helm has two layers:

1. **The Orchestrator** — a persistent Claude Code session you talk to. It receives your intent, builds a context packet, spawns an autonomous session, and tracks its status. It never does implementation work.

2. **Spawned Sessions** — fully autonomous Claude Code sessions that run in your project directories. Each one owns the full pipeline: discovery, planning, implementation, testing, and PR creation. Each stage is delegated to a dedicated subagent with scoped tool access. They never interact with you directly.

## Pipeline Stages

Every spawned session follows the same five stages in order:

| Stage | Agent | What it does | Output |
|---|---|---|---|
| Discovery | `discovery` | Explores the codebase read-only | `.helm/findings.md` |
| Planning | `planning` | Produces a step-by-step implementation plan | `.helm/plan.md` |
| Implementation | `implementation` | Executes the plan, commits per step | `.helm/implementation.md` |
| Testing | `testing` | Runs the test suite, fixes failures | All tests passing |
| PR | `pr` | Opens a pull request via `gh` | PR URL in `.helm/status.json` |

If any stage fails after retries, the session writes an escalation report and stops. The orchestrator surfaces the escalation to you.

## Usage

Point Claude Code at this plugin and describe the work you want done:

```
"Add email validation to the signup form in /Users/me/projects/myapp"
```

The orchestrator will ask for any missing context (test command, target branch, constraints) and then spawn the session.

To check on a running session:

```
"What's the status of the myapp session?"
```

## Context Packet

The orchestrator builds a context packet before spawning. All fields are required:

| Field | Description |
|---|---|
| `task` | What needs to be done |
| `project_dir` | Absolute path to the project |
| `success_criteria` | What done looks like |
| `constraints` | What the session must not do |
| `branch_name` | Feature branch to work on |
| `test_command` | How to run the test suite |
| `pr_target` | Branch the PR should target |

## Project Structure

```
helm/
├── .claude-plugin/plugin.json    # Plugin manifest
├── CLAUDE.md                     # Orchestrator routing
├── skills/
│   ├── orchestrator/SKILL.md     # Orchestrator behavior
│   ├── bootstrap/SKILL.md        # Spawned session pipeline contract
│   └── escalation/SKILL.md       # Shared escalation format
├── agents/
│   ├── discovery.md              # Codebase exploration (read-only)
│   ├── planning.md               # Implementation planning (read-only)
│   ├── implementation.md         # Plan execution (read/write)
│   ├── testing.md                # Test suite runner
│   └── pr.md                     # PR creation
├── hooks/
│   ├── hooks.json                # Hook configuration
│   └── scripts/post-spawn.sh     # Session logging
├── schemas/context-packet.md     # Context packet field definitions
└── status/                       # Runtime session tracking
```

## What Helm Is Not

- **Not a replacement for motif.** Motif augments how you work with Claude Code directly. Helm is for fully autonomous sessions that run without you.
- **Not a custom runtime.** All execution goes through Claude Code's native tools and standard CLI commands.
- **Not persistent across sessions.** Each spawned session is fresh. Context comes from the context packet and `.helm/` handoff artifacts.

## License

MIT
