import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createDebug } from './debug.js';
import { getClaudeConfigDir, getClaudeConfigJsonPath } from './claude-config-dir.js';

const debug = createDebug('config');

export interface ConfigCounts {
  claudeMdCount: number;
  rulesCount: number;
  mcpCount: number;
  hooksCount: number;
}

// Valid keys for disabled MCP arrays in config files
type DisabledMcpKey = 'disabledMcpServers' | 'disabledMcpjsonServers';

/**
 * Read and parse a JSON file, caching the result in `cache` so each file path
 * is only read from disk once per `countConfigs()` invocation.
 * Returns `null` when the file does not exist or cannot be parsed.
 */
function readJsonFile(filePath: string, cache: Map<string, unknown>): unknown {
  if (cache.has(filePath)) {
    return cache.get(filePath) ?? null;
  }
  if (!fs.existsSync(filePath)) {
    cache.set(filePath, null);
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed: unknown = JSON.parse(content);
    cache.set(filePath, parsed);
    return parsed;
  } catch (error) {
    debug(`Failed to read/parse ${filePath}:`, error);
    cache.set(filePath, null);
    return null;
  }
}

function getMcpServerNames(filePath: string, cache: Map<string, unknown>): Set<string> {
  const config = readJsonFile(filePath, cache);
  if (config !== null && typeof config === 'object' && !Array.isArray(config)) {
    const cfg = config as Record<string, unknown>;
    if (cfg.mcpServers && typeof cfg.mcpServers === 'object' && !Array.isArray(cfg.mcpServers)) {
      return new Set(Object.keys(cfg.mcpServers as object));
    }
  }
  return new Set();
}

function getDisabledMcpServers(filePath: string, key: DisabledMcpKey, cache: Map<string, unknown>): Set<string> {
  const config = readJsonFile(filePath, cache);
  if (config !== null && typeof config === 'object' && !Array.isArray(config)) {
    const cfg = config as Record<string, unknown>;
    if (Array.isArray(cfg[key])) {
      const arr = cfg[key] as unknown[];
      const validNames = arr.filter((s): s is string => typeof s === 'string');
      if (validNames.length !== arr.length) {
        debug(`${key} in ${filePath} contains non-string values, ignoring them`);
      }
      return new Set(validNames);
    }
  }
  return new Set();
}

function countHooksInFile(filePath: string, cache: Map<string, unknown>): number {
  const config = readJsonFile(filePath, cache);
  if (config !== null && typeof config === 'object' && !Array.isArray(config)) {
    const cfg = config as Record<string, unknown>;
    if (cfg.hooks && typeof cfg.hooks === 'object' && !Array.isArray(cfg.hooks)) {
      return Object.keys(cfg.hooks as object).length;
    }
  }
  return 0;
}

function countRulesInDir(rulesDir: string): number {
  if (!fs.existsSync(rulesDir)) return 0;
  let count = 0;
  try {
    const entries = fs.readdirSync(rulesDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(rulesDir, entry.name);
      if (entry.isDirectory()) {
        count += countRulesInDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        count++;
      }
    }
  } catch (error) {
    debug(`Failed to read rules from ${rulesDir}:`, error);
  }
  return count;
}

