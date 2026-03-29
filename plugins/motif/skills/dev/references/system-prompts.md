# System Prompt Optimization Reference

## What System Prompts Are For
System prompts define Claude's persistent behavior: its role, persona, constraints, output format defaults, and how it should handle edge cases. They're not for one-off instructions — those belong in the user turn.

## Common Failure Modes

### Too vague
```
# Bad
You are a helpful assistant.

# Better
You are a customer support agent for Acme SaaS. You help users troubleshoot 
billing issues, account access, and plan upgrades. You do not handle technical 
bugs — direct those to support@acme.com.
```

### Missing output format guidance
If the system prompt doesn't specify format, Claude defaults to whatever seems natural. Be explicit when it matters:
```
Respond in plain prose. Never use bullet points or headers unless the user 
explicitly asks for a list.
```

### Over-constraining with negatives
Tell Claude what to do, not just what not to do:
```
# Bad
Never use markdown. Don't write long responses. Don't ask clarifying questions.

# Better  
Write in plain prose. Keep responses under 3 paragraphs. If something is 
ambiguous, make a reasonable assumption and proceed.
```

### Anti-laziness instructions that overtrigger on Claude 4.x
Prompts written for Claude 2/3 often include aggressive instructions like:
- "ALWAYS use the search tool before answering"
- "CRITICAL: You MUST read the file before responding"
- "You MUST NEVER skip this step"

On Claude 4.x models, these cause overtriggering. Replace with normal language:
- "Use the search tool when you need current information"
- "Read the file before answering questions about it"

### Role definition without behavioral implications
```
# Weak
You are a coding assistant.

# Stronger
You are a senior TypeScript engineer. Prefer explicit types over inference. 
Favor composition over inheritance. When reviewing code, identify the most 
impactful issue first rather than listing every minor nit.
```

## Structural Best Practices

### Use XML sections for complex system prompts
For prompts over ~15 lines, section them clearly:
```xml
<role>...</role>
<capabilities>...</capabilities>
<constraints>...</constraints>
<output_format>...</output_format>
```

### Order matters
1. Role/persona first
2. Capabilities and context
3. Constraints and rules
4. Output format last

### Keep it minimal
Every line in a system prompt is a constraint. Unnecessary constraints create unexpected behavior. If you're not sure a rule is needed, leave it out.

## Persona Prompts
If the system prompt establishes a named persona:
- Define personality traits that have behavioral implications, not just vibes ("direct and concise" is useful, "friendly" is not)
- Specify how the persona handles topics outside its scope
- Don't try to fully suppress Claude's values — it won't work and creates unpredictable behavior
