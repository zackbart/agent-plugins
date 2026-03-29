# Agentic & Tool-Use Prompt Optimization Reference

## What Makes Agentic Prompts Different
Agentic prompts instruct Claude to take actions over multiple steps, often with tools, subagents, or across long sessions. The failure modes are different from one-shot prompts — mistakes compound, irreversible actions are possible, and context management matters.

## Core Dimensions to Evaluate

### 1. Action vs. Suggestion Clarity
Claude 4.x models interpret phrasing literally:
```
# Asks for suggestions (Claude will suggest, not act)
Can you suggest improvements to this function?

# Asks for action
Improve this function. Focus on performance.
```

If the prompt is ambiguous about whether to act or advise, flag it.

### 2. Tool Use Guidance
- Are tools described well enough for Claude to know when to use them?
- Is there guidance on parallel vs. sequential execution?
- Parallel tool calls are on by default in Claude 4.x — if sequential is needed, say so explicitly

```
# Enable parallel tool use explicitly (boosts to ~100% compliance)
If multiple tool calls are independent, make them in parallel. Only call tools
sequentially when a later call depends on the result of an earlier one.
```

### 3. Reversibility & Risk Handling
Agentic Claude may take risky actions without prompting. If not addressed, flag it:
```
Before taking actions that are hard to reverse (deleting files, pushing to 
shared branches, sending messages, modifying shared infrastructure), confirm 
with the user first.
```

### 4. State & Context Management
For long-running tasks:
- Is there guidance on how to handle approaching context limits?
- Is there a state persistence strategy (files, git, structured JSON)?
- Does the prompt address what to do when resuming after a context reset?

If context compaction is used:
```
Your context will be automatically compacted as it approaches its limit. 
Do not stop work early due to context concerns — save state and continue.
```

### 5. Subagent Orchestration (Claude Opus 4.x)
Claude Opus 4.6 spawns subagents aggressively. If the prompt doesn't address this:
- Add guidance on when subagents are warranted vs. overkill
- Simple tasks (grep, single file edit) don't need subagents

```
Use subagents for parallel workstreams or tasks requiring isolated context. 
For simple, sequential operations or single-file edits, work directly.
```

### 6. Overengineering Prevention
Claude Opus 4.x tends to add abstractions, extra files, and flexibility not requested. For coding agents, consider adding:
```
Only make changes that are directly requested. Don't refactor surrounding code,
add docstrings, or build in configurability unless asked.
```

## Common Anti-Patterns to Flag

| Anti-pattern | Problem | Fix |
|---|---|---|
| `ALWAYS use [tool]` | Overtriggering on Claude 4.x | `Use [tool] when it would help` |
| No reversibility guidance | Claude may take destructive actions | Add confirmation requirement for risky ops |
| No state strategy | Long tasks lose context | Add file-based state or git checkpointing |
| Vague success criteria | Claude doesn't know when it's done | Define what "done" looks like |
| Prefilled assistant turn | Deprecated in Claude 4.6+ | Move to system prompt or user turn instruction |

## Agentic Prompt Structure (Recommended Order)
1. Role and objective
2. Available tools and when to use them  
3. Workflow / phases (if multi-step)
4. Constraints (reversibility, scope limits)
5. State management approach
6. Definition of done / handoff behavior
