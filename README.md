# agent-plugins

Personal Claude Code plugin marketplace.

## Plugins

| Plugin | Version | Description |
|---|---|---|
| [claude-hud](plugins/claude-hud/) | 0.0.16 | Real-time statusline HUD for Claude Code |
| [motif](plugins/motif/) | 0.9.3 | 4-stage development workflow (Research, Plan, Build, Validate) |
| [helm](plugins/helm/) | 0.2.1 | Autonomous agent sessions from discovery to merged PR |

## Installation

Add the marketplace:

```
/plugin marketplace add zackbart/agent-plugins
```

Install a plugin:

```
/plugin install claude-hud@agent-plugins
/plugin install motif@agent-plugins
/plugin install helm@agent-plugins
```

## Updating

To pull the latest versions:

```
/plugin marketplace update agent-plugins
```

## Structure

```
agent-plugins/
├── .claude-plugin/
│   └── marketplace.json    # Marketplace manifest
└── plugins/
    ├── claude-hud/         # Statusline HUD
    ├── motif/              # Dev workflow
    └── helm/               # Autonomous orchestrator
```

Each plugin has its own `plugin.json` in `.claude-plugin/` with version tracking. See individual plugin READMEs for details.

## Validation

```bash
claude plugin validate .
```

## License

Each plugin is individually licensed. See the LICENSE file in each plugin directory.
