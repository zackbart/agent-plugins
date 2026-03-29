# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Claude HUD is a Claude Code plugin that displays a real-time multi-line statusline. It shows context health, tool activity, agent status, and todo progress.

## Build Commands

```bash
npm ci               # Install dependencies
npm run build        # Build TypeScript to dist/
npm test             # Build + run all tests
npm run dev          # Watch mode compile

# Test with sample stdin data
echo '{"model":{"display_name":"Opus"},"context_window":{"current_usage":{"input_tokens":45000},"context_window_size":200000}}' | node dist/index.js
```

## Architecture

### Data Flow

```
Claude Code → stdin JSON → parse → render lines → stdout → Claude Code displays
           ↘ transcript_path → parse JSONL → tools/agents/todos
```

**Key insight**: The statusline is invoked every ~300ms by Claude Code. Each invocation:
1. Receives JSON via stdin (model, context, tokens - native accurate data)
2. Parses the transcript JSONL file for tools, agents, and todos
3. Renders multi-line output to stdout
4. Claude Code displays all lines

### Data Sources

**Native from stdin JSON** (accurate, no estimation):
- `model.display_name` - Current model
- `context_window.current_usage` - Token counts
- `context_window.context_window_size` - Max context
- `transcript_path` - Path to session transcript

**From transcript JSONL parsing**:
- `tool_use` blocks → tool name, input, start time
- `tool_result` blocks → completion, duration
- Running tools = `tool_use` without matching `tool_result`
- `TodoWrite` calls → todo list
- `Task` calls → agent info

**From config files**:
- MCP count from `~/.claude/settings.json` (mcpServers)
- Hooks count from `~/.claude/settings.json` (hooks)
- Rules count from CLAUDE.md files

**From Claude Code stdin rate limits**:
- `rate_limits.five_hour.used_percentage` - 5-hour subscriber usage percentage
- `rate_limits.five_hour.resets_at` - 5-hour reset timestamp
- `rate_limits.seven_day.used_percentage` - 7-day subscriber usage percentage
- `rate_limits.seven_day.resets_at` - 7-day reset timestamp

### File Structure

```
src/
├── index.ts           # Entry point, data loading gates
├── stdin.ts           # Parse Claude's JSON input
├── transcript.ts      # Parse transcript JSONL
├── config-reader.ts   # Read MCP/rules configs
├── config.ts          # Load/validate user config, merge themes + colors
├── themes.ts          # Named color theme presets (default, monochrome, dracula, solarized, catppuccin)
├── git.ts             # Git status (branch, dirty, ahead/behind)
├── motif.ts           # Load motif workflow state from .motif/state.json (stage, tasks, critic, autoApprove)
├── types.ts           # TypeScript interfaces
└── render/
    ├── index.ts       # Main render coordinator, renderFromLines, renderElementForLines
    ├── session-line.ts   # Compact mode: single line with all info
    ├── tools-line.ts     # Tool activity
    ├── agents-line.ts    # Agent status
    ├── todos-line.ts     # Todo progress
    ├── colors.ts         # ANSI color helpers, resolves HudColorValue → ANSI escape
    └── lines/
        ├── index.ts      # Barrel export for all line/element renderers
        ├── project.ts    # Sub-element renderers + project bundle
        ├── identity.ts   # Context bar
        ├── usage.ts      # Usage/rate limit bar
        ├── memory.ts     # RAM usage bar
        ├── environment.ts # Config counts
        └── motif.ts      # Motif workflow status (stage, progress, elapsed, critic, active task)
```

### Layout System

The HUD supports two layout modes:

**Flexible `lines` config** (recommended): Array of arrays where each inner array = one physical line, elements joined with `│`.

```json
{
  "lines": [
    ["model", "path", "git"],
    ["context", "usage"],
    ["tools", "todos"]
  ]
}
```

**Legacy `elementOrder`**: Flat array controlling element order. Context+usage are auto-paired when adjacent. Falls back to this when `lines` is absent.

### Element Types

**Standalone sub-elements** (extracted from the old monolithic project line):
- `model` - `[Opus]` badge (renderModelElement)
- `path` - Project path (renderPathElement)
- `git` - `git:(main*)` status (renderGitElement)
- `session` - Session name (renderSessionElement)
- `version` - `CC v2.1.81` (renderVersionElement)
- `speed` - Output speed (renderSpeedElement)
- `duration` - Session timer (renderDurationElement)
- `customLabel` - Custom text (renderCustomLabelElement)

**Compound elements**:
- `project` - Backward-compatible bundle of all sub-elements above (path+git space-joined, rest │-joined)

**Other elements**: `context`, `usage`, `memory`, `environment`, `tools`, `agents`, `todos`, `motif`, `diff`

### Render Paths

- `renderElementLine(ctx, element)` — respects `display.show*` flags (used by `elementOrder` path)
- `renderElementForLines(ctx, element)` — bypasses `display.show*` flags (presence in `lines` = intent to show)
- `renderFromLines(ctx)` — iterates `config.lines` 2D array, handles multi-line elements (agents), tracks isActivity

### Theme System

Themes are named color presets in `src/themes.ts`. Each theme is a complete `HudColorOverrides` object.

**Resolution order**: `user colors → theme colors → default colors`

Available themes: `default`, `monochrome`, `dracula`, `solarized`, `catppuccin`

### Data Loading Gates

`main()` in `src/index.ts` conditionally fetches expensive data. When `config.lines` contains an element, its data is always fetched regardless of `display.show*` flags:
- `git` in lines → always fetch git status
- `version` in lines → always fetch CC version
- `memory` in lines → always fetch memory usage
- `motif` in lines or elementOrder → always fetch motif state

### Context Thresholds

| Threshold | Color | Action |
|-----------|-------|--------|
| <70% | Green | Normal |
| 70-85% | Yellow | Warning |
| >85% | Red | Show token breakdown |

## Plugin Configuration

The plugin manifest is in `.claude-plugin/plugin.json` (metadata only).

**StatusLine configuration** must be added to the user's `~/.claude/settings.json` via `/claude-hud:setup`.

The setup command adds an auto-updating command that finds the latest installed version at runtime.

## Dependencies

- **Runtime**: Node.js 18+ or Bun
- **Build**: TypeScript 5, ES2022 target, NodeNext modules
