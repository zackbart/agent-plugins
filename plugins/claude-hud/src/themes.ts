import type { HudColorOverrides } from './config.js';

export type HudThemeName = 'default' | 'monochrome' | 'dracula' | 'solarized' | 'catppuccin';

const THEMES: Record<HudThemeName, HudColorOverrides> = {
  default: {
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

  monochrome: {
    context: 250,
    usage: 246,
    warning: 255,
    usageWarning: 255,
    critical: 255,
    model: 252,
    project: 250,
    git: 246,
    gitBranch: 250,
    label: 242,
    custom: 248,
  },

  dracula: {
    context: '#50fa7b',    // green
    usage: '#8be9fd',      // cyan
    warning: '#f1fa8c',    // yellow
    usageWarning: '#ff79c6', // pink
    critical: '#ff5555',   // red
    model: '#bd93f9',      // purple
    project: '#f1fa8c',    // yellow
    git: '#ff79c6',        // pink
    gitBranch: '#8be9fd',  // cyan
    label: '#6272a4',      // comment gray
    custom: '#ffb86c',     // orange
  },

  solarized: {
    context: '#859900',    // green
    usage: '#268bd2',      // blue
    warning: '#b58900',    // yellow
    usageWarning: '#d33682', // magenta
    critical: '#dc322f',   // red
    model: '#2aa198',      // cyan
    project: '#b58900',    // yellow
    git: '#d33682',        // magenta
    gitBranch: '#2aa198',  // cyan
    label: '#586e75',      // base01
    custom: '#cb4b16',     // orange
  },

  catppuccin: {
    context: '#a6e3a1',    // green
    usage: '#89b4fa',      // blue
    warning: '#f9e2af',    // yellow
    usageWarning: '#f5c2e7', // pink
    critical: '#f38ba8',   // red
    model: '#b4befe',      // lavender
    project: '#f9e2af',    // yellow
    git: '#f5c2e7',        // pink
    gitBranch: '#94e2d5',  // teal
    label: '#6c7086',      // overlay0
    custom: '#fab387',     // peach
  },
};

const KNOWN_THEMES = new Set<string>(Object.keys(THEMES));

export function isValidThemeName(value: unknown): value is HudThemeName {
  return typeof value === 'string' && KNOWN_THEMES.has(value);
}

export function getThemeColors(name: HudThemeName): HudColorOverrides {
  return THEMES[name];
}
