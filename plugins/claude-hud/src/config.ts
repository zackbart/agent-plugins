import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { getHudPluginDir } from './claude-config-dir.js';
import { type HudThemeName, isValidThemeName, getThemeColors } from './themes.js';

export type LineLayoutType = 'compact' | 'expanded';

export type AutocompactBufferMode = 'enabled' | 'disabled';
export type ContextValueMode = 'percent' | 'tokens' | 'remaining' | 'both';
export type HudElement =
  | 'project' | 'model' | 'path' | 'git' | 'session' | 'version' | 'speed' | 'duration' | 'customLabel'
  | 'context' | 'usage' | 'memory' | 'environment' | 'tools' | 'agents' | 'todos'
  | 'motif' | 'diff';
export type HudColorName =
  | 'dim'
  | 'red'
  | 'green'
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'brightBlue'
  | 'brightMagenta';

/** A color value: named preset, 256-color index (0-255), or hex string (#rrggbb). */
export type HudColorValue = HudColorName | number | string;

export interface HudColorOverrides {
  context: HudColorValue;
  usage: HudColorValue;
  warning: HudColorValue;
  usageWarning: HudColorValue;
  critical: HudColorValue;
  model: HudColorValue;
  project: HudColorValue;
  git: HudColorValue;
  gitBranch: HudColorValue;
  label: HudColorValue;
  custom: HudColorValue;
}

export const DEFAULT_ELEMENT_ORDER: HudElement[] = [
  'project',
  'context',
  'usage',
  'memory',
  'environment',
  'tools',
  'agents',
  'todos',
];

const KNOWN_ELEMENTS = new Set<HudElement>([
  ...DEFAULT_ELEMENT_ORDER,
  'model', 'path', 'git', 'session', 'version', 'speed', 'duration', 'customLabel', 'motif', 'diff',
]);

export type { HudThemeName } from './themes.js';

export interface HudConfig {
  lineLayout: LineLayoutType;
  showSeparators: boolean;
  theme?: HudThemeName;
  pathLevels: 1 | 2 | 3;
  elementOrder: HudElement[];
  lines?: HudElement[][];
  gitStatus: {
    enabled: boolean;
    showDirty: boolean;
    showAheadBehind: boolean;
    showFileStats: boolean;
  };
  display: {
    showModel: boolean;
    showProject: boolean;
    showContextBar: boolean;
    contextValue: ContextValueMode;
    showConfigCounts: boolean;
    showDuration: boolean;
    showSpeed: boolean;
    showTokenBreakdown: boolean;
    showUsage: boolean;
    usageBarEnabled: boolean;
    showTools: boolean;
    showAgents: boolean;
    showTodos: boolean;
    showSessionName: boolean;
    showClaudeCodeVersion: boolean;
    showMemoryUsage: boolean;
    autocompactBuffer: AutocompactBufferMode;
    usageThreshold: number;
    sevenDayThreshold: number;
    environmentThreshold: number;
    customLine: string;
  };
  colors: HudColorOverrides;
}

export const DEFAULT_CONFIG: HudConfig = {
  lineLayout: 'expanded',
  showSeparators: false,
  pathLevels: 1,
  elementOrder: [...DEFAULT_ELEMENT_ORDER],
  gitStatus: {
    enabled: true,
    showDirty: true,
    showAheadBehind: false,
    showFileStats: false,
  },
  display: {
    showModel: true,
    showProject: true,
    showContextBar: true,
    contextValue: 'percent',
    showConfigCounts: false,
    showDuration: false,
    showSpeed: false,
    showTokenBreakdown: true,
    showUsage: true,
    usageBarEnabled: true,
    showTools: false,
    showAgents: false,
    showTodos: false,
    showSessionName: false,
    showClaudeCodeVersion: false,
    showMemoryUsage: false,
    autocompactBuffer: 'enabled',
    usageThreshold: 0,
    sevenDayThreshold: 80,
    environmentThreshold: 0,
    customLine: '',
  },
  colors: {
    context: 'green',
    usage: 'brightBlue',
    warning: 'yellow',
    usageWarning: 'brightMagenta',
    critical: 'red',
    model: 'cyan',
    project: 'yellow',
    git: 'magenta',
    gitBranch: 'cyan',
    label: 'dim',
    custom: 208,
  },
};

