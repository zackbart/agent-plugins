<p align="center">
  <a href="https://github.com/zackbart/agent-plugins">
    <img src="https://shieldcn.dev/header/graph.svg?title=agent-plugins&subtitle=personal+Claude+Code+plugin+marketplace&logo=claude&mode=light&align=center&font=geist-mono&border=false" alt="agent-plugins">
  </a>
</p>

<p align="center">
  <a href="https://github.com/zackbart/agent-plugins/stargazers">
    <img src="https://shieldcn.dev/github/stars/zackbart/agent-plugins.svg" alt="Stars">
  </a>
</p>

Personal Claude Code plugin marketplace.

## Plugins

| Plugin | Version | Description |
|---|---|---|
| [claude-hud](plugins/claude-hud/) | 0.0.17 | Real-time statusline HUD for Claude Code |
| [motif](plugins/motif/) | 0.10.2 | 4-stage development workflow (Research, Plan, Build, Validate) |

## Installation

Add the marketplace:

```
/plugin marketplace add zackbart/agent-plugins
```

Install a plugin:

```
/plugin install claude-hud@agent-plugins
/plugin install motif@agent-plugins
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
│   └── marketplace.json    # Claude Code marketplace manifest
└── plugins/
    ├── claude-hud/         # Statusline HUD
    └── motif/              # Dev workflow (Research, Plan, Build, Validate)
```

Each plugin has its own `plugin.json` in `.claude-plugin/` with version tracking. See individual plugin READMEs for details.

## Validation

```bash
claude plugin validate .
```

## License

Each plugin is individually licensed. See the LICENSE file in each plugin directory.
