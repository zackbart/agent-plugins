# agent-plugins

This is a Claude Code plugin marketplace. Each plugin is independent and lives in `plugins/<name>/`.

## Structure

- `.claude-plugin/marketplace.json` — Claude Code marketplace manifest, registers all plugins
- `.agents/plugins/marketplace.json` — Codex CLI marketplace manifest (registers motif only)
- `plugins/claude-hud/` — statusline HUD (TypeScript, needs `npm run build`)
- `plugins/motif/` — 4-stage dev workflow (Research, Plan, Build, Validate); also ships a `.codex-plugin/plugin.json` for Codex CLI
- `plugins/helm/` — autonomous session orchestrator (discovery through PR)

## Working on a plugin

Each plugin has its own CLAUDE.md with plugin-specific context. Read that before making changes.

## Adding a new plugin

1. Create the plugin directory under `plugins/<name>/`
2. Add `.claude-plugin/plugin.json` with at minimum `name` and `version`
3. Add an entry to `.claude-plugin/marketplace.json` with `source` set to `./plugins/<name>`
4. Run `claude plugin validate .` to verify

## Version management

- Each plugin manages its own version in its `plugin.json`
- Mirror the version in the marketplace.json plugin entry to keep them in sync
- Do not set version in both places with different values — `plugin.json` always wins

## Conventions

- Plugin names use kebab-case
- Plugin-specific gitignore rules go in the root `.gitignore`
- Do not add individual `marketplace.json` files inside plugins — the root marketplace handles registration
- Use `${CLAUDE_PLUGIN_ROOT}` in hooks and MCP configs for portable paths — plugins are copied to a cache on install
