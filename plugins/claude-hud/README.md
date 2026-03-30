# claude-hud

Real-time statusline HUD for Claude Code. Shows context health, tool activity, agent tracking, todo progress, and rate limit usage - always visible below your input.

```
[Opus] │ my-project git:(main*)
Context █████░░░░░ 45% │ Usage ██░░░░░░░░ 25% (1h 30m / 5h)
◐ Edit: auth.ts │ ✓ Read ×3
```

## Install

```bash
claude install-plugin github:zackbart/claude-hud
```

Then run `/claude-hud:setup` inside Claude Code.

## Layout

The HUD uses a flexible `lines` config - you control what goes on each line:

```json
{
  "lines": [
    ["model", "path", "git"],
    ["context", "usage"],
    ["tools", "todos"],
    ["agents"]
  ]
}
```

### Available elements

| Element | Output |
|---|---|
| `model` | `[Opus]` or `[Opus │ Bedrock]` |
| `path` | `my-project` |
| `git` | `git:(main*)` |
| `session` | Session name |
| `version` | `CC v2.1.81` |
| `speed` | `out: 42.3 tok/s` |
| `duration` | Timer |
| `customLabel` | Custom text from `display.customLine` |
| `context` | Context window bar |
| `usage` | Rate limit bar |
| `memory` | RAM usage bar |
| `environment` | CLAUDE.md / rules / MCP / hooks counts |
| `tools` | Active and completed tools |
| `agents` | Running agents |
| `todos` | Todo progress |
| `project` | Bundle of model+path+git+session+version+speed+duration+customLabel |

Placing an element in `lines` auto-enables it - no need to also set `display.showTools: true` etc.

If `lines` is not set, the classic `elementOrder` flat array still works.

## Themes

Set a theme to change all colors at once:

```json
{
  "theme": "dracula"
}
```

Available themes: `default`, `monochrome`, `dracula`, `solarized`, `catppuccin`

Override individual colors on top of any theme:

```json
{
  "theme": "catppuccin",
  "colors": {
    "model": "red"
  }
}
```

## Config

Edit `~/.claude/plugins/claude-hud/config.json` or use `/claude-hud:configure`.

```json
{
  "lineLayout": "expanded",
  "theme": "default",
  "lines": [
    ["model", "path", "git"],
    ["context", "usage"],
    ["environment"],
    ["tools"],
    ["agents"],
    ["todos"]
  ],
  "display": {
    "showTools": true,
    "showAgents": true,
    "showTodos": true
  }
}
```

### Display options

| Option | Default | Description |
|---|---|---|
| `lineLayout` | `expanded` | `expanded` or `compact` |
| `showSeparators` | `false` | Line between header and activity |
| `pathLevels` | `1` | Path segments to show (1-3) |
| `theme` | - | Named color theme |
| `display.showModel` | `true` | Model badge |
| `display.showProject` | `true` | Project path |
| `display.showContextBar` | `true` | Context bar |
| `display.showUsage` | `true` | Rate limit bar |
| `display.showTools` | `false` | Tool activity |
| `display.showAgents` | `false` | Agent status |
| `display.showTodos` | `false` | Todo progress |
| `display.showConfigCounts` | `false` | Environment counts |
| `display.showDuration` | `false` | Session timer |
| `display.showSpeed` | `false` | Output speed |
| `display.showSessionName` | `false` | Session name |
| `display.showClaudeCodeVersion` | `false` | CC version |
| `display.showMemoryUsage` | `false` | RAM usage |

## License

MIT
