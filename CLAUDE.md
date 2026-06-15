# agent-plugins

A Claude Code plugin marketplace. Each plugin is independent and lives in `plugins/<name>/`. All plugins are Claude Code-only.

## Structure

- `.claude-plugin/marketplace.json` — Claude Code marketplace manifest; registers **all** plugins
- `README.md` — public-facing plugin list and install instructions (has its own version table — see Version management)
- `plugins/claude-hud/` — statusline HUD (TypeScript; needs `npm run build`)
- `plugins/motif/` — 4-stage dev workflow (Research, Plan, Build, Validate); its `dev` skill is written to the portable Agent Skills standard, but motif ships only the Claude Code plugin
- `plugins/helm/` — autonomous session orchestrator (discovery through PR)

Each plugin has its own `CLAUDE.md` with plugin-specific context — read it before changing that plugin.

## Working on a plugin

- **claude-hud** is the only plugin with a build step. From `plugins/claude-hud/`: `npm ci`, `npm run build` (compiles `src/` → `dist/`), `npm test` (build + tests). `dist/` is gitignored.
- **motif** and **helm** are skill/agent/markdown plugins — no build.
- After changing any plugin, run `claude plugin validate .` from the repo root.

## Adding a new plugin

1. Create `plugins/<name>/` with a `.claude-plugin/plugin.json` (at minimum `name` and `version`)
2. Add a `CLAUDE.md` in the plugin directory documenting plugin-specific context
3. Add an entry to `.claude-plugin/marketplace.json` with `source: "./plugins/<name>"` (mirror `name`, `description`, `version`, `author`, `license`, `category`, `keywords` from the existing entries)
4. Add a row to the `README.md` version table
5. Run `claude plugin validate .` to verify

## Version management

A plugin's version is mirrored across several files. `plugin.json` is the source of truth; keep the rest in sync. When you bump a version, update **all** of these:

- `plugins/<name>/.claude-plugin/plugin.json` — source of truth
- `.claude-plugin/marketplace.json` — that plugin's entry
- `README.md` — version table row
- `plugins/claude-hud/package.json` — **claude-hud only**
- `plugins/motif/skills/dev/SKILL.md` and `plugins/motif/CLAUDE.md` — **motif only**

The README table drifts easily — verify it after any version change.

## Conventions

- Plugin names use kebab-case
- Commit subjects end with the new version, e.g. `motif: <change> — v0.10.0`; prefix with the plugin name when the change is plugin-scoped
- Plugin-specific gitignore rules go in the root `.gitignore`
- Do not add individual `marketplace.json` files inside plugins — the root marketplace handles registration
- Use `${CLAUDE_PLUGIN_ROOT}` in hooks and MCP configs for portable paths — plugins are copied to a cache on install