export function getConfigPath(): string {
  const homeDir = os.homedir();
  return path.join(getHudPluginDir(homeDir), 'config.json');
}

function validatePathLevels(value: unknown): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3;
}

function validateLineLayout(value: unknown): value is LineLayoutType {
  return value === 'compact' || value === 'expanded';
}

function validateAutocompactBuffer(value: unknown): value is AutocompactBufferMode {
  return value === 'enabled' || value === 'disabled';
}

function validateContextValue(value: unknown): value is ContextValueMode {
  return value === 'percent' || value === 'tokens' || value === 'remaining' || value === 'both';
}

function validateColorName(value: unknown): value is HudColorName {
  return value === 'dim'
    || value === 'red'
    || value === 'green'
    || value === 'yellow'
    || value === 'magenta'
    || value === 'cyan'
    || value === 'brightBlue'
    || value === 'brightMagenta';
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function validateColorValue(value: unknown): value is HudColorValue {
  if (validateColorName(value)) return true;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255) return true;
  if (typeof value === 'string' && HEX_COLOR_PATTERN.test(value)) return true;
  return false;
}

function validateElementOrder(value: unknown): HudElement[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [...DEFAULT_ELEMENT_ORDER];
  }

  const seen = new Set<HudElement>();
  const elementOrder: HudElement[] = [];

  for (const item of value) {
    if (typeof item !== 'string' || !KNOWN_ELEMENTS.has(item as HudElement)) {
      continue;
    }

    const element = item as HudElement;
    if (seen.has(element)) {
      continue;
    }

    seen.add(element);
    elementOrder.push(element);
  }

  return elementOrder.length > 0 ? elementOrder : [...DEFAULT_ELEMENT_ORDER];
}

function validateLines(value: unknown): HudElement[][] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const result: HudElement[][] = [];

  for (const row of value) {
    if (!Array.isArray(row)) {
      continue;
    }

    const validRow: HudElement[] = [];
    for (const item of row) {
      if (typeof item === 'string' && KNOWN_ELEMENTS.has(item as HudElement)) {
        validRow.push(item as HudElement);
      }
    }

    if (validRow.length > 0) {
      result.push(validRow);
    }
  }

  return result.length > 0 ? result : undefined;
}

interface LegacyConfig {
  layout?: 'default' | 'separators' | Record<string, unknown>;
}

function migrateConfig(userConfig: Partial<HudConfig> & LegacyConfig): Partial<HudConfig> {
  const migrated = { ...userConfig } as Partial<HudConfig> & LegacyConfig;

  if ('layout' in userConfig && !('lineLayout' in userConfig)) {
    if (typeof userConfig.layout === 'string') {
      // Legacy string migration (v0.0.x → v0.1.x)
      if (userConfig.layout === 'separators') {
        migrated.lineLayout = 'compact';
        migrated.showSeparators = true;
      } else {
        migrated.lineLayout = 'compact';
        migrated.showSeparators = false;
      }
    } else if (typeof userConfig.layout === 'object' && userConfig.layout !== null) {
      // Object layout written by third-party tools — extract nested fields
      const obj = userConfig.layout as Record<string, unknown>;
      if (typeof obj.lineLayout === 'string') migrated.lineLayout = obj.lineLayout as any;
      if (typeof obj.showSeparators === 'boolean') migrated.showSeparators = obj.showSeparators;
      if (typeof obj.pathLevels === 'number') migrated.pathLevels = obj.pathLevels as any;
    }
    delete migrated.layout;
  }

  return migrated;
}