function normalizePathForComparison(inputPath: string): string {
  let normalized = path.normalize(path.resolve(inputPath));
  const root = path.parse(normalized).root;
  while (normalized.length > root.length && normalized.endsWith(path.sep)) {
    normalized = normalized.slice(0, -1);
  }
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function pathsReferToSameLocation(pathA: string, pathB: string): boolean {
  if (normalizePathForComparison(pathA) === normalizePathForComparison(pathB)) {
    return true;
  }

  if (!fs.existsSync(pathA) || !fs.existsSync(pathB)) {
    return false;
  }

  try {
    const realPathA = fs.realpathSync.native(pathA);
    const realPathB = fs.realpathSync.native(pathB);
    return normalizePathForComparison(realPathA) === normalizePathForComparison(realPathB);
  } catch {
    return false;
  }
}

export async function countConfigs(cwd?: string): Promise<ConfigCounts> {
  let claudeMdCount = 0;
  let rulesCount = 0;
  let hooksCount = 0;

  // Cache parsed JSON objects keyed by absolute file path so each file is only
  // read from disk once per countConfigs() invocation.
  const jsonCache = new Map<string, unknown>();

  const homeDir = os.homedir();
  const claudeDir = getClaudeConfigDir(homeDir);

  // Collect all MCP servers across scopes, then subtract disabled ones
  const userMcpServers = new Set<string>();
  const projectMcpServers = new Set<string>();

  // === USER SCOPE ===

  // ~/.claude/CLAUDE.md
  if (fs.existsSync(path.join(claudeDir, 'CLAUDE.md'))) {
    claudeMdCount++;
  }

  // ~/.claude/rules/*.md
  rulesCount += countRulesInDir(path.join(claudeDir, 'rules'));

  // ~/.claude/settings.json (MCPs and hooks)
  const userSettings = path.join(claudeDir, 'settings.json');
  for (const name of getMcpServerNames(userSettings, jsonCache)) {
    userMcpServers.add(name);
  }
  hooksCount += countHooksInFile(userSettings, jsonCache);

  // {CLAUDE_CONFIG_DIR}.json (additional user-scope MCPs)
  const userClaudeJson = getClaudeConfigJsonPath(homeDir);
  for (const name of getMcpServerNames(userClaudeJson, jsonCache)) {
    userMcpServers.add(name);
  }

  // Get disabled user-scope MCPs from ~/.claude.json
  const disabledUserMcps = getDisabledMcpServers(userClaudeJson, 'disabledMcpServers', jsonCache);
  for (const name of disabledUserMcps) {
    userMcpServers.delete(name);
  }

  // === PROJECT SCOPE ===

  // Avoid double-counting when project .claude directory is the same location as user scope.
  const projectClaudeDir = cwd ? path.join(cwd, '.claude') : null;
  const projectClaudeOverlapsUserScope = projectClaudeDir
    ? pathsReferToSameLocation(projectClaudeDir, claudeDir)
    : false;

  if (cwd) {
    // {cwd}/CLAUDE.md
    if (fs.existsSync(path.join(cwd, 'CLAUDE.md'))) {
      claudeMdCount++;
    }

    // {cwd}/CLAUDE.local.md
    if (fs.existsSync(path.join(cwd, 'CLAUDE.local.md'))) {
      claudeMdCount++;
    }

    // {cwd}/.claude/CLAUDE.md (alternative location, skip when it is user scope)
    if (!projectClaudeOverlapsUserScope && fs.existsSync(path.join(cwd, '.claude', 'CLAUDE.md'))) {
      claudeMdCount++;
    }

    // {cwd}/.claude/CLAUDE.local.md
    if (fs.existsSync(path.join(cwd, '.claude', 'CLAUDE.local.md'))) {
      claudeMdCount++;
    }

    // {cwd}/.claude/rules/*.md (recursive)
    // Skip when it overlaps with user-scope rules.
    if (!projectClaudeOverlapsUserScope) {
      rulesCount += countRulesInDir(path.join(cwd, '.claude', 'rules'));
    }

    // {cwd}/.mcp.json (project MCP config) - tracked separately for disabled filtering
    const mcpJsonServers = getMcpServerNames(path.join(cwd, '.mcp.json'), jsonCache);

    // {cwd}/.claude/settings.json (project settings)
    // Skip when it overlaps with user-scope settings.
    const projectSettings = path.join(cwd, '.claude', 'settings.json');
    if (!projectClaudeOverlapsUserScope) {
      for (const name of getMcpServerNames(projectSettings, jsonCache)) {
        projectMcpServers.add(name);
      }
      hooksCount += countHooksInFile(projectSettings, jsonCache);
    }

    // {cwd}/.claude/settings.local.json (local project settings)
    const localSettings = path.join(cwd, '.claude', 'settings.local.json');
    for (const name of getMcpServerNames(localSettings, jsonCache)) {
      projectMcpServers.add(name);
    }
    hooksCount += countHooksInFile(localSettings, jsonCache);

    // Get disabled .mcp.json servers from settings.local.json
    const disabledMcpJsonServers = getDisabledMcpServers(localSettings, 'disabledMcpjsonServers', jsonCache);
    for (const name of disabledMcpJsonServers) {
      mcpJsonServers.delete(name);
    }

    // Add remaining .mcp.json servers to project set
    for (const name of mcpJsonServers) {
      projectMcpServers.add(name);
    }
  }

  // Total MCP count = user servers + project servers
  // Note: Deduplication only occurs within each scope, not across scopes.
  // A server with the same name in both user and project scope counts as 2 (separate configs).
  const mcpCount = userMcpServers.size + projectMcpServers.size;

  return { claudeMdCount, rulesCount, mcpCount, hooksCount };
}
