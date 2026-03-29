---
name: Escalation
description: >
  This skill defines the shared escalation format used across all pipeline stages
  to surface blockers back to the orchestrator. It is referenced by the bootstrap
  skill and should not be triggered independently by user queries.
version: 0.1.0
---

# Escalation Format

When a stage cannot proceed, write an escalation report and stop. This format is shared across all stages to ensure the orchestrator receives consistent, actionable information.

## When to Escalate

- No progress after repeated attempts at a stage (same failure mode recurring)
- A constraint discovered that makes the task impossible as specified
- Tool failure that cannot be recovered from (git conflict, CI unreachable, missing dependencies, etc.)
- Scope ambiguity that would require guessing at user intent
- A blocking dependency outside the session's control

## Escalation Steps

1. Write `.helm/escalation.md` using the format below
2. Update `.helm/status.json`:
   - Set `"status"` to `"escalated"`
   - Set `"error"` to a one-line summary of the blocker
   - Update `"updated_at"` timestamp
3. Stop immediately. Do not attempt further stages or workarounds.

## Escalation Format

Write to `.helm/escalation.md`:

```
STAGE: <stage name>
TASK: <original task summary from context packet>
ATTEMPTS: <number of attempts made at this stage>
BLOCKER: <clear description of what prevents progress>
TRIED: <specific actions attempted, with outcomes>
NEEDS: <what would allow this to proceed — user decision, access, clarification, etc.>
```

## Writing Guidelines

**BLOCKER**: State the problem, not the symptom. "The user table has no `email` column and the migration to add it conflicts with an existing index" is useful. "Tests fail" is not.

**TRIED**: Be specific. Include what was attempted and what happened each time. "Attempted to add column with `ALTER TABLE` — failed due to existing unique index on (user_id, email_hash). Attempted to drop index first — blocked by foreign key constraint from sessions table." This lets the user or a future session pick up without repeating work.

**NEEDS**: State what would unblock this concretely. "User decision on whether to drop the sessions table foreign key or restructure the migration to work around it." Not "help with the database."