function validateThreshold(value: unknown, max = 100): number {
  if (typeof value !== 'number') return 0;
  return Math.max(0, Math.min(max, value));
}

export function mergeConfig(userConfig: Partial<HudConfig>): HudConfig {
  const migrated = migrateConfig(userConfig);

  const lineLayout = validateLineLayout(migrated.lineLayout)
    ? migrated.lineLayout
    : DEFAULT_CONFIG.lineLayout;

  const showSeparators = typeof migrated.showSeparators === 'boolean'
    ? migrated.showSeparators
    : DEFAULT_CONFIG.showSeparators;

  const pathLevels = validatePathLevels(migrated.pathLevels)
    ? migrated.pathLevels
    : DEFAULT_CONFIG.pathLevels;

  const elementOrder = validateElementOrder(migrated.elementOrder);
  const lines = validateLines(migrated.lines);

  const gitStatus = {
    enabled: typeof migrated.gitStatus?.enabled === 'boolean'
      ? migrated.gitStatus.enabled
      : DEFAULT_CONFIG.gitStatus.enabled,
    showDirty: typeof migrated.gitStatus?.showDirty === 'boolean'
      ? migrated.gitStatus.showDirty
      : DEFAULT_CONFIG.gitStatus.showDirty,
    showAheadBehind: typeof migrated.gitStatus?.showAheadBehind === 'boolean'
      ? migrated.gitStatus.showAheadBehind
      : DEFAULT_CONFIG.gitStatus.showAheadBehind,
    showFileStats: typeof migrated.gitStatus?.showFileStats === 'boolean'
      ? migrated.gitStatus.showFileStats
      : DEFAULT_CONFIG.gitStatus.showFileStats,
  };

  const display = {
    showModel: typeof migrated.display?.showModel === 'boolean'
      ? migrated.display.showModel
      : DEFAULT_CONFIG.display.showModel,
    showProject: typeof migrated.display?.showProject === 'boolean'
      ? migrated.display.showProject
      : DEFAULT_CONFIG.display.showProject,
    showContextBar: typeof migrated.display?.showContextBar === 'boolean'
      ? migrated.display.showContextBar
      : DEFAULT_CONFIG.display.showContextBar,
    contextValue: validateContextValue(migrated.display?.contextValue)
      ? migrated.display.contextValue
      : DEFAULT_CONFIG.display.contextValue,
    showConfigCounts: typeof migrated.display?.showConfigCounts === 'boolean'
      ? migrated.display.showConfigCounts
      : DEFAULT_CONFIG.display.showConfigCounts,
    showDuration: typeof migrated.display?.showDuration === 'boolean'
      ? migrated.display.showDuration
      : DEFAULT_CONFIG.display.showDuration,
    showSpeed: typeof migrated.display?.showSpeed === 'boolean'
      ? migrated.display.showSpeed
      : DEFAULT_CONFIG.display.showSpeed,
    showTokenBreakdown: typeof migrated.display?.showTokenBreakdown === 'boolean'
      ? migrated.display.showTokenBreakdown
      : DEFAULT_CONFIG.display.showTokenBreakdown,
    showUsage: typeof migrated.display?.showUsage === 'boolean'
      ? migrated.display.showUsage
      : DEFAULT_CONFIG.display.showUsage,
    usageBarEnabled: typeof migrated.display?.usageBarEnabled === 'boolean'
      ? migrated.display.usageBarEnabled
      : DEFAULT_CONFIG.display.usageBarEnabled,
    showTools: typeof migrated.display?.showTools === 'boolean'
      ? migrated.display.showTools
      : DEFAULT_CONFIG.display.showTools,
    showAgents: typeof migrated.display?.showAgents === 'boolean'
      ? migrated.display.showAgents
      : DEFAULT_CONFIG.display.showAgents,
    showTodos: typeof migrated.display?.showTodos === 'boolean'
      ? migrated.display.showTodos
      : DEFAULT_CONFIG.display.showTodos,
    showSessionName: typeof migrated.display?.showSessionName === 'boolean'
      ? migrated.display.showSessionName
      : DEFAULT_CONFIG.display.showSessionName,
    showClaudeCodeVersion: typeof migrated.display?.showClaudeCodeVersion === 'boolean'
      ? migrated.display.showClaudeCodeVersion
      : DEFAULT_CONFIG.display.showClaudeCodeVersion,
    showMemoryUsage: typeof migrated.display?.showMemoryUsage === 'boolean'
      ? migrated.display.showMemoryUsage
      : DEFAULT_CONFIG.display.showMemoryUsage,
    autocompactBuffer: validateAutocompactBuffer(migrated.display?.autocompactBuffer)
      ? migrated.display.autocompactBuffer
      : DEFAULT_CONFIG.display.autocompactBuffer,
    usageThreshold: validateThreshold(migrated.display?.usageThreshold, 100),
    sevenDayThreshold: validateThreshold(migrated.display?.sevenDayThreshold, 100),
    environmentThreshold: validateThreshold(migrated.display?.environmentThreshold, 100),
    customLine: typeof migrated.display?.customLine === 'string'
      ? migrated.display.customLine.slice(0, 80)
      : DEFAULT_CONFIG.display.customLine,
  };

  const theme = isValidThemeName(migrated.theme) ? migrated.theme : undefined;
  const baseColors = theme ? getThemeColors(theme) : DEFAULT_CONFIG.colors;

  const resolveColor = (key: keyof HudColorOverrides): HudColorValue =>
    validateColorValue(migrated.colors?.[key])
      ? migrated.colors![key]
      : baseColors[key];

  const colors: HudColorOverrides = {
    context: resolveColor('context'),
    usage: resolveColor('usage'),
    warning: resolveColor('warning'),
    usageWarning: resolveColor('usageWarning'),
    critical: resolveColor('critical'),
    model: resolveColor('model'),
    project: resolveColor('project'),
    git: resolveColor('git'),
    gitBranch: resolveColor('gitBranch'),
    label: resolveColor('label'),
    custom: resolveColor('custom'),
  };

  return { lineLayout, showSeparators, pathLevels, elementOrder, lines, theme, gitStatus, display, colors };
}

