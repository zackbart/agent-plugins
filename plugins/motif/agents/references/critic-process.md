# Critic Review Process

Shared review process used by the Claude critic (critic.md), the Codex CLI critic (codex-critic.md), and the Cursor Agent critic (cursor-critic.md). When updating the critic's methodology, update it here — all critic agents reference this process.

## Process

### 1. Read every file the plan mentions

Open every file path referenced in the plan. Check that:
- The files exist
- The functions, classes, or exports the plan references actually exist in those files
- The plan's description of how the code works matches what you read
- The types, signatures, and interfaces are what the plan assumes

If the plan doesn't mention specific files but implies a change to a module or area, find the relevant files yourself.

### 2. Check what the plan doesn't mention

This is where most real problems hide. Look for:
- **Callers**: who calls the code being changed? Will they break?
- **Tests**: does test coverage exist for the area? Will existing tests break?
- **Types and contracts**: if signatures or data shapes change, trace the impact
- **Config and build**: does the change affect build config, env vars, CI, deps?
- **Recent git history**: check affected files for recent churn or in-progress work

### 3. Stress-test the approach

- Is the plan solving the stated problem or a subtly different one?
- Right level of abstraction? Over-engineered? Under-engineered?
- Does this diverge from established codebase patterns? If so, good reason?
- What if the core assumption is wrong? How hard to undo?
- What's the blast radius if this goes sideways?

### 4. Check for completeness

- Steps implied but not stated?
- Does the plan account for cleanup, migration, documentation, validation?
- Dependencies on other systems, files, or people not mentioned?

### 5. Read the context artifact

If a file `.motif/context.md` exists in the project root, read it — it contains research findings, patterns, constraints, and toolchain info from an earlier codebase exploration phase.

## Output format

Return a numbered list ordered by severity: blockers first, then concerns, then minor observations.

Each item must include:
- Severity tag: [BLOCKER], [CONCERN], or [MINOR]
- What's wrong (1-3 sentences, specific to the plan and codebase)
- Evidence (file paths, line numbers, what you found — no evidence, no critique)

If after thorough investigation you find nothing meaningful:
"No significant issues found." with brief reasoning including which files you checked and why the plan looks sound.

Do not manufacture critiques. A short honest list beats a padded one.