interface ConfigCache {
  configPath: string;
  mtimeMs: number;
  config: HudConfig;
}

function getConfigCachePath(): string {
  const homeDir = os.homedir();
  return path.join(getHudPluginDir(homeDir), '.config-cache.json');
}

function readConfigCache(cachePath: string): ConfigCache | null {
  try {
    const raw = fs.readFileSync(cachePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).configPath === 'string' &&
      typeof (parsed as Record<string, unknown>).mtimeMs === 'number' &&
      typeof (parsed as Record<string, unknown>).config === 'object'
    ) {
      return parsed as ConfigCache;
    }
  } catch {
    // Cache read failed — non-fatal
  }
  return null;
}

function writeConfigCache(cachePath: string, entry: ConfigCache): void {
  try {
    fs.writeFileSync(cachePath, JSON.stringify(entry), 'utf-8');
  } catch {
    // Cache write failed — non-fatal
  }
}

export async function loadConfig(): Promise<HudConfig> {
  const configPath = getConfigPath();

  try {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(configPath);
    } catch {
      // File does not exist
      return DEFAULT_CONFIG;
    }

    const mtimeMs = stat.mtimeMs;
    const cachePath = getConfigCachePath();
    const cache = readConfigCache(cachePath);

    if (cache !== null && cache.configPath === configPath && cache.mtimeMs === mtimeMs) {
      return cache.config;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(content) as Partial<HudConfig>;
    const config = mergeConfig(userConfig);

    writeConfigCache(cachePath, { configPath, mtimeMs, config });

    return config;
  } catch {
    return DEFAULT_CONFIG;
  }
}
